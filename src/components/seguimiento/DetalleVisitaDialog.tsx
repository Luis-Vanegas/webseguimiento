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
  Divider,
  TextField,
  Typography,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import HistoryIcon from '@mui/icons-material/History'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import { useNavigate } from 'react-router-dom'
import { FotoVisitaImg } from './FotoVisitaImg'
import { COLOR_ESTADO } from '../../theme/theme'
import type {
  EstadoVisita,
  SeveridadAlerta,
  TipoAlerta,
  UsuarioSeguimiento,
  VisitaSeguimiento,
} from '../../types/seguimiento.types'

const ETIQUETA_ESTADO: Record<EstadoVisita, string> = {
  pendiente_revisar: 'Pendiente de revisar',
  en_revision: 'En revisión',
  revisada: 'Revisada',
}

const COLOR_SEVERIDAD: Record<SeveridadAlerta, string> = {
  baja: '#22c55e',
  media: '#f9a825',
  alta: '#ef4444',
}

export interface CambiosVisitaEditables {
  porcentajeAvanceCampo: number
  presupuestoObservadoCampo: number
  observaciones: string
  fechaProximaVisita: string | null
}

// Reglas de edición (espejo de las policies RLS del schema): el visitador
// solo edita su propia visita mientras siga pendiente_revisar; el ingeniero
// edita cualquiera que no esté revisada; revisada es de solo lectura para
// todos — una corrección posterior es una visita nueva.
function puedeEditarVisita(
  visita: VisitaSeguimiento,
  usuario: UsuarioSeguimiento | null,
): boolean {
  if (!usuario || visita.estado === 'revisada') return false
  if (usuario.rol === 'ingeniero') return true
  return visita.autorId === usuario.id && visita.estado === 'pendiente_revisar'
}

interface DetalleVisitaDialogProps {
  visita: VisitaSeguimiento
  usuario: UsuarioSeguimiento | null
  nombreObra: string
  tiposAlerta: TipoAlerta[]
  onCerrar: () => void
  onGuardar: (cambios: CambiosVisitaEditables) => void
}

export function DetalleVisitaDialog({
  visita,
  usuario,
  nombreObra,
  tiposAlerta,
  onCerrar,
  onGuardar,
}: DetalleVisitaDialogProps) {
  const navigate = useNavigate()
  const editable = puedeEditarVisita(visita, usuario)
  const [editando, setEditando] = useState(false)
  const [avance, setAvance] = useState(visita.porcentajeAvanceCampo)
  const [presupuesto, setPresupuesto] = useState(visita.presupuestoObservadoCampo)
  const [observaciones, setObservaciones] = useState(visita.observaciones)
  const [proximaVisita, setProximaVisita] = useState(visita.fechaProximaVisita ?? '')

  const nombreTipoAlerta = (id: string) =>
    tiposAlerta.find((t) => t.id === id)?.nombre ?? 'Alerta'

  function guardar() {
    onGuardar({
      porcentajeAvanceCampo: avance,
      presupuestoObservadoCampo: presupuesto,
      observaciones,
      fechaProximaVisita: proximaVisita || null,
    })
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
              {nombreObra}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visita del {visita.fechaVisita}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={ETIQUETA_ESTADO[visita.estado]}
            sx={{ backgroundColor: COLOR_ESTADO[visita.estado], color: '#fff', fontWeight: 600 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visita.estado === 'revisada' && (
          <Alert severity="success" sx={{ py: 0 }}>
            Visita revisada: es de solo lectura. Una corrección posterior se registra como visita nueva.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
          {editando ? (
            <>
              <TextField
                label="% avance observado"
                type="number"
                value={avance}
                onChange={(e) => setAvance(Number(e.target.value))}
                sx={{ flex: '1 1 140px' }}
              />
              <TextField
                label="Presupuesto observado"
                type="number"
                value={presupuesto}
                onChange={(e) => setPresupuesto(Number(e.target.value))}
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
              <Dato etiqueta="Avance observado" valor={`${visita.porcentajeAvanceCampo}%`} />
              <Dato
                etiqueta="Presupuesto observado"
                valor={`$${visita.presupuestoObservadoCampo.toLocaleString('es-CO')}`}
              />
              <Dato etiqueta="Próxima visita" valor={visita.fechaProximaVisita ?? '—'} />
            </>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle2">Observaciones</Typography>
          {editando ? (
            <TextField
              multiline
              minRows={3}
              fullWidth
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              sx={{ mt: 0.5 }}
            />
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
              {visita.observaciones || 'Sin observaciones.'}
            </Typography>
          )}
        </Box>

        {(visita.alertas?.length ?? 0) > 0 && (
          <Box>
            <Typography variant="subtitle2">Alertas de campo</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
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
          </Box>
        )}

        {(visita.fotos?.length ?? 0) > 0 && (
          <Box>
            <Typography variant="subtitle2">Fotos ({visita.fotos!.length})</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {visita.fotos!.map((foto) => (
                <FotoVisitaImg key={foto.id} storagePath={foto.storagePath} />
              ))}
            </Box>
          </Box>
        )}

        <Divider />
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
        {editable && !editando && (
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
