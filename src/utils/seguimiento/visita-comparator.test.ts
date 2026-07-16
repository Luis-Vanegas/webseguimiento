import assert from 'node:assert/strict'
import test from 'node:test'
import { compararVisitas } from './visita-comparator.util.ts'
import type { VisitaSeguimiento } from '../../types/seguimiento.types.ts'

function visita(overrides: Partial<VisitaSeguimiento>): VisitaSeguimiento {
  return {
    id: '1',
    obraId: 1,
    autorId: 'u1',
    autorRol: 'visitador',
    fechaVisita: '2026-01-01',
    fechaProximaVisita: null,
    porcentajeAvanceCampo: 10,
    observaciones: '',
    estado: 'pendiente_revisar',
    revisadoPor: null,
    fechaRevision: null,
    createdAt: '',
    updatedAt: '',
    vistoGerencia: false,
    alertas: [],
    fotos: [],
    ...overrides,
  }
}

test('primera visita a una obra no tiene cambios', () => {
  const actual = visita({})
  assert.deepEqual(compararVisitas(actual, null), [])
})

test('detecta variacion de avance', () => {
  const anterior = visita({ porcentajeAvanceCampo: 10 })
  const actual = visita({ porcentajeAvanceCampo: 25 })

  const cambios = compararVisitas(actual, anterior)

  const avance = cambios.find((c) => c.campo === 'porcentajeAvanceCampo')
  assert.equal(avance?.variacion, 15)
})

test('clasifica alertas nuevas, resueltas y persistentes', () => {
  const anterior = visita({
    alertas: [
      { id: 'a1', visitaId: '0', tipoAlertaId: 'clima', detalle: null, severidad: 'baja' },
      { id: 'a2', visitaId: '0', tipoAlertaId: 'predial', detalle: null, severidad: 'media' },
    ],
  })
  const actual = visita({
    alertas: [
      { id: 'a3', visitaId: '1', tipoAlertaId: 'predial', detalle: null, severidad: 'media' },
      { id: 'a4', visitaId: '1', tipoAlertaId: 'epm', detalle: null, severidad: 'alta' },
    ],
  })

  const cambios = compararVisitas(actual, anterior)

  assert.deepEqual(cambios.find((c) => c.campo === 'alertasNuevas')?.valorNuevo, ['epm'])
  assert.deepEqual(cambios.find((c) => c.campo === 'alertasResueltas')?.valorAnterior, ['clima'])
  assert.deepEqual(
    cambios.find((c) => c.campo === 'alertasPersistentes')?.valorNuevo,
    ['predial'],
  )
})

test('detecta fotos nuevas', () => {
  const anterior = visita({ fotos: [] })
  const actual = visita({
    fotos: [{ id: 'f1', visitaId: '1', puntoReferenciaId: null, storagePath: 'x', orden: 1 }],
  })

  const cambios = compararVisitas(actual, anterior)
  assert.equal(cambios.find((c) => c.campo === 'cantidadFotos')?.variacion, 1)
})
