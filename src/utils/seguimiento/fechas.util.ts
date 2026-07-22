// Utilidades de fecha compartidas por el mapa, el módulo de próximas
// visitas y el calendario. Centralizadas acá porque MapaSeguimiento.tsx
// tenía su propia lógica de "días de diferencia" duplicable en más lugares.

export const DIAS_PROXIMA_ENTREGA = 15
export const DIAS_DESATENDIDA = 30

// Normaliza un texto de fecha a clave YYYY-MM-DD en huso horario LOCAL.
// `new Date('YYYY-MM-DD')` lo interpreta como medianoche UTC, que en
// Colombia (UTC-5) cae en el día anterior al formatearlo — por eso, si el
// texto ya viene en ese formato, se usa tal cual sin pasar por Date.
export function claveDia(fechaTexto: string): string {
  const soloFecha = fechaTexto.match(/^\d{4}-\d{2}-\d{2}/)
  if (soloFecha) return soloFecha[0]
  return claveDeDate(new Date(fechaTexto))
}

// Fecha -> clave YYYY-MM-DD en huso horario LOCAL. `Date.toISOString()` no
// sirve para esto: devuelve la fecha en UTC, que en Colombia (UTC-5) ya cae
// en el día siguiente entre las 7pm y la medianoche local.
export function claveDeDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

// Días de diferencia entre hoy (medianoche local) y la fecha dada.
// Positivo si es a futuro, negativo si ya pasó.
export function diasHasta(fechaTexto: string): number {
  const [y, m, d] = claveDia(fechaTexto).split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const hoy = new Date()
  const hoyMedianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((fecha.getTime() - hoyMedianoche.getTime()) / 86_400_000)
}

export function estaProximaAEntregar(obra: {
  entregada: boolean
  fechaEstimadaEntrega: string | null
}): boolean {
  if (obra.entregada || !obra.fechaEstimadaEntrega) return false
  const dias = diasHasta(obra.fechaEstimadaEntrega)
  return dias >= 0 && dias <= DIAS_PROXIMA_ENTREGA
}

export function estaDesatendida(ultimaVisita: string | undefined): boolean {
  if (!ultimaVisita) return true
  return diasHasta(ultimaVisita) < -DIAS_DESATENDIDA
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// "2026-07-17" -> "17 de julio" — para vistas tipo línea de tiempo, donde
// la fecha ISO cruda es más difícil de leer de un vistazo que el mes en
// palabras.
export function formatearFechaCorta(fechaTexto: string): string {
  const [, mes, dia] = claveDia(fechaTexto).split('-')
  return `${Number(dia)} de ${MESES[Number(mes) - 1]}`
}
