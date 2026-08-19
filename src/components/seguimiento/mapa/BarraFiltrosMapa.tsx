import { Box, Button, Chip, TextField, Typography } from '@mui/material'
import { useEsMovil } from '../../../hooks/useEsMovil'
import { COLOR_ACENTO, COLOR_ACENTO_FONDO_SUAVE } from '../../../theme/theme'

interface BarraFiltrosMapaProps {
  fechaDesde: string
  fechaHasta: string
  entregaDesde: string
  entregaHasta: string
  comunaFiltro: string | null
  proyectoFiltro: string | null
  subproyectoFiltro: string | null
  dependenciaFiltro: string | null
  estiloMapa: 'calles' | 'satelite'
  esVisualizador: boolean
  onCambiarFechaDesde: (valor: string) => void
  onCambiarFechaHasta: (valor: string) => void
  onCambiarEntregaDesde: (valor: string) => void
  onCambiarEntregaHasta: (valor: string) => void
  onLimpiarFiltros: () => void
  onCambiarEstiloMapa: (estilo: 'calles' | 'satelite') => void
}

export function BarraFiltrosMapa({
  fechaDesde,
  fechaHasta,
  entregaDesde,
  entregaHasta,
  comunaFiltro,
  proyectoFiltro,
  subproyectoFiltro,
  dependenciaFiltro,
  estiloMapa,
  esVisualizador,
  onCambiarFechaDesde,
  onCambiarFechaHasta,
  onCambiarEntregaDesde,
  onCambiarEntregaHasta,
  onLimpiarFiltros,
  onCambiarEstiloMapa,
}: BarraFiltrosMapaProps) {
  const esMovil = useEsMovil()
  // En mobile, dos campos de fecha por fila (en vez de uno larguísimo cada
  // uno) para que la barra no ocupe cuatro filas completas de alto.
  const anchoCampoFecha = esMovil ? { flex: '1 1 45%' } : { minWidth: 170 }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
        Mapa de obras
      </Typography>

      {esVisualizador && (
        <Chip
          size="small"
          label="Modo consulta: sin registrar visitas ni grabar recorridos"
          sx={{ bgcolor: COLOR_ACENTO_FONDO_SUAVE, color: COLOR_ACENTO, fontWeight: 600 }}
        />
      )}

      <TextField
        size="small"
        type="date"
        label="Última visita desde"
        value={fechaDesde}
        onChange={(e) => onCambiarFechaDesde(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={anchoCampoFecha}
      />
      <TextField
        size="small"
        type="date"
        label="Última visita hasta"
        value={fechaHasta}
        onChange={(e) => onCambiarFechaHasta(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={anchoCampoFecha}
      />
      <TextField
        size="small"
        type="date"
        label="Entrega desde"
        value={entregaDesde}
        onChange={(e) => onCambiarEntregaDesde(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={anchoCampoFecha}
      />
      <TextField
        size="small"
        type="date"
        label="Entrega hasta"
        value={entregaHasta}
        onChange={(e) => onCambiarEntregaHasta(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={anchoCampoFecha}
      />

      {(fechaDesde ||
        fechaHasta ||
        entregaDesde ||
        entregaHasta ||
        comunaFiltro ||
        proyectoFiltro ||
        subproyectoFiltro ||
        dependenciaFiltro) && (
        <Button size="small" variant="outlined" onClick={onLimpiarFiltros}>
          Limpiar filtros
        </Button>
      )}

      <Box sx={{ flex: 1 }} />

      <Chip
        label="Calles"
        size="small"
        variant={estiloMapa === 'calles' ? 'filled' : 'outlined'}
        color={estiloMapa === 'calles' ? 'primary' : 'default'}
        onClick={() => onCambiarEstiloMapa('calles')}
      />
      <Chip
        label="Satélite"
        size="small"
        variant={estiloMapa === 'satelite' ? 'filled' : 'outlined'}
        color={estiloMapa === 'satelite' ? 'primary' : 'default'}
        onClick={() => onCambiarEstiloMapa('satelite')}
      />
    </Box>
  )
}
