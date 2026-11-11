import assert from 'node:assert/strict'
import test from 'node:test'
import { aCsv, aPayload, normalizar, procesarFilas, resolverAporte, type Celda } from './cargaMasiva.util.ts'

const catalogo = {
  dependencias: [{ cenGestor: 71100000, nombre: 'Secretaría de Educación' }],
  estrategicos: [
    { id: 1, nombre: 'Mayor cuidado' },
    { id: 2, nombre: 'Cultura ciudadana' },
  ],
}
const reporta = { nombre: 'Ana Pérez', correo: '' }
const ENC: Celda[] = ['Vigencia', 'Dependencia', 'SAP', 'Nombre', 'Ini', 'Act', 'Eje', 'Estratégico', '%', 'Valor']
// Columnas: vigencia, dependencia, SAP, nombre, ppto ini, ppto act, ejecución, estratégico, %, valor
const fila = (est: string, pct: Celda, valor: Celda = null, extra: Partial<Record<number, Celda>> = {}): Celda[] => {
  const f: Celda[] = [2026, 'Secretaria de educacion', 200328, 'PROYECTO X', 1000, 2000, 1500, est, pct, valor]
  for (const [i, v] of Object.entries(extra)) f[Number(i)] = v
  return f
}

test('agrupa por vigencia + SAP y completa el valor desde el %', () => {
  const { grupos, errorArchivo } = procesarFilas([ENC, fila('Mayor cuidado', '45%'), fila('cultura ciudadana', 55), []], catalogo, reporta)
  assert.equal(errorArchivo, null)
  assert.equal(grupos.length, 1)
  assert.deepEqual(grupos[0].errores, [])
  const p = aPayload(grupos[0])
  assert.equal(p.cod_sap, '200328') // número de Excel → texto
  assert.equal(p.cen_gestor, 71100000) // nombre sin tildes encontrado igual
  assert.deepEqual(p.aportes, [
    { proyecto_estrategico_id: 1, porcentaje: 45, valor_aportado: 675 },
    { proyecto_estrategico_id: 2, porcentaje: 55, valor_aportado: 825 },
  ])
})

test('regla UIP: la suma de % de un proyecto de inversión no supera el 100 %', () => {
  const { grupos } = procesarFilas([ENC, fila('Mayor cuidado', 60), fila('Cultura ciudadana', 40.5)], catalogo, reporta)
  assert.ok(grupos[0].errores.includes('La suma de porcentajes de este proyecto supera el 100 %.'))
  // Exactamente 100 % es válido.
  const ok = procesarFilas([ENC, fila('Mayor cuidado', '33,33'), fila('Cultura ciudadana', '66,67')], catalogo, reporta)
  assert.deepEqual(ok.grupos[0].errores, [])
})

test('solo valor: calcula el %; y ese % también cuenta para el 100 %', () => {
  const { grupos } = procesarFilas([ENC, fila('Mayor cuidado', null, 750)], catalogo, reporta)
  assert.deepEqual(grupos[0].errores, [])
  assert.equal(aPayload(grupos[0]).aportes[0].porcentaje, 50)
  const excede = procesarFilas([ENC, fila('Mayor cuidado', null, 1000), fila('Cultura ciudadana', null, 1000)], catalogo, reporta)
  assert.ok(excede.grupos[0].errores.includes('La suma de porcentajes de este proyecto supera el 100 %.'))
})

test('resolverAporte: vacío es error, valor incoherente es advertencia', () => {
  assert.equal(resolverAporte('', null, 1500).error, 'escribe el porcentaje o el presupuesto que aporta.')
  assert.equal(resolverAporte('', 100, 0).error, 'con ejecución financiera en 0 o vacía escribe el porcentaje.')
  assert.ok(resolverAporte('45', 999999, 1500).advertencia)
  assert.equal(resolverAporte('45', 675, 1500).advertencia, undefined)
})

test('marca datos distintos entre filas, nombres desconocidos y SAP vacío', () => {
  const { grupos } = procesarFilas(
    [ENC, fila('Mayor cuidado', 50), fila('Inventado', 10, null, { 6: 999 })],
    catalogo,
    reporta,
  )
  const e = grupos[0].errores
  assert.ok(e.includes('Fila 3: Ejecución financiera distinto al de la fila 2 del mismo proyecto.'))
  assert.ok(e.includes('Fila 3: el proyecto estratégico «Inventado» no está en la lista.'))
  assert.ok(!e.some((m) => m.includes('Elige el proyecto estratégico')))
  const sinSap = procesarFilas([ENC, fila('Mayor cuidado', 10, null, { 2: '' })], catalogo, reporta)
  assert.ok(sinSap.grupos[0].errores.includes('Código SAP: Obligatorio, solo números.'))
})

test('rechaza montos negativos, dependencia desconocida y archivo vacío', () => {
  const { grupos } = procesarFilas([ENC, fila('Mayor cuidado', 10, null, { 1: 'Secretaría Falsa', 4: -5 })], catalogo, reporta)
  const e = grupos[0].errores
  assert.ok(e.includes('Fila 2: la dependencia «Secretaría Falsa» no está en la lista.'))
  assert.ok(e.some((m) => m.startsWith('Presupuesto inicial:')))
  assert.equal(procesarFilas([ENC], catalogo, reporta).errorArchivo, 'El archivo no tiene filas con datos en la hoja «Reporte».')
})

test('normalizar y CSV seguro para Excel', () => {
  assert.equal(normalizar('  Agencia ... SAPIENCIA. '), 'agencia ... sapiencia')
  assert.equal(aCsv([['a;b', '=1+1']]), '﻿"a;b";\'=1+1')
})
