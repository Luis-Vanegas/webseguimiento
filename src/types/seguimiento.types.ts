// Tipos del dominio de seguimiento en campo (tablas temporales de Supabase,
// ver supabase/schema.sql — reemplazar cuando exista backend definitivo).

export type RolUsuario = 'ingeniero' | 'visitador'

export type EstadoVisita = 'pendiente_revisar' | 'en_revision' | 'revisada'

export type SeveridadAlerta = 'baja' | 'media' | 'alta'

export type AccionHistorial = 'creada' | 'en_revision' | 'editada' | 'revisada'

export interface UsuarioSeguimiento {
  id: string
  nombre: string
  rol: RolUsuario
  activo: boolean
}

export interface PuntoReferenciaObra {
  id: string
  obraId: number
  nombre: string
}

export interface TipoAlerta {
  id: string
  nombre: string
}

export interface AlertaVisita {
  id: string
  visitaId: string
  tipoAlertaId: string
  detalle: string | null
  severidad: SeveridadAlerta
}

export interface FotoVisita {
  id: string
  visitaId: string
  puntoReferenciaId: string | null
  storagePath: string
  orden: number
}

export interface HistorialRevision {
  id: string
  visitaId: string
  accion: AccionHistorial
  usuarioId: string
  comentario: string | null
  fecha: string
}

export interface VisitaSeguimiento {
  id: string
  obraId: number
  autorId: string
  autorRol: RolUsuario
  fechaVisita: string
  fechaProximaVisita: string | null
  porcentajeAvanceCampo: number
  observaciones: string
  estado: EstadoVisita
  revisadoPor: string | null
  fechaRevision: string | null
  createdAt: string
  updatedAt: string
  alertas?: AlertaVisita[]
  fotos?: FotoVisita[]
}
