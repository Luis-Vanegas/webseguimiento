import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import {
  ESTADOS_COMPROMISO,
  type Compromiso,
  type CompromisoNuevo,
  type EstadoCompromiso,
} from '../../../types/actas.types'

interface DialogoCompromisoProps {
  open: boolean
  compromisoAEditar: Compromiso | null
  actaId: string
  onCerrar: () => void
  onGuardar: (datos: CompromisoNuevo | Partial<CompromisoNuevo>) => Promise<void>
}

export function DialogoCompromiso({
  open,
  compromisoAEditar,
  actaId,
  onCerrar,
  onGuardar,
}: DialogoCompromisoProps) {
  const [actividad, setActividad] = useState('')
  const [responsable, setResponsable] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [estado, setEstado] = useState<EstadoCompromiso>('Pendiente')
  const [criterioFecha, setCriterioFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (compromisoAEditar) {
        setActividad(compromisoAEditar.actividad)
        setResponsable(compromisoAEditar.responsable ?? '')
        setFechaVencimiento(compromisoAEditar.fechaVencimiento ?? '')
        setEstado(compromisoAEditar.estado)
        setCriterioFecha(compromisoAEditar.criterioFecha ?? '')
      } else {
        setActividad('')
        setResponsable('')
        setFechaVencimiento('')
        setEstado('Pendiente')
        setCriterioFecha('')
      }
      setError(null)
      setGuardando(false)
    }
  }, [open, compromisoAEditar])

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actividad.trim()) {
      setError('La actividad específica es obligatoria.')
      return
    }

    setGuardando(true)
    setError(null)
    try {
      const payload = {
        actaId,
        actividad: actividad.trim(),
        responsable: responsable.trim() || null,
        fechaVencimiento: fechaVencimiento || null,
        estado,
        criterioFecha: criterioFecha.trim() || null,
      }
      await onGuardar(payload)
      onCerrar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Error al guardar el compromiso: ${msg}`)
    } finally {
      setGuardando(false)
    }
  }

  const esEdicion = Boolean(compromisoAEditar)

  return (
    <Dialog open={open} onClose={guardando ? undefined : onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={manejarEnvio}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {esEdicion ? 'Editar compromiso' : 'Nuevo compromiso'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Actividad específica"
              value={actividad}
              onChange={(e) => setActividad(e.target.value)}
              required
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Describa la tarea o actividad a realizar"
              disabled={guardando}
            />

            <TextField
              label="Responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              fullWidth
              size="small"
              placeholder="Nombre de la persona, contratista o área responsable"
              disabled={guardando}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Fecha de vencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={guardando}
                helperText="Opcional"
              />

              <FormControl fullWidth size="small" required>
                <InputLabel id="estado-compromiso-label">Estado</InputLabel>
                <Select
                  labelId="estado-compromiso-label"
                  value={estado}
                  label="Estado"
                  onChange={(e) => setEstado(e.target.value as EstadoCompromiso)}
                  disabled={guardando}
                >
                  {ESTADOS_COMPROMISO.map((est) => (
                    <MenuItem key={est} value={est}>
                      {est}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Criterio de fecha / Observaciones de plazo"
              value={criterioFecha}
              onChange={(e) => setCriterioFecha(e.target.value)}
              fullWidth
              size="small"
              placeholder="Ej. Según entrega de informe, antes del próximo comité..."
              disabled={guardando}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCerrar} disabled={guardando} color="inherit" sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={guardando || !actividad.trim()}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
          >
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear compromiso'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
