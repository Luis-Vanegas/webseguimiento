import { createTheme } from '@mui/material/styles'
import type { EstadoVisita, SeveridadAlerta } from '../types/seguimiento.types'

// Paleta aproximada del Visor real (sección 8 del brief) — ajustar cuando
// se tenga acceso a theme.ts del repo real.
export const COLOR_SIDEBAR = '#0A1E3D'
export const COLOR_ACENTO = '#29B6E8'

export const COLOR_ESTADO = {
  revisada: '#2e7d32', // verde
  // Ámbar oscurecido (antes #f9a825): con texto blanco encima, el tono
  // claro daba ~1.97:1 de contraste — muy por debajo del mínimo WCAG AA
  // (4.5:1). Este oscurece a ~5:1 sin perder la lectura "ámbar/pendiente".
  pendiente_revisar: '#b45309',
  en_revision: '#1565c0', // azul
} as const

// Usado por el mapa y el calendario para marcar obras con fecha estimada
// de entrega próxima — un solo color para que ambas vistas se lean igual.
export const COLOR_PROXIMA_ENTREGA = '#a855f7'

// Antes vivía duplicado como const local en DetalleVisitaDialog.tsx — se
// unifica acá para que las tarjetas de listado también puedan colorear su
// chip de alertas con el mismo criterio de severidad.
export const COLOR_SEVERIDAD: Record<SeveridadAlerta, string> = {
  baja: '#22c55e',
  media: '#f9a825',
  alta: '#ef4444',
}

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
          borderColor: 'rgba(10, 30, 61, 0.08)',
          // Antes solo borde flat de 1px — sin sombra, las tarjetas se veían
          // planas contra el fondo gris claro. Elevación sutil en reposo +
          // más marcada al pasar el mouse, para que se sientan clickeables.
          boxShadow: '0 1px 3px rgba(10, 30, 61, 0.06)',
          transition: 'box-shadow 0.15s ease',
          '&:hover': {
            boxShadow: '0 4px 14px rgba(10, 30, 61, 0.12)',
          },
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
