import type { ObraVisor } from '../../types/obra.types'

export interface FiltrosMapaObra {
  fechaDesde: string
  fechaHasta: string
  entregaDesde: string
  entregaHasta: string
  comunaFiltro: string | null
  proyectoFiltro: string | null
  dependenciaFiltro: string | null
}

export const FILTROS_MAPA_VACIOS: FiltrosMapaObra = {
  fechaDesde: '',
  fechaHasta: '',
  entregaDesde: '',
  entregaHasta: '',
  comunaFiltro: null,
  proyectoFiltro: null,
  dependenciaFiltro: null,
}

export type DimensionCategorica = 'comuna' | 'proyecto' | 'dependencia'

const CAMPO_POR_DIMENSION: Record<DimensionCategorica, keyof ObraVisor> = {
  comuna: 'comuna',
  proyecto: 'proyectoEstrategico',
  dependencia: 'dependencia',
}

// Aplica todos los filtros salvo, opcionalmente, una dimensión categórica —
// así la misma función arma tanto `obrasFiltradas` (sin omitir nada) como
// las opciones de cada <select> (omitiendo su propia dimensión, para que
// elegir una comuna no oculte la comuna ya elegida, pero sí acote proyecto
// y dependencia a lo que existe ahí).
export function filtrarObras(
  obras: ObraVisor[],
  ultimaVisitaPorObra: Map<number, string>,
  filtros: FiltrosMapaObra,
  omitir?: DimensionCategorica,
): ObraVisor[] {
  let resultado = obras.filter((o) => o.latitud !== null && o.longitud !== null)

  if (filtros.fechaDesde || filtros.fechaHasta) {
    resultado = resultado.filter((o) => {
      const ultima = ultimaVisitaPorObra.get(o.obraId)
      if (!ultima) return false
      if (filtros.fechaDesde && ultima < filtros.fechaDesde) return false
      if (filtros.fechaHasta && ultima > filtros.fechaHasta) return false
      return true
    })
  }

  if (filtros.entregaDesde || filtros.entregaHasta) {
    resultado = resultado.filter((o) => {
      if (!o.fechaEstimadaEntrega) return false
      if (filtros.entregaDesde && o.fechaEstimadaEntrega < filtros.entregaDesde) return false
      if (filtros.entregaHasta && o.fechaEstimadaEntrega > filtros.entregaHasta) return false
      return true
    })
  }

  if (omitir !== 'comuna' && filtros.comunaFiltro) {
    resultado = resultado.filter((o) => o.comuna === filtros.comunaFiltro)
  }
  if (omitir !== 'proyecto' && filtros.proyectoFiltro) {
    resultado = resultado.filter((o) => o.proyectoEstrategico === filtros.proyectoFiltro)
  }
  if (omitir !== 'dependencia' && filtros.dependenciaFiltro) {
    resultado = resultado.filter((o) => o.dependencia === filtros.dependenciaFiltro)
  }

  return resultado
}

// Valores únicos y ordenados de una dimensión categórica, calculados sobre
// las obras que ya pasan las DEMÁS dimensiones (`filtrarObras` omitiendo
// justo esta) — así el <select> no ofrece opciones que darían cero
// resultados con los filtros ya elegidos ("no me muestre lo que no es").
export function opcionesDeDimension(
  obras: ObraVisor[],
  ultimaVisitaPorObra: Map<number, string>,
  filtros: FiltrosMapaObra,
  dimension: DimensionCategorica,
): string[] {
  const campo = CAMPO_POR_DIMENSION[dimension]
  const obrasAcotadas = filtrarObras(obras, ultimaVisitaPorObra, filtros, dimension)
  return [...new Set(obrasAcotadas.map((o) => o[campo] as string | null).filter((v): v is string => !!v))].sort()
}
