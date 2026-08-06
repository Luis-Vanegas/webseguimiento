import assert from 'node:assert/strict'
import test from 'node:test'
import { visitasConProximaPendiente } from './proximas-visitas.util.ts'
import type { VisitaSeguimiento } from '../../types/seguimiento.types.ts'

function visita(overrides: Partial<VisitaSeguimiento>): VisitaSeguimiento {
  return {
    id: 'v1',
    obraId: 1,
    autorId: 'autor-1',
    autorRol: 'visitador',
    fechaVisita: '2026-05-21',
    fechaProximaVisita: '2026-07-20',
    porcentajeAvanceCampo: 0,
    observaciones: '',
    estado: 'revisada',
    revisadoPor: null,
    fechaRevision: null,
    createdAt: '',
    updatedAt: '',
    vistoGerencia: false,
    ...overrides,
  }
}

test('sin próxima visita agendada, no queda pendiente', () => {
  const resultado = visitasConProximaPendiente([visita({ fechaProximaVisita: null })], new Map())
  assert.deepEqual(resultado, [])
})

test('si nadie volvió a la obra, la próxima visita sigue pendiente', () => {
  const v = visita({ obraId: 7, fechaVisita: '2026-05-21' })
  const resultado = visitasConProximaPendiente([v], new Map([[7, '2026-05-21']]))
  assert.deepEqual(resultado.map((r) => r.id), ['v1'])
})

// Regresión del bug reportado: el visitador registra la primera visita y el
// ingeniero (OTRO autor) vuelve después. La lista de "Mis visitas" del
// visitador solo contiene su propia visita, así que sin cruzar contra
// ultimaVisitaPorObra la vieja quedaba mostrándose como "vencida".
test('si OTRO autor volvió después, la próxima visita vieja ya no está pendiente', () => {
  const miVisitaVieja = visita({ obraId: 7, fechaVisita: '2026-05-21', fechaProximaVisita: '2026-07-20' })
  // El ingeniero volvió el 17/07, después de mi visita del 21/05.
  const resultado = visitasConProximaPendiente([miVisitaVieja], new Map([[7, '2026-07-17']]))
  assert.deepEqual(resultado, [])
})

test('entre dos visitas propias a la misma obra, solo la más reciente queda pendiente', () => {
  const vieja = visita({ id: 'vieja', obraId: 7, fechaVisita: '2026-05-21' })
  const nueva = visita({ id: 'nueva', obraId: 7, fechaVisita: '2026-07-17' })
  const resultado = visitasConProximaPendiente([vieja, nueva], new Map([[7, '2026-07-17']]))
  assert.deepEqual(resultado.map((r) => r.id), ['nueva'])
})

test('una visita del mismo día que la última registrada sigue pendiente', () => {
  const v = visita({ obraId: 7, fechaVisita: '2026-07-17' })
  const resultado = visitasConProximaPendiente([v], new Map([[7, '2026-07-17']]))
  assert.deepEqual(resultado.map((r) => r.id), ['v1'])
})

test('obras distintas no se interfieren entre sí', () => {
  const obraA = visita({ id: 'a', obraId: 1, fechaVisita: '2026-05-21' })
  const obraB = visita({ id: 'b', obraId: 2, fechaVisita: '2026-05-21' })
  // Solo la obra 1 fue revisitada por alguien más.
  const resultado = visitasConProximaPendiente(
    [obraA, obraB],
    new Map([
      [1, '2026-07-17'],
      [2, '2026-05-21'],
    ]),
  )
  assert.deepEqual(resultado.map((r) => r.id), ['b'])
})
