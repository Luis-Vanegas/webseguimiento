import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonIcon from '@mui/icons-material/Person'
import RateReviewIcon from '@mui/icons-material/RateReview'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import {
  editarVisita,
  listarPendientes,
  marcarEnRevision,
  marcarRevisada as marcarRevisadaAccion,
} from '../../features/seguimiento/seguimientoSlice'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { FiltrosVisitasBar } from '../../components/seguimiento/FiltrosVisitasBar'
import {
  DetalleVisitaDialog,
  type CambiosVisitaEditables,
} from '../../components/seguimiento/DetalleVisitaDialog'
import { PageHeader } from '../../components/layout/PageHeader'
import { filtrarVisitas } from '../../utils/seguimiento/filtrar-visitas.util'
import { severidadMaxima } from '../../utils/seguimiento/alertas.util'
import { FILTROS_VACIOS } from '../../types/filtros.types'
import { COLOR_ESTADO, COLOR_SEVERIDAD, ETIQUETA_ESTADO } from '../../theme/theme'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

export function RevisarVisitas() {
  const theme = useTheme()
  const esMovil = useMediaQuery(theme.breakpoints.down('sm'))
  const dispatch = useAppDispatch()
  const { usuario } = useUsuarioActual()
  const { pendientes, cargando } = useAppSelector((state) => state.seguimiento)
  const { proyectoEstrategicoPorObra, proyectosEstrategicos, tiposAlerta, obraPorId, nombrePorAutor } =
    useDatosFiltro()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaSeguimiento | null>(null)

  useEffect(() => {
    if (usuario) dispatch(listarPendientes(usuario.id))
  }, [dispatch, usuario])

  const pendientesFiltradas = useMemo(
    () => filtrarVisitas(pendientes, filtros, proyectoEstrategicoPorObra),
    [pendientes, filtros, proyectoEstrategicoPorObra],
  )

  const cantidadUrgente = useMemo(
    () => pendientes.filter((v) => v.estado === 'pendiente_revisar').length,
    [pendientes],
  )

  function abrirDetalle(visita: VisitaSeguimiento) {
    // El ingeniero abre la visita para revisarla — pasa a en_revision si
    // todavía estaba pendiente_revisar (sección 4 del brief).
    if (usuario && visita.estado === 'pendiente_revisar') {
      dispatch(marcarEnRevision({ id: visita.id, usuarioId: usuario.id }))
    }
    setVisitaSeleccionada(visita)
  }

  function guardarEdicion(cambios: CambiosVisitaEditables) {
    if (!visitaSeleccionada || !usuario) return
    dispatch(editarVisita({ id: visitaSeleccionada.id, usuarioId: usuario.id, cambios }))
    setVisitaSeleccionada(null)
  }

  function marcarRevisada(visita: VisitaSeguimiento) {
    if (!usuario) return
    dispatch(marcarRevisadaAccion({ id: visita.id, revisadoPor: usuario.id }))
  }

  const nombreObra = (obraId: number) => obraPorId.get(obraId)?.nombre ?? `Obra ${obraId}`
  const ubicacionObra = (obraId: number) => {
    const obra = obraPorId.get(obraId)
    return obra?.comuna ?? obra?.direccion ?? null
  }
  const nombreAutor = (autorId: string) => nombrePorAutor.get(autorId) ?? 'Autor desconocido'
  const puedeMarcarRevisada = (visita: VisitaSeguimiento) => visita.estado !== 'revisada'

  return (
    <Box sx={{ width: '100%', maxWidth: 1400 }}>
      <PageHeader
        titulo="Revisar visitas"
        subtitulo={
          cantidadUrgente > 0
            ? `${cantidadUrgente} visita${cantidadUrgente === 1 ? '' : 's'} esperando primera revisión`
            : 'Visitas de los visitadores y de otros ingenieros'
        }
      />

      <FiltrosVisitasBar
        filtros={filtros}
        onChange={setFiltros}
        proyectosEstrategicos={proyectosEstrategicos}
        tiposAlerta={tiposAlerta}
      />

      {cargando && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {esMovil ? (
        <Stack spacing={1.5}>
          {pendientesFiltradas.map((visita) => {
            const alertas = visita.alertas?.length ?? 0
            const severidad = severidadMaxima(visita.alertas)
            const ubicacion = ubicacionObra(visita.obraId)
            return (
              <Card
                key={visita.id}
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  p: 2,
                  borderLeft: '4px solid',
                  borderLeftColor: COLOR_ESTADO[visita.estado],
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>
                      {nombreObra(visita.obraId)}
                    </Typography>
                    {ubicacion && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.25 }}>
                        <LocationOnIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {ubicacion}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                    {severidad && (
                      <Chip
                        size="small"
                        icon={<WarningAmberIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                        label={alertas}
                        sx={{ backgroundColor: COLOR_SEVERIDAD[severidad], color: '#fff', fontWeight: 700 }}
                      />
                    )}
                    <Chip
                      size="small"
                      label={ETIQUETA_ESTADO[visita.estado]}
                      sx={{ backgroundColor: COLOR_ESTADO[visita.estado], color: '#fff', fontWeight: 600 }}
                    />
                  </Stack>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                  <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {nombreAutor(visita.autorId)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, minWidth: 110 }}>
                    <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      {visita.fechaVisita}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <TrendingUpIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      Avance: <b>{visita.porcentajeAvanceCampo}%</b>
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => abrirDetalle(visita)}
                    sx={{ flex: 1, minHeight: 44 }}
                  >
                    {puedeMarcarRevisada(visita) ? 'Ver / editar' : 'Ver'}
                  </Button>
                  {puedeMarcarRevisada(visita) && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => marcarRevisada(visita)}
                      sx={{ flex: 1, minHeight: 44 }}
                    >
                      Revisada
                    </Button>
                  )}
                </Box>
              </Card>
            )
          })}
        </Stack>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Obra</TableCell>
                <TableCell>Autor</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Avance campo</TableCell>
                <TableCell align="center">Alertas</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendientesFiltradas.map((visita) => {
                const alertas = visita.alertas?.length ?? 0
                return (
                  <TableRow key={visita.id} hover>
                    <TableCell sx={{ maxWidth: 340 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {nombreObra(visita.obraId)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {nombreAutor(visita.autorId)}
                      </Typography>
                    </TableCell>
                    <TableCell>{visita.fechaVisita}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {visita.porcentajeAvanceCampo}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {alertas > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
                          <WarningAmberIcon sx={{ fontSize: 16, color: '#f9a825' }} />
                          <Typography variant="body2">{alertas}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ETIQUETA_ESTADO[visita.estado]}
                        sx={{ backgroundColor: COLOR_ESTADO[visita.estado], color: '#fff' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => abrirDetalle(visita)}>
                        {puedeMarcarRevisada(visita) ? 'Ver / editar' : 'Ver'}
                      </Button>
                      {puedeMarcarRevisada(visita) && (
                        <Button size="small" onClick={() => marcarRevisada(visita)}>
                          Marcar revisada
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!cargando && pendientesFiltradas.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <RateReviewIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {pendientes.length === 0
              ? 'No hay visitas pendientes de revisar. Buen trabajo.'
              : 'No hay visitas que coincidan con estos filtros.'}
          </Typography>
        </Box>
      )}

      {visitaSeleccionada && (
        <DetalleVisitaDialog
          // Versión fresca del store: al abrir, abrirDetalle() puede haberla pasado a en_revision
          visita={pendientes.find((v) => v.id === visitaSeleccionada.id) ?? visitaSeleccionada}
          nombreObra={nombreObra(visitaSeleccionada.obraId)}
          direccionObra={obraPorId.get(visitaSeleccionada.obraId)?.direccion}
          tiposAlerta={tiposAlerta}
          onCerrar={() => setVisitaSeleccionada(null)}
          onGuardar={guardarEdicion}
        />
      )}
    </Box>
  )
}
