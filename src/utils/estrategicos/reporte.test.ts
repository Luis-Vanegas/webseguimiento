import assert from 'node:assert/strict'
import test from 'node:test'
import {
  codigoReporte,
  formatearMonto,
  parsearMonto,
  parsearPorcentaje,
  sumaPorcentajes,
  validarAportes,
  valorAportado,
} from './reporte.util.ts'

test('parsearMonto acepta separadores de miles y rechaza vacío', () => {
  assert.equal(parsearMonto('1.234.567'), 1234567)
  assert.equal(parsearMonto('$ 47967940517'), 47967940517)
  assert.equal(parsearMonto(''), null)
  assert.equal(parsearMonto(formatearMonto(88659885969)), 88659885969)
})

test('parsearPorcentaje acepta coma decimal', () => {
  assert.equal(parsearPorcentaje('45,5'), 45.5)
  assert.equal(parsearPorcentaje('abc'), null)
})

test('valorAportado reproduce el cálculo del Excel (ejecución × %)', () => {
  // Fila 8 del Excel: 64.204.662.973 × 45 % = 28.892.098.337,85
  assert.equal(valorAportado(64204662973, '45'), 28892098338)
  assert.equal(valorAportado(null, '45'), null)
})

test('validarAportes detecta repetidos, rangos y suma > 100', () => {
  const ok = validarAportes([
    { proyectoEstrategicoId: 1, porcentaje: '33,33' },
    { proyectoEstrategicoId: 2, porcentaje: '33,33' },
    { proyectoEstrategicoId: 3, porcentaje: '33,34' },
  ])
  assert.deepEqual(ok, { porFila: {}, general: null })

  const mal = validarAportes([
    { proyectoEstrategicoId: 1, porcentaje: '80' },
    { proyectoEstrategicoId: 1, porcentaje: '30' },
    { proyectoEstrategicoId: null, porcentaje: '0' },
  ])
  assert.equal(mal.porFila[1], 'Este proyecto ya está en la lista.')
  assert.equal(mal.porFila[2], 'Elige el proyecto estratégico.')
  assert.equal(mal.general, 'La suma de porcentajes supera el 100 %.')
  assert.equal(validarAportes([]).general, 'Agrega al menos un proyecto estratégico.')
  assert.equal(sumaPorcentajes([{ proyectoEstrategicoId: 1, porcentaje: '' }]), 0)
})

test('codigoReporte', () => {
  assert.equal(codigoReporte(7), 'REP-0007')
})
