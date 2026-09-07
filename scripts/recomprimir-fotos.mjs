// Migración de un solo uso: recomprime las fotos que ya están en el bucket
// "fotos-seguimiento" a los mismos parámetros que usa la app hoy
// (comprimirImagen.util.ts), actualiza storage_path en fotos_visita /
// fotos_recorrido, y borra el original.
//
// Motivo: las fotos subidas antes de que existiera la compresión en el
// navegador pesan 1-6 MB cada una y se comieron ~750 MB del giga del plan
// gratuito de Supabase. Recomprimidas quedan en ~180 KB.
//
// Uso:
//   SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/recomprimir-fotos.mjs --dry-run
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/recomprimir-fotos.mjs
//
// La service role key vive en el dashboard de Supabase: Settings > API >
// service_role (secret). NUNCA la pongas en el frontend ni la commitees.
// Corré primero con --dry-run: no descarga ni un byte, solo lista qué se
// convertiría y cuánto se recupera.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import convertirHeic from 'heic-convert'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.argv.includes('--dry-run')
const BUCKET = 'fotos-seguimiento'

// Mismos valores que src/utils/seguimiento/comprimirImagen.util.ts — si se
// cambian allá, cambiarlos acá también.
const DIMENSION_MAXIMA = 1280
const CALIDAD = 72

// Una foto que ya pesa menos que esto no vale el egress de bajarla: o ya pasó
// por esta migración, o la subió la app con la compresión del navegador ya
// puesta. Es también lo que hace el script reanudable — si se corta a mitad,
// lo ya convertido queda debajo del umbral y no se vuelve a tocar.
const UMBRAL_BYTES = 250 * 1024

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1)

// El bucket tiene dos profundidades: "{visitaId}/foto.webp" para las fotos de
// visita y "recorridos/{recorridoId}/foto.webp" para las de recorrido. Por eso
// se recorre recursivo en vez de bajar un solo nivel.
async function listarArchivos(prefijo = '') {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefijo, { limit: 1000 })
  if (error) throw error

  const rutas = []
  for (const entrada of data ?? []) {
    const ruta = prefijo ? `${prefijo}/${entrada.name}` : entrada.name
    // Las carpetas vienen con id null; los archivos reales traen metadata.
    if (entrada.id === null) rutas.push(...(await listarArchivos(ruta)))
    else rutas.push({ path: ruta, size: entrada.metadata?.size ?? 0 })
  }
  return rutas
}

// sharp no lee HEIC (necesita libheif compilado, que el binario que se instala
// por npm no trae). Se decodifica antes con heic-convert, la misma librería
// que ya usa convertir-fotos-heic.mjs.
async function aWebp(buffer, ruta) {
  const entrada = /\.hei[cf]$/i.test(ruta)
    ? Buffer.from(await convertirHeic({ buffer, format: 'JPEG', quality: 1 }))
    : buffer

  return sharp(entrada)
    .rotate() // respeta la orientación EXIF antes de descartar los metadatos
    .resize(DIMENSION_MAXIMA, DIMENSION_MAXIMA, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: CALIDAD })
    .toBuffer()
}

async function main() {
  const archivos = await listarArchivos()
  const candidatos = archivos.filter((a) => !a.path.toLowerCase().endsWith('.webp') || a.size > UMBRAL_BYTES)

  const totalActual = archivos.reduce((acc, a) => acc + a.size, 0)
  const totalCandidatos = candidatos.reduce((acc, a) => acc + a.size, 0)

  console.log(`Bucket: ${archivos.length} archivos, ${mb(totalActual)} MB en total.`)
  console.log(`Candidatos a recomprimir: ${candidatos.length} archivos, ${mb(totalCandidatos)} MB.`)

  if (candidatos.length === 0) {
    console.log('Nada para hacer — todas las fotos ya están comprimidas.')
    return
  }

  if (DRY_RUN) {
    candidatos
      .sort((a, b) => b.size - a.size)
      .forEach((c) => console.log(`  [dry-run] ${mb(c.size).padStart(6)} MB  ${c.path}`))
    console.log(`\n[dry-run] No se descargó ni se modificó nada. Se recuperarían del orden de ${mb(totalCandidatos * 0.9)} MB.`)
    return
  }

  // Una misma ruta puede estar en fotos_visita o en fotos_recorrido; se arma
  // el índice una sola vez para saber qué fila actualizar después de subir.
  const tablaPorRuta = new Map()
  for (const tabla of ['fotos_visita', 'fotos_recorrido']) {
    const { data, error } = await supabase.from(tabla).select('id, storage_path')
    if (error) throw error
    for (const fila of data ?? []) tablaPorRuta.set(fila.storage_path, { tabla, id: fila.id })
  }

  let ok = 0
  let saltadas = 0
  let fallidas = 0
  let bytesAntes = 0
  let bytesDespues = 0

  for (const [i, candidato] of candidatos.entries()) {
    const prefijo = `[${i + 1}/${candidatos.length}] ${candidato.path}`
    try {
      const referencia = tablaPorRuta.get(candidato.path)
      if (!referencia) {
        // Huérfano: ningún registro lo apunta. No se toca — para eso está
        // borrar-archivos-huerfanos.mjs, que pide confirmación explícita.
        console.log(`${prefijo}: sin fila en la base, se salta (huérfano).`)
        saltadas++
        continue
      }

      const { data: archivo, error: errorDescarga } = await supabase.storage.from(BUCKET).download(candidato.path)
      if (errorDescarga) throw errorDescarga

      const original = Buffer.from(await archivo.arrayBuffer())
      const comprimido = await aWebp(original, candidato.path)

      if (comprimido.length >= original.length) {
        console.log(`${prefijo}: recomprimir no la achica, se deja como está.`)
        saltadas++
        continue
      }

      const nuevaRuta = candidato.path.replace(/\.\w+$/, '.webp')
      const mismaRuta = nuevaRuta === candidato.path

      const { error: errorSubida } = await supabase.storage
        .from(BUCKET)
        .upload(nuevaRuta, comprimido, { contentType: 'image/webp', upsert: mismaRuta })
      if (errorSubida) throw errorSubida

      // Orden deliberado: subir, después apuntar la base al archivo nuevo, y
      // recién al final borrar el viejo. Si se corta en el medio queda un
      // huérfano (limpiable), nunca una foto perdida.
      if (!mismaRuta) {
        const { error: errorUpdate } = await supabase
          .from(referencia.tabla)
          .update({ storage_path: nuevaRuta })
          .eq('id', referencia.id)
        if (errorUpdate) throw errorUpdate

        await supabase.storage.from(BUCKET).remove([candidato.path])
      }

      bytesAntes += original.length
      bytesDespues += comprimido.length
      ok++
      console.log(`${prefijo}: ${mb(original.length)} MB -> ${mb(comprimido.length)} MB`)
    } catch (err) {
      fallidas++
      console.error(`${prefijo}: FALLÓ — ${err.message ?? err}`)
    }
  }

  console.log(`\nListo: ${ok} recomprimidas, ${saltadas} saltadas, ${fallidas} fallidas.`)
  console.log(`Storage recuperado: ${mb(bytesAntes - bytesDespues)} MB (${mb(bytesAntes)} MB -> ${mb(bytesDespues)} MB).`)
  if (fallidas > 0) console.log('Las fallidas quedaron intactas — volvé a correr el script para reintentarlas.')
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
