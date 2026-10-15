import { useMemo, useState } from 'react'
import {
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { ESTADOS_COMPROMISO, type Compromiso, type EstadoCompromiso } from '../../../types/actas.types'
import { semaforo, type Semaforo } from '../../../utils/actas/tablero.util'
import { FILTROS_COMPROMISOS_VACIOS, fechaLegible, filasCompromisos } from './filasCompromisos'

const COLOR_CHIP: Record<EstadoCompromiso, 'default' | 'info' | 'error' | 'success'> = {
  Pendiente: 'default',
  'En progreso': 'info',
  Crítica: 'error',
  Completada: 'success',
}

const COLOR_DIAS: Record<Semaforo, string | undefined> = {
  vencida: 'error.main',
  proxima: 'warning.main',
  normal: undefined,
  'sin-fecha': undefined,
}

interface Props {
  compromisos: Compromiso[]
  origenDeActa: Map<string, string>
  origenes: string[]
}

export function TablaCompromisos({ compromisos, origenDeActa, origenes }: Props) {
  const [filtros, setFiltros] = useState(FILTROS_COMPROMISOS_VACIOS)
  const filas = useMemo(
    () => filasCompromisos(compromisos, origenDeActa, filtros),
    [compromisos, origenDeActa, filtros],
  )

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Origen</TableCell>
              <TableCell>Actividad</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Días restantes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.origen}</TableCell>
                <TableCell sx={{ minWidth: 220 }}>{c.actividad}</TableCell>
                <TableCell>{c.responsable ?? '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {c.fechaVencimiento ? fechaLegible(c.fechaVencimiento) : '—'}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.estado} color={COLOR_CHIP[c.estado]} />
                </TableCell>
                <TableCell align="right" sx={{ color: COLOR_DIAS[semaforo(c)], fontWeight: 600 }}>
                  {c.dias ?? ''}
                </TableCell>
              </TableRow>
            ))}
            {filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    No hay compromisos que coincidan con los filtros.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary">
        Días restantes: rojo = vencida; naranja = vence en 7 días o menos.
      </Typography>
    </Stack>
  )
}
