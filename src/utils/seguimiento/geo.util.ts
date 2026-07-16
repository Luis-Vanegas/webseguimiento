interface Coordenada {
  lat: number
  lon: number
}

const RADIO_TIERRA_METROS = 6371000

// Fórmula de Haversine: suficiente para distancias caminadas a pie (error
// despreciable a esta escala), sin depender de PostGIS ni ninguna librería.
function distanciaEntrePuntos(a: Coordenada, b: Coordenada): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180
  const dLat = radianes(b.lat - a.lat)
  const dLon = radianes(b.lon - a.lon)
  const lat1 = radianes(a.lat)
  const lat2 = radianes(b.lat)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return RADIO_TIERRA_METROS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Suma la distancia entre cada punto consecutivo del trazo (línea poligonal,
// no la distancia en línea recta del primero al último).
export function calcularDistanciaTotal(puntos: Coordenada[]): number {
  let total = 0
  for (let i = 1; i < puntos.length; i++) {
    total += distanciaEntrePuntos(puntos[i - 1], puntos[i])
  }
  return total
}
