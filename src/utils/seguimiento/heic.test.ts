import assert from 'node:assert/strict'
import test from 'node:test'
import { esArchivoHeic, esRutaHeic } from './heic.util.ts'

// convertirBlobHeicAJpeg queda fuera: depende de heic2any (WASM real) y de
// un Blob de imagen válido — no vale la pena mockearlo acá, se cubre mejor
// con un test de componente/E2E cuando se sume esa capa.

test('esRutaHeic detecta la extensión heic/heif sin importar mayúsculas', () => {
  assert.equal(esRutaHeic('visitas/foo.heic'), true)
  assert.equal(esRutaHeic('visitas/foo.HEIF'), true)
  assert.equal(esRutaHeic('visitas/foo.jpg'), false)
  assert.equal(esRutaHeic('visitas/foo.heic.jpg'), false)
})

test('esArchivoHeic detecta por mime type', () => {
  const archivo = new File([], 'foto.bin', { type: 'image/heic' })
  assert.equal(esArchivoHeic(archivo), true)
})

test('esArchivoHeic detecta por extensión cuando el navegador no informa el mime type', () => {
  const archivo = new File([], 'foto.heic', { type: '' })
  assert.equal(esArchivoHeic(archivo), true)
})

test('esArchivoHeic devuelve false para un jpg normal', () => {
  const archivo = new File([], 'foto.jpg', { type: 'image/jpeg' })
  assert.equal(esArchivoHeic(archivo), false)
})
