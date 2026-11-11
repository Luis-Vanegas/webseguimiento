// Convierte las filas de la plantilla Excel en reportes listos para enviar.
// Puro (sin React ni Supabase) para probarlo con node --test.
import type { ReportePayload } from '../../features/estrategicos/estrategicosApi'
import {
  parsearMonto,
  parsearPorcentaje,
  sumaPorcentajes,
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

/** Un proyecto de inversión del archivo (puede ocupar varias filas). */
export interface GrupoCarga {
  clave: string
  filas: number[]
  campos: Campos
  dependencia: string
  aportes: AporteBorrador[]
  nombresEstrategicos: string[]
  errores: string[]
  advertencias: string[]
}

export const MAX_FILAS = 2000

// Orden de columnas de la hoja «Reporte» de la plantilla.
const COL = { vigencia: 0, dependencia: 1, bpin: 2, sap: 3, nombre: 4, pptoIni: 5, pptoAct: 6, eje: 7, estrategico: 8, porcentaje: 9 }

/** Minúsculas, sin tildes ni espacios dobles ni punto final: "Secretaría  de Salud." ≈ "secretaria de salud". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/\.$/, '')
}

const texto = (c: Celda): string => (c === null || c === undefined ? '' : c instanceof Date ? '' : String(c).trim())

function monto(c: Celda): number | null {
  if (typeof c === 'number') return Number.isFinite(c) && c >= 0 ? Math.round(c) : null
  const t = texto(c)
  // Un signo menos haría que parsearMonto lo leyera como positivo.
  return t.includes('-') ? null : parsearMonto(t)
}

/** Códigos: Excel puede guardar el BPIN como número; se pasa a texto sin notación científica. */
function codigo(c: Celda): string {
  if (typeof c === 'number') return Number.isInteger(c) ? c.toFixed(0) : String(c)
  return texto(c).replace(/\s/g, '')
}

function porcentaje(c: Celda): string {
  if (typeof c === 'number') return String(c)
  return texto(c).replace('%', '').trim()
}

export function procesarFilas(filas: Celda[][], catalogo: Catalogo, reporta: { nombre: string; correo: string }): {
  grupos: GrupoCarga[]
  errorArchivo: string | null
} {
  const datos = filas.slice(1) // fila 1 = encabezados
  const conContenido = datos
    .map((fila, i) => ({ fila, numero: i + 2 }))
    .filter(({ fila }) => fila.some((c) => texto(c) !== '' || typeof c === 'number'))
  if (conContenido.length === 0) return { grupos: [], errorArchivo: 'El archivo no tiene filas con datos en la hoja «Reporte».' }
  if (conContenido.length > MAX_FILAS) return { grupos: [], errorArchivo: `Máximo ${MAX_FILAS} filas por archivo.` }

  const deps = new Map(catalogo.dependencias.map((d) => [normalizar(d.nombre), d]))
  const depsPorCodigo = new Map(catalogo.dependencias.map((d) => [String(d.cenGestor), d]))
  const ests = new Map(catalogo.estrategicos.map((e) => [normalizar(e.nombre), e]))
  const grupos = new Map<string, GrupoCarga>()
  // Aportes cuyo nombre no existe en la lista: ya tienen su error, no repetir "Elige el proyecto".
  const desconocidos = new Map<string, Set<number>>()

  for (const { fila, numero } of conContenido) {
    const vigencia = codigo(fila[COL.vigencia])
    const bpin = codigo(fila[COL.bpin])
    const nombreDep = texto(fila[COL.dependencia])
    const dep = deps.get(normalizar(nombreDep)) ?? depsPorCodigo.get(codigo(fila[COL.dependencia]))
    const campos: Campos = {
      vigencia,
      cenGestor: dep?.cenGestor ?? null,
      codBpin: bpin,
      codSap: codigo(fila[COL.sap]),
      nomProyecto: texto(fila[COL.nombre]),
      pptoInicial: monto(fila[COL.pptoIni]),
      totalPptoActual: monto(fila[COL.pptoAct]),
      ejeFinanciera: monto(fila[COL.eje]),
      reportadoPor: reporta.nombre,
      correo: reporta.correo,
      observaciones: '',
    }
    const clave = `${vigencia}|${bpin}`
    let grupo = grupos.get(clave)
    if (!grupo) {
      grupo = { clave, filas: [], campos, dependencia: dep?.nombre ?? nombreDep, aportes: [], nombresEstrategicos: [], errores: [], advertencias: [] }
      grupos.set(clave, grupo)
      if (nombreDep && !dep) grupo.errores.push(`Fila ${numero}: la dependencia «${nombreDep}» no está en la lista.`)
    } else {
      // Las filas del mismo proyecto deben repetir exactamente los mismos datos.
      for (const k of ['cenGestor', 'codSap', 'nomProyecto', 'pptoInicial', 'totalPptoActual', 'ejeFinanciera'] as const) {
        const a = grupo.campos[k]
        const b = campos[k]
        const distintos = k === 'nomProyecto' ? normalizar(String(a)) !== normalizar(String(b)) : a !== b
        if (distintos) grupo.errores.push(`Fila ${numero}: ${ETIQUETA[k]} distinto al de la fila ${grupo.filas[0]} del mismo proyecto.`)
      }
    }
    grupo.filas.push(numero)

    const nombreEst = texto(fila[COL.estrategico])
    const est = ests.get(normalizar(nombreEst))
    if (nombreEst && !est) {
      grupo.errores.push(`Fila ${numero}: el proyecto estratégico «${nombreEst}» no está en la lista.`)
      desconocidos.set(clave, (desconocidos.get(clave) ?? new Set()).add(grupo.aportes.length))
    }
    grupo.aportes.push({ proyectoEstrategicoId: est?.id ?? null, porcentaje: porcentaje(fila[COL.porcentaje]) })
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
      if (desconocidos.get(g.clave)?.has(Number(i))) continue
      g.errores.push(`Fila ${g.filas[Number(i)]}: ${msg}`)
    }
    if (general) g.errores.push(general)
    const valores = g.aportes.map((a) => parsearPorcentaje(a.porcentaje) ?? 0)
    if (valores.every((v) => v > 0 && v < 1) && sumaPorcentajes(g.aportes) <= 1) {
      g.advertencias.push('Los porcentajes son menores a 1. ¿Escribiste 0,45 en lugar de 45? Se guardarán tal cual.')
    }
    if (g.campos.ejeFinanciera !== null && g.campos.totalPptoActual !== null && g.campos.ejeFinanciera > g.campos.totalPptoActual) {
      g.advertencias.push('La ejecución financiera es mayor que el presupuesto total actual.')
    }
  }
  return { grupos: [...grupos.values()], errorArchivo: null }
}

const ETIQUETA: Partial<Record<keyof Campos, string>> = {
  vigencia: 'Vigencia',
  cenGestor: 'Dependencia',
  codBpin: 'Código BPIN',
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
    cod_bpin: g.campos.codBpin,
    cod_sap: g.campos.codSap || null,
    nom_proyecto: g.campos.nomProyecto,
    ppto_inicial: g.campos.pptoInicial!,
    total_ppto_actual: g.campos.totalPptoActual!,
    eje_financiera: g.campos.ejeFinanciera!,
    reportado_por: g.campos.reportadoPor.trim(),
    correo: g.campos.correo.trim() || null,
    observaciones: null,
    aportes: g.aportes.map((a) => ({ proyecto_estrategico_id: a.proyectoEstrategicoId!, porcentaje: parsearPorcentaje(a.porcentaje)! })),
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
