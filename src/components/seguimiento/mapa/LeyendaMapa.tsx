import { Box, Typography } from '@mui/material'
import { COLOR_DESATENDIDA, LEYENDA } from './mapaEstado.util'

interface LeyendaMapaProps {
  cantidadObras: number
  cantidadComunas: number
  cantidadProximasAEntregar: number
}

export function LeyendaMapa({ cantidadObras, cantidadComunas, cantidadProximasAEntregar }: LeyendaMapaProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 20,
        left: 10,
        bgcolor: 'rgba(255,255,255,0.95)',
        borderRadius: 1.5,
        px: 1.5,
        py: 1,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        zIndex: 1,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {cantidadObras} obras · {cantidadComunas} comunas
        {cantidadProximasAEntregar > 0 && ` · ${cantidadProximasAEntregar} por entregar`}
      </Typography>
      {LEYENDA.map((item) => (
        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.15 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: item.color,
              border: item.border ? `2px solid ${COLOR_DESATENDIDA}` : 'none',
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
