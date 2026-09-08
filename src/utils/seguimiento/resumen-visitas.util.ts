// Contadores del encabezado de gerencia. Separado de GestionVisitas porque
// la cobertura es un porcentaje calculado y conviene poder probarlo sin
// montar la página entera.
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

export interface ResumenVisitas {
  total: number
  revisadas: number
  sinRevisar: number
  conAlertas: number
  cobertura: number
}

export function resumirVisitas(visitas: VisitaSeguimiento[]): ResumenVisitas {
  const total = visitas.length
  const revisadas = visitas.filter((v) => v.vistoGerencia).length
  const conAlertas = visitas.filter((v) => (v.alertas?.length ?? 0) > 0).length
  return {
    total,
    revisadas,
    sinRevisar: total - revisadas,
    conAlertas,
    // Sin visitas la cobertura es 0, no NaN: el 0/0 llegaba hasta el KPI.
    cobertura: total === 0 ? 0 : Math.round((revisadas / total) * 100),
  }
}
