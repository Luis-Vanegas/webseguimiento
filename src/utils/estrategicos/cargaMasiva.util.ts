// Convierte las filas de la plantilla Excel en reportes listos para enviar.
// Puro (sin React ni Supabase) para probarlo con node --test.
import type { ReportePayload } from '../../features/estrategicos/estrategicosApi'
import {
  parsearMonto,
  parsearPorcentaje,
  validarAportes,
  validarCampos,
  type AporteBorrador,
  type Campos,
} from './reporte.util.ts'

export type Celda = string | number | boolean | Date | null | undefined

export interface Catalogo {
  dependencias: { cenGestor: number; nombre: string }[]
  estrategicos: { id: number; nombre: string }[]
}

/** Aporte ya resuelto: % y valor siempre presentes cuando la fila es válida. */
export interface AporteCarga extends AporteBorrador {
  valor: number | null
}

/** Un proyecto de inversión del archivo (puede ocupar varias filas). */
export interface GrupoCarga {
  clave: string
  filas: number[]
  campos: Campos
  dependencia: string
  aportes: AporteCarga[]
  nombresEstrategicos: string[]
  errores: string[]
  advertencias: string[]
}

export const MAX_FILAS = 2000

// Orden de columnas de la hoja «Reporte» (plantilla de la UIP del 2026-11-11).
const COL = { vigencia: 0, dependencia: 1, sap: 2, nombre: 3, pptoIni: 4, pptoAct: 5, eje: 6, estrategico: 7, porcentaje: 8, valor: 9 }

/** Minúsculas, sin tildes ni espacios dobles ni punto final: "Secretaría  de Salud." ≈ "secretaria de salud". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/\.$/, '')
}

const texto = (c: Celda): string => (c === null || c === undefined || c instanceof Date ? '' : String(c).trim())

function monto(c: Celda): number | null {
  if (typeof c === 'number') return Number.isFinite(c) && c >= 0 ? Math.round(c) : null
  const t = texto(c)
  // Un signo menos haría que parsearMonto lo leyera como positivo.
  return t.includes('-') ? null : parsearMonto(t)
}

/** Códigos: Excel puede guardarlos como número; se pasan a texto sin notación científica. */
function codigo(c: Celda): string {
  if (typeof c === 'number') return Number.isInteger(c) ? c.toFixed(0) : String(c)
  return texto(c).replace(/\s/g, '')
}

function porcentaje(c: Celda): string {
  if (typeof c === 'number') return String(c)
  return texto(c).replace('%', '').trim()
}

const redondear6 = (n: number) => Math.round(n * 1e6) / 1e6

/**
 * Completa el dato que falte entre % y valor, usando la ejecución financiera como base
 * (mismo criterio del Excel de la UIP). Devuelve un error o una advertencia si aplica.
 */
export function resolverAporte(pctTexto: string, valor: number | null, ejecucion: number | null): {
  porcentaje: string
  valor: number | null
  error?: string
  advertencia?: string
} {
  const pct = pctTexto ? parsearPorcentaje(pctTexto) : null
  if (pctTexto && pct === null) return { porcentaje: pctTexto, valor, error: 'el porcentaje no es un número.' }
  if (pct === null && valor === null) return { porcentaje: '', valor, error: 'escribe el porcentaje o el presupuesto que aporta.' }
  if (pct === null) {
    if (!ejecucion) return { porcentaje: '', valor, error: 'con ejecución financiera en 0 o vacía escribe el porcentaje.' }
    return { porcentaje: String(redondear6((valor! * 100) / ejecucion)), valor }
  }
  const calculado = ejecucion === null ? null : Math.round((ejecucion * pct) / 100)
  if (valor === null) return { porcentaje: String(pct), valor: calculado }
  // Tolerancia: 0,5 % del valor o $1.000, para no marcar diferencias de redondeo.
  if (calculado !== null && Math.abs(calculado - valor) > Math.max(1000, valor * 0.005)) {
    return {
      porcentaje: String(pct),
      valor,
      advertencia: `el presupuesto que aporta no coincide con ${pct} % de la ejecución financiera. Se guardará el valor escrito.`,
    }
  }
  return { porcentaje: String(pct), valor }
}

