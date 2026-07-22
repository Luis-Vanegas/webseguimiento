import { useMediaQuery, useTheme } from '@mui/material'

// Antes repetido línea por línea en 7 componentes distintos
// (`useMediaQuery(useTheme().breakpoints.down('sm'))`).
export function useEsMovil(): boolean {
  return useMediaQuery(useTheme().breakpoints.down('sm'))
}
