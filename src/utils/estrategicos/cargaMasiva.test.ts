import assert from 'node:assert/strict'
import test from 'node:test'
import { aCsv, aPayload, normalizar, procesarFilas, type Celda } from './cargaMasiva.util.ts'

const catalogo = {
  dependencias: [{ cenGestor: 71100000, nombre: 'Secretaría de Educación' }],
  estrategicos: [
    { id: 1, nombre: 'Mayor cuidado' },
    { id: 2, nombre: 'Cultura ciudadana' },
  ],
}
const reporta = { nombre: 'Ana Pérez', correo: '' }
const ENC: Celda[] = ['Vigencia', 'Dependencia', 'BPIN', 'SAP', 'Nombre', 'Ini', 'Act', 'Eje', 'Estratégico', '%']
const fila = (est: string, pct: Celda, extra: Partial<Record<number, Celda>> = {}): Celda[] => {
  const f: Celda[] = [2026, 'Secretaria de educacion', 2020050010401, '200328', 'PROYECTO X', 1000, 2000, 1500, est, pct]
  for (const [i, v] of Object.entries(extra)) f[Number(i)] = v
  return f
}

test('agrupa filas del mismo proyecto y arma el payload', () => {
  const { grupos, errorArchivo } = procesarFilas([ENC, fila('Mayor cuidado', '45%'), fila('cultura ciudadana', 55), []], catalogo, reporta)
  assert.equal(errorArchivo, null)
  assert.equal(grupos.length, 1)
  assert.deepEqual(grupos[0].errores, [])
  assert.deepEqual(grupos[0].filas, [2, 3])
  const p = aPayload(grupos[0])
  assert.equal(p.cod_bpin, '2020050010401') // número de Excel → texto sin notación científica
  assert.equal(p.cen_gestor, 71100000) // nombre sin tildes encontrado igual
  assert.deepEqual(p.aportes, [
    { proyecto_estrategico_id: 1, porcentaje: 45 },
    { proyecto_estrategico_id: 2, porcentaje: 55 },
  ])
})

test('marca datos distintos entre filas, nombres desconocidos y suma > 100', () => {
  const { grupos } = procesarFilas(
    [ENC, fila('Mayor cuidado', 80), fila('Inventado', 10, { 7: 999 }), fila('Cultura ciudadana', 30)],
    catalogo,
    reporta,
  )
  const e = grupos[0].errores
  assert.ok(e.includes('Fila 3: Ejecución financiera distinto al de la fila 2 del mismo proyecto.'))
  assert.ok(e.includes('Fila 3: el proyecto estratégico «Inventado» no está en la lista.'))
  assert.ok(e.includes('La suma de porcentajes supera el 100 %.'))
  assert.ok(!e.some((m) => m.includes('Elige el proyecto estratégico')))
})

test('rechaza montos negativos, dependencia desconocida y archivo vacío', () => {
  const { grupos } = procesarFilas([ENC, fila('Mayor cuidado', 10, { 1: 'Secretaría Falsa', 5: -5 })], catalogo, reporta)
  const e = grupos[0].errores
  assert.ok(e.includes('Fila 2: la dependencia «Secretaría Falsa» no está en la lista.'))
  assert.ok(e.some((m) => m.startsWith('Presupuesto inicial:')))
  assert.equal(procesarFilas([ENC], catalogo, reporta).errorArchivo, 'El archivo no tiene filas con datos en la hoja «Reporte».')
})

test('advierte porcentajes escritos como fracción', () => {
  const { grupos } = procesarFilas([ENC, fila('Mayor cuidado', 0.45)], catalogo, reporta)
  assert.equal(grupos[0].advertencias.length, 1)
})

test('normalizar y CSV seguro para Excel', () => {
  assert.equal(normalizar('  Agencia ... SAPIENCIA. '), 'agencia ... sapiencia')
  assert.equal(aCsv([['a;b', '=1+1']]), '﻿"a;b";\'=1+1')
})
