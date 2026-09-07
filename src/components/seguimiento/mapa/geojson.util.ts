// Vive acá y no en utils/seguimiento porque necesita infoObra, que es de este
// mismo directorio: moverla a utils haría que una capa interna importara de
// components. Las transformaciones que NO dependen del estado de la obra
// están en utils/seguimiento/geojson.util.ts, donde sí se pueden probar.
import { infoObra } from './mapaEstado.util.ts'
import { estaDesatendida } from '../../../utils/seguimiento/fechas.util.ts'
import type { ObraVisor } from '../../../types/obra.types'

// FeatureCollection de puntos: uno por obra, con su color de estado y si
// está desatendida ya resueltos como propiedades — así el layer de
// MapLibre solo necesita 'get', sin duplicar la lógica en el paint.
export function obrasAGeoJSON(obras: ObraVisor[], ultimaVisitaPorObra: Map<number, string>) {
  return {
    type: 'FeatureCollection' as const,
    features: obras.map((obra) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [obra.longitud, obra.latitud] },
      properties: {
        obraId: obra.obraId,
        color: infoObra(obra, ultimaVisitaPorObra).color,
        desatendida: estaDesatendida(ultimaVisitaPorObra.get(obra.obraId)),
      },
    })),
  }
}
