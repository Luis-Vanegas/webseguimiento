import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// De un conjunto de visitas, cuáles tienen una próxima-visita agendada que
// TODAVÍA está pendiente.
//
// Una próxima-visita se considera cumplida en cuanto existe una visita
// posterior a esa obra — la haya hecho quien la haya hecho. Por eso la
// comparación es contra `ultimaVisitaPorObra` (última visita por obra de
// TODO el equipo) y no contra la propia lista `visitas`: en "Mis visitas"
// esa lista trae solo las del usuario actual, así que cuando el que
// revisita es otra persona (un visitador registra la primera, el ingeniero
// vuelve después) ninguna de las dos listas contiene ambas visitas y
// compararlas entre sí deja la vieja marcada como "vencida" para siempre.
//
// No borra ni modifica nada: el historial completo se sigue viendo en el
// listado de visitas y en la línea de tiempo.
export function visitasConProximaPendiente(
  visitas: VisitaSeguimiento[],
  ultimaVisitaPorObra: Map<number, string>,
): VisitaSeguimiento[] {
  return visitas.filter((v) => {
    if (!v.fechaProximaVisita) return false
    const ultima = ultimaVisitaPorObra.get(v.obraId)
    // `>=` y no `>`: si la última visita de la obra es esta misma (o cayó el
    // mismo día), la próxima-visita agendada acá sigue vigente.
    return !ultima || v.fechaVisita >= ultima
  })
}
