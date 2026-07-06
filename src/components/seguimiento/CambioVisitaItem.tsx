import { Box, Typography } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import type { CambioVisita } from '../../utils/seguimiento/visita-comparator.util'

const ETIQUETA_CAMPO: Record<string, string> = {
  porcentajeAvanceCampo: 'Avance observado',
  presupuestoObservadoCampo: 'Presupuesto observado',
  alertasNuevas: 'Alertas nuevas',
  alertasResueltas: 'Alertas resueltas',
  alertasPersistentes: 'Alertas que continúan',
  cantidadFotos: 'Fotos',
}

function formatearValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined) return '—'
  if (Array.isArray(valor)) return valor.length === 0 ? '—' : valor.join(', ')
  if (campo === 'porcentajeAvanceCampo') return `${valor}%`
  if (campo === 'presupuestoObservadoCampo') return `$${Number(valor).toLocaleString('es-CO')}`
  return String(valor)
}

// Traduce un CambioVisita crudo (nombre de campo en camelCase, valores sin
// formato) a una línea legible para quien revisa — se usa en la tarjeta de
// contexto de RegistrarVisita y en el timeline de HistorialObra. Un solo
// lugar para no repetir el formato en cada pantalla.
export function CambioVisitaItem({ cambio }: { cambio: CambioVisita }) {
  const etiqueta = ETIQUETA_CAMPO[cambio.campo] ?? cambio.campo

  if (cambio.variacion === undefined) {
    return (
      <Typography variant="body2" sx={{ py: 0.25 }}>
        <b>{etiqueta}:</b> {formatearValor(cambio.campo, cambio.valorNuevo ?? cambio.valorAnterior)}
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
        <b>{etiqueta}:</b> {formatearValor(cambio.campo, cambio.valorAnterior)} →{' '}
        {formatearValor(cambio.campo, cambio.valorNuevo)}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          ({subio ? '+' : ''}
          {cambio.campo === 'presupuestoObservadoCampo'
            ? `$${cambio.variacion.toLocaleString('es-CO')}`
            : `${cambio.variacion}${cambio.campo === 'porcentajeAvanceCampo' ? '%' : ''}`}
          )
        </Typography>
      </Typography>
    </Box>
  )
}
