import assert from 'node:assert/strict'
import test from 'node:test'
import { calcularDistanciaTotal } from './geo.util.ts'

test('sin puntos o un solo punto, distancia es 0', () => {
  assert.equal(calcularDistanciaTotal([]), 0)
  assert.equal(calcularDistanciaTotal([{ lat: 6.24, lon: -75.58 }]), 0)
})

test('un grado de latitud son aproximadamente 111km', () => {
  const distancia = calcularDistanciaTotal([
    { lat: 6.0, lon: -75.58 },
    { lat: 7.0, lon: -75.58 },
  ])
  assert.ok(Math.abs(distancia - 111_195) < 500, `esperaba ~111195m, dio ${distancia}`)
})

test('suma tramo por tramo, no la distancia directa punto a punto', () => {
  const idaYVuelta = calcularDistanciaTotal([
    { lat: 6.24, lon: -75.58 },
    { lat: 6.25, lon: -75.58 },
    { lat: 6.24, lon: -75.58 },
  ])
  const directo = calcularDistanciaTotal([
    { lat: 6.24, lon: -75.58 },
    { lat: 6.24, lon: -75.58 },
  ])
  assert.ok(idaYVuelta > directo)
  assert.ok(idaYVuelta > 0)
})
