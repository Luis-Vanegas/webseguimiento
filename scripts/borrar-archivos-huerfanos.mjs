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

async function main() {
  // storage.objects no es una tabla propia del schema public — se consulta
  // por RPC/SQL crudo no hace falta acá: alcanza con listar el bucket y
  // comparar contra fotos_visita, que sí es una tabla normal.
  const { data: archivos, error: errorList } = await supabase.storage.from(BUCKET).list(undefined, {
    limit: 1000,
    search: '',
  })
  if (errorList) throw errorList

  // list() en la raíz solo trae carpetas (una por visita); hay que bajar un
  // nivel a cada una para listar los archivos reales.
  const carpetas = (archivos ?? []).filter((a) => a.id === null) // las carpetas no tienen id
  const rutasCompletas = []
  for (const carpeta of carpetas) {
    const { data: hijos, error: errorHijos } = await supabase.storage.from(BUCKET).list(carpeta.name, { limit: 1000 })
    if (errorHijos) throw errorHijos
    for (const hijo of hijos ?? []) {
      rutasCompletas.push({ path: `${carpeta.name}/${hijo.name}`, size: hijo.metadata?.size ?? 0 })
    }
  }

  const { data: fotosEnBase, error: errorFotos } = await supabase.from('fotos_visita').select('storage_path')
  if (errorFotos) throw errorFotos
  const rutasEnUso = new Set((fotosEnBase ?? []).map((f) => f.storage_path))

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
