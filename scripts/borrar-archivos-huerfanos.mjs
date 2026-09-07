// Limpia archivos del bucket "fotos-seguimiento" que ya no tienen ninguna
// fila en fotos_visita que los referencie — huérfanos típicos de borrar
// visitas con un DELETE directo en el SQL Editor en vez de con
// borrar-datos-usuario.mjs (ese script sí borra el archivo real antes de
// borrar la fila; un DELETE a mano en la base nunca toca Storage).
//
// SEGURIDAD: mismo patrón que borrar-datos-usuario.mjs — muestra la lista
// completa antes de tocar nada, pide escribir BORRAR a mano, y deja
// registro en scripts/logs/eliminaciones-historial.jsonl.
//
// Uso:
//   SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/borrar-archivos-huerfanos.mjs

import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { mkdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'fotos-seguimiento'

const DIR_SCRIPT = dirname(fileURLToPath(import.meta.url))
const ARCHIVO_HISTORICO = join(DIR_SCRIPT, 'logs', 'eliminaciones-historial.jsonl')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// El bucket tiene dos profundidades distintas: las fotos de visita cuelgan de
// "{visitaId}/foto.webp" y las de recorrido de "recorridos/{recorridoId}/foto.webp".
// Por eso se recorre recursivo en vez de bajar un solo nivel: con un solo
// nivel, las fotos de recorrido nunca se listaban (y "recorridos/{id}" se
// contaba como si fuera un archivo huérfano, que no lo es).
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

async function main() {
  // storage.objects no es una tabla propia del schema public — no hace falta
  // SQL crudo acá: alcanza con listar el bucket y comparar contra
  // fotos_visita y fotos_recorrido, que sí son tablas normales.
  const rutasCompletas = await listarArchivos()

  const { data: fotosVisita, error: errorFotos } = await supabase.from('fotos_visita').select('storage_path')
  if (errorFotos) throw errorFotos
  const { data: fotosRecorrido, error: errorRecorrido } = await supabase
    .from('fotos_recorrido')
    .select('storage_path')
  if (errorRecorrido) throw errorRecorrido

  const rutasEnUso = new Set([...(fotosVisita ?? []), ...(fotosRecorrido ?? [])].map((f) => f.storage_path))

  const huerfanos = rutasCompletas.filter((r) => !rutasEnUso.has(r.path))

  if (huerfanos.length === 0) {
    console.log('No hay archivos huérfanos — Storage está sincronizado con la base.')
    return
  }

  const tamanoTotalMb = (huerfanos.reduce((acc, h) => acc + h.size, 0) / 1024 / 1024).toFixed(1)
  console.log(`Encontrados ${huerfanos.length} archivos huérfanos (${tamanoTotalMb} MB) sin ninguna fila en fotos_visita:`)
  huerfanos.forEach((h) => console.log(`  - ${h.path}`))
  console.log('\nEsto es IRREVERSIBLE. No hay papelera ni backup automático.\n')

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const respuesta = await rl.question('Escribí BORRAR (en mayúsculas) para confirmar, cualquier otra cosa cancela: ')
  rl.close()

  if (respuesta !== 'BORRAR') {
    console.log('Cancelado — no se borró nada.')
    return
  }

  const { error: errorRemove } = await supabase.storage.from(BUCKET).remove(huerfanos.map((h) => h.path))
  if (errorRemove) throw errorRemove
  console.log(`Borrados ${huerfanos.length} archivos huérfanos.`)

  mkdirSync(dirname(ARCHIVO_HISTORICO), { recursive: true })
  appendFileSync(
    ARCHIVO_HISTORICO,
    JSON.stringify({
      fecha: new Date().toISOString(),
      accion: 'limpieza_huerfanos_storage',
      archivosBorrados: huerfanos.map((h) => h.path),
    }) + '\n',
  )
  console.log(`\nRegistro guardado en ${ARCHIVO_HISTORICO}.`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
