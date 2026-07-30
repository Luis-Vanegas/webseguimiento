import assert from 'node:assert/strict'
import test from 'node:test'
import { severidadMaxima } from './alertas.util.ts'
import type { AlertaVisita, SeveridadAlerta } from '../../types/seguimiento.types.ts'

function alerta(severidad: SeveridadAlerta): AlertaVisita {
  return { id: '1', visitaId: 'v1', tipoAlertaId: 't1', detalle: null, severidad }
}

test('sin alertas (undefined o vacío) devuelve null', () => {
  assert.equal(severidadMaxima(undefined), null)
  assert.equal(severidadMaxima([]), null)
})

test('devuelve la severidad más alta entre varias, sin importar el orden', () => {
  assert.equal(severidadMaxima([alerta('baja'), alerta('alta'), alerta('media')]), 'alta')
  assert.equal(severidadMaxima([alerta('media'), alerta('baja')]), 'media')
  assert.equal(severidadMaxima([alerta('baja')]), 'baja')
})
