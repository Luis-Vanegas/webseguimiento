import assert from 'node:assert/strict'
import test from 'node:test'
import { mapObraRow, numeroOrNull } from './obraVisorRow.util.ts'

// Fila mínima como la devuelve la API externa: TODO como texto, incluido el
// id (ver comentario en obraVisorRow.util.ts).
const FILA_BASE = {
  id: '1042',
  NOMBRE: 'Parque de prueba',
  LATITUD: '6.24',
  LONGITUD: '-75.58',
  '¿OBRA ENTREGADA?': 'no',
}

test('regresión: obraId siempre es number, aunque la API lo mande como texto', () => {
  const obra = mapObraRow(FILA_BASE)
  assert.equal(typeof obra.obraId, 'number')
  assert.equal(obra.obraId, 1042)
  // Este es justo el bug de hoy: si obraId queda string, nunca matchea
  // contra las claves numéricas de ultimaVisitaPorObra (Map<number,...>
  // armado desde Supabase) y el mapa muestra TODAS las obras como "sin
  // visitar" sin importar cuántas visitas tengan.
})

test('numeroOrNull convierte texto numérico y devuelve null para vacío/no numérico', () => {
  assert.equal(numeroOrNull('6.24'), 6.24)
  assert.equal(numeroOrNull(''), null)
  assert.equal(numeroOrNull(null), null)
  assert.equal(numeroOrNull(undefined), null)
  assert.equal(numeroOrNull('no es un número'), null)
})

test('entregada se normaliza sin depender de mayúsculas/tildes', () => {
  assert.equal(mapObraRow({ ...FILA_BASE, '¿OBRA ENTREGADA?': 'si' }).entregada, true)
  assert.equal(mapObraRow({ ...FILA_BASE, '¿OBRA ENTREGADA?': 'SI' }).entregada, true)
  assert.equal(mapObraRow({ ...FILA_BASE, '¿OBRA ENTREGADA?': 'no' }).entregada, false)
})

test('campos ausentes en la fila caen a null, no a undefined', () => {
  const obra = mapObraRow(FILA_BASE)
  assert.equal(obra.dependencia, null)
  assert.equal(obra.comuna, null)
  assert.equal(obra.proyectoEstrategico, null)
})
