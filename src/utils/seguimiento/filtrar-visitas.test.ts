import assert from 'node:assert/strict'
import test from 'node:test'
import { filtrarVisitas } from './filtrar-visitas.util.ts'
import { FILTROS_VACIOS } from '../../types/filtros.types.ts'
import type { VisitaSeguimiento } from '../../types/seguimiento.types.ts'

function visita(overrides: Partial<VisitaSeguimiento>): VisitaSeguimiento {
  return {
    id: '1',
    obraId: 1,
    autorId: 'u1',
    autorRol: 'visitador',
    fechaVisita: '2026-03-15',
    fechaProximaVisita: null,
    porcentajeAvanceCampo: 40,
    observaciones: '',
    estado: 'pendiente_revisar',
    revisadoPor: null,
    fechaRevision: null,
    createdAt: '',
    updatedAt: '',
    alertas: [],
    fotos: [],
    ...overrides,
  }
}

test('sin filtros devuelve todas las visitas', () => {
  const visitas = [visita({}), visita({ id: '2' })]
  assert.equal(filtrarVisitas(visitas, FILTROS_VACIOS, new Map()).length, 2)
})

test('filtra por rango de fecha', () => {
  const visitas = [
    visita({ id: '1', fechaVisita: '2026-01-01' }),
    visita({ id: '2', fechaVisita: '2026-06-01' }),
  ]
  const resultado = filtrarVisitas(
    visitas,
    { ...FILTROS_VACIOS, fechaDesde: '2026-03-01', fechaHasta: '2026-12-31' },
    new Map(),
  )
  assert.deepEqual(resultado.map((v) => v.id), ['2'])
})

test('filtra por proyecto estratégico de la obra', () => {
  const visitas = [visita({ id: '1', obraId: 1 }), visita({ id: '2', obraId: 2 })]
  const proyectoPorObra = new Map([
    [1, 'Vías'],
    [2, 'Educación'],
  ])
  const resultado = filtrarVisitas(
    visitas,
    { ...FILTROS_VACIOS, proyectoEstrategico: 'Educación' },
    proyectoPorObra,
  )
  assert.deepEqual(resultado.map((v) => v.id), ['2'])
})

test('filtra por tipo de alerta', () => {
  const visitas = [
    visita({
      id: '1',
      alertas: [{ id: 'a1', visitaId: '1', tipoAlertaId: 'clima', detalle: null, severidad: 'baja' }],
    }),
    visita({ id: '2', alertas: [] }),
  ]
  const resultado = filtrarVisitas(visitas, { ...FILTROS_VACIOS, tipoAlertaId: 'clima' }, new Map())
  assert.deepEqual(resultado.map((v) => v.id), ['1'])
})

test('filtra por rango de porcentaje de avance', () => {
  const visitas = [
    visita({ id: '1', porcentajeAvanceCampo: 10 }),
    visita({ id: '2', porcentajeAvanceCampo: 50 }),
    visita({ id: '3', porcentajeAvanceCampo: 90 }),
  ]
  const resultado = filtrarVisitas(
    visitas,
    { ...FILTROS_VACIOS, avanceMin: '30', avanceMax: '70' },
    new Map(),
  )
  assert.deepEqual(resultado.map((v) => v.id), ['2'])
})
