import assert from 'node:assert/strict'
import test from 'node:test'
import { agruparPortafolio } from './portafolio.util.ts'
import { ETAPAS_OBRA } from './etapas.util.ts'
import { claveDeDate } from './fechas.util.ts'
import type { EtapaObra, ObraVisor } from '../../types/obra.types.ts'

function etapas(parciales: Partial<Record<(typeof ETAPAS_OBRA)[number], Partial<EtapaObra>>>): EtapaObra[] {
  return ETAPAS_OBRA.map((nombre) => ({
    nombre,
    porcentaje: 0,
    noAplica: false,
    ...parciales[nombre],
  }))
}

function obra(overrides: Partial<ObraVisor>): ObraVisor {
  return {
    obraId: 1,
    nombre: 'Obra',
    dependencia: null,
    comuna: null,
    barrio: null,
    direccion: null,
    latitud: null,
    longitud: null,
    presupuestoOficial: 0,
    porcentajeAvanceOficial: 0,
    proyectoEstrategico: null,
    subproyectoEstrategico: null,
    entregada: false,
    estado: null,
    descripcion: null,
    fechaRealEntrega: null,
    fechaEstimadaEntrega: null,
    etapas: etapas({}),
    ...overrides,
  }
}

function enDias(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return claveDeDate(fecha)
}

test('agruparPortafolio clasifica cada obra en su parada', () => {
  const previasCompletas = (hasta: (typeof ETAPAS_OBRA)[number]) =>
    Object.fromEntries(
      ETAPAS_OBRA.slice(0, ETAPAS_OBRA.indexOf(hasta)).map((n) => [n, { porcentaje: 100 }]),
    )

  const enPlaneacion = obra({ obraId: 1, etapas: etapas({ 'Planeación (MGA)': { porcentaje: 10 } }) })
  const enEjecucion = obra({
    obraId: 2,
    etapas: etapas({ ...previasCompletas('Ejecución obra'), 'Ejecución obra': { porcentaje: 50 } }),
  })
  const porEntregar = obra({
    obraId: 3,
    etapas: etapas({ ...previasCompletas('Ejecución obra'), 'Ejecución obra': { porcentaje: 95 } }),
    fechaEstimadaEntrega: enDias(5),
  })
  const entregada = obra({ obraId: 4, entregada: true })

  const resultado = agruparPortafolio([enPlaneacion, enEjecucion, porEntregar, entregada])

  assert.deepEqual(resultado.planeacion.map((o) => o.obraId), [1])
  assert.deepEqual(resultado.ejecucion.map((o) => o.obraId), [2])
  assert.deepEqual(resultado.porEntregar.map((o) => o.obraId), [3])
  assert.deepEqual(resultado.entregadas.map((o) => o.obraId), [4])
})

test('la entrega próxima gana sobre la etapa de ejecución (no se repite en las dos)', () => {
  const o = obra({
    obraId: 1,
    etapas: etapas({ 'Ejecución obra': { porcentaje: 90 } }),
    fechaEstimadaEntrega: enDias(2),
  })
  const resultado = agruparPortafolio([o])
  assert.deepEqual(resultado.porEntregar.map((x) => x.obraId), [1])
  assert.deepEqual(resultado.ejecucion, [])
})

test('una obra sin entrega inminente y en Liquidación no cae en ninguna parada', () => {
  const o = obra({
    obraId: 1,
    etapas: etapas(Object.fromEntries(ETAPAS_OBRA.slice(0, -1).map((n) => [n, { porcentaje: 100 }]))),
  })
  const resultado = agruparPortafolio([o])
  assert.equal(resultado.planeacion.length, 0)
  assert.equal(resultado.ejecucion.length, 0)
  assert.equal(resultado.porEntregar.length, 0)
  assert.equal(resultado.entregadas.length, 0)
})
