import { diasRestantes } from '../../../utils/actas/tablero.util.ts'
import type { Compromiso, EstadoCompromiso } from '../../../types/actas.types.ts'

export interface FiltrosCompromisos {
  estado: EstadoCompromiso | ''
  origen: string
  texto: string
}

export const FILTROS_COMPROMISOS_VACIOS: FiltrosCompromisos = { estado: '', origen: '', texto: '' }

export interface FilaCompromiso extends Compromiso {
  origen: string
  dias: number | null
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Commitments of every acta, filtered and sorted by days remaining ascending (no date last). */
export function filasCompromisos(
  compromisos: Compromiso[],
  origenDeActa: Map<string, string>,
  filtros: FiltrosCompromisos,
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
    .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
}

/** "2026-07-17" -> "17/07/2026" */
export const fechaLegible = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
