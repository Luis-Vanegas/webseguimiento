import type { ReactNode } from 'react'
import { Paper, Typography } from '@mui/material'

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        {titulo}
      </Typography>
      {children}
    </Paper>
  )
}
