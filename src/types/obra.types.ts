// Shape de la obra oficial, tal como la entrega la Edge Function obras-proxy
// (que a su vez consulta la API real del Visor Estratégico). Referencia de
// forma tomada de ValidacionesAlcaldia — ajustar cuando se confirme el JSON
// exacto de la API real (ver Decisión 3 del plan).
export interface ObraVisor {
  obraId: number
  nombre: string
  dependencia: string | null
  comuna: string | null
  barrio: string | null
  direccion: string | null
  latitud: number | null
  longitud: number | null
  presupuestoOficial: number
  porcentajeAvanceOficial: number
  proyectoEstrategico: string | null // aproximado con tipo_intervencion, no existe campo exacto en la API real
  entregada: boolean
  estado: string | null
  descripcion: string | null
  fechaRealEntrega: string | null
  fechaEstimadaEntrega: string | null
  etapas: EtapaObra[]
}

// Una de las 11 fases del ciclo de vida de la obra (Planeación, Diseños,
// Ejecución obra, etc. — ver ETAPAS_OBRA en obrasVisorApi.ts). `noAplica`
// sale tal cual de la API: la obra puede saltarse una fase entera.
export interface EtapaObra {
  nombre: string
  porcentaje: number
  noAplica: boolean
}
