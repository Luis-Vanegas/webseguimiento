import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import HistoryIcon from '@mui/icons-material/History'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import { useNavigate } from 'react-router-dom'
import { CarruselFotos } from './CarruselFotos'
import { Seccion } from '../layout/Seccion'
import { COLOR_ESTADO, COLOR_SEVERIDAD, ETIQUETA_ESTADO } from '../../theme/theme'
import type { TipoAlerta, VisitaSeguimiento } from '../../types/seguimiento.types'

export interface CambiosVisitaEditables {
  porcentajeAvanceCampo: number
  observaciones: string
  fechaProximaVisita: string | null
  fechaVisita: string
}

interface DetalleVisitaDialogProps {
  visita: VisitaSeguimiento
  nombreObra: string
  direccionObra?: string | null
  tiposAlerta: TipoAlerta[]
  onCerrar: () => void
  onGuardar: (cambios: CambiosVisitaEditables) => void
}

export function DetalleVisitaDialog({
  visita,
  nombreObra,
  direccionObra,
  tiposAlerta,
  onCerrar,
  onGuardar,
}: DetalleVisitaDialogProps) {
  const navigate = useNavigate()
  const esMovil = useMediaQuery(useTheme().breakpoints.down('sm'))
  const [editando, setEditando] = useState(false)
  const [avance, setAvance] = useState(visita.porcentajeAvanceCampo)
  const [observaciones, setObservaciones] = useState(visita.observaciones)
  const [proximaVisita, setProximaVisita] = useState(visita.fechaProximaVisita ?? '')
  const [fechaVisita, setFechaVisita] = useState(visita.fechaVisita)

  const nombreTipoAlerta = (id: string) =>
    tiposAlerta.find((t) => t.id === id)?.nombre ?? 'Alerta'

  function guardar() {
    onGuardar({
      porcentajeAvanceCampo: avance,
      observaciones,
      fechaProximaVisita: proximaVisita || null,
      fechaVisita,
    })
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="md" fullScreen={esMovil}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
              {nombreObra}
            </Typography>
            {direccionObra && (
              <Typography variant="body2" color="text.secondary">
                {direccionObra}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Visita del {fechaVisita}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={ETIQUETA_ESTADO[visita.estado]}
            sx={{ backgroundColor: COLOR_ESTADO[visita.estado], color: '#fff', fontWeight: 600 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#f7f9fc' }}>
        {visita.estado === 'revisada' && (
          <Alert severity="success" sx={{ mb: 2.5 }}>
            Visita revisada: todavía se puede editar o corregir.
          </Alert>
        )}

        <Seccion titulo="Datos de la visita">
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {editando ? (
              <>
                <TextField
                  label="Fecha de la visita"
                  type="date"
                  value={fechaVisita}
                  onChange={(e) => setFechaVisita(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: '1 1 140px' }}
                />
                <TextField
                  label="% avance observado"
                  type="number"
                  value={avance}
                  onChange={(e) => setAvance(Number(e.target.value))}
                  sx={{ flex: '1 1 140px' }}
                />
                <TextField
                  label="Próxima visita"
                  type="date"
                  value={proximaVisita}
                  onChange={(e) => setProximaVisita(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: '1 1 140px' }}
                />
              </>
            ) : (
              <>
                <Dato etiqueta="Fecha de la visita" valor={visita.fechaVisita} />
                <Dato etiqueta="Avance observado" valor={`${visita.porcentajeAvanceCampo}%`} />
                <Dato etiqueta="Próxima visita" valor={visita.fechaProximaVisita ?? '—'} />
              </>
            )}
          </Box>
        </Seccion>

        <Seccion titulo="Observaciones">
          {editando ? (
            <TextField
              multiline
              minRows={3}
              fullWidth
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {visita.observaciones || 'Sin observaciones.'}
            </Typography>
          )}
        </Seccion>

        {(visita.alertas?.length ?? 0) > 0 && (
          <Seccion titulo="Alertas de campo">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {visita.alertas!.map((alerta) => (
                <Box key={alerta.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningAmberIcon sx={{ fontSize: 18, color: COLOR_SEVERIDAD[alerta.severidad] }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {nombreTipoAlerta(alerta.tipoAlertaId)}
                    {alerta.detalle ? ` — ${alerta.detalle}` : ''}
                  </Typography>
                  <Chip
                    size="small"
                    label={alerta.severidad}
                    sx={{
                      height: 20,
                      fontSize: 11,
                      bgcolor: COLOR_SEVERIDAD[alerta.severidad],
                      color: '#fff',
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Seccion>
        )}

        {(visita.fotos?.length ?? 0) > 0 && (
          <Seccion titulo={`Fotos (${visita.fotos!.length})`}>
            <CarruselFotos fotos={visita.fotos!} />
          </Seccion>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => navigate(`/seguimiento/historial/${visita.obraId}`)}
          >
            Ver historial de la obra
          </Button>
          <Button
            size="small"
            startIcon={<AddLocationAltIcon />}
            onClick={() => navigate(`/seguimiento/registrar/${visita.obraId}`)}
          >
            Nueva visita a esta obra
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar}>Cerrar</Button>
        {!editando && (
          <Button variant="outlined" onClick={() => setEditando(true)}>
            Editar
          </Button>
        )}
        {editando && (
          <Button variant="contained" onClick={guardar}>
            Guardar cambios
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box sx={{ flex: '1 1 140px' }}>
      <Typography variant="subtitle2">{etiqueta}</Typography>
      <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{valor}</Typography>
    </Box>
  )
}
