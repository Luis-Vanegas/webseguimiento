import { diasHasta } from '../seguimiento/fechas.util.ts'
import { ESTADOS_COMPROMISO, type Compromiso, type EstadoCompromiso } from '../../types/actas.types.ts'

export const DIAS_ALERTA_VENCIMIENTO = 7

export type Semaforo = 'vencida' | 'proxima' | 'normal' | 'sin-fecha'

/** Days until due; null when there is no due date or it is already completed (same rule as the Excel). */
export function diasRestantes(c: Pick<Compromiso, 'fechaVencimiento' | 'estado'>): number | null {
  if (!c.fechaVencimiento || c.estado === 'Completada') return null
  return diasHasta(c.fechaVencimiento)
}

export function semaforo(c: Pick<Compromiso, 'fechaVencimiento' | 'estado'>): Semaforo {
  const dias = diasRestantes(c)
  if (dias === null) return 'sin-fecha'
  if (dias < 0) return 'vencida'
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return 'proxima'
  return 'normal'
}

export type ConteoEstados = Record<EstadoCompromiso, number> & { total: number }

export function contarEstados(compromisos: Pick<Compromiso, 'estado'>[]): ConteoEstados {
  const conteo = Object.fromEntries(ESTADOS_COMPROMISO.map((e) => [e, 0])) as ConteoEstados
  conteo.total = compromisos.length
  for (const c of compromisos) conteo[c.estado]++
  return conteo
}

export interface ResumenOrigen extends ConteoEstados {
  origen: string
  /** Completed / total, 0..1 */
  avance: number
}

/** "Resumen por origen" table of the Excel: one row per meeting origin. */
export function resumenPorOrigen(
  compromisos: Pick<Compromiso, 'actaId' | 'estado'>[],
  origenDeActa: Map<string, string>,
): ResumenOrigen[] {
  const grupos = new Map<string, Pick<Compromiso, 'estado'>[]>()
  for (const c of compromisos) {
    const origen = origenDeActa.get(c.actaId) ?? 'Sin origen'
    grupos.set(origen, [...(grupos.get(origen) ?? []), c])
  }
  return [...grupos].map(([origen, lista]) => {
    const conteo = contarEstados(lista)
    return { origen, ...conteo, avance: conteo.total ? conteo.Completada / conteo.total : 0 }
  })
}
