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
  TextField,
} from '@mui/material'
import type { Acta, ActaNueva } from '../../../types/actas.types'

interface DialogoEditarActaProps {
  open: boolean
  acta: Acta
  onCerrar: () => void
  onGuardar: (cambios: Partial<ActaNueva>) => Promise<void>
}

export function DialogoEditarActa({ open, acta, onCerrar, onGuardar }: DialogoEditarActaProps) {
  const [origen, setOrigen] = useState(acta.origen)
  const [fecha, setFecha] = useState(acta.fecha)
  const [asistentes, setAsistentes] = useState(acta.asistentes ?? '')
  const [notas, setNotas] = useState(acta.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setOrigen(acta.origen)
      setFecha(acta.fecha)
      setAsistentes(acta.asistentes ?? '')
      setNotas(acta.notas ?? '')
      setError(null)
      setGuardando(false)
    }
  }, [open, acta])

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!origen.trim() || !fecha) {
      setError('El origen y la fecha son obligatorios.')
      return
    }

    setGuardando(true)
    setError(null)
    try {
      await onGuardar({
        origen: origen.trim(),
        fecha,
        asistentes: asistentes.trim() || null,
        notas: notas.trim() || null,
      })
      onCerrar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Error al actualizar el acta: ${msg}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onClose={guardando ? undefined : onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={manejarEnvio}>
        <DialogTitle sx={{ fontWeight: 700 }}>Editar acta</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Origen / Nombre de la reunión"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              required
              fullWidth
              size="small"
              placeholder="Ej. Comité Directivo, Arenilla a sintética"
              disabled={guardando}
            />

            <TextField
              label="Fecha de la reunión"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={guardando}
            />

            <TextField
              label="Asistentes (opcional)"
              value={asistentes}
              onChange={(e) => setAsistentes(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Ej. Juan Pérez, María Gómez, Contratista..."
              disabled={guardando}
            />

            <TextField
              label="Notas / Observaciones (opcional)"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Observaciones generales o contexto de la reunión"
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
            disabled={guardando || !origen.trim() || !fecha}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
