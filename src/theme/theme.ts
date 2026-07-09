import { createTheme } from '@mui/material/styles'
import type { EstadoVisita } from '../types/seguimiento.types'

// Paleta aproximada del Visor real (sección 8 del brief) — ajustar cuando
// se tenga acceso a theme.ts del repo real.
export const COLOR_SIDEBAR = '#0A1E3D'
export const COLOR_ACENTO = '#29B6E8'

export const COLOR_ESTADO = {
  revisada: '#2e7d32', // verde
  pendiente_revisar: '#f9a825', // ámbar
  en_revision: '#1565c0', // azul
} as const

export const ETIQUETA_ESTADO: Record<EstadoVisita, string> = {
  pendiente_revisar: 'Pendiente de revisar',
  en_revision: 'En revisión',
  revisada: 'Revisada',
}

export const theme = createTheme({
  palette: {
    primary: {
      main: COLOR_SIDEBAR,
    },
    secondary: {
      main: COLOR_ACENTO,
    },
    background: {
      default: '#f4f6fa',
    },
    text: {
      primary: '#1a2332',
      secondary: '#5c6b7a',
    },
    divider: 'rgba(10, 30, 61, 0.08)',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
    h5: { fontSize: '1.375rem', fontWeight: 700, letterSpacing: -0.2 },
    h6: { fontSize: '1.0625rem', fontWeight: 700 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 600 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, color: '#5c6b7a', textTransform: 'uppercase', letterSpacing: 0.4 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(10, 30, 61, 0.1)',
        },
        outlined: {
          borderColor: 'rgba(10, 30, 61, 0.1)',
        },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderColor: 'rgba(10, 30, 61, 0.1)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiChip: {
      styleOverrides: {
        label: { fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: '#5c6b7a',
          borderBottom: '2px solid rgba(10, 30, 61, 0.08)',
        },
        body: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
})
