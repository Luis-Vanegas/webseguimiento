// Detecta visitas cuya fecha_visita pudo quedar corrida un día por el bug
// de RegistrarVisita.tsx (arreglado en este mismo cambio): el formulario
// precargaba la fecha con `new Date().toISOString().slice(0,10)`, que da
// el día en UTC. En Colombia (UTC-5) eso ya es el día siguiente entre las
// 7pm y la medianoche hora local — si el usuario no corregía el campo a
// mano, la visita quedaba guardada con la fecha de mañana en vez de hoy.
//
// Heurística: para cada visita, compara su fecha_visita contra el día
// calendario (UTC) y el día calendario (Bogotá) de su created_at. Si
// fecha_visita coincide con el día UTC pero NO con el día real en Bogotá,
// es candidata a estar afectada — probablemente se guardó sin tocar el
// valor precargado por el formulario.
//
// Es un indicio, no una certeza: si alguien eligió a mano una fecha que
// coincide por casualidad con el día UTC de creación, puede salir como
// falso positivo. Solo lee, no modifica nada.
//
// Uso:
//   SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/auditar-visitas-huso-horario.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const formatoBogota = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function claveEnBogota(fechaISO) {
  return formatoBogota.format(new Date(fechaISO))
}

function claveEnUTC(fechaISO) {
  return fechaISO.slice(0, 10)
}

async function main() {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .select('id, obra_id, autor_id, fecha_visita, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error

  const sospechosas = (data ?? [])
    .map((v) => ({ ...v, bogota: claveEnBogota(v.created_at), utc: claveEnUTC(v.created_at) }))
    .filter((v) => v.fecha_visita === v.utc && v.utc !== v.bogota)

  console.log(`Total de visitas en la base: ${data?.length ?? 0}`)

  if (sospechosas.length === 0) {
    console.log('No se encontraron visitas con indicios del bug de huso horario.')
    return
  }

  console.log(`\n${sospechosas.length} visita(s) probablemente afectada(s) (fecha guardada = día UTC de creación, no el día real en Bogotá):\n`)
  sospechosas.forEach((v) => {
    console.log(
      `  - id ${v.id} · obra ${v.obra_id} · autor ${v.autor_id} · guardada como ${v.fecha_visita} · probablemente debería ser ${v.bogota} · creada ${v.created_at}`,
    )
  })
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
