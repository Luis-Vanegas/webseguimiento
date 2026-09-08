import assert from 'node:assert/strict'
import test from 'node:test'
import { resumirVisitas } from './resumen-visitas.util.ts'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

const visita = (vistoGerencia: boolean, alertas: number): VisitaSeguimiento =>
  ({ vistoGerencia, alertas: Array.from({ length: alertas }, () => ({})) }) as VisitaSeguimiento

test('sin visitas la cobertura es 0, no NaN', () => {
  const r = resumirVisitas([])
  assert.equal(r.cobertura, 0)
  assert.equal(r.total, 0)
  assert.equal(r.sinRevisar, 0)
})

test('cobertura es el porcentaje de revisadas sobre el total', () => {
  const r = resumirVisitas([visita(true, 0), visita(true, 0), visita(false, 0), visita(false, 0)])
  assert.equal(r.revisadas, 2)
  assert.equal(r.sinRevisar, 2)
  assert.equal(r.cobertura, 50)
})

test('la cobertura se redondea en vez de arrastrar decimales', () => {
  assert.equal(resumirVisitas([visita(true, 0), visita(false, 0), visita(false, 0)]).cobertura, 33)
})

test('conAlertas cuenta visitas, no alertas', () => {
  const r = resumirVisitas([visita(false, 3), visita(false, 2), visita(false, 0)])
  assert.equal(r.conAlertas, 2)
})

test('una visita sin el campo alertas no rompe el conteo', () => {
  assert.equal(resumirVisitas([{ vistoGerencia: false } as VisitaSeguimiento]).conAlertas, 0)
})
