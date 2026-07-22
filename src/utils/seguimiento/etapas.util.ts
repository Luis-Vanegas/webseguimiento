import type { EtapaObra, ObraVisor } from '../../types/obra.types'

// Las 11 fases del ciclo de vida de la obra, tal como las nombra la API
// (columnas "PORCENTAJE <fase>" / "NO APLICA <fase>"). Vive acá (no en
// obrasVisorApi.ts) para que este archivo no dependa del cliente de
// Supabase — así los tests corren con `node --test` sin necesitar
// VITE_SUPABASE_URL/ANON_KEY.
export const ETAPAS_OBRA = [
  'Planeación (MGA)',
  'Estudios preliminares',
  'Viabilización (DAP)',
  'Licencias (Curaduría)',
  'Gestión predial',
  'Contratación',
  'Inicio',
  'Diseños',
  'Ejecución obra',
  'Dotación y puesta en operación',
  'Liquidación',
] as const

// Traduce el nombre de fase tal como lo nombra la API (con siglas técnicas
// de planeación pública: MGA, DAP, Curaduría) a lenguaje llano para
// gerencia. Con fallback al nombre crudo si aparece una fase no mapeada.
export const ETIQUETA_ETAPA: Record<(typeof ETAPAS_OBRA)[number], string> = {
  'Planeación (MGA)': 'Planeación',
  'Estudios preliminares': 'Estudios preliminares',
  'Viabilización (DAP)': 'Viabilización',
  'Licencias (Curaduría)': 'Licencias de construcción',
  'Gestión predial': 'Gestión predial',
  Contratación: 'Contratación',
  Inicio: 'Inicio de obra',
  Diseños: 'Diseños',
  'Ejecución obra': 'Ejecución de obra',
  'Dotación y puesta en operación': 'Dotación y entrega',
  Liquidación: 'Cierre y liquidación',
}

export function etiquetaEtapa(nombre: string): string {
  return ETIQUETA_ETAPA[nombre as (typeof ETAPAS_OBRA)[number]] ?? nombre
}

// Primera etapa (en el orden fijo de ETAPAS_OBRA, ya como viene en
// obra.etapas) que aplica a la obra y todavía no llegó al 100% — o null si
// todas las que aplican ya están completas (obra entregada/liquidada).
export function etapaActual(obra: ObraVisor): EtapaObra | null {
  return obra.etapas.find((etapa) => !etapa.noAplica && etapa.porcentaje < 100) ?? null
}

// "En planeación" = las primeras 3 fases del ciclo (antes de Contratación),
// que es donde todavía no hay obra física en el terreno.
const ETAPAS_DE_PLANEACION: readonly string[] = [
  'Planeación (MGA)',
  'Estudios preliminares',
  'Viabilización (DAP)',
]

export function estaEnPlaneacion(obra: ObraVisor): boolean {
  const actual = etapaActual(obra)
  return actual !== null && ETAPAS_DE_PLANEACION.includes(actual.nombre)
}

// "En ejecución" = ya se contrató y hay obra física en curso (de
// Contratación a Ejecución obra) — antes de la entrega/dotación final.
const ETAPAS_DE_EJECUCION: readonly string[] = ['Contratación', 'Inicio', 'Diseños', 'Ejecución obra']

export function estaEnEjecucion(obra: ObraVisor): boolean {
  const actual = etapaActual(obra)
  return actual !== null && ETAPAS_DE_EJECUCION.includes(actual.nombre)
}
