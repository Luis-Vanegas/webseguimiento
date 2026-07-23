import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { puedeBorrar } from './permisos.util.ts'

const visitador = { id: 'a', nombre: 'A', rol: 'visitador' as const, activo: true }
const ingeniero = { id: 'b', nombre: 'B', rol: 'ingeniero' as const, activo: true }
const visualizador = { id: 'c', nombre: 'C', rol: 'visualizador' as const, activo: true }

describe('puedeBorrar', () => {
  it('permite al autor borrar lo suyo', () => {
    assert.equal(puedeBorrar('a', visitador), true)
  })

  it('permite a cualquier ingeniero borrar de otro autor', () => {
    assert.equal(puedeBorrar('a', ingeniero), true)
  })

  it('no permite a un visitador borrar lo de otro', () => {
    assert.equal(puedeBorrar('otro-autor', visitador), false)
  })

  it('no permite a un visualizador borrar nada ajeno', () => {
    assert.equal(puedeBorrar('otro-autor', visualizador), false)
  })

  it('no permite borrar sin usuario autenticado', () => {
    assert.equal(puedeBorrar('a', null), false)
  })
})
