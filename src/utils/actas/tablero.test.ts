import assert from 'node:assert/strict'
import test from 'node:test'
import { claveDeDate } from '../seguimiento/fechas.util.ts'
import { contarEstados, diasRestantes, resumenPorOrigen, semaforo } from './tablero.util.ts'

function fechaRelativa(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return claveDeDate(d)
}

test('diasRestantes ignores completed and undated commitments', () => {
  assert.equal(diasRestantes({ fechaVencimiento: fechaRelativa(3), estado: 'Completada' }), null)
  assert.equal(diasRestantes({ fechaVencimiento: null, estado: 'Pendiente' }), null)
  assert.equal(diasRestantes({ fechaVencimiento: fechaRelativa(3), estado: 'Pendiente' }), 3)
})

test('semaforo: overdue red, due within 7 days orange', () => {
  assert.equal(semaforo({ fechaVencimiento: fechaRelativa(-1), estado: 'Crítica' }), 'vencida')
  assert.equal(semaforo({ fechaVencimiento: fechaRelativa(7), estado: 'Pendiente' }), 'proxima')
  assert.equal(semaforo({ fechaVencimiento: fechaRelativa(8), estado: 'Pendiente' }), 'normal')
  assert.equal(semaforo({ fechaVencimiento: null, estado: 'Pendiente' }), 'sin-fecha')
})

test('contarEstados and resumenPorOrigen match the Excel dashboard', () => {
  const lista = [
    { actaId: 'a', estado: 'Completada' as const },
    { actaId: 'a', estado: 'Pendiente' as const },
    { actaId: 'b', estado: 'Crítica' as const },
  ]
  assert.deepEqual(contarEstados(lista), {
    Pendiente: 1, 'En progreso': 0, Crítica: 1, Completada: 1, total: 3,
  })
  const resumen = resumenPorOrigen(lista, new Map([['a', 'Plan Piscinas'], ['b', 'Comité Directivo']]))
  assert.deepEqual(resumen.map((r) => [r.origen, r.total, r.avance]), [
    ['Plan Piscinas', 2, 0.5],
    ['Comité Directivo', 1, 0],
  ])
})
