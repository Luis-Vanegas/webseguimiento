import { useEffect, useMemo, useRef, useState } from 'react'
import { calcularDistanciaTotal } from '../../utils/seguimiento/geo.util'
import { borrarBorrador, guardarBorrador, leerBorrador } from '../../utils/seguimiento/recorridoBorrador.util'
import type { PuntoTrazo } from '../../types/seguimiento.types'

export type EstadoGrabacion = 'inactivo' | 'grabando' | 'detenido'

// Encapsula navigator.geolocation.watchPosition (API nativa del navegador,
// sin librerías) — solo colecciona puntos mientras graba. La distancia se
// recalcula en cada punto nuevo, es barato para las decenas/cientos de
// puntos que tiene un recorrido caminado.
//
// Persistencia: cada punto nuevo se guarda también en localStorage. Si el
// navegador recarga o mata la pestaña a mitad de camino (típico al abrir la
// cámara nativa con poca memoria disponible), al volver a entrar se puede
// recuperar el trazo en vez de perderlo entero — antes vivía solo en useState.
export function useGrabacionRecorrido() {
  const [estado, setEstado] = useState<EstadoGrabacion>('inactivo')
  const [puntos, setPuntos] = useState<PuntoTrazo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState<string | null>(null)
  const [fechaFin, setFechaFin] = useState<string | null>(null)
  const [hayBorrador, setHayBorrador] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)

  useEffect(() => {
    const borrador = leerBorrador()
    if (borrador && borrador.puntos.length > 0) setHayBorrador(true)
  }, [])

  async function pedirWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      }
    } catch {
      // No es crítico: si el navegador no da el wake lock, la grabación
      // sigue funcionando igual, solo la pantalla se puede apagar sola.
    }
  }

  function liberarWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  // El wake lock se libera solo cuando la pestaña pasa a segundo plano (lo
  // hace el propio navegador); al volver a primer plano hay que repedirlo.
  useEffect(() => {
    function alCambiarVisibilidad() {
      if (document.visibilityState === 'visible' && estado === 'grabando') pedirWakeLock()
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  }, [estado])

  // setPuntos usa la forma funcional: si ya había puntos en el estado (ej.
  // al retomar un borrador), esto sigue sumando sobre esos, no los pisa.
  function empezarWatch() {
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
  }

  function iniciar() {
    if (!navigator.geolocation) {
      setError('Este navegador no soporta geolocalización.')
      return
    }
    setError(null)
    setPuntos([])
    setFechaFin(null)
    const inicio = new Date().toISOString()
    setFechaInicio(inicio)
    guardarBorrador({ puntos: [], fechaInicio: inicio })
    empezarWatch()
    pedirWakeLock()
    setEstado('grabando')
  }

  // Retoma un recorrido interrumpido: sigue sumando puntos al trazo que ya
  // estaba guardado en localStorage, en vez de empezar de cero.
  function recuperarBorrador() {
    const borrador = leerBorrador()
    if (!borrador) return
    setHayBorrador(false)
    setError(null)
    setPuntos(borrador.puntos)
    setFechaInicio(borrador.fechaInicio)
    setFechaFin(null)
    empezarWatch()
    pedirWakeLock()
    setEstado('grabando')
  }

  function descartarBorrador() {
    borrarBorrador()
    setHayBorrador(false)
  }

  function detener() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
    liberarWakeLock()
    setFechaFin(new Date().toISOString())
    setEstado('detenido')
    // El borrador se conserva hasta guardar de verdad: el paso de agregar
    // fotos (justo lo que motivó este cambio) también puede interrumpirse.
  }

  function descartar() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
    liberarWakeLock()
    borrarBorrador()
    setEstado('inactivo')
    setPuntos([])
    setFechaInicio(null)
    setFechaFin(null)
    setError(null)
  }

  // Persiste cada punto nuevo mientras se está grabando (o retomando un
  // borrador) — es la protección real contra la pérdida de datos.
  useEffect(() => {
    if (estado === 'grabando' && fechaInicio) {
      guardarBorrador({ puntos, fechaInicio })
    }
  }, [puntos, estado, fechaInicio])

  const distanciaMetros = useMemo(() => calcularDistanciaTotal(puntos), [puntos])

  return {
    estado,
    puntos,
    error,
    fechaInicio,
    fechaFin,
    distanciaMetros,
    hayBorrador,
    iniciar,
    detener,
    descartar,
    recuperarBorrador,
    descartarBorrador,
    limpiarBorradorGuardado: borrarBorrador,
  }
}
