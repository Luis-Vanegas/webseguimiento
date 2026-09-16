import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { infoObra } from './mapaEstado.util'
import type { CSSProperties } from 'react'
import type { ObraVisor } from '../../../types/obra.types'

const ESTILO_SELECT: CSSProperties = {
  padding: '6.5px 8px',
  borderRadius: 4,
  border: '1px solid #c4c4c4',
  fontSize: 14,
  fontFamily: 'inherit',
  width: '100%',
}

interface PanelLateralMapaProps {
  busqueda: string
  onCambiarBusqueda: (valor: string) => void
  comunaFiltro: string | null
  onCambiarComunaFiltro: (valor: string | null) => void
  proyectoFiltro: string | null
  onCambiarProyectoFiltro: (valor: string | null) => void
  subproyectoFiltro: string | null
  onCambiarSubproyectoFiltro: (valor: string | null) => void
  dependenciaFiltro: string | null
  onCambiarDependenciaFiltro: (valor: string | null) => void
  onLimpiarFiltrosCategoricos: () => void
  nombresComunas: string[]
  nombresProyectos: string[]
  nombresSubproyectos: string[]
  nombresDependencias: string[]
  obrasDeLaAgenda: ObraVisor[]
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
  subproyectoFiltro,
  onCambiarSubproyectoFiltro,
  dependenciaFiltro,
  onCambiarDependenciaFiltro,
  onLimpiarFiltrosCategoricos,
  nombresComunas,
  nombresProyectos,
  nombresSubproyectos,
  nombresDependencias,
  obrasDeLaAgenda,
  resultadosBusqueda,
  obrasFiltradas,
  ultimaVisitaPorObra,
  onSeleccionarObra,
}: PanelLateralMapaProps) {
  const hayFiltroCategorico = comunaFiltro || proyectoFiltro || subproyectoFiltro || dependenciaFiltro

  // El panel se apila sobre el mapa hasta 'md' (ver MapaSeguimiento), no hasta
  // 'sm' como useEsMovil: en ese rango los cinco selects apilados no caben.
  const panelApilado = useMediaQuery(useTheme().breakpoints.down('md'))

  const selectsDeFiltro = (
    <>
        {/* Los cuatro selects se acotan entre sí (ver filtrar-obras.util.ts):
            elegir uno recalcula qué opciones quedan disponibles en los
            otros tres, para no ofrecer combinaciones sin resultados. */}
        <select
          value={comunaFiltro ?? ''}
          onChange={(e) => onCambiarComunaFiltro(e.target.value || null)}
          style={ESTILO_SELECT}
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
          style={ESTILO_SELECT}
        >
          <option value="">Todos los proyectos</option>
          {nombresProyectos.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={subproyectoFiltro ?? ''}
          onChange={(e) => onCambiarSubproyectoFiltro(e.target.value || null)}
          style={ESTILO_SELECT}
        >
          <option value="">Todos los subproyectos</option>
          {nombresSubproyectos.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={dependenciaFiltro ?? ''}
          onChange={(e) => onCambiarDependenciaFiltro(e.target.value || null)}
          style={ESTILO_SELECT}
        >
          <option value="">Todas las dependencias</option>
          {nombresDependencias.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        {/* Select de "acción": elegir una obra la selecciona en el mapa y el
            valor vuelve al placeholder (no queda "pegado" a la última
            obra elegida), igual que un menú de navegación. No filtra nada:
            es un atajo para saltar directo a una de las 18 obras de la
            agenda priorizada sin tener que tipear su nombre. */}
        <select
          value=""
          onChange={(e) => {
            const obra = obrasDeLaAgenda.find((o) => o.obraId === Number(e.target.value))
            if (obra) onSeleccionarObra(obra)
          }}
          style={ESTILO_SELECT}
        >
          <option value="">Obra prioritaria…</option>
          {obrasDeLaAgenda.map((obra) => (
            <option key={obra.obraId} value={obra.obraId}>
              {obra.nombre}
            </option>
          ))}
        </select>
    </>
  )

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
      }}
    >
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
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

        {/* Apilado sobre el mapa, los cinco selects más el buscador piden 307px
            de alto: más de lo que queda para el panel, y la lista de resultados
            se quedaba en 0px. Colapsados, el buscador y los resultados vuelven
            a entrar; en escritorio el panel tiene alto de sobra y siguen a la vista. */}
        {panelApilado ? (
          <Accordion variant="outlined" disableGutters sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
              <Typography variant="subtitle2">Filtros</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectsDeFiltro}
            </AccordionDetails>
          </Accordion>
        ) : (
          selectsDeFiltro
        )}
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1, maxHeight: { xs: 220, md: 'none' } }}>
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

        {!busqueda && hayFiltroCategorico && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2">
                {[comunaFiltro, proyectoFiltro, subproyectoFiltro, dependenciaFiltro].filter(Boolean).join(' · ')}{' '}
                · {obrasFiltradas.length} obras
              </Typography>
              <IconButton size="small" onClick={onLimpiarFiltrosCategoricos}>
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

        {!busqueda && !hayFiltroCategorico && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
            Buscá una obra por nombre, o elegí una comuna, proyecto, subproyecto o dependencia para ver sus obras.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
