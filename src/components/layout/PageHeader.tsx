import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  accion?: ReactNode
}

// Encabezado compartido por todas las pantallas del módulo — misma
// jerarquía (título/subtítulo/acción) en vez de que cada pantalla arme la
// suya con tamaños distintos.
export function PageHeader({ titulo, subtitulo, accion }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 1.5,
        flexWrap: 'wrap',
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h5">{titulo}</Typography>
        {subtitulo && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitulo}
          </Typography>
        )}
      </Box>
      {accion && <Box sx={{ flexShrink: 0 }}>{accion}</Box>}
    </Box>
  )
}
