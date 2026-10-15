import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { crearActa, crearCompromiso } from '../../../features/actas/actasApi'
import { claveDeDate } from '../../../utils/seguimiento/fechas.util'
import { compromisosDeBorrador, type CompromisoBorrador } from './filasCompromisos'

export interface AvisoActa {
  severidad: 'success' | 'warning'
  mensaje: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Existing meeting names, offered as suggestions. */
  origenes: string[]
}

const filaVacia = (): CompromisoBorrador => ({ actividad: '', responsable: '', fechaVencimiento: '' })

export function NuevaActaDialog({ abierto, onCerrar, origenes }: Props) {
  const navigate = useNavigate()
  const pantallaCompleta = useMediaQuery(useTheme().breakpoints.down('sm'))
  const [origen, setOrigen] = useState('')
  const [fecha, setFecha] = useState(() => claveDeDate(new Date()))
  const [asistentes, setAsistentes] = useState('')
  const [notas, setNotas] = useState('')
  const [filas, setFilas] = useState<CompromisoBorrador[]>([filaVacia()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fresh form every time it opens.
  useEffect(() => {
    if (!abierto) return
    setOrigen('')
    setFecha(claveDeDate(new Date()))
    setAsistentes('')
    setNotas('')
    setFilas([filaVacia()])
    setError(null)
    setGuardando(false)
  }, [abierto])

  const cambiarFila = (i: number, cambios: Partial<CompromisoBorrador>) =>
    setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...cambios } : f)))
  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (i: number) =>
    setFilas((prev) => (prev.length === 1 ? [filaVacia()] : prev.filter((_, j) => j !== i)))

  // Enter on an activity adds the next row instead of submitting the whole acta.
  const enterAgregaFila = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (i === filas.length - 1 && filas[i].actividad.trim()) agregarFila()
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    let actaId: string
    try {
      const acta = await crearActa({
        origen: origen.trim(),
        fecha,
        asistentes: asistentes.trim() || null,
        notas: notas.trim() || null,
      })
      actaId = acta.id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el acta.')
      setGuardando(false)
      return
    }

    // The acta already exists: from here on, always go to it and report what was saved.
    const nuevos = compromisosDeBorrador(filas, actaId)
    const resultados = await Promise.allSettled(nuevos.map(crearCompromiso))
    const fallidos = resultados.filter((r) => r.status === 'rejected').length
    const aviso: AvisoActa =
      fallidos > 0
        ? {
            severidad: 'warning',
            mensaje: `Acta creada, pero ${fallidos} de ${nuevos.length} compromisos no se guardaron. Agrégalos de nuevo aquí.`,
          }
        : {
            severidad: 'success',
            mensaje:
              nuevos.length > 0
                ? `Acta creada con ${nuevos.length} ${nuevos.length === 1 ? 'compromiso' : 'compromisos'}.`
                : 'Acta creada. Ahora puedes agregar sus compromisos.',
          }
    navigate(`/actas/${actaId}`, { state: { aviso } })
  }

  const conActividad = filas.filter((f) => f.actividad.trim()).length

  return (
    <Dialog
      open={abierto}
      onClose={guardando ? undefined : onCerrar}
      fullWidth
      maxWidth="md"
      fullScreen={pantallaCompleta}
    >
      <form onSubmit={guardar}>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva acta</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
              <Autocomplete
                freeSolo
                options={origenes}
                inputValue={origen}
                onInputChange={(_, v) => setOrigen(v)}
                disabled={guardando}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Origen (reunión)"
                    placeholder="Ej. Comité Directivo"
                    helperText="Elige una reunión existente o escribe una nueva"
                    required
                    autoFocus
                  />
                )}
              />
              <TextField
                label="Fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                disabled={guardando}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <TextField
              label="Asistentes"
              value={asistentes}
              onChange={(e) => setAsistentes(e.target.value)}
              disabled={guardando}
              multiline
              minRows={1}
            />
            <TextField
              label="Notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={guardando}
              multiline
              minRows={2}
            />

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Compromisos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Opcional. Escribe cada tarea y presiona Enter para agregar la siguiente. Quedan en estado
                «Pendiente».
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {filas.map((f, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', sm: '3fr 2fr 1.4fr auto' },
                    gap: 1,
                    alignItems: 'start',
                  }}
                >
                  <TextField
                    size="small"
                    label={`Actividad ${i + 1}`}
                    value={f.actividad}
                    onChange={(e) => cambiarFila(i, { actividad: e.target.value })}
                    onKeyDown={(e) => enterAgregaFila(e, i)}
                    disabled={guardando}
                    autoFocus={i > 0 && i === filas.length - 1}
                    sx={{ gridColumn: { xs: '1 / 2', sm: 'auto' } }}
                  />
                  <TextField
                    size="small"
                    label="Responsable"
                    value={f.responsable}
                    onChange={(e) => cambiarFila(i, { responsable: e.target.value })}
                    disabled={guardando}
                    sx={{ gridColumn: { xs: '1 / 2', sm: 'auto' }, gridRow: { xs: 2, sm: 'auto' } }}
                  />
                  <TextField
                    size="small"
                    label="Vence"
                    type="date"
                    value={f.fechaVencimiento}
                    onChange={(e) => cambiarFila(i, { fechaVencimiento: e.target.value })}
                    disabled={guardando}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ gridColumn: { xs: '1 / 2', sm: 'auto' }, gridRow: { xs: 3, sm: 'auto' } }}
                  />
                  <IconButton
                    aria-label={`Quitar compromiso ${i + 1}`}
                    title="Quitar"
                    onClick={() => quitarFila(i)}
                    disabled={guardando}
                    sx={{ gridColumn: { xs: '2 / 3', sm: 'auto' }, gridRow: { xs: 1, sm: 'auto' } }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box>
                <Button startIcon={<AddIcon />} onClick={agregarFila} disabled={guardando} size="small">
                  Agregar otro compromiso
                </Button>
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCerrar} disabled={guardando} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={guardando || !origen.trim() || !fecha}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {guardando
              ? 'Creando…'
              : conActividad > 0
                ? `Crear acta con ${conActividad} ${conActividad === 1 ? 'compromiso' : 'compromisos'}`
                : 'Crear acta'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
