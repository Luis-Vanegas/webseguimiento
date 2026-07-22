import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material'
import RouteIcon from '@mui/icons-material/Route'
import { CarruselFotos } from './CarruselFotos'
import { Seccion } from '../layout/Seccion'
import { useEsMovil } from '../../hooks/useEsMovil'
import { COLOR_ACENTO, COLOR_FONDO_DIALOGO, COLOR_RUTA_PLANEADA } from '../../theme/theme'
import type { FotoVisita, RecorridoSeguimiento } from '../../types/seguimiento.types'

function formatearDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`
  return `${(metros / 1000).toFixed(1)} km`
}

function formatearDuracion(fechaInicio: string, fechaFin: string): string {
  const segundos = Math.max(0, Math.floor((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 1000))
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// dd/mm/aaaa hh:mm en horario local, sin dependencias de formato.
function formatearFechaHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface DetalleRecorridoDialogProps {
  recorrido: RecorridoSeguimiento
  nombreAutor?: string
  onCerrar: () => void
}

export function DetalleRecorridoDialog({ recorrido, nombreAutor, onCerrar }: DetalleRecorridoDialogProps) {
  const esMovil = useEsMovil()
  const fotos = recorrido.fotos ?? []
  const esPlaneado = recorrido.tipo === 'planeado'
  const colorTipo = esPlaneado ? COLOR_RUTA_PLANEADA : COLOR_ACENTO

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="md" fullScreen={esMovil}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <RouteIcon sx={{ color: colorTipo, mt: 0.3 }} />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
                {recorrido.titulo || 'Recorrido sin título'}
              </Typography>
              <Chip
                size="small"
                label={esPlaneado ? 'Planeada' : 'Grabada'}
                sx={{ bgcolor: `${colorTipo}1f`, color: colorTipo, fontWeight: 700 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {/* Para 'planeado' fechaInicio === fechaFin (no hay tiempo caminado
                  real): se muestra una sola fecha en vez de un rango redundante. */}
              {esPlaneado
                ? formatearFechaHora(recorrido.fechaInicio)
                : `${formatearFechaHora(recorrido.fechaInicio)} — ${formatearFechaHora(recorrido.fechaFin)}`}
              {nombreAutor && ` · ${nombreAutor}`}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: COLOR_FONDO_DIALOGO }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            p: 2,
            mb: 2.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Kpi etiqueta="Distancia" valor={formatearDistancia(recorrido.distanciaMetros)} />
          {/* Duración solo aplica a 'grabado': en 'planeado' fechaInicio === */}
          {/* fechaFin daría siempre 00:00, así que se omite ese KPI. */}
          {esPlaneado ? (
            <Kpi etiqueta="Tipo" valor="Ruta planeada" />
          ) : (
            <Kpi etiqueta="Duración" valor={formatearDuracion(recorrido.fechaInicio, recorrido.fechaFin)} />
          )}
          <Kpi etiqueta="Puntos" valor={String(recorrido.trazo.length)} />
        </Box>

        <Seccion titulo="Observaciones">
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {recorrido.observaciones || 'Sin observaciones.'}
          </Typography>
        </Seccion>

        {fotos.length > 0 && (
          <Seccion titulo={`Fotos (${fotos.length})`}>
            {/* FotoRecorrido comparte la forma id/storagePath/orden que usa
                CarruselFotos; el cast salva los campos que no consume. */}
            <CarruselFotos fotos={fotos as unknown as FotoVisita[]} />
          </Seccion>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

function Kpi({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box sx={{ flex: '1 1 90px' }}>
      <Typography variant="subtitle2">{etiqueta}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{valor}</Typography>
    </Box>
  )
}
