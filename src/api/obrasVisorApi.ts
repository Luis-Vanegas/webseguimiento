import { supabase } from '../lib/supabaseClient'
import type { ObraVisor } from '../types/obra.types'

// Lectura de obras oficiales del Visor Estratégico. NUNCA se llama a la API
// real directo desde el frontend: la API key va por header HTTP y con Vite
// cualquier variable VITE_* queda expuesta en el bundle del navegador. Por
// eso este cliente solo invoca la Edge Function `obras-proxy`, que guarda la
// key como secret de Supabase y hace de intermediaria (ver
// supabase/functions/obras-proxy/index.ts).
// Caché a nivel módulo: las obras oficiales no cambian durante la sesión y
// cada pantalla montaba su propio fetch de ~1859 obras. Se cachea la promesa
// (no el resultado) para que llamadas concurrentes compartan el mismo request.
let obrasCache: Promise<ObraVisor[]> | null = null

export function obtenerObras(): Promise<ObraVisor[]> {
  obrasCache ??= (async () => {
    const { data, error } = await supabase.functions.invoke<{ data: unknown[] }>('obras-proxy')
    if (error) {
      obrasCache = null // no dejar cacheado un fallo: el próximo intento reintenta
      throw error
    }
    return (data?.data ?? []).map(mapObraRow)
  })()
  return obrasCache
}

// La API externa devuelve los campos numéricos como texto (ej. LATITUD:
// "6.24"); sin coerción, sumar esos valores en el mapa (cálculo de centroide
// por comuna) concatena strings en vez de sumar y termina en NaN.
function numeroOrNull(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function mapObraRow(row: any): ObraVisor {
  return {
    obraId: row.id,
    nombre: row.NOMBRE,
    dependencia: row.DEPENDENCIA ?? null,
    comuna: row['COMUNA O CORREGIMIENTO'] ?? null,
    barrio: row.BARRIO ?? null,
    direccion: row['DIRECCIÓN'] ?? null,
    latitud: numeroOrNull(row.LATITUD),
    longitud: numeroOrNull(row.LONGITUD),
    presupuestoOficial: Number(row['COSTO TOTAL ACTUALIZADO'] ?? row['COSTO ESTIMADO TOTAL'] ?? 0) || 0,
    porcentajeAvanceOficial: Number(row['AVANCE GENERAL MANUAL'] ?? row['PORCENTAJE Planeación (MGA)'] ?? 0) || 0,
    proyectoEstrategico: row['PROYECTO ESTRATÉGICO'] ?? null,
    entregada: row['¿OBRA ENTREGADA?'] === 'Sí' || row['¿OBRA ENTREGADA?'] === true,
  }
}
