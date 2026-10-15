import { diasRestantes } from '../../../utils/actas/tablero.util.ts'
import type { Compromiso, CompromisoNuevo, EstadoCompromiso } from '../../../types/actas.types.ts'

export interface FiltrosCompromisos {
  estado: EstadoCompromiso | ''
  origen: string
  texto: string
}

export const FILTROS_COMPROMISOS_VACIOS: FiltrosCompromisos = { estado: '', origen: '', texto: '' }

export type CampoOrden = 'origen' | 'actividad' | 'responsable' | 'vence' | 'estado' | 'dias'

export interface OrdenCompromisos {
  campo: CampoOrden
  dir: 'asc' | 'desc'
}

export const ORDEN_POR_DEFECTO: OrdenCompromisos = { campo: 'dias', dir: 'asc' }

export interface FilaCompromiso extends Compromiso {
  origen: string
  dias: number | null
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Most urgent first, so "asc" on estado reads as a priority list. */
const URGENCIA: Record<EstadoCompromiso, number> = {
  Crítica: 0,
  'En progreso': 1,
  Pendiente: 2,
  Completada: 3,
}

const valorDeOrden = (c: FilaCompromiso, campo: CampoOrden): string | number | null => {
  switch (campo) {
    case 'origen':
      return normalizar(c.origen)
    case 'actividad':
      return normalizar(c.actividad)
    case 'responsable':
      return c.responsable ? normalizar(c.responsable) : null
    case 'vence':
      return c.fechaVencimiento
    case 'estado':
      return URGENCIA[c.estado]
    case 'dias':
      return c.dias
  }
}

/** Compares by the chosen column; empty values go last in both directions. */
function comparar(a: FilaCompromiso, b: FilaCompromiso, { campo, dir }: OrdenCompromisos): number {
  const va = valorDeOrden(a, campo)
  const vb = valorDeOrden(b, campo)
  if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1
  const r = va < vb ? -1 : va > vb ? 1 : 0
  return dir === 'asc' ? r : -r
}

/** Commitments of every acta, filtered and sorted (default: days remaining ascending, no date last). */
export function filasCompromisos(
  compromisos: Compromiso[],
  origenDeActa: Map<string, string>,
  filtros: FiltrosCompromisos,
  orden: OrdenCompromisos = ORDEN_POR_DEFECTO,
): FilaCompromiso[] {
  const texto = normalizar(filtros.texto.trim())
  return compromisos
    .map((c) => ({ ...c, origen: origenDeActa.get(c.actaId) ?? 'Sin origen', dias: diasRestantes(c) }))
    .filter(
      (c) =>
        (!filtros.estado || c.estado === filtros.estado) &&
        (!filtros.origen || c.origen === filtros.origen) &&
        (!texto || normalizar(`${c.actividad} ${c.responsable ?? ''}`).includes(texto)),
    )
    .sort((a, b) => comparar(a, b, orden))
}

export interface CompromisoBorrador {
  actividad: string
  responsable: string
  fechaVencimiento: string
}

/** Rows typed in "Nueva acta" ready to insert; rows without actividad are dropped. */
export function compromisosDeBorrador(filas: CompromisoBorrador[], actaId: string): CompromisoNuevo[] {
  return filas
    .filter((f) => f.actividad.trim())
    .map((f) => ({
      actaId,
      actividad: f.actividad.trim(),
      responsable: f.responsable.trim() || null,
      fechaVencimiento: f.fechaVencimiento || null,
      estado: 'Pendiente',
      criterioFecha: null,
    }))
}

/** "2026-07-17" -> "17/07/2026" */
export const fechaLegible = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
