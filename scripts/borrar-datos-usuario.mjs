// Borra TODAS las visitas de un autor (y en cascada sus alertas, fotos y
// entradas de historial_revision — la base ya tiene "on delete cascade"
// para esas tres tablas), más los archivos reales en el bucket
// "fotos-seguimiento" que esas fotos referenciaban.
//
// Pensado para limpiar datos de prueba de un usuario puntual sin tocar los
// de otros — nunca borra por rol ni "todo", siempre por un autor exacto.
//
// SEGURIDAD: siempre muestra antes qué se va a borrar (visitas, alertas,
// fotos) y pide escribir la palabra BORRAR a mano para continuar. No hay
// forma de saltear esa confirmación. Al terminar, deja un registro en
// scripts/logs/eliminaciones-historial.jsonl con qué se borró y cuándo —
// es el único histórico que queda, porque la fila original ya no existe.
//
// Uso:
//   SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/borrar-datos-usuario.mjs --autor="Luis"
//   (también acepta --autor-id=<uuid> si preferís apuntar por id exacto)
//
// La service role key vive en el dashboard de Supabase: Settings > API >
// service_role (secret). NUNCA la pongas en el frontend ni la commitees.

import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { mkdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'fotos-seguimiento'

const argAutorNombre = process.argv.find((a) => a.startsWith('--autor='))?.split('=')[1]
const argAutorId = process.argv.find((a) => a.startsWith('--autor-id='))?.split('=')[1]

const DIR_SCRIPT = dirname(fileURLToPath(import.meta.url))
const ARCHIVO_HISTORICO = join(DIR_SCRIPT, 'logs', 'eliminaciones-historial.jsonl')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!argAutorNombre && !argAutorId) {
  console.error('Falta indicar a quién borrar: --autor="Nombre" o --autor-id=<uuid>.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function resolverAutor() {
  if (argAutorId) {
    const { data, error } = await supabase
      .from('usuarios_seguimiento')
      .select('id, nombre, rol')
      .eq('id', argAutorId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error(`No existe ningún usuario con id ${argAutorId}.`)
    return data
  }

  const { data, error } = await supabase
    .from('usuarios_seguimiento')
    .select('id, nombre, rol')
    .ilike('nombre', `%${argAutorNombre}%`)
  if (error) throw error
  if (data.length === 0) throw new Error(`No hay ningún usuario cuyo nombre contenga "${argAutorNombre}".`)
  if (data.length > 1) {
    const nombres = data.map((u) => `${u.nombre} (${u.id})`).join('\n  - ')
    throw new Error(`"${argAutorNombre}" coincide con más de un usuario, sé más específico:\n  - ${nombres}`)
  }
  return data[0]
}

async function main() {
  const autor = await resolverAutor()
  console.log(`Autor objetivo: ${autor.nombre} (${autor.rol}) — id ${autor.id}\n`)

  const { data: visitas, error: errorVisitas } = await supabase
    .from('visitas_seguimiento')
    .select('id, obra_id, fecha_visita, estado, porcentaje_avance_campo')
    .eq('autor_id', autor.id)
    .order('fecha_visita', { ascending: false })
  if (errorVisitas) throw errorVisitas

  if (visitas.length === 0) {
    console.log('No tiene ninguna visita registrada — nada para borrar.')
    return
  }

  const idsVisita = visitas.map((v) => v.id)

  const { data: fotos, error: errorFotos } = await supabase
    .from('fotos_visita')
    .select('id, storage_path, visita_id')
    .in('visita_id', idsVisita)
  if (errorFotos) throw errorFotos

  const { count: cantidadAlertas, error: errorAlertas } = await supabase
    .from('alertas_visita')
    .select('id', { count: 'exact', head: true })
    .in('visita_id', idsVisita)
  if (errorAlertas) throw errorAlertas

  console.log(`Se van a borrar (en cascada):`)
  console.log(`  ${visitas.length} visitas:`)
  visitas.forEach((v) => {
    console.log(`    - obra ${v.obra_id} · ${v.fecha_visita} · ${v.estado} · avance ${v.porcentaje_avance_campo}%`)
  })
  console.log(`  ${cantidadAlertas ?? 0} alertas de campo`)
  console.log(`  ${fotos.length} fotos (fila en la base + archivo real en el bucket "${BUCKET}"):`)
  fotos.forEach((f) => console.log(`    - ${f.storage_path}`))
  console.log('  todas las entradas de historial_revision asociadas a esas visitas')
  console.log('\nEsto es IRREVERSIBLE. No hay papelera ni backup automático.\n')

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const respuesta = await rl.question('Escribí BORRAR (en mayúsculas) para confirmar, cualquier otra cosa cancela: ')
  rl.close()

  if (respuesta !== 'BORRAR') {
    console.log('Cancelado — no se borró nada.')
    return
  }

  // Primero el storage (si falla acá, las filas de la base quedan intactas
  // y se puede reintentar); recién con los archivos afuera se borran las
  // visitas, que arrastran en cascada alertas/fotos/historial.
  if (fotos.length > 0) {
    const rutas = fotos.map((f) => f.storage_path)
    const { error: errorStorage } = await supabase.storage.from(BUCKET).remove(rutas)
    if (errorStorage) throw errorStorage
    console.log(`Borrados ${rutas.length} archivos del bucket.`)
  }

  const { error: errorDelete } = await supabase.from('visitas_seguimiento').delete().in('id', idsVisita)
  if (errorDelete) throw errorDelete
  console.log(`Borradas ${visitas.length} visitas (con sus alertas e historial en cascada).`)

  mkdirSync(dirname(ARCHIVO_HISTORICO), { recursive: true })
  appendFileSync(
    ARCHIVO_HISTORICO,
    JSON.stringify({
      fecha: new Date().toISOString(),
      autor: { id: autor.id, nombre: autor.nombre, rol: autor.rol },
      visitasBorradas: visitas.map((v) => ({ id: v.id, obraId: v.obra_id, fechaVisita: v.fecha_visita })),
      cantidadAlertas: cantidadAlertas ?? 0,
      fotosBorradas: fotos.map((f) => f.storage_path),
    }) + '\n',
  )
  console.log(`\nRegistro guardado en ${ARCHIVO_HISTORICO}.`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
