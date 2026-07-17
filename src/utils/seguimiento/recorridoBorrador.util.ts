import type { PuntoTrazo } from '../../types/seguimiento.types'

// Guarda el recorrido en curso en localStorage mientras se graba, para poder
// recuperarlo si el navegador recarga/mata la pestaña a mitad de camino (ej.
// al abrir la cámara nativa y quedarse sin memoria) — sin esto, cualquier
// interrupción perdía todo el trazo caminado hasta ese momento sin aviso.
const CLAVE = 'seguimiento:recorrido-borrador'

export interface BorradorRecorrido {
  puntos: PuntoTrazo[]
  fechaInicio: string
}

export function guardarBorrador(borrador: BorradorRecorrido) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(borrador))
  } catch {
    // Cuota llena o localStorage inhabilitado: la grabación sigue
    // funcionando en memoria, solo se pierde la protección ante recarga.
  }
}

export function leerBorrador(): BorradorRecorrido | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const datos = JSON.parse(crudo)
    if (!Array.isArray(datos?.puntos) || typeof datos?.fechaInicio !== 'string') return null
    return datos
  } catch {
    return null
  }
}

export function borrarBorrador() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada que limpiar si localStorage no está disponible
  }
}
