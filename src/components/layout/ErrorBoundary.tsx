import { Component, type ReactNode } from 'react'
import { Alert, Box, Typography } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Sin esto, un error de render no capturado desmonta TODA la app (pantalla
// en blanco sin ningún mensaje) — ver recomendación de React en consola.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, maxWidth: 640, mx: 'auto' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Ocurrió un error inesperado en esta pantalla.
          </Alert>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {this.state.error.message}
          </Typography>
        </Box>
      )
    }
    return this.props.children
  }
}
