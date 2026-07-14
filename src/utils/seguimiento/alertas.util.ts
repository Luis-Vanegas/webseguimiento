import type { AlertaVisita, SeveridadAlerta } from '../../types/seguimiento.types'

// La severidad más alta entre las alertas de una visita — para colorear un
// único chip de resumen en las tarjetas de listado en vez de enumerar cada
// alerta con su propio color.
export function severidadMaxima(alertas: AlertaVisita[] | undefined): SeveridadAlerta | null {
  if (!alertas || alertas.length === 0) return null
  if (alertas.some((a) => a.severidad === 'alta')) return 'alta'
  if (alertas.some((a) => a.severidad === 'media')) return 'media'
  return 'baja'
}
