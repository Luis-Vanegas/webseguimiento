// Transformaciones geométricas a las FeatureCollection que consumen los
// <Source> de MapLibre. Son puras y no conocen nada de React ni del theme:
// por eso viven acá y no junto al mapa — así se pueden probar sin montarlo.
import type { ObraVisor } from '../../types/obra.types'
import type { PuntoTrazo, RecorridoSeguimiento } from '../../types/seguimiento.types'

// Un LineString por recorrido con trazo utilizable (>= 2 puntos), con su id
// como propiedad — la lógica de selección se resuelve en el click leyendo
// `get('recorridoId')`, sin duplicarla.
export function recorridosALineas(recorridos: RecorridoSeguimiento[]) {
  return {
    type: 'FeatureCollection' as const,
    features: recorridos
      .filter((r) => r.trazo.length >= 2)
      .map((r) => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: r.trazo.map((p) => [p.lon, p.lat]) },
        properties: { recorridoId: r.id, tipo: r.tipo },
      })),
  }
}

// Trazo en vivo mientras se graba: una sola línea a partir de los puntos que
// va emitiendo el hook de grabación.
export function puntosALinea(puntos: PuntoTrazo[]) {
  return {
    type: 'FeatureCollection' as const,
    features:
      puntos.length >= 2
        ? [
            {
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: puntos.map((p) => [p.lon, p.lat]) },
              properties: {},
            },
          ]
        : [],
  }
}

export function calcularBounds(obras: ObraVisor[]): [[number, number], [number, number]] | null {
  const conCoordenadas = obras.filter((o) => o.latitud !== null && o.longitud !== null)
  if (conCoordenadas.length === 0) return null
  const lons = conCoordenadas.map((o) => o.longitud!)
  const lats = conCoordenadas.map((o) => o.latitud!)
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ]
}
