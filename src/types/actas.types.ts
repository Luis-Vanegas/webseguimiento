export const ESTADOS_COMPROMISO = ['Pendiente', 'En progreso', 'Crítica', 'Completada'] as const
export type EstadoCompromiso = (typeof ESTADOS_COMPROMISO)[number]

export interface Acta {
  id: string
  origen: string
  /** ISO date (yyyy-mm-dd) */
  fecha: string
  asistentes: string | null
  notas: string | null
}

export interface Compromiso {
  id: string
  actaId: string
  actividad: string
  responsable: string | null
  /** ISO date (yyyy-mm-dd) or null when the meeting did not set one */
  fechaVencimiento: string | null
  estado: EstadoCompromiso
  criterioFecha: string | null
}

export type ActaNueva = Omit<Acta, 'id'>
export type CompromisoNuevo = Omit<Compromiso, 'id'>
