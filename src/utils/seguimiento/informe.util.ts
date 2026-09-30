// Datos derivados para el informe consolidado (EditorInforme.tsx). Separado
// del componente para testear las reglas sin React ni DOM.
import { claveDia } from './fechas.util.ts'
import type { VisitaSeguimiento } from '../../types/seguimiento.types.ts'

export interface MetricaInforme {
  etiqueta: string
  valor: string
  color?: string
}

export const COLOR_DESVIACION_GRAVE = '#c62828'
export const COLOR_DESVIACION_LEVE = '#b26a00'
// ponytail: umbral fijo de -10 p.p. para pasar de naranja a rojo; si cada
// proyecto necesita su propia tolerancia, moverlo a un catálogo en la BD.
const UMBRAL_DESVIACION_GRAVE = -10

// "2026-09-23" -> "23/09/2026"
export function formatearFechaNumerica(fechaTexto: string): string {
  const [anio, mes, dia] = claveDia(fechaTexto).split('-')
  return `${dia}/${mes}/${anio}`
}

// Solo las métricas que la visita tiene cargadas: el informe es un punto de
// partida editable, no se llena con "—" lo que nadie midió.
export function metricasInforme(visita: VisitaSeguimiento): MetricaInforme[] {
  const metricas: MetricaInforme[] = [{ etiqueta: 'Avance observado', valor: `${visita.porcentajeAvanceCampo}%` }]

  if (visita.porcentajeProgramado != null) {
    metricas.push({ etiqueta: 'Programado', valor: `${visita.porcentajeProgramado}%` })
    // Redondeo a un decimal: 27.5 - 47.1 da -19.600000000000001 en coma flotante.
    const desviacion = Math.round((visita.porcentajeAvanceCampo - visita.porcentajeProgramado) * 10) / 10
    metricas.push({
      etiqueta: 'Desviación',
      valor: `${desviacion > 0 ? '+' : ''}${desviacion} p.p.`,
      color:
        desviacion <= UMBRAL_DESVIACION_GRAVE
          ? COLOR_DESVIACION_GRAVE
          : desviacion < 0
            ? COLOR_DESVIACION_LEVE
            : undefined,
    })
  }
  if (visita.porcentajePagado != null) metricas.push({ etiqueta: 'Pagado', valor: `${visita.porcentajePagado}%` })
  if (visita.proximoFrente) metricas.push({ etiqueta: 'Próximo frente', valor: visita.proximoFrente })
  if (visita.fechaProximaVisita) {
    metricas.push({ etiqueta: 'Próxima visita', valor: formatearFechaNumerica(visita.fechaProximaVisita) })
  }
  return metricas
}

// Nombre para el encabezado ("Proyectos RECREO DEPORTIVOS"): el proyecto
// estratégico si todas las visitas elegidas son del mismo, "VARIOS" si no.
export function nombreGrupoInforme(proyectos: (string | null | undefined)[]): string {
  const distintos = new Set(proyectos.filter((p): p is string => !!p))
  return distintos.size === 1 ? [...distintos][0].toUpperCase() : 'VARIOS'
}
