import { useState } from 'react'
import { Box, CircularProgress, MenuItem, Select } from '@mui/material'
import { ESTADOS_COMPROMISO, type Compromiso, type EstadoCompromiso } from '../../types/actas.types'

const ESTILOS_ESTADO: Record<EstadoCompromiso, { bg: string; color: string; border: string }> = {
  Pendiente: { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
  'En progreso': { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  Crítica: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  Completada: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
}

interface Props {
  compromiso: Compromiso
  onCambiar: (c: Compromiso, nuevo: EstadoCompromiso) => Promise<void>
}

/** Colored status dropdown that saves on change and shows a spinner while saving. */
export function SelectorEstado({ compromiso, onCambiar }: Props) {
  const [guardando, setGuardando] = useState(false)
  const estilo = ESTILOS_ESTADO[compromiso.estado]

  const cambiar = async (nuevo: EstadoCompromiso) => {
    if (nuevo === compromiso.estado) return
    setGuardando(true)
    try {
      await onCambiar(compromiso, nuevo)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Select
        size="small"
        value={compromiso.estado}
        onChange={(e) => cambiar(e.target.value as EstadoCompromiso)}
        disabled={guardando}
        inputProps={{ 'aria-label': 'Cambiar estado' }}
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          borderRadius: 2,
          minWidth: 130,
          bgcolor: estilo.bg,
          color: estilo.color,
          border: `1px solid ${estilo.border}`,
          '& .MuiSelect-select': { py: 0.5, px: 1.25 },
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
        }}
      >
        {ESTADOS_COMPROMISO.map((est) => (
          <MenuItem key={est} value={est} sx={{ fontSize: '0.8125rem' }}>
            {est}
          </MenuItem>
        ))}
      </Select>
      {guardando && <CircularProgress size={16} />}
    </Box>
  )
}
