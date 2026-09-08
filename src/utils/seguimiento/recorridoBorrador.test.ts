import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'
import { borrarBorrador, guardarBorrador, leerBorrador } from './recorridoBorrador.util.ts'

// localStorage no existe en Node. Se instala un doble mínimo con la misma
// forma que usa el util; los tests que necesitan que falle lo reemplazan.
function instalarLocalStorage(almacen = new Map<string, string>()) {
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  }
  return almacen
}

function instalarLocalStorageQueFalla() {
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: () => {
      throw new Error('acceso denegado')
    },
    setItem: () => {
      throw new Error('QuotaExceededError')
    },
    removeItem: () => {
      throw new Error('acceso denegado')
    },
  }
}

const punto = { lat: 6.24, lon: -75.58, ts: 1 }

beforeEach(() => instalarLocalStorage())

test('un borrador guardado se recupera igual', () => {
  guardarBorrador({ puntos: [punto], fechaInicio: '2026-09-08T10:00:00.000Z' })
  const leido = leerBorrador()
  assert.deepEqual(leido?.puntos, [punto])
  assert.equal(leido?.fechaInicio, '2026-09-08T10:00:00.000Z')
})

test('sin nada guardado devuelve null en vez de romper', () => {
  assert.equal(leerBorrador(), null)
})

test('borrarBorrador deja el almacenamiento sin el borrador', () => {
  guardarBorrador({ puntos: [punto], fechaInicio: '2026-09-08T10:00:00.000Z' })
  borrarBorrador()
  assert.equal(leerBorrador(), null)
})

test('un JSON corrupto se descarta en vez de propagar el error', () => {
  const almacen = instalarLocalStorage()
  almacen.set('seguimiento:recorrido-borrador', '{ esto no es json')
  assert.equal(leerBorrador(), null)
})

// Estos tres cubren el motivo real del util: si valida de menos, el trazo
// recuperado entra al mapa con una forma que la UI no espera.
test('un borrador sin puntos como array se descarta', () => {
  const almacen = instalarLocalStorage()
  almacen.set('seguimiento:recorrido-borrador', JSON.stringify({ puntos: 'ninguno', fechaInicio: 'x' }))
  assert.equal(leerBorrador(), null)
})

test('un borrador sin fechaInicio se descarta', () => {
  const almacen = instalarLocalStorage()
  almacen.set('seguimiento:recorrido-borrador', JSON.stringify({ puntos: [] }))
  assert.equal(leerBorrador(), null)
})

test('un borrador con puntos vacios sigue siendo valido', () => {
  guardarBorrador({ puntos: [], fechaInicio: '2026-09-08T10:00:00.000Z' })
  assert.deepEqual(leerBorrador()?.puntos, [])
})

// La grabación tiene que seguir en memoria aunque el almacenamiento falle:
// perder el respaldo es aceptable, tirar la excepción y cortar la grabación
// en medio de un recorrido no lo es.
test('si localStorage falla, guardar no tira la excepcion hacia arriba', () => {
  instalarLocalStorageQueFalla()
  assert.doesNotThrow(() => guardarBorrador({ puntos: [punto], fechaInicio: 'x' }))
})

test('si localStorage falla, leer devuelve null en vez de romper', () => {
  instalarLocalStorageQueFalla()
  assert.equal(leerBorrador(), null)
})

test('si localStorage falla, borrar no tira la excepcion hacia arriba', () => {
  instalarLocalStorageQueFalla()
  assert.doesNotThrow(() => borrarBorrador())
})
