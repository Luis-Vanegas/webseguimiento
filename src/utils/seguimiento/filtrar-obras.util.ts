import type { ObraVisor } from '../../types/obra.types'

export interface FiltrosMapaObra {
  fechaDesde: string
  fechaHasta: string
  entregaDesde: string
  entregaHasta: string
  comunaFiltro: string | null
  proyectoFiltro: string | null
  subproyectoFiltro: string | null
  dependenciaFiltro: string | null
  soloPorVisitar: boolean
}

export const FILTROS_MAPA_VACIOS: FiltrosMapaObra = {
  fechaDesde: '',
  fechaHasta: '',
  entregaDesde: '',
  entregaHasta: '',
  comunaFiltro: null,
  proyectoFiltro: null,
  subproyectoFiltro: null,
  dependenciaFiltro: null,
  soloPorVisitar: false,
}

// Agenda de visitas priorizadas: 18 obras concretas del Visor.
//
// Se filtra por obraId y NO por nombre a propósito. La lista original llegó
// como texto de una planilla y NINGUNO de los 17 nombres coincidía con el
// Visor: ahí "Recreo Museo del Reguetón" figura como "Recreo Cultural Museo
// del Reggaeton (Francisco Antonio Zea)" (doble g, ortografía inglesa) y los
// items sueltos ("Alpes", "Pastora") son en realidad "Recreo Los Alpes" y
// "Recreo La Pastora". Ninguna normalización de texto cubre eso; el id sí.
//
// El comentario de cada línea es el nombre en la planilla del usuario, para
// poder auditar la lista sin volver a consultar la API.
// Verificado contra obras-proxy con scripts/diff-subproyectos-por-visitar.mjs.
export const OBRAS_POR_VISITAR = new Set([
  560, // Buen Comienzo – Popular      -> JIBC Popular
  515, // Buen Comienzo – Santa Eufrasia -> JIBC Santa Eufrasia
  1492, // I.E. La Libertad            -> Sección Escuela La Libertad
  1493, // I.E. Rodrigo Lara           -> Sección Escuela Rodrigo Lara Bonilla
  1499, // I.E. Niño Jesús de Praga    -> Sección Escuela Niño Jesús de Praga
  1494, // S.E. El Tirol               -> Sección Escuela El Tirol
  1258, // I.E. Bello Oriente          -> Institución Educativa Bello Oriente
  2275, // Recreo Cultural Ciudad del Río -> Recreo Cultural Ciudad del Rio
  2274, // Recreo Cultural Guayabal    -> ReCreo Cultural Guayabal
  2273, // Recreo Cultural Jordán      -> ReCreo Cultural El Jordán
  2276, // Recreo Museo del Reguetón   -> Recreo Cultural Museo del Reggaeton
  1560, // Recreo Deportivo Frontera   -> Recreo La Frontera
  900, // Alpes                        -> Recreo Los Alpes
  1561, // Pastora                     -> Recreo La Pastora
  2255, // Trinidad                    -> Recreo Trinidad
  2568, // San Cristóbal               -> Recreo San Cristobal

  // Los dos ReCreos Deportivos que la planilla no nombraba. Se suman por
  // decisión del usuario para cubrir los 7 del subproyecto completo: la
  // planilla listaba 5 de 7 y, en cambio, traía un item "Popular" que no
  // existe en el Visor (no hay ningún Recreo ni UVA en la comuna Popular;
  // la única obra que encajaba era JIBC Popular, ya incluida arriba en 560).
  901, // Recreo Brisas de Robledo
  902, // Recreo Altavista
])

export type DimensionCategorica = 'comuna' | 'proyecto' | 'subproyecto' | 'dependencia'

const CAMPO_POR_DIMENSION: Record<DimensionCategorica, keyof ObraVisor> = {
  comuna: 'comuna',
  proyecto: 'proyectoEstrategico',
  subproyecto: 'subproyectoEstrategico',
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

  // No es una dimensión categórica: es un recorte fijo sobre la agenda de
  // visitas, así que se aplica siempre (nunca se omite) y además acota las
  // opciones de los cuatro <select> a lo que exista dentro de esas obras.
  if (filtros.soloPorVisitar) {
    resultado = resultado.filter((o) => OBRAS_POR_VISITAR.has(o.obraId))
  }

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
  if (omitir !== 'subproyecto' && filtros.subproyectoFiltro) {
    resultado = resultado.filter((o) => o.subproyectoEstrategico === filtros.subproyectoFiltro)
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
