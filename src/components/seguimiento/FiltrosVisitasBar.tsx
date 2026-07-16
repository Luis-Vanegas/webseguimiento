import { useMemo } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FilterListIcon from '@mui/icons-material/FilterList'
import { FILTROS_VACIOS, HITOS_SIMPLIFICADOS, type FiltrosVisitas } from '../../types/filtros.types'
import { ETIQUETA_ESTADO } from '../../theme/theme'
import type { EstadoVisita, TipoAlerta, UsuarioSeguimiento } from '../../types/seguimiento.types'

const ESTADOS: EstadoVisita[] = ['pendiente_revisar', 'en_revision', 'revisada']

interface FiltrosVisitasBarProps {
  filtros: FiltrosVisitas
  onChange: (filtros: FiltrosVisitas) => void
  proyectosEstrategicos: string[]
  tiposAlerta: TipoAlerta[]
  // Solo se pasa en pantallas que necesitan filtrar por autor (ej. Gestión de
  // gerencia) — en el resto (MisVisitas, RevisarVisitas...) el autor ya está
  // implícito en la lista que consultan, así que el select ni se muestra.
  usuarios?: UsuarioSeguimiento[]
}

// Filtros compartidos entre MisVisitas, RevisarVisitas e HistorialObra
// (sección 9 del brief), agrupados en un panel colapsable — antes competían
// visualmente con el contenido principal de cada pantalla.
export function FiltrosVisitasBar({
  filtros,
  onChange,
  proyectosEstrategicos,
  tiposAlerta,
  usuarios,
}: FiltrosVisitasBarProps) {
  function set<K extends keyof FiltrosVisitas>(campo: K, valor: FiltrosVisitas[K]) {
    onChange({ ...filtros, [campo]: valor })
  }

  const cantidadActiva = useMemo(
    () => Object.values(filtros).filter((v) => v !== '').length,
    [filtros],
  )

  return (
    <Accordion
      variant="outlined"
      disableGutters
      defaultExpanded={false}
      sx={{ mb: 3, '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="subtitle1" sx={{ textTransform: 'none', color: 'text.primary' }}>
            Filtros
          </Typography>
          {cantidadActiva > 0 && (
            <Chip label={cantidadActiva} size="small" color="secondary" sx={{ height: 20 }} />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* flex-basis con grow: en desktop caben varios por fila; en móvil
            cada campo se estira a ~mitad o fila completa y el label nunca se trunca. */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="Desde"
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 140px' }}
            value={filtros.fechaDesde}
            onChange={(e) => set('fechaDesde', e.target.value)}
          />
          <TextField
            label="Hasta"
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 140px' }}
            value={filtros.fechaHasta}
            onChange={(e) => set('fechaHasta', e.target.value)}
          />
          <TextField
            label="Proyecto estratégico"
            select
            sx={{ flex: '2 1 200px' }}
            value={filtros.proyectoEstrategico}
            onChange={(e) => set('proyectoEstrategico', e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {proyectosEstrategicos.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Tipo de alerta"
            select
            sx={{ flex: '1 1 160px' }}
            value={filtros.tipoAlertaId}
            onChange={(e) => set('tipoAlertaId', e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {tiposAlerta.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Estado"
            select
            sx={{ flex: '1 1 150px' }}
            value={filtros.estado}
            onChange={(e) => set('estado', e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map((e) => (
              <MenuItem key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </MenuItem>
            ))}
          </TextField>
          {usuarios && (
            <TextField
              label="Autor"
              select
              sx={{ flex: '1 1 180px' }}
              value={filtros.autorId}
              onChange={(e) => set('autorId', e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {usuarios.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Hito"
            select
            sx={{ flex: '1 1 130px' }}
            value={filtros.hito}
            onChange={(e) => set('hito', e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {HITOS_SIMPLIFICADOS.map((h) => (
              <MenuItem key={h} value={h}>
                {h}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Avance mín. %"
            type="number"
            sx={{ flex: '1 1 120px' }}
            value={filtros.avanceMin}
            onChange={(e) => set('avanceMin', e.target.value)}
          />
          <TextField
            label="Avance máx. %"
            type="number"
            sx={{ flex: '1 1 120px' }}
            value={filtros.avanceMax}
            onChange={(e) => set('avanceMax', e.target.value)}
          />
        </Box>
        {cantidadActiva > 0 && (
          <Button size="small" onClick={() => onChange(FILTROS_VACIOS)} sx={{ mt: 1.5 }}>
            Limpiar filtros
          </Button>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
