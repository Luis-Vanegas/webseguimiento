import { supabase } from '../lib/supabaseClient'
import { ETAPAS_OBRA } from '../utils/seguimiento/etapas.util'
import type { EtapaObra, ObraVisor } from '../types/obra.types'

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

function mapEtapas(row: any): EtapaObra[] {
  return ETAPAS_OBRA.map((nombre) => ({
    nombre,
    porcentaje: numeroOrNull(row[`PORCENTAJE ${nombre}`]) ?? 0,
    noAplica: row[`NO APLICA ${nombre}`] === true,
  }))
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
    presupuestoOficial: numeroOrNull(row['COSTO TOTAL ACTUALIZADO'] ?? row['COSTO ESTIMADO TOTAL']) ?? 0,
    porcentajeAvanceOficial: numeroOrNull(row['AVANCE GENERAL MANUAL'] ?? row['PORCENTAJE Planeación (MGA)']) ?? 0,
    proyectoEstrategico: row['PROYECTO ESTRATÉGICO'] ?? null,
    // El valor real de la API es 'si'/'no' en minúsculas y sin tilde (no 'Sí');
    // se normaliza para no depender de mayúsculas/tildes que puedan variar.
    entregada:
      String(row['¿OBRA ENTREGADA?']).trim().toLowerCase() === 'si' ||
      row['¿OBRA ENTREGADA?'] === true,
    estado: row['ESTADO DE LA OBRA'] ?? null,
    descripcion: row['DESCRIPCIÓN'] ?? null,
    fechaRealEntrega: row['FECHA REAL DE ENTREGA'] ?? null,
    fechaEstimadaEntrega: row['FECHA ESTIMADA DE ENTREGA'] ?? null,
    etapas: mapEtapas(row),
  }
}
