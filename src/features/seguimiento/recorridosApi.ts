import { supabase } from '../../lib/supabaseClient'
import type { Json, Tables } from '../../types/database.types'
import type { FotoRecorrido, PuntoTrazo, RecorridoSeguimiento, TipoRecorrido } from '../../types/seguimiento.types'

export interface NuevoRecorridoInput {
  autorId: string
  titulo: string
  observaciones: string
  trazo: PuntoTrazo[]
  distanciaMetros: number
  fechaInicio: string
  fechaFin: string
  tipo: TipoRecorrido
}

export async function crearRecorrido(input: NuevoRecorridoInput): Promise<RecorridoSeguimiento> {
  const { data, error } = await supabase
    .from('recorridos_seguimiento')
    .insert({
      autor_id: input.autorId,
      titulo: input.titulo,
      observaciones: input.observaciones,
      trazo: input.trazo as unknown as Json, // columna jsonb; PuntoTrazo[] es JSON válido
      distancia_metros: input.distanciaMetros,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      tipo: input.tipo,
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

// Mismo motivo que eliminarVisita en seguimientoApi.ts: el "on delete
// cascade" de fotos_recorrido borra la fila, no el archivo real en Storage.
export async function eliminarRecorrido(recorridoId: string): Promise<void> {
  const { data: fotos, error: errorFotos } = await supabase
    .from('fotos_recorrido')
    .select('storage_path')
    .eq('recorrido_id', recorridoId)
  if (errorFotos) throw errorFotos

  if (fotos && fotos.length > 0) {
    await supabase.storage.from('fotos-seguimiento').remove(fotos.map((f) => f.storage_path))
  }

  // Ver el comentario equivalente en eliminarVisita (seguimientoApi.ts): sin
  // policy de delete, PostgREST devuelve éxito con 0 filas, no un error.
  const { data, error } = await supabase.from('recorridos_seguimiento').delete().eq('id', recorridoId).select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('No se pudo borrar el recorrido: falta la policy de borrado en la base de datos.')
  }
}

export async function listarRecorridos(): Promise<RecorridoSeguimiento[]> {
  const { data, error } = await supabase
    .from('recorridos_seguimiento')
    .select('*, fotos_recorrido(*)')
    .order('fecha_inicio', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapRecorridoRow)
}

// Fila cruda tipada con el esquema generado; mismo criterio que mapVisitaRow
// en seguimientoApi.ts (casts porque `tipo` es text + CHECK y `trazo` es jsonb).
type RecorridoRow = Tables<'recorridos_seguimiento'> & { fotos_recorrido?: Tables<'fotos_recorrido'>[] }

function mapRecorridoRow(row: RecorridoRow): RecorridoSeguimiento {
  return {
    id: row.id,
    autorId: row.autor_id,
    titulo: row.titulo,
    observaciones: row.observaciones,
    trazo: (row.trazo ?? []) as unknown as PuntoTrazo[],
    distanciaMetros: Number(row.distancia_metros),
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    createdAt: row.created_at,
    // Defensivo: si la columna `tipo` no existe todavía en la base real, o la
    // fila es anterior a ella, llega undefined — todo recorrido previo era,
    // de hecho, grabado con GPS, así que ese es el valor correcto para no
    // dejarlo invisible en el mapa (ninguna de las dos capas filtradas por
    // tipo lo dibujaría con un valor null/undefined).
    tipo: (row.tipo ?? 'grabado') as TipoRecorrido,
    fotos: (row.fotos_recorrido ?? []).map(mapFotoRecorridoRow),
  }
}

function mapFotoRecorridoRow(row: Tables<'fotos_recorrido'>): FotoRecorrido {
  return {
    id: row.id,
    recorridoId: row.recorrido_id,
    storagePath: row.storage_path,
    orden: row.orden,
  }
}
