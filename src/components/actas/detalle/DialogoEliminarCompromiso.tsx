import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { Compromiso } from '../../../types/actas.types'

interface DialogoEliminarCompromisoProps {
  open: boolean
  compromiso: Compromiso | null
  onCerrar: () => void
  onConfirmar: (id: string) => Promise<void>
}

export function DialogoEliminarCompromiso({
  open,
  compromiso,
  onCerrar,
  onConfirmar,
}: DialogoEliminarCompromisoProps) {
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manejarEliminar = async () => {
    if (!compromiso) return
    setEliminando(true)
    setError(null)
    try {
      await onConfirmar(compromiso.id)
      onCerrar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Error al eliminar el compromiso: ${msg}`)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Dialog open={open} onClose={eliminando ? undefined : onCerrar} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <DeleteOutlineIcon color="error" />
        Eliminar compromiso
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body1">
            ¿Está seguro de que desea eliminar este compromiso?
          </Typography>

          {compromiso && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" fontWeight={600} color="text.primary">
                {compromiso.actividad}
              </Typography>
              {compromiso.responsable && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Responsable: {compromiso.responsable}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={eliminando} color="inherit" sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          onClick={manejarEliminar}
          variant="contained"
          color="error"
          disabled={eliminando}
          startIcon={eliminando ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: 'none' }}
        >
          {eliminando ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
