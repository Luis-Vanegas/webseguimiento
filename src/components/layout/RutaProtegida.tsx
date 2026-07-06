import { CircularProgress, Box } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'

export function RutaProtegida() {
  const { usuario, cargando } = useUsuarioActual()

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!usuario) {
    return <Navigate to="/seguimiento/login" replace />
  }

  return <Outlet />
}
