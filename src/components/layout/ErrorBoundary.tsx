import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  componentStack: string
}

// Sin esto, un error de render no capturado desmonta TODA la app (pantalla
// en blanco sin ningún mensaje) — ver recomendación de React en consola.
//
// Además del mensaje se muestran el stack y el componentStack: sin ellos un
// error reportado desde un celular ("removeChild no es hijo de este nodo")
// no alcanza para saber qué componente lo tiró.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' })
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error, componentStack } = this.state
    if (error) {
      const detalle = [error.message, error.stack, componentStack].filter(Boolean).join('\n\n')
      return (
        <Box sx={{ p: 4, maxWidth: 640, mx: 'auto' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Ocurrió un error inesperado en esta pantalla.
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button variant="contained" size="small" onClick={() => window.location.reload()}>
              Recargar
            </Button>
            <Button size="small" onClick={() => navigator.clipboard?.writeText(detalle)}>
              Copiar detalle
            </Button>
          </Box>
          <Typography
            variant="body2"
            component="pre"
            sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, overflowX: 'auto' }}
          >
            {detalle}
          </Typography>
        </Box>
      )
    }
    return this.props.children
  }
}
