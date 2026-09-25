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
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import HistoryIcon from '@mui/icons-material/History'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import DeleteIcon from '@mui/icons-material/Delete'
import { useNavigate } from 'react-router-dom'
import { CarruselFotos } from './CarruselFotos'
import { EditorTextoConFormato } from './EditorTextoConFormato'
import { TextoConFormato } from './TextoConFormato'
import { Seccion } from '../layout/Seccion'
import { useEsMovil } from '../../hooks/useEsMovil'
import { COLOR_ESTADO, COLOR_FONDO_DIALOGO, COLOR_SEVERIDAD, COLOR_TEXTO_SEVERIDAD, ETIQUETA_ESTADO } from '../../theme/theme'
import type { TipoAlerta, VisitaSeguimiento } from '../../types/seguimiento.types'

export interface CambiosVisitaEditables {
  porcentajeAvanceCampo: number
  observaciones: string
  fechaProximaVisita: string | null
  fechaVisita: string
  porcentajeProgramado: number | null
  porcentajePagado: number | null
  proximoFrente: string | null
}

interface DetalleVisitaDialogProps {
  visita: VisitaSeguimiento
  nombreObra: string
  direccionObra?: string | null
  nombreAutor?: string
  tiposAlerta: TipoAlerta[]
  onCerrar: () => void
  onGuardar: (cambios: CambiosVisitaEditables) => void
  // Vista de gerencia: oculta Editar/Guardar y "Nueva visita a esta obra" —
  // solo mira y navega al historial.
  soloLectura?: boolean
  // Se pasan juntos: si no vienen, el toggle "Visto por gerencia" no se muestra.
  vistoGerencia?: boolean
  onCambiarVisto?: (visto: boolean) => void
  // Si no viene, no se muestra "Borrar" — quien llama decide el permiso
  // (autor de la visita o rol ingeniero, ver permisos.util.ts) antes de pasarlo.
  onBorrar?: () => void
}

