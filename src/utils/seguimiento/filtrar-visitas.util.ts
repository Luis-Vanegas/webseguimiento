import type { FiltrosVisitas } from '../../types/filtros.types'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// Función pura, reutilizada por MisVisitas, RevisarVisitas e HistorialObra
// (mismo criterio de filtrado en las tres pantallas, sección 9 del brief).
export function filtrarVisitas(
  visitas: VisitaSeguimiento[],
  filtros: FiltrosVisitas,
  proyectoEstrategicoPorObra: Map<number, string | null>,
): VisitaSeguimiento[] {
  return visitas.filter((visita) => {
    if (filtros.fechaDesde && visita.fechaVisita < filtros.fechaDesde) return false
    if (filtros.fechaHasta && visita.fechaVisita > filtros.fechaHasta) return false

    if (filtros.proyectoEstrategico) {
      const proyecto = proyectoEstrategicoPorObra.get(visita.obraId)
      if (proyecto !== filtros.proyectoEstrategico) return false
    }

    if (filtros.tipoAlertaId) {
      const tieneAlerta = (visita.alertas ?? []).some((a) => a.tipoAlertaId === filtros.tipoAlertaId)
      if (!tieneAlerta) return false
    }

    if (filtros.avanceMin && visita.porcentajeAvanceCampo < Number(filtros.avanceMin)) return false
    if (filtros.avanceMax && visita.porcentajeAvanceCampo > Number(filtros.avanceMax)) return false

    if (filtros.autorId && visita.autorId !== filtros.autorId) return false
    if (filtros.estado && visita.estado !== filtros.estado) return false

    // filtros.hito: sin campo de origen todavía (ver comentario en filtros.types.ts) — no filtra.

    return true
  })
}
