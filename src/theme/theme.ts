import { createTheme } from '@mui/material/styles'
import type { EstadoVisita, SeveridadAlerta } from '../types/seguimiento.types'

// Paleta aproximada del Visor real (sección 8 del brief) — ajustar cuando
// se tenga acceso a theme.ts del repo real.
export const COLOR_SIDEBAR = '#0A1E3D'
export const COLOR_ACENTO = '#29B6E8'
// Hover del acento (oscurecido) — antes repetido como literal en varios
// componentes con botones/controles sobre COLOR_ACENTO.
export const COLOR_ACENTO_HOVER = '#1f9fce'
// Fondo tenue del acento, para chips/etiquetas informativas sobre fondo claro.
export const COLOR_ACENTO_FONDO_SUAVE = 'rgba(41, 182, 232, 0.12)'
// Color de texto cuando va ENCIMA de COLOR_ACENTO. En blanco el celeste da
// 2.35:1, muy por debajo del minimo AA (4.5:1); con el azul del sidebar sube
// a 7.07:1 y ademas evita tener que oscurecer el celeste de marca.
export const COLOR_TEXTO_SOBRE_ACENTO = COLOR_SIDEBAR

// Ruta planeada en el mapa (índigo, distinto del cian de recorridos
// grabados) — antes duplicado como const local en 3 archivos.
export const COLOR_RUTA_PLANEADA = '#6366f1'

// Fondo de contenido de diálogos (visitas, recorridos, cámara) — antes
// repetido como literal en 5 componentes.
export const COLOR_FONDO_DIALOGO = '#f7f9fc'

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
// Oscurecido un 10% respecto del violeta original (#a855f7): con texto blanco
// encima daba 3.96:1 y ahora da 4.77:1, sin que el tono cambie a simple vista.
export const COLOR_PROXIMA_ENTREGA = '#974cde'

// Antes vivía duplicado como const local en DetalleVisitaDialog.tsx — se
// unifica acá para que las tarjetas de listado también puedan colorear su
// chip de alertas con el mismo criterio de severidad.
export const COLOR_SEVERIDAD: Record<SeveridadAlerta, string> = {
  baja: '#22c55e',
  media: '#f9a825',
  // Rojo apenas oscurecido (antes #ef4444): con texto blanco daba 3.76:1 y con
  // texto oscuro 4.19:1 — no llegaba a AA por ninguno de los dos lados. Este
  // pasa con blanco (4.54:1) y se sigue leyendo como el mismo rojo de alerta.
  alta: '#d73d3d',
}

// El chip de severidad lleva texto encima y el color de fondo ES la
// informacion (semaforo), asi que en vez de apagar el verde y el ambar se
// oscurece el texto: 6.93:1 sobre el verde y 8.01:1 sobre el ambar. El rojo
// es el unico que necesita texto blanco.
export const COLOR_TEXTO_SEVERIDAD: Record<SeveridadAlerta, string> = {
  baja: '#1a2332',
  media: '#1a2332',
  alta: '#ffffff',
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
      // MUI trae rgba(0,0,0,0.38) por defecto, que sobre fondo claro da
      // 2.68:1 — por debajo del minimo AA. Se usa en los guiones de "sin
      // dato" de las tablas, que son texto igual. Con 0.55 sube a 4.76:1.
      disabled: 'rgba(0, 0, 0, 0.55)',
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
    // Los dos overrides que siguen valen solo para pantallas tactiles
    // (pointer: coarse): en escritorio con mouse la densidad chica esta bien
    // y no se toca. En campo el telefono es el unico dispositivo.
    MuiInputBase: {
      styleOverrides: {
        input: {
          // iOS Safari hace zoom automatico al enfocar un input de menos de
          // 16px, y despues deja la pagina desencuadrada. Con size 'small'
          // los inputs quedaban en 15px, asi que zoomeaba en cada campo.
          '@media (pointer: coarse)': { fontSize: 16 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        // WCAG 2.5.5: 44px minimo de area tactil. Los inputs quedaban en 39.
        // El minHeight en el root no alcanza: con size 'small' MUI fija el
        // padding del input interno, y ese padding es el que manda la altura.
        input: {
          // Excluye el multiline a proposito: ahi MUI pone padding 0 en el
          // textarea porque el padding lo maneja el root, y pisarlo le sumaba
          // 24px de alto a los campos de observaciones.
          '@media (pointer: coarse)': {
            '&:not(.MuiInputBase-inputMultiline)': { paddingTop: 12, paddingBottom: 12 },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          // 44px tambien para los sizeSmall. La exclusion anterior asumia que
          // todos vivian en filas densas, y medido en RegistrarVisita resulto
          // falso: los de negrita/italica/lista del editor y el de cerrar
          // sesion quedaban en 30px y se tocan con el dedo.
          '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
        },
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
        root: {
          borderRadius: 8,
          // Mismo minimo tactil que los inputs: el boton de guardar visita se
          // toca con el telefono en la mano, a veces con guantes.
          '@media (pointer: coarse)': { minHeight: 44 },
        },
      },
    },
  },
})