export function procesarFilas(filas: Celda[][], catalogo: Catalogo, reporta: { nombre: string; correo: string }): {
  grupos: GrupoCarga[]
  errorArchivo: string | null
} {
  const conContenido = filas
    .slice(1) // fila 1 = encabezados
    .map((fila, i) => ({ fila, numero: i + 2 }))
    .filter(({ fila }) => fila.some((c) => texto(c) !== ''))
  if (conContenido.length === 0) return { grupos: [], errorArchivo: 'El archivo no tiene filas con datos en la hoja «Reporte».' }
  if (conContenido.length > MAX_FILAS) return { grupos: [], errorArchivo: `Máximo ${MAX_FILAS} filas por archivo.` }

  const deps = new Map(catalogo.dependencias.map((d) => [normalizar(d.nombre), d]))
  const depsPorCodigo = new Map(catalogo.dependencias.map((d) => [String(d.cenGestor), d]))
  const ests = new Map(catalogo.estrategicos.map((e) => [normalizar(e.nombre), e]))
  const grupos = new Map<string, GrupoCarga>()
  // Filas con un problema ya reportado: no repetir el mensaje genérico de validarAportes.
  const yaReportadas = new Map<string, Set<number>>()

  for (const { fila, numero } of conContenido) {
    const vigencia = codigo(fila[COL.vigencia])
    const sap = codigo(fila[COL.sap])
    const nombreDep = texto(fila[COL.dependencia])
    const dep = deps.get(normalizar(nombreDep)) ?? depsPorCodigo.get(codigo(fila[COL.dependencia]))
    const campos: Campos = {
      vigencia,
      cenGestor: dep?.cenGestor ?? null,
      codSap: sap,
      nomProyecto: texto(fila[COL.nombre]),
      pptoInicial: monto(fila[COL.pptoIni]),
      totalPptoActual: monto(fila[COL.pptoAct]),
      ejeFinanciera: monto(fila[COL.eje]),
      reportadoPor: reporta.nombre,
      correo: reporta.correo,
      observaciones: '',
    }
    const clave = `${vigencia}|${sap}`
    let grupo = grupos.get(clave)
    if (!grupo) {
      grupo = { clave, filas: [], campos, dependencia: dep?.nombre ?? nombreDep, aportes: [], nombresEstrategicos: [], errores: [], advertencias: [] }
      grupos.set(clave, grupo)
      yaReportadas.set(clave, new Set())
      if (nombreDep && !dep) grupo.errores.push(`Fila ${numero}: la dependencia «${nombreDep}» no está en la lista.`)
    } else {
      // Las filas del mismo proyecto deben repetir exactamente los mismos datos.
      for (const k of ['cenGestor', 'nomProyecto', 'pptoInicial', 'totalPptoActual', 'ejeFinanciera'] as const) {
        const a = grupo.campos[k]
        const b = campos[k]
        const distintos = k === 'nomProyecto' ? normalizar(String(a)) !== normalizar(String(b)) : a !== b
        if (distintos) grupo.errores.push(`Fila ${numero}: ${ETIQUETA[k]} distinto al de la fila ${grupo.filas[0]} del mismo proyecto.`)
      }
    }
    const indice = grupo.aportes.length
    grupo.filas.push(numero)

    const nombreEst = texto(fila[COL.estrategico])
    const est = ests.get(normalizar(nombreEst))
    if (nombreEst && !est) {
      grupo.errores.push(`Fila ${numero}: el proyecto estratégico «${nombreEst}» no está en la lista.`)
      yaReportadas.get(clave)!.add(indice)
    }
    const r = resolverAporte(porcentaje(fila[COL.porcentaje]), monto(fila[COL.valor]), grupo.campos.ejeFinanciera)
    if (r.error) {
      grupo.errores.push(`Fila ${numero}: ${r.error}`)
      yaReportadas.get(clave)!.add(indice)
    }
    if (r.advertencia) grupo.advertencias.push(`Fila ${numero}: ${r.advertencia}`)
    if (texto(fila[COL.valor]) && monto(fila[COL.valor]) === null) grupo.errores.push(`Fila ${numero}: el presupuesto que aporta no es válido.`)
    grupo.aportes.push({ proyectoEstrategicoId: est?.id ?? null, porcentaje: r.porcentaje, valor: r.valor })
    grupo.nombresEstrategicos.push(est?.nombre ?? nombreEst)
  }

  for (const g of grupos.values()) {
    for (const [k, msg] of Object.entries(validarCampos(g.campos))) {
      if (k === 'reportadoPor' || k === 'correo') continue // se validan una vez en la página
      if (k === 'cenGestor' && g.errores.some((e) => e.includes('la dependencia «'))) continue // ya reportado
      g.errores.push(`${ETIQUETA[k as keyof Campos] ?? k}: ${msg}`)
    }
    const { porFila, general } = validarAportes(g.aportes)
    for (const [i, msg] of Object.entries(porFila)) {
      if (yaReportadas.get(g.clave)!.has(Number(i))) continue
      g.errores.push(`Fila ${g.filas[Number(i)]}: ${msg}`)
    }
    // Regla de la UIP: los aportes de un proyecto de inversión no superan el 100 %.
    if (general) g.errores.push(general.replace('La suma de porcentajes', 'La suma de porcentajes de este proyecto'))
    if (g.campos.ejeFinanciera !== null && g.campos.totalPptoActual !== null && g.campos.ejeFinanciera > g.campos.totalPptoActual) {
      g.advertencias.push('La ejecución financiera es mayor que el presupuesto total actual.')
    }
  }
  return { grupos: [...grupos.values()], errorArchivo: null }
}

const ETIQUETA: Partial<Record<keyof Campos, string>> = {
  vigencia: 'Vigencia',
  cenGestor: 'Dependencia',
  codSap: 'Código SAP',
  nomProyecto: 'Nombre del proyecto',
  pptoInicial: 'Presupuesto inicial',
  totalPptoActual: 'Presupuesto total actual',
  ejeFinanciera: 'Ejecución financiera',
}

/** Solo para grupos sin errores. */
export function aPayload(g: GrupoCarga): ReportePayload {
  return {
    vigencia: Number(g.campos.vigencia),
    cen_gestor: g.campos.cenGestor!,
    cod_sap: g.campos.codSap,
    nom_proyecto: g.campos.nomProyecto,
    ppto_inicial: g.campos.pptoInicial!,
    total_ppto_actual: g.campos.totalPptoActual!,
    eje_financiera: g.campos.ejeFinanciera!,
    reportado_por: g.campos.reportadoPor.trim(),
    correo: g.campos.correo.trim() || null,
    observaciones: null,
    aportes: g.aportes.map((a) => ({
      proyecto_estrategico_id: a.proyectoEstrategicoId!,
      porcentaje: parsearPorcentaje(a.porcentaje)!,
      valor_aportado: a.valor ?? 0,
    })),
  }
}

/** CSV con «;» y BOM: Excel en español lo abre bien con doble clic. */
export function aCsv(filas: (string | number)[][]): string {
  const escapar = (v: string | number) => {
    const s = String(v)
    // Evita inyección de fórmulas al abrir el CSV en Excel.
    const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s
    return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
  }
  return '﻿' + filas.map((f) => f.map(escapar).join(';')).join('\r\n')
}
