import { useState } from 'react'
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import EngineeringIcon from '@mui/icons-material/Engineering'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { COLOR_SIDEBAR } from '../../theme/theme'

export function LoginSeguimiento() {
  const { usuario, cargando } = useUsuarioActual()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!cargando && usuario) {
    return <Navigate to="/seguimiento/mis-visitas" replace />
  }

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)

    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email, password })

    if (errorLogin) {
      setError(errorLogin.message)
    }
    setEnviando(false)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        px: 2,
        background: `linear-gradient(160deg, ${COLOR_SIDEBAR} 0%, #123060 55%, #1a4a8a 100%)`,
      }}
    >
      <Paper
        sx={{ p: 4, width: 380, maxWidth: '100%', borderRadius: 3 }}
        elevation={8}
        component="form"
        onSubmit={manejarEnvio}
      >
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <EngineeringIcon sx={{ fontSize: 42, color: '#29B6E8' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Seguimiento de Obras
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registro de visitas de campo
          </Typography>
        </Box>
        <TextField
          label="Correo"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }} disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </Paper>
    </Box>
  )
}
