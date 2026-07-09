import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { editarVisita, listarMisVisitas } from '../../features/seguimiento/seguimientoSlice'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { FiltrosVisitasBar } from '../../components/seguimiento/FiltrosVisitasBar'
import {
  DetalleVisitaDialog,
  type CambiosVisitaEditables,
} from '../../components/seguimiento/DetalleVisitaDialog'
import { filtrarVisitas } from '../../utils/seguimiento/filtrar-visitas.util'
import { PageHeader } from '../../components/layout/PageHeader'
import { FILTROS_VACIOS } from '../../types/filtros.types'
import { COLOR_ESTADO, ETIQUETA_ESTADO } from '../../theme/theme'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

export function MisVisitas() {
  const dispatch = useAppDispatch()
  const { usuario } = useUsuarioActual()
  const { misVisitas, cargando } = useAppSelector((state) => state.seguimiento)
  const { proyectoEstrategicoPorObra, proyectosEstrategicos, tiposAlerta, obraPorId } =
    useDatosFiltro()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaSeguimiento | null>(null)

  function guardarEdicion(cambios: CambiosVisitaEditables) {
    if (!visitaSeleccionada || !usuario) return
    dispatch(editarVisita({ id: visitaSeleccionada.id, usuarioId: usuario.id, cambios }))
    setVisitaSeleccionada(null)
  }

  useEffect(() => {
    if (usuario) dispatch(listarMisVisitas(usuario.id))
  }, [dispatch, usuario])

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
          const alertas = visita.alertas?.length ?? 0
          const fotos = visita.fotos?.length ?? 0
          return (
            <Card key={visita.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
              <CardActionArea onClick={() => setVisitaSeleccionada(visita)} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>
                    {obraPorId.get(visita.obraId)?.nombre ?? `Obra ${visita.obraId}`}
                  </Typography>
                  <Chip
                    size="small"
                    label={ETIQUETA_ESTADO[visita.estado]}
                    sx={{
                      backgroundColor: COLOR_ESTADO[visita.estado],
                      color: '#fff',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    {visita.fechaVisita}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avance observado: <b>{visita.porcentajeAvanceCampo}%</b>
                  </Typography>
                  {alertas > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WarningAmberIcon sx={{ fontSize: 16, color: '#f9a825' }} />
                      <Typography variant="body2" color="text.secondary">
                        {alertas} {alertas === 1 ? 'alerta' : 'alertas'}
                      </Typography>
                    </Box>
                  )}
                  {fotos > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CameraAltIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary">
                        {fotos}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardActionArea>
            </Card>
          )
        })}
      </Stack>

      {visitaSeleccionada && (
        <DetalleVisitaDialog
          // Versión fresca del store, por si una edición la actualizó
          visita={misVisitas.find((v) => v.id === visitaSeleccionada.id) ?? visitaSeleccionada}
          usuario={usuario}
          nombreObra={
            obraPorId.get(visitaSeleccionada.obraId)?.nombre ?? `Obra ${visitaSeleccionada.obraId}`
          }
          tiposAlerta={tiposAlerta}
          onCerrar={() => setVisitaSeleccionada(null)}
          onGuardar={guardarEdicion}
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
