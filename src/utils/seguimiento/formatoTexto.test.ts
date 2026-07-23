import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parsearTextoConFormato } from './formatoTexto.util.ts'

describe('parsearTextoConFormato', () => {
  it('devuelve un solo párrafo para texto plano sin marcadores', () => {
    const bloques = parsearTextoConFormato('avance normal')
    assert.deepEqual(bloques, [
      { tipo: 'parrafo', lineas: [[{ tipo: 'texto', contenido: 'avance normal' }]] },
    ])
  })

  it('reconoce negrita e itálica en la misma línea', () => {
    const bloques = parsearTextoConFormato('**urgente** revisar *cimentación*')
    assert.deepEqual(bloques, [
      {
        tipo: 'parrafo',
        lineas: [
          [
            { tipo: 'negrita', contenido: 'urgente' },
            { tipo: 'texto', contenido: ' revisar ' },
            { tipo: 'italica', contenido: 'cimentación' },
          ],
        ],
      },
    ])
  })

  it('agrupa líneas que empiezan con "- " en un bloque de lista', () => {
    const bloques = parsearTextoConFormato('Pendientes:\n- revisar planos\n- pedir permiso')
    assert.deepEqual(bloques, [
      { tipo: 'parrafo', lineas: [[{ tipo: 'texto', contenido: 'Pendientes:' }]] },
      {
        tipo: 'lista',
        items: [
          [{ tipo: 'texto', contenido: 'revisar planos' }],
          [{ tipo: 'texto', contenido: 'pedir permiso' }],
        ],
      },
    ])
  })

  it('vuelve a un párrafo si el texto sigue después de una lista', () => {
    const bloques = parsearTextoConFormato('- uno\n- dos\notra cosa')
    assert.equal(bloques.length, 2)
    assert.equal(bloques[0].tipo, 'lista')
    assert.equal(bloques[1].tipo, 'parrafo')
  })

  it('devuelve un array vacío para texto vacío', () => {
    assert.deepEqual(parsearTextoConFormato(''), [])
  })
})
