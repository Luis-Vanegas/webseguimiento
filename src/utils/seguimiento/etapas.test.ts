import assert from 'node:assert/strict'
import test from 'node:test'
import { ETAPAS_OBRA, estaEnEjecucion, estaEnPlaneacion, etapaActual, etiquetaEtapa } from './etapas.util.ts'
import type { EtapaObra, ObraVisor } from '../../types/obra.types.ts'

function etapas(parciales: Partial<Record<(typeof ETAPAS_OBRA)[number], Partial<EtapaObra>>>): EtapaObra[] {
  return ETAPAS_OBRA.map((nombre) => ({
    nombre,
    porcentaje: 0,
    noAplica: false,
    ...parciales[nombre],
  }))
}

function obra(etapasObra: EtapaObra[]): ObraVisor {
  return {
    obraId: 1,
    nombre: 'Obra de prueba',
    dependencia: null,
    comuna: null,
    barrio: null,
    direccion: null,
    latitud: null,
    longitud: null,
    presupuestoOficial: 0,
    porcentajeAvanceOficial: 0,
    proyectoEstrategico: null,
    entregada: false,
    estado: null,
    descripcion: null,
    fechaRealEntrega: null,
    fechaEstimadaEntrega: null,
    etapas: etapasObra,
  }
}

test('etiquetaEtapa traduce las siglas técnicas', () => {
  assert.equal(etiquetaEtapa('Planeación (MGA)'), 'Planeación')
  assert.equal(etiquetaEtapa('Licencias (Curaduría)'), 'Licencias de construcción')
})

test('etiquetaEtapa devuelve el nombre crudo si no está mapeado', () => {
  assert.equal(etiquetaEtapa('Fase inventada'), 'Fase inventada')
})

test('etapaActual devuelve la primera etapa no completa, saltando noAplica', () => {
  const o = obra(
    etapas({
      'Planeación (MGA)': { porcentaje: 100 },
      'Estudios preliminares': { noAplica: true },
      'Viabilización (DAP)': { porcentaje: 40 },
    }),
  )
  assert.equal(etapaActual(o)?.nombre, 'Viabilización (DAP)')
})

test('etapaActual devuelve null si todas las etapas que aplican están al 100%', () => {
  const o = obra(etapas(Object.fromEntries(ETAPAS_OBRA.map((n) => [n, { porcentaje: 100 }]))))
  assert.equal(etapaActual(o), null)
})

test('estaEnPlaneacion es true en las primeras 3 fases', () => {
  const o = obra(etapas({ 'Viabilización (DAP)': { porcentaje: 20 } }))
  assert.equal(estaEnPlaneacion(o), true)
})

test('estaEnPlaneacion es false una vez pasada la etapa de licencias', () => {
  const o = obra(
    etapas({
      'Planeación (MGA)': { porcentaje: 100 },
      'Estudios preliminares': { porcentaje: 100 },
      'Viabilización (DAP)': { porcentaje: 100 },
      'Licencias (Curaduría)': { porcentaje: 100 },
      'Gestión predial': { porcentaje: 30 },
    }),
  )
  assert.equal(estaEnPlaneacion(o), false)
})

test('estaEnEjecucion es true de Contratación a Ejecución obra', () => {
  const o = obra(
    etapas({
      'Planeación (MGA)': { porcentaje: 100 },
      'Estudios preliminares': { porcentaje: 100 },
      'Viabilización (DAP)': { porcentaje: 100 },
      'Licencias (Curaduría)': { porcentaje: 100 },
      'Gestión predial': { porcentaje: 100 },
      'Ejecución obra': { porcentaje: 45 },
    }),
  )
  assert.equal(estaEnEjecucion(o), true)
})

test('estaEnEjecucion es false en planeación y false ya entregada', () => {
  const enPlaneacion = obra(etapas({ 'Planeación (MGA)': { porcentaje: 10 } }))
  assert.equal(estaEnEjecucion(enPlaneacion), false)

  const entregada = obra(etapas(Object.fromEntries(ETAPAS_OBRA.map((n) => [n, { porcentaje: 100 }]))))
  assert.equal(estaEnEjecucion(entregada), false)
})
