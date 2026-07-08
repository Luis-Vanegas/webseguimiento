import { Box, Typography } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import type { CambioVisita } from '../../utils/seguimiento/visita-comparator.util'
import type { TipoAlerta } from '../../types/seguimiento.types'

const ETIQUETA_CAMPO: Record<string, string> = {
  porcentajeAvanceCampo: 'Avance observado',
  alertasNuevas: 'Alertas nuevas',
  alertasResueltas: 'Alertas resueltas',
  alertasPersistentes: 'Alertas que continúan',
  cantidadFotos: 'Fotos',
}

const CAMPOS_ALERTAS = new Set(['alertasNuevas', 'alertasResueltas', 'alertasPersistentes'])

function formatearValor(campo: string, valor: unknown, tiposAlerta: TipoAlerta[]): string {
  if (valor === null || valor === undefined) return '—'
  if (Array.isArray(valor)) {
    if (valor.length === 0) return '—'
    if (CAMPOS_ALERTAS.has(campo)) {
      return valor.map((id) => tiposAlerta.find((t) => t.id === id)?.nombre ?? 'Alerta').join(', ')
    }
    return valor.join(', ')
  }
  if (campo === 'porcentajeAvanceCampo') return `${valor}%`
  return String(valor)
}

interface CambioVisitaItemProps {
  cambio: CambioVisita
  tiposAlerta?: TipoAlerta[]
}

// Traduce un CambioVisita crudo (nombre de campo en camelCase, valores sin
// formato) a una línea legible para quien revisa — se usa en la tarjeta de
// contexto de RegistrarVisita y en el timeline de HistorialObra. Un solo
// lugar para no repetir el formato en cada pantalla.
export function CambioVisitaItem({ cambio, tiposAlerta = [] }: CambioVisitaItemProps) {
  const etiqueta = ETIQUETA_CAMPO[cambio.campo] ?? cambio.campo

  if (cambio.variacion === undefined) {
    return (
      <Typography variant="body2" sx={{ py: 0.25 }}>
        <b>{etiqueta}:</b>{' '}
        {formatearValor(cambio.campo, cambio.valorNuevo ?? cambio.valorAnterior, tiposAlerta)}
      </Typography>
    )
  }

  const subio = cambio.variacion > 0
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25 }}>
      {subio ? (
        <TrendingUpIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
      ) : (
        <TrendingDownIcon sx={{ fontSize: 16, color: '#c62828' }} />
      )}
      <Typography variant="body2">
        <b>{etiqueta}:</b> {formatearValor(cambio.campo, cambio.valorAnterior, tiposAlerta)} →{' '}
        {formatearValor(cambio.campo, cambio.valorNuevo, tiposAlerta)}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          ({subio ? '+' : ''}
          {cambio.variacion}
          {cambio.campo === 'porcentajeAvanceCampo' ? '%' : ''})
        </Typography>
      </Typography>
    </Box>
  )
}
