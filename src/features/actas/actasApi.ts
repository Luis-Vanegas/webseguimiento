import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../types/database.types'
import type {
  Acta,
  ActaNueva,
  Compromiso,
  CompromisoNuevo,
  EstadoCompromiso,
} from '../../types/actas.types'

type FilaActa = Database['public']['Tables']['actas']['Row']
type FilaCompromiso = Database['public']['Tables']['compromisos']['Row']

const aActa = (f: FilaActa): Acta => ({
  id: f.id,
  origen: f.origen,
  fecha: f.fecha,
  asistentes: f.asistentes,
  notas: f.notas,
})

const aCompromiso = (f: FilaCompromiso): Compromiso => ({
  id: f.id,
  actaId: f.acta_id,
  actividad: f.actividad,
  responsable: f.responsable,
  fechaVencimiento: f.fecha_vencimiento,
  // The CHECK constraint guarantees one of the four states.
  estado: f.estado as EstadoCompromiso,
  criterioFecha: f.criterio_fecha,
})

const aFilaCompromiso = (c: Partial<CompromisoNuevo>) => ({
  acta_id: c.actaId,
  actividad: c.actividad,
  responsable: c.responsable,
  fecha_vencimiento: c.fechaVencimiento,
  estado: c.estado,
  criterio_fecha: c.criterioFecha,
})

function sinError<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

export async function listarActas(): Promise<Acta[]> {
  const filas = sinError(await supabase.from('actas').select('*').order('fecha', { ascending: false }))
  return filas.map(aActa)
}

export async function obtenerActa(id: string): Promise<Acta> {
  return aActa(sinError(await supabase.from('actas').select('*').eq('id', id).single()))
}

export async function crearActa(acta: ActaNueva): Promise<Acta> {
  return aActa(sinError(await supabase.from('actas').insert(acta).select().single()))
}

export async function actualizarActa(id: string, cambios: Partial<ActaNueva>): Promise<Acta> {
  return aActa(sinError(await supabase.from('actas').update(cambios).eq('id', id).select().single()))
}

/** Deletes the acta and, by FK cascade, its commitments. */
export async function eliminarActa(id: string): Promise<void> {
  sinError(await supabase.from('actas').delete().eq('id', id))
}

/** All commitments, or only those of one acta. */
export async function listarCompromisos(actaId?: string): Promise<Compromiso[]> {
  let consulta = supabase.from('compromisos').select('*').order('created_at')
  if (actaId) consulta = consulta.eq('acta_id', actaId)
  return sinError(await consulta).map(aCompromiso)
}

export async function crearCompromiso(c: CompromisoNuevo): Promise<Compromiso> {
  const fila = { ...aFilaCompromiso(c), acta_id: c.actaId, actividad: c.actividad }
  return aCompromiso(sinError(await supabase.from('compromisos').insert(fila).select().single()))
}

export async function actualizarCompromiso(
  id: string,
  cambios: Partial<CompromisoNuevo>,
): Promise<Compromiso> {
  // Undefined keys are dropped by JSON serialization, so only changed columns are sent.
  return aCompromiso(
    sinError(
      await supabase.from('compromisos').update(aFilaCompromiso(cambios)).eq('id', id).select().single(),
    ),
  )
}

export async function eliminarCompromiso(id: string): Promise<void> {
  sinError(await supabase.from('compromisos').delete().eq('id', id))
}
