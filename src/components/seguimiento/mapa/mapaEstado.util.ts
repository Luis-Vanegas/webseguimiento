import { COLOR_PROXIMA_ENTREGA } from '../../../theme/theme'
import { DIAS_PROXIMA_ENTREGA } from '../../../utils/seguimiento/fechas.util'
import type { ObraVisor } from '../../../types/obra.types'

export const COLOR_COMUNA = '#f97316'
export const COLOR_DESATENDIDA = '#9ca3af'

// El color del punto marca si ALGUIEN ya subió una visita para esa obra
// (ultimaVisitaPorObra la trae del backend, así que "visitada" es "tiene
// entrada en ese mapa"), no el % de avance oficial — eso sigue disponible
// por etapa en el popup, pero dejó de pintar el mapa para bajar la cantidad
// de colores simultáneos.
export function infoObra(obra: ObraVisor, ultimaVisitaPorObra: Map<number, string>) {
  if (obra.entregada) return { color: '#3b82f6', etiqueta: 'Entregada' }
  if (ultimaVisitaPorObra.has(obra.obraId)) return { color: '#22c55e', etiqueta: 'Visitada' }
  return { color: '#ef4444', etiqueta: 'Sin visitar' }
}

export const LEYENDA: { color: string; label: string; border?: boolean }[] = [
  { color: '#3b82f6', label: 'Entregada' },
  { color: '#22c55e', label: 'Visitada' },
  { color: '#ef4444', label: 'Sin visitar' },
  { color: '#fff', label: 'Sin visitar hace más de 30 días', border: true },
  { color: COLOR_PROXIMA_ENTREGA, label: `Próxima a entregar (≤${DIAS_PROXIMA_ENTREGA} días)` },
]
