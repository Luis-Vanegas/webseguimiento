import { supabase } from '../../lib/supabaseClient'
import type { Json } from '../../types/database.types'

export interface Dependencia {
  cenGestor: number
  nombre: string
}
export interface ProyectoEstrategico {
  id: number
  nombre: string
}

export interface AportePayload {
  proyecto_estrategico_id: number
  porcentaje: number
  valor_aportado: number
}

/** Lo que viaja a est_guardar_reporte (nombres de columna de la BD). */
export interface ReportePayload {
  vigencia: number
  cen_gestor: number
  cod_sap: string
  nom_proyecto: string
  ppto_inicial: number
  total_ppto_actual: number
  eje_financiera: number
  reportado_por: string
  correo: string | null
  observaciones: string | null
  aportes: AportePayload[]
}
export interface ReporteGuardado extends Omit<ReportePayload, 'aportes'> {
  id: number
  estado: 'activo' | 'anulado'
  updated_at: string
  aportes: { proyecto_estrategico_id: number; porcentaje: number; valor_aportado: number | null }[]
}

function sinError<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

export async function cargarCatalogos() {
  const [deps, est] = await Promise.all([
    supabase.from('est_dependencias').select('*').order('nombre'),
    supabase.from('est_proyectos_estrategicos').select('*').order('nombre'),
  ])
  return {
    dependencias: sinError(deps).map((d): Dependencia => ({ cenGestor: d.cen_gestor, nombre: d.nombre })),
    estrategicos: sinError(est).map((e): ProyectoEstrategico => ({ id: e.id, nombre: e.nombre })),
  }
}

/** Crea (sin token) o corrige (con token) un reporte. */
export async function guardarReporte(payload: ReportePayload, token?: string) {
  const data = sinError(
    await supabase.rpc('est_guardar_reporte', { p: payload as unknown as Json, p_token: token }),
  )
  return data as unknown as { id: number; token: string }
}

export async function obtenerReporte(token: string): Promise<ReporteGuardado | null> {
  return sinError(await supabase.rpc('est_obtener_reporte', { p_token: token })) as unknown as ReporteGuardado | null
}

export async function anularReporte(token: string): Promise<void> {
  sinError(await supabase.rpc('est_anular_reporte', { p_token: token }))
}
