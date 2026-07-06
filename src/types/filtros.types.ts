export interface FiltrosVisitas {
  fechaDesde: string
  fechaHasta: string
  proyectoEstrategico: string
  tipoAlertaId: string
  hito: string
  avanceMin: string
  avanceMax: string
}

export const FILTROS_VACIOS: FiltrosVisitas = {
  fechaDesde: '',
  fechaHasta: '',
  proyectoEstrategico: '',
  tipoAlertaId: '',
  hito: '',
  avanceMin: '',
  avanceMax: '',
}

// Catálogo simplificado/hardcodeado de hitos (supuesto 10.3 del brief): no
// hay acceso todavía al catálogo real de Proyectos Estratégicos e Hitos, y
// las visitas ni la API real de obras exponen un campo "hito". Reemplazar
// por el catálogo real cuando exista — mientras tanto el filtro queda en la
// UI pero no descarta ninguna visita.
export const HITOS_SIMPLIFICADOS = ['Planeación', 'Diseños', 'Ejecución', 'Liquidación']
