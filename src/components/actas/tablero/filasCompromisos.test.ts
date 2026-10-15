import { test } from 'node:test'
import assert from 'node:assert/strict'
import { claveDeDate } from '../../../utils/seguimiento/fechas.util.ts'
import {
  FILTROS_COMPROMISOS_VACIOS,
  compromisosDeBorrador,
  fechaLegible,
  filasCompromisos,
} from './filasCompromisos.ts'
import type { Compromiso } from '../../../types/actas.types.ts'

const enDias = (n: number) => claveDeDate(new Date(Date.now() + n * 86_400_000))

const base: Omit<Compromiso, 'id' | 'actividad'> = {
  actaId: 'a1',
  responsable: null,
  fechaVencimiento: null,
  estado: 'Pendiente',
  criterioFecha: null,
}
const compromisos: Compromiso[] = [
  { ...base, id: '1', actividad: 'Sin fecha' },
  { ...base, id: '2', actividad: 'Lejana', fechaVencimiento: enDias(20), actaId: 'a2' },
  { ...base, id: '3', actividad: 'Vencida', fechaVencimiento: enDias(-3), responsable: 'José Pérez' },
  { ...base, id: '4', actividad: 'Hecha', fechaVencimiento: enDias(-10), estado: 'Completada' },
]
const origenes = new Map([
  ['a1', 'Comité Directivo'],
  ['a2', 'Arenilla a sintética'],
])

test('sorts by days remaining ascending with no date last', () => {
  const filas = filasCompromisos(compromisos, origenes, FILTROS_COMPROMISOS_VACIOS)
  assert.deepEqual(filas.map((f) => f.id).slice(0, 2), ['3', '2'])
  assert.deepEqual(filas.slice(2).map((f) => f.dias), [null, null])
  assert.equal(filas[0].dias, -3)
  assert.equal(filas[0].origen, 'Comité Directivo')
})

test('filters by estado, origen and accent-insensitive text', () => {
  const f = FILTROS_COMPROMISOS_VACIOS
  assert.deepEqual(filasCompromisos(compromisos, origenes, { ...f, estado: 'Completada' }).map((c) => c.id), ['4'])
  assert.deepEqual(
    filasCompromisos(compromisos, origenes, { ...f, origen: 'Arenilla a sintética' }).map((c) => c.id),
    ['2'],
  )
  assert.deepEqual(filasCompromisos(compromisos, origenes, { ...f, texto: 'jose' }).map((c) => c.id), ['3'])
  assert.deepEqual(filasCompromisos(compromisos, origenes, { ...f, texto: 'LEJANA' }).map((c) => c.id), ['2'])
})

test('sorts by the chosen column and direction, empty values always last', () => {
  const f = FILTROS_COMPROMISOS_VACIOS
  const ids = (orden: Parameters<typeof filasCompromisos>[3]) =>
    filasCompromisos(compromisos, origenes, f, orden).map((c) => c.id)

  assert.deepEqual(ids({ campo: 'dias', dir: 'desc' }).slice(0, 2), ['2', '3'])
  assert.deepEqual(ids({ campo: 'origen', dir: 'asc' })[0], '2')
  assert.deepEqual(ids({ campo: 'origen', dir: 'desc' }).at(-1), '2')
  assert.deepEqual(ids({ campo: 'vence', dir: 'asc' }), ['4', '3', '2', '1'])
  assert.deepEqual(ids({ campo: 'vence', dir: 'desc' }), ['2', '3', '4', '1'])
})

test('sorts estado by urgency: Crítica, En progreso, Pendiente, Completada', () => {
  const lista: Compromiso[] = [
    { ...base, id: 'p', actividad: 'p', estado: 'Pendiente' },
    { ...base, id: 'h', actividad: 'h', estado: 'Completada' },
    { ...base, id: 'c', actividad: 'c', estado: 'Crítica' },
    { ...base, id: 'e', actividad: 'e', estado: 'En progreso' },
  ]
  const orden = { campo: 'estado', dir: 'asc' } as const
  assert.deepEqual(
    filasCompromisos(lista, origenes, FILTROS_COMPROMISOS_VACIOS, orden).map((c) => c.id),
    ['c', 'e', 'p', 'h'],
  )
})

test('compromisosDeBorrador trims fields and skips rows without actividad', () => {
  const borrador = [
    { actividad: '  Enviar informe ', responsable: ' Ana ', fechaVencimiento: '2026-11-01' },
    { actividad: '   ', responsable: 'Nadie', fechaVencimiento: '' },
    { actividad: 'Revisar planos', responsable: '', fechaVencimiento: '' },
  ]
  assert.deepEqual(compromisosDeBorrador(borrador, 'acta-1'), [
    {
      actaId: 'acta-1',
      actividad: 'Enviar informe',
      responsable: 'Ana',
      fechaVencimiento: '2026-11-01',
      estado: 'Pendiente',
      criterioFecha: null,
    },
    {
      actaId: 'acta-1',
      actividad: 'Revisar planos',
      responsable: null,
      fechaVencimiento: null,
      estado: 'Pendiente',
      criterioFecha: null,
    },
  ])
})

test('fechaLegible formats ISO dates', () => {
  assert.equal(fechaLegible('2026-07-17'), '17/07/2026')
})
