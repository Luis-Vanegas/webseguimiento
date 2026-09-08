import assert from 'node:assert/strict'
import test from 'node:test'
import { mensajeDeCamposFaltantes } from './camposFaltantes.util.ts'

test('sin errores devuelve el aviso generico', () => {
  assert.match(mensajeDeCamposFaltantes({}), /Revisá los datos/)
})

test('nombra el campo faltante con su etiqueta visible', () => {
  const msg = mensajeDeCamposFaltantes({ porcentajeAvanceCampo: {} })
  assert.match(msg, /% de avance observado en campo/)
})

test('un campo sin etiqueta conocida se nombra por su clave en vez de omitirse', () => {
  assert.match(mensajeDeCamposFaltantes({ campoNuevoSinEtiqueta: {} }), /campoNuevoSinEtiqueta/)
})

test('lista todos los campos faltantes separados por coma', () => {
  const msg = mensajeDeCamposFaltantes({ fechaVisita: {}, alertas: {} })
  assert.match(msg, /Fecha de visita, Descripción de la alerta/)
})
