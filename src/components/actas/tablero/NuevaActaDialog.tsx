import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { crearActa } from '../../../features/actas/actasApi'
import { claveDeDate } from '../../../utils/seguimiento/fechas.util'

interface Props {
  abierto: boolean
  onCerrar: () => void
}

export function NuevaActaDialog({ abierto, onCerrar }: Props) {
  const navigate = useNavigate()
  const [origen, setOrigen] = useState('')
  const [fecha, setFecha] = useState(() => claveDeDate(new Date()))
  const [asistentes, setAsistentes] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      const acta = await crearActa({
        origen: origen.trim(),
        fecha,
        asistentes: asistentes.trim() || null,
        notas: notas.trim() || null,
      })
      navigate(`/actas/${acta.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el acta.')
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onClose={guardando ? undefined : onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={guardar}>
        <DialogTitle>Nueva acta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Origen (reunión)"
              placeholder="Ej. Comité Directivo"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Asistentes"
              value={asistentes}
              onChange={(e) => setAsistentes(e.target.value)}
              multiline
              minRows={2}
            />
            <TextField label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={guardando || !origen.trim() || !fecha}>
            {guardando ? 'Creando…' : 'Crear acta'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
