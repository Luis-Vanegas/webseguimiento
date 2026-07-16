import { Box, LinearProgress, Typography } from '@mui/material'
import { COLOR_SIDEBAR } from '../../theme/theme'

// Avance como barra + %: lectura de un vistazo, en vez del número suelto que
// usaban las pantallas operativas ("Avance: 45%"). Navy (marca) para
// distinguirla de otras barras de progreso del módulo (ej. cobertura en Gestión).
export function BarraAvance({ valor }: { valor: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(Math.max(valor, 0), 100)}
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          bgcolor: 'rgba(10, 30, 61, 0.08)',
          '& .MuiLinearProgress-bar': { bgcolor: COLOR_SIDEBAR, borderRadius: 3 },
        }}
      />
      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 34, textAlign: 'right' }}>
        {valor}%
      </Typography>
    </Box>
  )
}
