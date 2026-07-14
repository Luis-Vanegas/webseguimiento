import { supabase } from '../../lib/supabaseClient'
import type {
  EstadoVisita,
  FotoVisita,
  RolUsuario,
  TipoAlerta,
  UsuarioSeguimiento,
  VisitaSeguimiento,
} from '../../types/seguimiento.types'

// Catálogo fijo: no cambia durante la sesión, y hasta 3 pantallas distintas
// lo piden por separado (mismo motivo de caché que obtenerObras() en
// obrasVisorApi.ts).
let tiposAlertaCache: Promise<TipoAlerta[]> | null = null

export function listarTiposAlerta(): Promise<TipoAlerta[]> {
  tiposAlertaCache ??= (async () => {
    const { data, error } = await supabase.from('tipos_alerta').select('id, nombre').order('nombre')
    if (error) {
      tiposAlertaCache = null
      throw error
    }
    return (data ?? []).map((row) => ({ id: row.id, nombre: row.nombre }))
  })()
  return tiposAlertaCache
}

// Última fecha de visita por obra, para poder marcar "obra desatendida"
// (hoy - última visita > 30 días) en el mapa. Consulta calculada, no se
// guarda ningún campo derivado (sección 5 del brief).
export async function obtenerUltimaVisitaPorObra(): Promise<Map<number, string>> {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .select('obra_id, fecha_visita')
    .order('fecha_visita', { ascending: false })

  if (error) throw error

  const ultimaPorObra = new Map<number, string>()
  for (const fila of data ?? []) {
    if (!ultimaPorObra.has(fila.obra_id)) ultimaPorObra.set(fila.obra_id, fila.fecha_visita)
  }
  return ultimaPorObra
}

export async function listarPuntosReferencia(obraId: number) {
  const { data, error } = await supabase
    .from('puntos_referencia_obra')
    .select('id, obra_id, nombre')
    .eq('obra_id', obraId)

  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, obraId: row.obra_id, nombre: row.nombre }))
}

// El bucket "fotos-seguimiento" es privado (ver Decisión de RLS del schema);
// se necesita una URL firmada para poder mostrar la foto en <img>.
export async function obtenerUrlFoto(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('fotos-seguimiento')
    .createSignedUrl(storagePath, 60 * 60)

  if (error) throw error
  return data.signedUrl
}

export interface NuevaVisitaInput {
  obraId: number
  autorId: string
  autorRol: RolUsuario
  fechaVisita: string
  fechaProximaVisita: string | null
  porcentajeAvanceCampo: number
  observaciones: string
  alertas: { tipoAlertaId: string; detalle: string | null; severidad: string }[]
}

// Si el autor es ingeniero, la visita nace revisada de una: es la autoridad
// de campo y no necesita que nadie más la valide. Si es visitador, nace
// pendiente_revisar hasta que el ingeniero la mire.
function estadoInicial(autorRol: RolUsuario): EstadoVisita {
  return autorRol === 'ingeniero' ? 'revisada' : 'pendiente_revisar'
}

export async function crearVisita(input: NuevaVisitaInput): Promise<VisitaSeguimiento> {
  const estado = estadoInicial(input.autorRol)

  const { data: visita, error } = await supabase
    .from('visitas_seguimiento')
    .insert({
      obra_id: input.obraId,
      autor_id: input.autorId,
      autor_rol: input.autorRol,
      fecha_visita: input.fechaVisita,
      fecha_proxima_visita: input.fechaProximaVisita,
      porcentaje_avance_campo: input.porcentajeAvanceCampo,
      observaciones: input.observaciones,
      estado,
    })
    .select()
    .single()

  if (error) throw error

  if (input.alertas.length > 0) {
    const { error: errorAlertas } = await supabase.from('alertas_visita').insert(
      input.alertas.map((alerta) => ({
        visita_id: visita.id,
        tipo_alerta_id: alerta.tipoAlertaId,
        detalle: alerta.detalle,
        severidad: alerta.severidad,
      })),
    )
    if (errorAlertas) throw errorAlertas
  }

  await supabase.from('historial_revision').insert({
    visita_id: visita.id,
    accion: 'creada',
    usuario_id: input.autorId,
  })

  return mapVisitaRow(visita)
}

export async function listarMisVisitas(autorId: string): Promise<VisitaSeguimiento[]> {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .select('*, alertas_visita(*), fotos_visita(*)')
    .eq('autor_id', autorId)
    .order('fecha_visita', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapVisitaRow)
}

// Bandeja del ingeniero: lo pendiente de los visitadores, MÁS lo que
// registraron otros ingenieros (nace 'revisada' de una, ver estadoInicial())
// para que los ingenieros puedan auditarse entre sí. Nunca incluye las
// propias del usuario actual — esas ya se ven en "Mis visitas".
export async function listarPendientes(usuarioActualId: string): Promise<VisitaSeguimiento[]> {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .select('*, alertas_visita(*), fotos_visita(*)')
    // .neq() encadenado aplica a TODO el .or() que sigue, así la exclusión de
    // "propias" cubre ambas ramas en vez de solo la de 'revisada' (antes,
    // la rama pendiente/en_revision dependía de que un ingeniero nunca
    // tenga ahí una visita suya — cierto hoy por estadoInicial(), pero no
    // garantizado por esta query).
    .neq('autor_id', usuarioActualId)
    .or(`estado.in.(pendiente_revisar,en_revision),and(estado.eq.revisada,autor_rol.eq.ingeniero)`)
    .order('fecha_visita', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapVisitaRow)
}

