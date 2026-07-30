import { ETAPAS_OBRA } from './etapas.util.ts'
import type { EtapaObra, ObraVisor } from '../../types/obra.types'

// Mapeo de la fila cruda del Visor Estratégico a ObraVisor — separado de
// obrasVisorApi.ts (que importa supabaseClient.ts, y ese usa import.meta.env)
// para que este archivo corra bajo `node --test` sin depender de Vite, mismo
// motivo por el que ETAPAS_OBRA vive en etapas.util.ts y no ahí.

// La API externa devuelve los campos numéricos como texto (ej. LATITUD:
// "6.24"); sin coerción, sumar esos valores en el mapa (cálculo de centroide
// por comuna) concatena strings en vez de sumar y termina en NaN.
export function numeroOrNull(valor: unknown): number | null {
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

// ponytail: any acotado a la fila cruda de la API externa; tipar el schema
// completo no es lo que este mapeo necesita hoy.
export function mapObraRow(row: any): ObraVisor {
  return {
    // La API externa devuelve TODO como texto, incluido el id — sin este
    // Number(), obraId queda string y nunca matchea contra las claves
    // numéricas de ultimaVisitaPorObra (Map<number,...> armado desde
    // Supabase), así que el mapa mostraba todas las obras como "sin visitar".
    obraId: Number(row.id),
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
