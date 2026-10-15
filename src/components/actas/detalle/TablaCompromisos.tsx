import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  ESTADOS_COMPROMISO,
  type Compromiso,
  type EstadoCompromiso,
} from '../../../types/actas.types'
import { diasRestantes, semaforo } from '../../../utils/actas/tablero.util'

interface TablaCompromisosProps {
  compromisos: Compromiso[]
  onNuevoCompromiso: () => void
  onEditarCompromiso: (c: Compromiso) => void
  onEliminarCompromiso: (c: Compromiso) => void
  onCambiarEstado: (c: Compromiso, nuevoEstado: EstadoCompromiso) => Promise<void>
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—'
  const partes = fecha.split('-')
  if (partes.length === 3) {
    const [y, m, d] = partes
    return `${d}/${m}/${y}`
  }
  return fecha
}

const ESTILOS_ESTADO: Record<
  EstadoCompromiso,
  { bg: string; color: string; border: string }
> = {
  Pendiente: { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
  'En progreso': { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  Crítica: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  Completada: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
}

export function TablaCompromisos({
  compromisos,
  onNuevoCompromiso,
  onEditarCompromiso,
  onEliminarCompromiso,
  onCambiarEstado,
}: TablaCompromisosProps) {
  const [actualizandoId, setActualizandoId] = useState<string | null>(null)

  const manejarCambioEstado = async (c: Compromiso, nuevoEstado: EstadoCompromiso) => {
    if (c.estado === nuevoEstado) return
    setActualizandoId(c.id)
    try {
      await onCambiarEstado(c, nuevoEstado)
    } finally {
      setActualizandoId(null)
    }
  }

  const renderChipSemaforo = (c: Compromiso) => {
    const sem = semaforo(c)
    const dias = diasRestantes(c)

    if (sem === 'sin-fecha' || dias === null) {
      return (
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      )
    }

    if (sem === 'vencida') {
      return (
        <Chip
          label={`${dias} ${Math.abs(dias) === 1 ? 'día' : 'días'}`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            bgcolor: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fca5a5',
          }}
        />
      )
    }

    if (sem === 'proxima') {
      return (
        <Chip
          label={dias === 0 ? 'Vence hoy' : `${dias} ${dias === 1 ? 'día' : 'días'}`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            bgcolor: '#ffedd5',
            color: '#c2410c',
            border: '1px solid #fdba74',
          }}
        />
      )
    }

    return (
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {dias} {dias === 1 ? 'día' : 'días'}
      </Typography>
    )
  }

  const renderSelectorEstado = (c: Compromiso) => {
    const estilo = ESTILOS_ESTADO[c.estado]
    const cargando = actualizandoId === c.id

    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <Select
          size="small"
          value={c.estado}
          onChange={(e) => manejarCambioEstado(c, e.target.value as EstadoCompromiso)}
          disabled={cargando}
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            borderRadius: 2,
            minWidth: 130,
            bgcolor: estilo.bg,
            color: estilo.color,
            border: `1px solid ${estilo.border}`,
            '& .MuiSelect-select': { py: 0.5, px: 1.25 },
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }}
        >
          {ESTADOS_COMPROMISO.map((est) => (
            <MenuItem key={est} value={est} sx={{ fontSize: '0.8125rem' }}>
              {est}
            </MenuItem>
          ))}
        </Select>
        {cargando && <CircularProgress size={16} />}
      </Box>
    )
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Compromisos ({compromisos.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lista de tareas, responsables y seguimiento de plazos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNuevoCompromiso}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Nuevo compromiso
        </Button>
      </Box>

      {compromisos.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2.5,
            bgcolor: 'background.paper',
          }}
        >
          <AssignmentOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            No hay compromisos registrados en esta acta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Agrega los compromisos acordados durante la reunión con su responsable y fecha límite.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onNuevoCompromiso}
            sx={{ textTransform: 'none' }}
          >
            Agregar primer compromiso
          </Button>
        </Paper>
      ) : (
        <>
          {/* Vista de escritorio / tablet (Table) */}
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              display: { xs: 'none', md: 'block' },
              overflowX: 'auto',
            }}
          >
            <Table size="medium">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '30%' }}>Actividad</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '16%' }}>Responsable</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '13%' }}>Fecha vencimiento</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '16%' }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '13%' }}>Criterio fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '12%' }}>Días restantes</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: '10%' }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {compromisos.map((c) => (
                  <TableRow
                    key={c.id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                        {c.actividad}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={c.responsable ? 'text.primary' : 'text.disabled'}>
                        {c.responsable ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={c.fechaVencimiento ? 'text.primary' : 'text.disabled'}>
                        {formatearFecha(c.fechaVencimiento)}
                      </Typography>
                    </TableCell>
                    <TableCell>{renderSelectorEstado(c)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color={c.criterioFecha ? 'text.primary' : 'text.disabled'}>
                        {c.criterioFecha ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{renderChipSemaforo(c)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                        <Tooltip title="Editar compromiso">
                          <IconButton
                            size="small"
                            onClick={() => onEditarCompromiso(c)}
                            aria-label="Editar compromiso"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar compromiso">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onEliminarCompromiso(c)}
                            aria-label="Eliminar compromiso"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Vista móvil (Cards adaptables para teléfonos) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {compromisos.map((c) => (
              <Paper
                key={c.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, wordBreak: 'break-word' }}>
                    {c.actividad}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => onEditarCompromiso(c)}
                      aria-label="Editar compromiso"
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onEliminarCompromiso(c)}
                      aria-label="Eliminar compromiso"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                  {renderSelectorEstado(c)}
                  {renderChipSemaforo(c)}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  {c.responsable && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonOutlineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Responsable: <strong>{c.responsable}</strong>
                      </Typography>
                    </Box>
                  )}
                  {c.fechaVencimiento && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Vence: <strong>{formatearFecha(c.fechaVencimiento)}</strong>
                      </Typography>
                    </Box>
                  )}
                  {c.criterioFecha && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Criterio: {c.criterioFecha}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}
    </Box>
  )
}