let usuariosCache: Promise<UsuarioSeguimiento[]> | null = null

export function listarUsuarios(): Promise<UsuarioSeguimiento[]> {
  usuariosCache ??= (async () => {
    const { data, error } = await supabase
      .from('usuarios_seguimiento')
      .select('id, nombre, rol, activo')

    if (error) {
      usuariosCache = null
      throw error
    }
    return data ?? []
  })()
  return usuariosCache
}

export async function listarVisitasDeObra(obraId: number): Promise<VisitaSeguimiento[]> {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .select('*, alertas_visita(*), fotos_visita(*)')
    .eq('obra_id', obraId)
    .order('fecha_visita', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapVisitaRow)
}

export interface EditarVisitaInput {
  id: string
  usuarioId: string
  cambios: Partial<{
    porcentajeAvanceCampo: number
    observaciones: string
    fechaProximaVisita: string | null
    fechaVisita: string
  }>
  comentario?: string
}

export async function editarVisita(input: EditarVisitaInput): Promise<VisitaSeguimiento> {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .update({
      porcentaje_avance_campo: input.cambios.porcentajeAvanceCampo,
      observaciones: input.cambios.observaciones,
      fecha_proxima_visita: input.cambios.fechaProximaVisita,
      fecha_visita: input.cambios.fechaVisita,
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error) throw error

  await supabase.from('historial_revision').insert({
    visita_id: input.id,
    accion: 'editada',
    usuario_id: input.usuarioId,
    comentario: input.comentario ?? null,
  })

  return mapVisitaRow(data)
}

export async function marcarEnRevision(id: string, usuarioId: string): Promise<VisitaSeguimiento> {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .update({ estado: 'en_revision' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  await supabase.from('historial_revision').insert({
    visita_id: id,
    accion: 'en_revision',
    usuario_id: usuarioId,
  })

  return mapVisitaRow(data)
}

export async function marcarRevisada(
  id: string,
  revisadoPor: string,
): Promise<VisitaSeguimiento> {
  const { data, error } = await supabase
    .from('visitas_seguimiento')
    .update({
      estado: 'revisada',
      revisado_por: revisadoPor,
      fecha_revision: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  await supabase.from('historial_revision').insert({
    visita_id: id,
    accion: 'revisada',
    usuario_id: revisadoPor,
  })

  return mapVisitaRow(data)
}

export async function subirFoto(
  visitaId: string,
  archivo: File,
  puntoReferenciaId: string | null,
  orden: number,
): Promise<FotoVisita> {
  const storagePath = `${visitaId}/${crypto.randomUUID()}-${archivo.name}`

  const { error: errorStorage } = await supabase.storage
    .from('fotos-seguimiento')
    .upload(storagePath, archivo)

  if (errorStorage) throw errorStorage

  const { data, error } = await supabase
    .from('fotos_visita')
    .insert({
      visita_id: visitaId,
      punto_referencia_id: puntoReferenciaId,
      storage_path: storagePath,
      orden,
    })
    .select()
    .single()

  if (error) throw error

  return mapFotoRow(data)
}

// --- Mapeo de filas snake_case (Supabase) a los tipos camelCase del dominio ---

// ponytail: any acotado a la forma cruda de la fila de Supabase; tipar el
// schema completo generado por la CLI es más de lo que este módulo necesita hoy.
function mapVisitaRow(row: any): VisitaSeguimiento {
  return {
    id: row.id,
    obraId: row.obra_id,
    autorId: row.autor_id,
    autorRol: row.autor_rol,
    fechaVisita: row.fecha_visita,
    fechaProximaVisita: row.fecha_proxima_visita,
    // PostgREST devuelve columnas `numeric` como string para no perder
    // precisión; se castea acá para que el resto del dominio trabaje con number.
    porcentajeAvanceCampo: Number(row.porcentaje_avance_campo),
    observaciones: row.observaciones,
    estado: row.estado,
    revisadoPor: row.revisado_por,
    fechaRevision: row.fecha_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    alertas: (row.alertas_visita ?? []).map((a: any) => ({
      id: a.id,
      visitaId: a.visita_id,
      tipoAlertaId: a.tipo_alerta_id,
      detalle: a.detalle,
      severidad: a.severidad,
    })),
    fotos: (row.fotos_visita ?? []).map(mapFotoRow),
  }
}

function mapFotoRow(row: any): FotoVisita {
  return {
    id: row.id,
    visitaId: row.visita_id,
    puntoReferenciaId: row.punto_referencia_id,
    storagePath: row.storage_path,
    orden: row.orden,
  }
}
