// Crea un usuario nuevo del módulo de seguimiento: cuenta de auth (email +
// contraseña) más su fila en usuarios_seguimiento (nombre, rol). Las dos
// cosas son necesarias — usuarios_seguimiento.id referencia a auth.users(id)
// (ver supabase/migrations), así que un usuario sin cuenta de auth no puede
// loguearse, y una cuenta de auth sin fila en usuarios_seguimiento no tiene
// rol ni aparece en ningún selector de la app.
//
// SEGURIDAD: muestra los datos antes de crear nada y pide confirmación.
// Deja registro en scripts/logs/eliminaciones-historial.jsonl (mismo archivo
// histórico que usan los scripts de borrado, para tener todo en un solo lugar).
//
// Uso:
//   SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx \
//     node scripts/crear-usuario.mjs --email=daniel.calvache@medellin.gov.co --password=123456 --nombre="Daniel Calvache" --rol=ingeniero

import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { mkdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const argEmail = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1]
const argPassword = process.argv.find((a) => a.startsWith('--password='))?.split('=')[1]
const argNombre = process.argv.find((a) => a.startsWith('--nombre='))?.split('=')[1]
const argRol = process.argv.find((a) => a.startsWith('--rol='))?.split('=')[1] ?? 'ingeniero'

const DIR_SCRIPT = dirname(fileURLToPath(import.meta.url))
const ARCHIVO_HISTORICO = join(DIR_SCRIPT, 'logs', 'eliminaciones-historial.jsonl')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!argEmail || !argPassword || !argNombre) {
  console.error('Falta algún dato: --email=, --password= y --nombre= son obligatorios.')
  process.exit(1)
}

if (!['ingeniero', 'visitador', 'visualizador'].includes(argRol)) {
  console.error(`--rol debe ser "ingeniero", "visitador" o "visualizador", llegó "${argRol}".`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  console.log('Se va a crear:')
  console.log(`  Email: ${argEmail}`)
  console.log(`  Nombre: ${argNombre}`)
  console.log(`  Rol: ${argRol}`)
  console.log('  (la contraseña no se muestra acá)\n')

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const respuesta = await rl.question('Escribí SI para confirmar, cualquier otra cosa cancela: ')
  rl.close()

  if (respuesta !== 'SI') {
    console.log('Cancelado — no se creó nada.')
    return
  }

  const { data: authData, error: errorAuth } = await supabase.auth.admin.createUser({
    email: argEmail,
    password: argPassword,
    email_confirm: true,
  })
  if (errorAuth) throw errorAuth

  const { error: errorFila } = await supabase.from('usuarios_seguimiento').insert({
    id: authData.user.id,
    nombre: argNombre,
    rol: argRol,
    activo: true,
  })
  if (errorFila) throw errorFila

  console.log(`\nUsuario creado: ${argNombre} (${argRol}) — ${argEmail}`)

  mkdirSync(dirname(ARCHIVO_HISTORICO), { recursive: true })
  appendFileSync(
    ARCHIVO_HISTORICO,
    JSON.stringify({
      fecha: new Date().toISOString(),
      accion: 'crear_usuario',
      usuario: { id: authData.user.id, nombre: argNombre, rol: argRol, email: argEmail },
    }) + '\n',
  )
  console.log(`Registro guardado en ${ARCHIVO_HISTORICO}.`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
