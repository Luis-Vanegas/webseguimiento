import { useMemo, useRef, useState } from 'react'
import { calcularDistanciaTotal } from '../../utils/seguimiento/geo.util'
import type { PuntoTrazo } from '../../types/seguimiento.types'

export type EstadoGrabacion = 'inactivo' | 'grabando' | 'detenido'

// Encapsula navigator.geolocation.watchPosition (API nativa del navegador,
// sin librerías) — solo colecciona puntos mientras graba. La distancia se
// recalcula en cada punto nuevo, es barato para las decenas/cientos de
// puntos que tiene un recorrido caminado.
export function useGrabacionRecorrido() {
  const [estado, setEstado] = useState<EstadoGrabacion>('inactivo')
  const [puntos, setPuntos] = useState<PuntoTrazo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState<string | null>(null)
  const [fechaFin, setFechaFin] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  function iniciar() {
    if (!navigator.geolocation) {
      setError('Este navegador no soporta geolocalización.')
      return
    }
    setError(null)
    setPuntos([])
    setFechaFin(null)
    setFechaInicio(new Date().toISOString())
    watchIdRef.current = navigator.geolocation.watchPosition(
      (posicion) => {
        setPuntos((previo) => [
          ...previo,
          { lat: posicion.coords.latitude, lon: posicion.coords.longitude, ts: posicion.timestamp },
        ])
      },
      (err) => setError(err.message || 'No se pudo obtener tu ubicación.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    )
    setEstado('grabando')
  }

  function detener() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
    setFechaFin(new Date().toISOString())
    setEstado('detenido')
  }

  function descartar() {
    setEstado('inactivo')
    setPuntos([])
    setFechaInicio(null)
    setFechaFin(null)
    setError(null)
  }

  const distanciaMetros = useMemo(() => calcularDistanciaTotal(puntos), [puntos])

  return { estado, puntos, error, fechaInicio, fechaFin, distanciaMetros, iniciar, detener, descartar }
}
