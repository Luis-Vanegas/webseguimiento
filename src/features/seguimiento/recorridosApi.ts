import { supabase } from '../../lib/supabaseClient'
import type { FotoRecorrido, PuntoTrazo, RecorridoSeguimiento } from '../../types/seguimiento.types'

export interface NuevoRecorridoInput {
  autorId: string
  titulo: string
  observaciones: string
  trazo: PuntoTrazo[]
  distanciaMetros: number
  fechaInicio: string
  fechaFin: string
}

export async function crearRecorrido(input: NuevoRecorridoInput): Promise<RecorridoSeguimiento> {
  const { data, error } = await supabase
    .from('recorridos_seguimiento')
    .insert({
      autor_id: input.autorId,
      titulo: input.titulo,
      observaciones: input.observaciones,
      trazo: input.trazo,
      distancia_metros: input.distanciaMetros,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
    })
    .select()
    .single()

  if (error) throw error
  return mapRecorridoRow(data)
}

// Mismo bucket que las fotos de visita ("fotos-seguimiento"), bajo un
// prefijo "recorridos/" para no mezclar carpetas por id de visita y de
// recorrido dentro del mismo bucket.
export async function subirFotoRecorrido(
  recorridoId: string,
  archivo: File,
  orden: number,
): Promise<FotoRecorrido> {
  const storagePath = `recorridos/${recorridoId}/${crypto.randomUUID()}-${archivo.name}`

  const { error: errorStorage } = await supabase.storage
    .from('fotos-seguimiento')
    .upload(storagePath, archivo)

  if (errorStorage) throw errorStorage

  const { data, error } = await supabase
    .from('fotos_recorrido')
    .insert({ recorrido_id: recorridoId, storage_path: storagePath, orden })
    .select()
    .single()

  if (error) throw error
  return mapFotoRecorridoRow(data)
}

export async function listarRecorridos(): Promise<RecorridoSeguimiento[]> {
  const { data, error } = await supabase
    .from('recorridos_seguimiento')
    .select('*, fotos_recorrido(*)')
    .order('fecha_inicio', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapRecorridoRow)
}

// ponytail: any acotado a la forma cruda de la fila de Supabase, mismo
// criterio que mapVisitaRow en seguimientoApi.ts.
function mapRecorridoRow(row: any): RecorridoSeguimiento {
  return {
    id: row.id,
    autorId: row.autor_id,
    titulo: row.titulo,
    observaciones: row.observaciones,
    trazo: row.trazo ?? [],
    distanciaMetros: Number(row.distancia_metros),
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    createdAt: row.created_at,
    fotos: (row.fotos_recorrido ?? []).map(mapFotoRecorridoRow),
  }
}

function mapFotoRecorridoRow(row: any): FotoRecorrido {
  return {
    id: row.id,
    recorridoId: row.recorrido_id,
    storagePath: row.storage_path,
    orden: row.orden,
  }
}
