// Reglas puras del formulario de proyectos estratégicos. Sin React ni
// Supabase para poder probarlas con node --test.

export interface AporteBorrador {
  proyectoEstrategicoId: number | null
  porcentaje: string
}

/** "1.234.567" o "1234567" → 1234567. Vacío o inválido → null. */
export function parsearMonto(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '')
  if (!digitos) return null
  return Number(digitos)
}

const fmtCOP = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** Formato de miles colombiano para mostrar mientras se escribe. */
export function formatearMonto(valor: number | null): string {
  return valor === null ? '' : fmtCOP.format(valor)
}

/** "45,5" o "45.5" → 45.5. */
export function parsearPorcentaje(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!limpio) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

export function sumaPorcentajes(aportes: AporteBorrador[]): number {
  // Redondeo a centésimas: 33.33 + 33.33 + 33.34 debe dar 100 exacto.
  const total = aportes.reduce((s, a) => s + (parsearPorcentaje(a.porcentaje) ?? 0), 0)
  return Math.round(total * 100) / 100
}

/** Valor aportado = ejecución financiera × porcentaje (criterio del Excel de la UIP). */
export function valorAportado(ejecucion: number | null, porcentaje: string): number | null {
  const p = parsearPorcentaje(porcentaje)
  if (ejecucion === null || p === null) return null
  return Math.round((ejecucion * p) / 100)
}

/** Errores por fila (índice → mensaje) y un error general de la sección. */
export function validarAportes(aportes: AporteBorrador[]): {
  porFila: Record<number, string>
  general: string | null
} {
  const porFila: Record<number, string> = {}
  const vistos = new Set<number>()
  aportes.forEach((a, i) => {
    const p = parsearPorcentaje(a.porcentaje)
    if (a.proyectoEstrategicoId === null) porFila[i] = 'Elige el proyecto estratégico.'
    else if (vistos.has(a.proyectoEstrategicoId)) porFila[i] = 'Este proyecto ya está en la lista.'
    else if (p === null || p <= 0 || p > 100) porFila[i] = 'El porcentaje debe estar entre 0,01 y 100.'
    if (a.proyectoEstrategicoId !== null) vistos.add(a.proyectoEstrategicoId)
  })
  let general: string | null = null
  if (aportes.length === 0) general = 'Agrega al menos un proyecto estratégico.'
  else if (sumaPorcentajes(aportes) > 100) general = 'La suma de porcentajes supera el 100 %.'
  return { porFila, general }
}

export const codigoReporte = (id: number) => `REP-${String(id).padStart(4, '0')}`
