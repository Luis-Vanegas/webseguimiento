// Tipos del dominio de seguimiento en campo (tablas temporales de Supabase,
// ver supabase/schema.sql — reemplazar cuando exista backend definitivo).

export type RolUsuario = 'ingeniero' | 'visitador' | 'visualizador'

export type EstadoVisita = 'pendiente_revisar' | 'en_revision' | 'revisada'

export type SeveridadAlerta = 'baja' | 'media' | 'alta'

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

export interface PuntoTrazo {
  lat: number
  lon: number
  ts: number
}

export interface FotoRecorrido {
  id: string
  recorridoId: string
  storagePath: string
  orden: number
}

export type TipoRecorrido = 'grabado' | 'planeado'

export interface RecorridoSeguimiento {
  id: string
  autorId: string
  titulo: string
  observaciones: string
  trazo: PuntoTrazo[]
  distanciaMetros: number
  fechaInicio: string
  fechaFin: string
  createdAt: string
  tipo: TipoRecorrido
  fotos?: FotoRecorrido[]
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
  vistoGerencia: boolean
  alertas?: AlertaVisita[]
  fotos?: FotoVisita[]
}
