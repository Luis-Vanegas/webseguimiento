import { Box, Button, Divider, Paper, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EventIcon from '@mui/icons-material/Event'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import type { Acta } from '../../../types/actas.types'

interface EncabezadoActaProps {
  acta: Acta
  onEditar: () => void
  onEliminar: () => void
}

function formatearFecha(fechaIso: string): string {
  const partes = fechaIso.split('-')
  if (partes.length === 3) {
    const [y, m, d] = partes
    return `${d}/${m}/${y}`
  }
  return fechaIso
}

export function EncabezadoActa({ acta, onEditar, onEliminar }: EncabezadoActaProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Button
        component={Link}
        to="/actas"
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 2,
          textTransform: 'none',
          color: 'text.secondary',
          fontWeight: 600,
          '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
        }}
      >
        Volver al tablero
      </Button>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2.5,
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" component="h1" fontWeight={700}>
              {acta.origen}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
              <EventIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Typography variant="body2" color="text.secondary">
                Fecha de la reunión: <strong>{formatearFecha(acta.fecha)}</strong>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={onEditar}
              sx={{ textTransform: 'none', flex: { xs: 1, sm: 'none' } }}
            >
              Editar acta
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon />}
              onClick={onEliminar}
              sx={{ textTransform: 'none', flex: { xs: 1, sm: 'none' } }}
            >
              Eliminar acta
            </Button>
          </Box>
        </Box>

        {(acta.asistentes || acta.notas) && <Divider sx={{ my: 2 }} />}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {acta.asistentes && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <PeopleOutlineIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.25, fontSize: 18 }} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  ASISTENTES
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {acta.asistentes}
                </Typography>
              </Box>
            </Box>
          )}

          {acta.notas && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <DescriptionOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.25, fontSize: 18 }} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  NOTAS / OBSERVACIONES
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {acta.notas}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
