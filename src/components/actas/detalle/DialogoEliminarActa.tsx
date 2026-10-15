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
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

interface DialogoEliminarActaProps {
  open: boolean
  origen: string
  onCerrar: () => void
  onConfirmar: () => Promise<void>
}

export function DialogoEliminarActa({ open, origen, onCerrar, onConfirmar }: DialogoEliminarActaProps) {
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manejarEliminar = async () => {
    setEliminando(true)
    setError(null)
    try {
      await onConfirmar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Error al eliminar el acta: ${msg}`)
      setEliminando(false)
    }
  }

  return (
    <Dialog open={open} onClose={eliminando ? undefined : onCerrar} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        Eliminar acta
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body1">
            ¿Está seguro de que desea eliminar el acta <strong>{origen}</strong>?
          </Typography>

          <Alert severity="warning">
            Esta acción no se puede deshacer. Se eliminarán también todos los compromisos y pendientes asociados a esta acta.
          </Alert>
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
          {eliminando ? 'Eliminando...' : 'Eliminar acta'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
