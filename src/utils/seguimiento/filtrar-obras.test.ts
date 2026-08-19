import assert from 'node:assert/strict'
import test from 'node:test'
import { FILTROS_MAPA_VACIOS, OBRAS_POR_VISITAR, filtrarObras, opcionesDeDimension } from './filtrar-obras.util.ts'
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
    subproyectoEstrategico: null,
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

test('soloPorVisitar deja únicamente las obras de la agenda priorizada', () => {
  const obras = [
    obra({ obraId: 2273 }), // ReCreo Cultural El Jordán — está en la agenda
    obra({ obraId: 900 }), // Recreo Los Alpes — está en la agenda
    obra({ obraId: 999999 }), // fuera de la agenda
  ]
  const resultado = filtrarObras(obras, new Map(), { ...FILTROS_MAPA_VACIOS, soloPorVisitar: true })
  assert.deepEqual(resultado.map((o) => o.obraId), [2273, 900])
})

test('la agenda tiene las 18 obras confirmadas contra el Visor', () => {
  assert.equal(OBRAS_POR_VISITAR.size, 18)
})

test('soloPorVisitar acota las opciones de los demás selects', () => {
  const obras = [
    obra({ obraId: 2273, comuna: 'La América' }),
    obra({ obraId: 999999, comuna: 'Belén' }),
  ]
  const opciones = opcionesDeDimension(
    obras,
    new Map(),
    { ...FILTROS_MAPA_VACIOS, soloPorVisitar: true },
    'comuna',
  )
  assert.deepEqual(opciones, ['La América'])
})
