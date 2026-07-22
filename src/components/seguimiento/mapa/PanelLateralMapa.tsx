import { Box, IconButton, InputAdornment, List, ListItemButton, ListItemText, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import { infoObra } from './mapaEstado.util'
import type { ObraVisor } from '../../../types/obra.types'

interface PanelLateralMapaProps {
  busqueda: string
  onCambiarBusqueda: (valor: string) => void
  comunaFiltro: string | null
  onCambiarComunaFiltro: (valor: string | null) => void
  proyectoFiltro: string | null
  onCambiarProyectoFiltro: (valor: string | null) => void
  nombresComunas: string[]
  nombresProyectos: string[]
  resultadosBusqueda: ObraVisor[]
  obrasFiltradas: ObraVisor[]
  ultimaVisitaPorObra: Map<number, string>
  onSeleccionarObra: (obra: ObraVisor) => void
}

export function PanelLateralMapa({
  busqueda,
  onCambiarBusqueda,
  comunaFiltro,
  onCambiarComunaFiltro,
  proyectoFiltro,
  onCambiarProyectoFiltro,
  nombresComunas,
  nombresProyectos,
  resultadosBusqueda,
  obrasFiltradas,
  ultimaVisitaPorObra,
  onSeleccionarObra,
}: PanelLateralMapaProps) {
  return (
    <Box
      sx={{
        width: { xs: '100%', md: 320 },
        flexShrink: 0,
        borderRight: { md: '1px solid' },
        borderBottom: { xs: '1px solid', md: 'none' },
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { xs: 260, md: 'none' },
      }}
    >
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Buscar obra por nombre…"
          value={busqueda}
          onChange={(e) => onCambiarBusqueda(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: busqueda && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onCambiarBusqueda('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <select
          value={comunaFiltro ?? ''}
          onChange={(e) => onCambiarComunaFiltro(e.target.value || null)}
          style={{
            padding: '6.5px 8px',
            borderRadius: 4,
            border: '1px solid #c4c4c4',
            fontSize: 14,
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          <option value="">Todas las comunas</option>
          {nombresComunas.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={proyectoFiltro ?? ''}
          onChange={(e) => onCambiarProyectoFiltro(e.target.value || null)}
          style={{
            padding: '6.5px 8px',
            borderRadius: 4,
            border: '1px solid #c4c4c4',
            fontSize: 14,
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          <option value="">Todos los proyectos</option>
          {nombresProyectos.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {busqueda && (
          <List dense disablePadding>
            {resultadosBusqueda.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                Sin resultados para "{busqueda}".
              </Typography>
            )}
            {resultadosBusqueda.map((obra) => (
              <ListItemButton key={obra.obraId} onClick={() => onSeleccionarObra(obra)}>
                <ListItemText primary={obra.nombre} secondary={obra.comuna ?? 'Sin comuna registrada'} />
              </ListItemButton>
            ))}
          </List>
        )}

        {!busqueda && (comunaFiltro || proyectoFiltro) && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2">
                {[comunaFiltro, proyectoFiltro].filter(Boolean).join(' · ')} · {obrasFiltradas.length} obras
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  onCambiarComunaFiltro(null)
                  onCambiarProyectoFiltro(null)
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <List dense disablePadding>
              {obrasFiltradas.map((obra) => (
                <ListItemButton key={obra.obraId} onClick={() => onSeleccionarObra(obra)}>
                  <ListItemText primary={obra.nombre} secondary={infoObra(obra, ultimaVisitaPorObra).etiqueta} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {!busqueda && !comunaFiltro && !proyectoFiltro && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
            Buscá una obra por nombre, o elegí una comuna o proyecto para ver sus obras.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
