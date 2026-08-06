import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { editarVisita, eliminarVisita, listarMisVisitas } from '../../features/seguimiento/seguimientoSlice'
import * as seguimientoApi from '../../features/seguimiento/seguimientoApi'
import { puedeBorrar } from '../../utils/seguimiento/permisos.util'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { BarraAvance } from '../../components/seguimiento/BarraAvance'
import { FiltrosVisitasBar } from '../../components/seguimiento/FiltrosVisitasBar'
import { ProximasVisitas } from '../../components/seguimiento/ProximasVisitas'
import {
  DetalleVisitaDialog,
  type CambiosVisitaEditables,
} from '../../components/seguimiento/DetalleVisitaDialog'
import { filtrarVisitas } from '../../utils/seguimiento/filtrar-visitas.util'
import { severidadMaxima } from '../../utils/seguimiento/alertas.util'
import { PageHeader } from '../../components/layout/PageHeader'
import { FILTROS_VACIOS } from '../../types/filtros.types'
import { COLOR_ESTADO, COLOR_SEVERIDAD, ETIQUETA_ESTADO } from '../../theme/theme'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

export function MisVisitas() {
  const dispatch = useAppDispatch()
  const { usuario } = useUsuarioActual()
  const { misVisitas, cargando } = useAppSelector((state) => state.seguimiento)
  const { proyectoEstrategicoPorObra, proyectosEstrategicos, tiposAlerta, obraPorId } =
    useDatosFiltro()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaSeguimiento | null>(null)
  // De TODO el equipo, no solo del usuario actual: la tira de "Próximas
  // visitas" lo necesita para saber si otro ya volvió a la obra (consulta
  // liviana, solo obra_id + fecha_visita).
  const [ultimaVisitaPorObra, setUltimaVisitaPorObra] = useState<Map<number, string>>(new Map())

  function guardarEdicion(cambios: CambiosVisitaEditables) {
    if (!visitaSeleccionada || !usuario) return
    dispatch(editarVisita({ id: visitaSeleccionada.id, usuarioId: usuario.id, cambios }))
    setVisitaSeleccionada(null)
  }

  function borrarVisita() {
    if (!visitaSeleccionada) return
    dispatch(eliminarVisita(visitaSeleccionada.id))
      .unwrap()
      .then(() => setVisitaSeleccionada(null))
      .catch((err) => window.alert(err?.message ?? 'No se pudo borrar la visita'))
  }

  useEffect(() => {
    if (usuario) dispatch(listarMisVisitas(usuario.id))
  }, [dispatch, usuario])

  useEffect(() => {
    seguimientoApi
      .obtenerUltimaVisitaPorObra()
      .then(setUltimaVisitaPorObra)
      .catch(() => {})
  }, [])

  const visitasFiltradas = useMemo(
    () => filtrarVisitas(misVisitas, filtros, proyectoEstrategicoPorObra),
    [misVisitas, filtros, proyectoEstrategicoPorObra],
  )

  return (
    <Box sx={{ width: '100%', maxWidth: 1200 }}>
      <PageHeader
        titulo="Mis visitas"
        subtitulo="Obras que visitaste y el estado de revisión de cada registro"
        accion={
          <Button
            component={Link}
            to="/seguimiento/mapa"
            variant="contained"
            startIcon={<AddLocationAltIcon />}
          >
            Nueva visita
          </Button>
        }
      />

      <ProximasVisitas
        visitas={misVisitas}
        ultimaVisitaPorObra={ultimaVisitaPorObra}
        obraPorId={obraPorId}
        onSeleccionar={setVisitaSeleccionada}
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

      <Stack spacing={1.5}>
        {visitasFiltradas.map((visita) => {
          const obra = obraPorId.get(visita.obraId)
          const alertas = visita.alertas?.length ?? 0
          const fotos = visita.fotos?.length ?? 0
          const severidad = severidadMaxima(visita.alertas)
          const ubicacion = obra?.comuna ?? obra?.direccion
          return (
            <Card
              key={visita.id}
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                borderLeft: '4px solid',
                borderLeftColor: COLOR_ESTADO[visita.estado],
              }}
            >
              <CardActionArea onClick={() => setVisitaSeleccionada(visita)} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>
                      {obra?.nombre ?? `Obra ${visita.obraId}`}
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

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 130 }}>
                    <CalendarTodayIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      {visita.fechaVisita}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flex: 1, minWidth: 140, maxWidth: 260 }}>
                    <BarraAvance valor={visita.porcentajeAvanceCampo} />
                  </Box>
                </Box>

                {fotos > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <CameraAltIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">
                      {fotos} foto{fotos === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                )}
              </CardActionArea>
            </Card>
          )
        })}
      </Stack>

      {visitaSeleccionada && (
        <DetalleVisitaDialog
          // Versión fresca del store, por si una edición la actualizó
          visita={misVisitas.find((v) => v.id === visitaSeleccionada.id) ?? visitaSeleccionada}
          nombreObra={
            obraPorId.get(visitaSeleccionada.obraId)?.nombre ?? `Obra ${visitaSeleccionada.obraId}`
          }
          direccionObra={obraPorId.get(visitaSeleccionada.obraId)?.direccion}
          tiposAlerta={tiposAlerta}
          onCerrar={() => setVisitaSeleccionada(null)}
          onGuardar={guardarEdicion}
          onBorrar={puedeBorrar(visitaSeleccionada.autorId, usuario) ? borrarVisita : undefined}
        />
      )}

      {!cargando && visitasFiltradas.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AddLocationAltIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {misVisitas.length === 0
              ? 'Todavía no registraste ninguna visita. Buscá una obra en el mapa para empezar.'
              : 'No hay visitas que coincidan con estos filtros.'}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
