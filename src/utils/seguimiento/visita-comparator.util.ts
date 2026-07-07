import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// Función pura: compara la visita actual contra la anterior de la MISMA
// obra. Se usa en RegistrarVisita (tarjeta de contexto), la confirmación al
// guardar, e HistorialObra (delta entre cada visita consecutiva). No
// duplicar esta lógica en ningún otro lugar.
export interface CambioVisita {
  campo: string
  valorAnterior: unknown
  valorNuevo: unknown
  variacion?: number
}

export const compararVisitas = (
  actual: VisitaSeguimiento,
  anterior: VisitaSeguimiento | null,
): CambioVisita[] => {
  if (!anterior) return [] // primera visita a esta obra, no hay contra qué comparar

  const cambios: CambioVisita[] = []

  if (actual.porcentajeAvanceCampo !== anterior.porcentajeAvanceCampo) {
    cambios.push({
      campo: 'porcentajeAvanceCampo',
      valorAnterior: anterior.porcentajeAvanceCampo,
      valorNuevo: actual.porcentajeAvanceCampo,
      variacion: actual.porcentajeAvanceCampo - anterior.porcentajeAvanceCampo,
    })
  }

  const tiposAnteriores = new Set((anterior.alertas ?? []).map((a) => a.tipoAlertaId))
  const tiposActuales = new Set((actual.alertas ?? []).map((a) => a.tipoAlertaId))

  const nuevas = [...tiposActuales].filter((t) => !tiposAnteriores.has(t))
  const resueltas = [...tiposAnteriores].filter((t) => !tiposActuales.has(t))
  const persistentes = [...tiposActuales].filter((t) => tiposAnteriores.has(t))

  if (nuevas.length > 0) {
    cambios.push({ campo: 'alertasNuevas', valorAnterior: null, valorNuevo: nuevas })
  }
  if (resueltas.length > 0) {
    cambios.push({ campo: 'alertasResueltas', valorAnterior: resueltas, valorNuevo: null })
  }
  if (persistentes.length > 0) {
    cambios.push({ campo: 'alertasPersistentes', valorAnterior: persistentes, valorNuevo: persistentes })
  }

  const fotosAnteriores = anterior.fotos?.length ?? 0
  const fotosActuales = actual.fotos?.length ?? 0
  if (fotosActuales !== fotosAnteriores) {
    cambios.push({
      campo: 'cantidadFotos',
      valorAnterior: fotosAnteriores,
      valorNuevo: fotosActuales,
      variacion: fotosActuales - fotosAnteriores,
    })
  }

  return cambios
}
