import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DIAS_DESATENDIDA,
  DIAS_PROXIMA_ENTREGA,
  claveDeDate,
  claveDia,
  diasHasta,
  estaDesatendida,
  estaProximaAEntregar,
} from './fechas.util.ts'

// Fechas calculadas relativas a "hoy" (no hardcodeadas) para que el test no
// se vuelva frágil ni dependa de mockear el reloj del sistema.
function fechaRelativa(diasDesdeHoy: number): string {
  const hoy = new Date()
  return claveDeDate(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + diasDesdeHoy))
}

test('claveDia deja un texto YYYY-MM-DD tal cual, sin pasar por Date/UTC', () => {
  // Este es justo el caso que rompía en Colombia (UTC-5): parsear
  // '2026-03-05' con `new Date()` la interpreta como medianoche UTC, que cae
  // el día anterior al formatear en huso local.
  assert.equal(claveDia('2026-03-05'), '2026-03-05')
  assert.equal(claveDia('2026-03-05T10:00:00.000Z'), '2026-03-05')
})

test('claveDia normaliza otros formatos a la fecha LOCAL', () => {
  const local = new Date(2026, 2, 5) // 5 de marzo, medianoche local
  assert.equal(claveDia(local.toString()), '2026-03-05')
})

test('claveDeDate arma YYYY-MM-DD con padding de mes y día', () => {
  assert.equal(claveDeDate(new Date(2026, 0, 3)), '2026-01-03')
  assert.equal(claveDeDate(new Date(2026, 10, 21)), '2026-11-21')
})

test('diasHasta: 0 hoy, positivo a futuro, negativo a pasado', () => {
  assert.equal(diasHasta(fechaRelativa(0)), 0)
  assert.equal(diasHasta(fechaRelativa(5)), 5)
  assert.equal(diasHasta(fechaRelativa(-5)), -5)
})

test('estaProximaAEntregar: true justo en el borde de la ventana, false pasado el borde', () => {
  assert.equal(
    estaProximaAEntregar({ entregada: false, fechaEstimadaEntrega: fechaRelativa(DIAS_PROXIMA_ENTREGA) }),
    true,
  )
  assert.equal(
    estaProximaAEntregar({ entregada: false, fechaEstimadaEntrega: fechaRelativa(DIAS_PROXIMA_ENTREGA + 1) }),
    false,
  )
})

test('estaProximaAEntregar: false si ya pasó la fecha o no tiene fecha', () => {
  assert.equal(estaProximaAEntregar({ entregada: false, fechaEstimadaEntrega: fechaRelativa(-1) }), false)
  assert.equal(estaProximaAEntregar({ entregada: false, fechaEstimadaEntrega: null }), false)
})

test('estaProximaAEntregar: una obra entregada nunca es "próxima a entregar"', () => {
  assert.equal(estaProximaAEntregar({ entregada: true, fechaEstimadaEntrega: fechaRelativa(1) }), false)
})

test('estaDesatendida: sin visita registrada nunca, true', () => {
  assert.equal(estaDesatendida(undefined), true)
})

test('estaDesatendida: visita reciente false, visita vieja (> DIAS_DESATENDIDA) true', () => {
  assert.equal(estaDesatendida(fechaRelativa(-5)), false)
  assert.equal(estaDesatendida(fechaRelativa(-(DIAS_DESATENDIDA + 1))), true)
})
