import assert from 'node:assert/strict'
import test from 'node:test'
import { calcularBounds, puntosALinea, recorridosALineas } from './geojson.util.ts'
import type { ObraVisor } from '../../types/obra.types'
import type { PuntoTrazo, RecorridoSeguimiento } from '../../types/seguimiento.types'

const punto = (lat: number, lon: number): PuntoTrazo => ({ lat, lon, ts: 0 })

const recorrido = (id: string, trazo: PuntoTrazo[]): RecorridoSeguimiento =>
  ({ id, trazo, tipo: 'visita' }) as RecorridoSeguimiento

const obra = (obraId: number, latitud: number | null, longitud: number | null): ObraVisor =>
  ({ obraId, latitud, longitud }) as ObraVisor

test('un trazo de menos de dos puntos no dibuja linea', () => {
  assert.equal(puntosALinea([]).features.length, 0)
  assert.equal(puntosALinea([punto(6.24, -75.58)]).features.length, 0)
})

test('puntosALinea invierte a [lon, lat], que es el orden de GeoJSON', () => {
  const [feature] = puntosALinea([punto(6.24, -75.58), punto(6.25, -75.57)]).features
  assert.deepEqual(feature.geometry.coordinates, [
    [-75.58, 6.24],
    [-75.57, 6.25],
  ])
})

test('recorridosALineas descarta los trazos de menos de dos puntos', () => {
  const coleccion = recorridosALineas([
    recorrido('sin-trazo', []),
    recorrido('un-punto', [punto(6.24, -75.58)]),
    recorrido('valido', [punto(6.24, -75.58), punto(6.25, -75.57)]),
  ])
  assert.equal(coleccion.features.length, 1)
  assert.equal(coleccion.features[0].properties.recorridoId, 'valido')
})

test('sin obras con coordenadas no hay bounds que encuadrar', () => {
  assert.equal(calcularBounds([]), null)
  assert.equal(calcularBounds([obra(1, null, null)]), null)
})

test('calcularBounds ignora las obras sin coordenadas en vez de romper', () => {
  const bounds = calcularBounds([obra(1, 6.2, -75.6), obra(2, null, null), obra(3, 6.3, -75.5)])
  assert.deepEqual(bounds, [
    [-75.6, 6.2],
    [-75.5, 6.3],
  ])
})

test('una sola obra da bounds de area cero, no null', () => {
  assert.deepEqual(calcularBounds([obra(1, 6.24, -75.58)]), [
    [-75.58, 6.24],
    [-75.58, 6.24],
  ])
})