export function DetalleVisitaDialog({
  visita,
  nombreObra,
  direccionObra,
  nombreAutor,
  tiposAlerta,
  onCerrar,
  onGuardar,
  soloLectura = false,
  vistoGerencia,
  onCambiarVisto,
  onBorrar,
}: DetalleVisitaDialogProps) {
  const navigate = useNavigate()
  const esMovil = useEsMovil()
  const [editando, setEditando] = useState(false)
  const [avance, setAvance] = useState(visita.porcentajeAvanceCampo)
  const [observaciones, setObservaciones] = useState(visita.observaciones)
  const [proximaVisita, setProximaVisita] = useState(visita.fechaProximaVisita ?? '')
  const [fechaVisita, setFechaVisita] = useState(visita.fechaVisita)
  const [programado, setProgramado] = useState(visita.porcentajeProgramado?.toString() ?? '')
  const [pagado, setPagado] = useState(visita.porcentajePagado?.toString() ?? '')
  const [proximoFrente, setProximoFrente] = useState(visita.proximoFrente ?? '')

  const nombreTipoAlerta = (id: string) =>
    tiposAlerta.find((t) => t.id === id)?.nombre ?? 'Alerta'

  function guardar() {
    onGuardar({
      porcentajeAvanceCampo: avance,
      observaciones,
      fechaProximaVisita: proximaVisita || null,
      fechaVisita,
      porcentajeProgramado: programado === '' ? null : Number(programado),
      porcentajePagado: pagado === '' ? null : Number(pagado),
      proximoFrente: proximoFrente || null,
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
              {nombreAutor && ` · ${nombreAutor}`}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={ETIQUETA_ESTADO[visita.estado]}
            sx={{ backgroundColor: COLOR_ESTADO[visita.estado], color: '#fff', fontWeight: 600 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent id="ficha-visita-imprimible" sx={{ bgcolor: COLOR_FONDO_DIALOGO }}>
        {!soloLectura && visita.estado === 'revisada' && (
          <Alert severity="success" sx={{ mb: 2.5 }}>
            Visita revisada: todavía se puede editar o corregir.
          </Alert>
        )}

        {/* La ficha impresa no incluye el DialogTitle (queda afuera del id
            imprimible), así que este encabezado lo reemplaza — solo visible
            al imprimir. */}
        <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2 } }}>
          <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
            {nombreObra}
          </Typography>
          {direccionObra && <Typography variant="body2">{direccionObra}</Typography>}
          <Typography variant="body2">
            Visita del {fechaVisita}
            {nombreAutor && ` · ${nombreAutor}`} · {ETIQUETA_ESTADO[visita.estado]}
          </Typography>
        </Box>

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
                <TextField
                  label="% programado (opcional)"
                  type="number"
                  value={programado}
                  onChange={(e) => setProgramado(e.target.value)}
                  sx={{ flex: '1 1 140px' }}
                />
                <TextField
                  label="% pagado (opcional)"
                  type="number"
                  value={pagado}
                  onChange={(e) => setPagado(e.target.value)}
                  sx={{ flex: '1 1 140px' }}
                />
                <TextField
                  label="Próximo frente (opcional)"
                  value={proximoFrente}
                  onChange={(e) => setProximoFrente(e.target.value)}
                  sx={{ flex: '1 1 200px' }}
                />
              </>
            ) : (
              <>
                <Dato etiqueta="Fecha de la visita" valor={visita.fechaVisita} />
                <Dato etiqueta="Avance observado" valor={`${visita.porcentajeAvanceCampo}%`} />
                <Dato etiqueta="Próxima visita" valor={visita.fechaProximaVisita ?? '—'} />
                {visita.porcentajeProgramado != null && (
                  <Dato etiqueta="Programado" valor={`${visita.porcentajeProgramado}%`} />
                )}
                {visita.porcentajePagado != null && (
                  <Dato etiqueta="Pagado" valor={`${visita.porcentajePagado}%`} />
                )}
                {visita.proximoFrente && <Dato etiqueta="Próximo frente" valor={visita.proximoFrente} />}
              </>
            )}
          </Box>
        </Seccion>

        <Seccion titulo="Observaciones">
          {editando ? (
            <EditorTextoConFormato valor={observaciones} onCambiar={setObservaciones} />
          ) : visita.observaciones ? (
            <Typography variant="body2" component="div">
              <TextoConFormato texto={visita.observaciones} />
            </Typography>
          ) : (
            <Typography variant="body2">Sin observaciones.</Typography>
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
                      color: COLOR_TEXTO_SEVERIDAD[alerta.severidad],
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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', '@media print': { display: 'none' } }}>
          <Button
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => navigate(`/seguimiento/historial/${visita.obraId}`)}
          >
            Ver historial de la obra
          </Button>
          {!soloLectura && (
            <Button
              size="small"
              startIcon={<AddLocationAltIcon />}
              onClick={() => navigate(`/seguimiento/registrar/${visita.obraId}`)}
            >
              Nueva visita a esta obra
            </Button>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {vistoGerencia !== undefined && onCambiarVisto ? (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={vistoGerencia}
                onChange={(e) => onCambiarVisto(e.target.checked)}
              />
            }
            label="Visto por gerencia"
            sx={{ ml: 0 }}
          />
        ) : (
          <Box />
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!soloLectura && onBorrar && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (window.confirm('¿Seguro que querés borrar esta visita? No se puede deshacer.')) {
                  onBorrar()
                }
              }}
            >
              Borrar
            </Button>
          )}
          <Button startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>
            Exportar PDF
          </Button>
          <Button onClick={onCerrar}>Cerrar</Button>
          {!soloLectura && !editando && (
            <Button variant="outlined" onClick={() => setEditando(true)}>
              Editar
            </Button>
          )}
          {!soloLectura && editando && (
            <Button variant="contained" onClick={guardar}>
              Guardar cambios
            </Button>
          )}
        </Box>
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
