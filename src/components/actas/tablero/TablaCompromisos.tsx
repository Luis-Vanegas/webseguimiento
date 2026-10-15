import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { ESTADOS_COMPROMISO, type Compromiso, type EstadoCompromiso } from '../../../types/actas.types'
import { semaforo, type Semaforo } from '../../../utils/actas/tablero.util'
import { SelectorEstado } from '../SelectorEstado'
import {
  FILTROS_COMPROMISOS_VACIOS,
  ORDEN_POR_DEFECTO,
  fechaLegible,
  filasCompromisos,
  type CampoOrden,
  type FilaCompromiso,
  type OrdenCompromisos,
} from './filasCompromisos'

const COLOR_DIAS: Record<Semaforo, string | undefined> = {
  vencida: 'error.main',
  proxima: 'warning.main',
  normal: undefined,
  'sin-fecha': undefined,
}

const COLUMNAS: { campo: CampoOrden; titulo: string; align?: 'right' }[] = [
  { campo: 'origen', titulo: 'Origen' },
  { campo: 'actividad', titulo: 'Actividad' },
  { campo: 'responsable', titulo: 'Responsable' },
  { campo: 'vence', titulo: 'Vence' },
  { campo: 'estado', titulo: 'Estado' },
  { campo: 'dias', titulo: 'Días restantes', align: 'right' },
]

interface Props {
  compromisos: Compromiso[]
  origenDeActa: Map<string, string>
  origenes: string[]
  onEditar: (c: Compromiso) => void
  onEliminar: (c: Compromiso) => void
  onCambiarEstado: (c: Compromiso, nuevo: EstadoCompromiso) => Promise<void>
}

export function TablaCompromisos({
  compromisos,
  origenDeActa,
  origenes,
  onEditar,
  onEliminar,
  onCambiarEstado,
}: Props) {
  const [filtros, setFiltros] = useState(FILTROS_COMPROMISOS_VACIOS)
  const [orden, setOrden] = useState<OrdenCompromisos>(ORDEN_POR_DEFECTO)
  const filas = useMemo(
    () => filasCompromisos(compromisos, origenDeActa, filtros, orden),
    [compromisos, origenDeActa, filtros, orden],
  )
  const hayFiltros = filtros.estado || filtros.origen || filtros.texto

  const ordenarPor = (campo: CampoOrden) =>
    setOrden((o) => ({ campo, dir: o.campo === campo && o.dir === 'asc' ? 'desc' : 'asc' }))

  const acciones = (c: FilaCompromiso) => (
    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
      <Tooltip title="Editar compromiso">
        <IconButton size="small" onClick={() => onEditar(c)} aria-label="Editar compromiso">
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar compromiso">
        <IconButton size="small" color="error" onClick={() => onEliminar(c)} aria-label="Eliminar compromiso">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )

  const linkOrigen = (c: FilaCompromiso) => (
    <Link component={RouterLink} to={`/actas/${c.actaId}`} underline="hover" color="inherit" fontWeight={600}>
      {c.origen}
    </Link>
  )

  const dias = (c: FilaCompromiso) => (
    <Typography component="span" variant="body2" sx={{ color: COLOR_DIAS[semaforo(c)], fontWeight: 600 }}>
      {c.dias === null ? '' : c.dias === 0 ? 'Hoy' : c.dias}
    </Typography>
  )

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField
          select
          size="small"
          label="Estado"
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as EstadoCompromiso | '' })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {ESTADOS_COMPROMISO.map((e) => (
            <MenuItem key={e} value={e}>
              {e}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Origen"
          value={filtros.origen}
          onChange={(e) => setFiltros({ ...filtros, origen: e.target.value })}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {origenes.map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Buscar actividad o responsable"
          value={filtros.texto}
          onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
          sx={{ flex: 1 }}
        />
        {hayFiltros && (
          <Button size="small" onClick={() => setFiltros(FILTROS_COMPROMISOS_VACIOS)} sx={{ flexShrink: 0 }}>
            Limpiar filtros
          </Button>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {filas.length === compromisos.length
          ? `${filas.length} compromisos`
          : `${filas.length} de ${compromisos.length} compromisos`}
      </Typography>

      {/* Desktop / tablet */}
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {COLUMNAS.map(({ campo, titulo, align }) => (
                <TableCell
                  key={campo}
                  align={align}
                  sortDirection={orden.campo === campo ? orden.dir : false}
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  <TableSortLabel
                    active={orden.campo === campo}
                    direction={orden.campo === campo ? orden.dir : 'asc'}
                    onClick={() => ordenarPor(campo)}
                  >
                    {titulo}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{linkOrigen(c)}</TableCell>
                <TableCell sx={{ minWidth: 220 }}>{c.actividad}</TableCell>
                <TableCell>{c.responsable ?? '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {c.fechaVencimiento ? fechaLegible(c.fechaVencimiento) : '—'}
                </TableCell>
                <TableCell>
                  <SelectorEstado compromiso={c} onCambiar={onCambiarEstado} />
                </TableCell>
                <TableCell align="right">{dias(c)}</TableCell>
                <TableCell align="right">{acciones(c)}</TableCell>
              </TableRow>
            ))}
            {filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNAS.length + 1}>
                  <Typography variant="body2" color="text.secondary">
                    No hay compromisos que coincidan con los filtros.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mobile */}
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
        <TextField
          select
          size="small"
          label="Ordenar por"
          value={`${orden.campo}:${orden.dir}`}
          onChange={(e) => {
            const [campo, dir] = e.target.value.split(':') as [CampoOrden, 'asc' | 'desc']
            setOrden({ campo, dir })
          }}
        >
          <MenuItem value="dias:asc">Más urgentes primero</MenuItem>
          <MenuItem value="estado:asc">Estado (críticas primero)</MenuItem>
          <MenuItem value="vence:asc">Fecha de vencimiento</MenuItem>
          <MenuItem value="origen:asc">Origen (A-Z)</MenuItem>
          <MenuItem value="responsable:asc">Responsable (A-Z)</MenuItem>
        </TextField>
        {filas.map((c) => (
          <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  {linkOrigen(c)}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                  {c.actividad}
                </Typography>
              </Box>
              {acciones(c)}
            </Stack>
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ mt: 1 }}>
              <SelectorEstado compromiso={c} onCambiar={onCambiarEstado} />
              {c.fechaVencimiento && (
                <Typography variant="body2" color="text.secondary">
                  Vence {fechaLegible(c.fechaVencimiento)}
                </Typography>
              )}
              {c.dias !== null && (
                <Typography variant="body2" sx={{ color: COLOR_DIAS[semaforo(c)], fontWeight: 600 }}>
                  {c.dias === 0
                    ? 'Vence hoy'
                    : c.dias < 0
                      ? `Vencida hace ${-c.dias} ${c.dias === -1 ? 'día' : 'días'}`
                      : `Faltan ${c.dias} ${c.dias === 1 ? 'día' : 'días'}`}
                </Typography>
              )}
            </Stack>
            {c.responsable && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {c.responsable}
              </Typography>
            )}
          </Paper>
        ))}
        {filas.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No hay compromisos que coincidan con los filtros.
          </Typography>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Días restantes: rojo = vencida; naranja = vence en 7 días o menos. Haz clic en un título para ordenar.
      </Typography>
    </Stack>
  )
}
