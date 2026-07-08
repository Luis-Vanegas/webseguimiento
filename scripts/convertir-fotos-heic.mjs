// Migración de un solo uso: convierte las fotos .heic/.heif que ya están
// guardadas en el bucket "fotos-seguimiento" a JPEG real, actualiza
// fotos_visita.storage_path, y borra el original. Después de correrlo, esas
// fotos se ven instantáneas para cualquiera — no hace falta reconvertirlas
// cada vez que alguien abre la visita (ver FotoVisitaImg.tsx).
//
// Uso:
//   SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/convertir-fotos-heic.mjs --dry-run
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/convertir-fotos-heic.mjs
//
// La service role key vive en el dashboard de Supabase: Settings > API >
// service_role (secret). NUNCA la pongas en el frontend ni la commitees.
// Corré primero con --dry-run para ver qué se convertiría, sin tocar nada.

import { createClient } from '@supabase/supabase-js'
import convert from 'heic-convert'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.argv.includes('--dry-run')
const BUCKET = 'fotos-seguimiento'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function esHeic(ruta) {
  return /\.hei[cf]$/i.test(ruta)
}

async function main() {
  const { data: fotos, error } = await supabase.from('fotos_visita').select('id, storage_path')
  if (error) throw error

  const fotosHeic = (fotos ?? []).filter((f) => esHeic(f.storage_path))
  console.log(`Encontradas ${fotosHeic.length} fotos en formato HEIC/HEIF.`)

  if (DRY_RUN) {
    fotosHeic.forEach((f) => console.log(`  [dry-run] ${f.storage_path}`))
    return
  }

  let ok = 0
  let fallidas = 0

  for (const foto of fotosHeic) {
    const nuevaRuta = foto.storage_path.replace(/\.hei[cf]$/i, '.jpg')
    try {
      const { data: archivo, error: errorDescarga } = await supabase.storage
        .from(BUCKET)
        .download(foto.storage_path)
      if (errorDescarga) throw errorDescarga

      const bufferOriginal = Buffer.from(await archivo.arrayBuffer())
      const bufferJpeg = Buffer.from(await convert({ buffer: bufferOriginal, format: 'JPEG', quality: 0.9 }))

      const { error: errorSubida } = await supabase.storage
        .from(BUCKET)
        .upload(nuevaRuta, bufferJpeg, { contentType: 'image/jpeg', upsert: false })
      if (errorSubida) throw errorSubida

      // Recién acá, con el nuevo archivo YA subido, se actualiza la fila y
      // se borra el original — si algo falla antes, el .heic original queda
      // intacto y no se pierde nada.
      const { error: errorUpdate } = await supabase
        .from('fotos_visita')
        .update({ storage_path: nuevaRuta })
        .eq('id', foto.id)
      if (errorUpdate) throw errorUpdate

      await supabase.storage.from(BUCKET).remove([foto.storage_path])

      ok++
      console.log(`OK: ${foto.storage_path} -> ${nuevaRuta}`)
    } catch (err) {
      fallidas++
      console.error(`FALLÓ: ${foto.storage_path} — ${err.message ?? err}`)
    }
  }

  console.log(`\nListo: ${ok} convertidas, ${fallidas} fallidas de ${fotosHeic.length}.`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
