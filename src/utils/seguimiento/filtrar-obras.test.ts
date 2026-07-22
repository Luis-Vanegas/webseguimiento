import assert from 'node:assert/strict'
import test from 'node:test'
import { FILTROS_MAPA_VACIOS, filtrarObras, opcionesDeDimension } from './filtrar-obras.util.ts'
import type { ObraVisor } from '../../types/obra.types.ts'

function obra(overrides: Partial<ObraVisor>): ObraVisor {
  return {
    obraId: 1,
    nombre: 'Obra',
    dependencia: null,
    comuna: null,
    barrio: null,
    direccion: null,
    latitud: 6.24,
    longitud: -75.58,
    presupuestoOficial: 0,
    porcentajeAvanceOficial: 0,
    proyectoEstrategico: null,
    entregada: false,
    estado: null,
    descripcion: null,
    fechaRealEntrega: null,
    fechaEstimadaEntrega: null,
    etapas: [],
    ...overrides,
  }
}

const OBRAS = [
  obra({ obraId: 1, comuna: 'Belén', proyectoEstrategico: 'Parques', dependencia: 'INDER' }),
  obra({ obraId: 2, comuna: 'Belén', proyectoEstrategico: 'Vías', dependencia: 'Infraestructura' }),
  obra({ obraId: 3, comuna: 'Robledo', proyectoEstrategico: 'Parques', dependencia: 'Infraestructura' }),
]

test('sin filtros devuelve todas las obras con coordenadas', () => {
  const resultado = filtrarObras(OBRAS, new Map(), FILTROS_MAPA_VACIOS)
  assert.equal(resultado.length, 3)
})

test('descarta obras sin latitud/longitud', () => {
  const conUnaSinCoordenadas = [...OBRAS, obra({ obraId: 4, latitud: null })]
  const resultado = filtrarObras(conUnaSinCoordenadas, new Map(), FILTROS_MAPA_VACIOS)
  assert.equal(resultado.length, 3)
})

test('filtra por comuna', () => {
  const resultado = filtrarObras(OBRAS, new Map(), { ...FILTROS_MAPA_VACIOS, comunaFiltro: 'Robledo' })
  assert.deepEqual(resultado.map((o) => o.obraId), [3])
})

test('cruza comuna y proyecto a la vez', () => {
  const resultado = filtrarObras(OBRAS, new Map(), {
    ...FILTROS_MAPA_VACIOS,
    comunaFiltro: 'Belén',
    proyectoFiltro: 'Vías',
  })
  assert.deepEqual(resultado.map((o) => o.obraId), [2])
})

test('opcionesDeDimension acota proyecto según la comuna elegida', () => {
  const opciones = opcionesDeDimension(
    OBRAS,
    new Map(),
    { ...FILTROS_MAPA_VACIOS, comunaFiltro: 'Robledo' },
    'proyecto',
  )
  assert.deepEqual(opciones, ['Parques'])
})

test('opcionesDeDimension no se acota a sí misma (no oculta la ya elegida)', () => {
  const opciones = opcionesDeDimension(
    OBRAS,
    new Map(),
    { ...FILTROS_MAPA_VACIOS, comunaFiltro: 'Robledo' },
    'comuna',
  )
  assert.deepEqual(opciones, ['Belén', 'Robledo'])
})

test('opcionesDeDimension de dependencia se acota por proyecto', () => {
  const opciones = opcionesDeDimension(
    OBRAS,
    new Map(),
    { ...FILTROS_MAPA_VACIOS, proyectoFiltro: 'Parques' },
    'dependencia',
  )
  assert.deepEqual(opciones, ['INDER', 'Infraestructura'])
})
