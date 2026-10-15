import { Box, Card, Typography } from '@mui/material'
import type { ConteoEstados } from '../../../utils/actas/tablero.util'

const TARJETAS: { clave: keyof ConteoEstados; titulo: string; color: string }[] = [
  { clave: 'total', titulo: 'TAREAS TOTALES', color: 'text.primary' },
  { clave: 'Pendiente', titulo: 'PENDIENTES', color: 'text.secondary' },
  { clave: 'En progreso', titulo: 'EN PROGRESO', color: 'info.main' },
  { clave: 'Crítica', titulo: 'CRÍTICAS', color: 'error.main' },
  { clave: 'Completada', titulo: 'COMPLETADAS', color: 'success.main' },
]

export function TarjetasEstado({ conteo }: { conteo: ConteoEstados }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
      }}
    >
      {TARJETAS.map(({ clave, titulo, color }) => (
        <Card key={clave} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {titulo}
          </Typography>
          <Typography variant="h4" sx={{ color, fontWeight: 700 }}>
            {conteo[clave]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {conteo.total ? Math.round((conteo[clave] / conteo.total) * 100) : 0}% del total
          </Typography>
        </Card>
      ))}
    </Box>
  )
}
