import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InsightsIcon from '@mui/icons-material/Insights'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { listarTodasLasVisitas, marcarVistoGerencia } from '../../features/seguimiento/seguimientoSlice'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { FiltrosVisitasBar } from '../../components/seguimiento/FiltrosVisitasBar'
import { DetalleVisitaDialog } from '../../components/seguimiento/DetalleVisitaDialog'
import { BarraAvance } from '../../components/seguimiento/BarraAvance'
import { PageHeader } from '../../components/layout/PageHeader'
import { useEsMovil } from '../../hooks/useEsMovil'
import { filtrarVisitas } from '../../utils/seguimiento/filtrar-visitas.util'
import { severidadMaxima } from '../../utils/seguimiento/alertas.util'
import { iniciales } from '../../utils/seguimiento/formatoTexto.util'
import { resumirVisitas } from '../../utils/seguimiento/resumen-visitas.util'
import { FILTROS_VACIOS } from '../../types/filtros.types'
import { COLOR_ACENTO, COLOR_ESTADO, COLOR_SEVERIDAD, COLOR_TEXTO_SEVERIDAD, ETIQUETA_ESTADO } from '../../theme/theme'
import type { SeveridadAlerta, VisitaSeguimiento } from '../../types/seguimiento.types'

// Tinte muy sutil para las filas/tarjetas ya vistas por gerencia — a
// diferencia de un opacity global (que baja el contraste del texto por
// debajo de AA), esto solo matiza el fondo y mantiene la lectura.
const FONDO_VISTO = 'rgba(46, 125, 50, 0.045)'

// Esta es la única pantalla exclusiva del rol visualizador — no hay
// ningún otro lugar de la app que le explique qué puede hacer acá, así
// que el aviso se guarda "visto" en localStorage para no repetirlo cada
// vez que entra.
const CLAVE_GUIA_VISTA = 'seguimiento_guia_gestion_vista'

export function GestionVisitas() {
  const esMovil = useEsMovil()
  const dispatch = useAppDispatch()
  const { todasLasVisitas, cargando } = useAppSelector((state) => state.seguimiento)
  const { proyectoEstrategicoPorObra, proyectosEstrategicos, tiposAlerta, obraPorId, nombrePorAutor, usuarios } =
    useDatosFiltro()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaSeguimiento | null>(null)
  const [mostrarGuia, setMostrarGuia] = useState(() => localStorage.getItem(CLAVE_GUIA_VISTA) !== '1')

  function descartarGuia() {
    localStorage.setItem(CLAVE_GUIA_VISTA, '1')
    setMostrarGuia(false)
  }

  useEffect(() => {
    dispatch(listarTodasLasVisitas())
  }, [dispatch])

  const visitasFiltradas = useMemo(
    () => filtrarVisitas(todasLasVisitas, filtros, proyectoEstrategicoPorObra),
    [todasLasVisitas, filtros, proyectoEstrategicoPorObra],
  )

  // Vista ejecutiva: lo primero que mira gerencia es lo que falta revisar,
  // así que las sin revisar suben arriba (orden estable dentro de cada grupo).
  const visitasOrdenadas = useMemo(
    () => [...visitasFiltradas].sort((a, b) => Number(a.vistoGerencia) - Number(b.vistoGerencia)),
    [visitasFiltradas],
  )

  // KPIs derivados del conjunto ya filtrado: al filtrar por proyecto/autor el
  // resumen se recalcula para esa porción — no hace falta pedir más datos.
  const resumen = useMemo(() => resumirVisitas(visitasFiltradas), [visitasFiltradas])

  const nombreObra = (obraId: number) => obraPorId.get(obraId)?.nombre ?? `Obra ${obraId}`
  const nombreAutor = (autorId: string) => nombrePorAutor.get(autorId) ?? 'Autor desconocido'

  function toggleVisto(visita: VisitaSeguimiento, visto: boolean) {
    dispatch(marcarVistoGerencia({ id: visita.id, visto }))
  }

  function guardarVistaSeleccionada(visto: boolean) {
    if (!visitaSeleccionada) return
    toggleVisto(visitaSeleccionada, visto)
    setVisitaSeleccionada({ ...visitaSeleccionada, vistoGerencia: visto })
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1400 }}>
      <PageHeader
        titulo="Gestión de visitas"
        subtitulo="Resumen ejecutivo de las visitas registradas por todo el equipo"
      />

      {mostrarGuia && (
        <Alert severity="info" onClose={descartarGuia} sx={{ mb: 2.5 }}>
          Acá ves todas las visitas registradas por el equipo. Podés marcarlas como revisadas, pero no podés
          editarlas ni crear nuevas — eso lo hacen ingeniería y el equipo de campo desde el mapa.
        </Alert>
      )}

      <ResumenGerencia resumen={resumen} />

      <FiltrosVisitasBar
        filtros={filtros}
        onChange={setFiltros}
        proyectosEstrategicos={proyectosEstrategicos}
        tiposAlerta={tiposAlerta}
        usuarios={usuarios}
      />

      {cargando && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {esMovil ? (
        <Stack spacing={1.5}>
          {visitasOrdenadas.map((visita) => {
            const severidad = severidadMaxima(visita.alertas)
            const alertas = visita.alertas?.length ?? 0
            return (
              <Card
                key={visita.id}
                variant="outlined"
                onClick={() => setVisitaSeleccionada(visita)}
                sx={{
                  borderRadius: 2.5,
                  p: 1.75,
                  cursor: 'pointer',
                  borderLeft: '4px solid',
                  borderLeftColor: visita.vistoGerencia ? 'transparent' : COLOR_ACENTO,
                  bgcolor: visita.vistoGerencia ? FONDO_VISTO : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box onClick={(e) => e.stopPropagation()} sx={{ mt: -0.75, ml: -0.75 }}>
                    <ToggleVisto
                      visto={visita.vistoGerencia}
                      onChange={(visto) => toggleVisto(visita, visto)}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, minWidth: 0 }}>
                        {nombreObra(visita.obraId)}
                      </Typography>
                      {severidad && <ChipSeveridad severidad={severidad} cantidad={alertas} />}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {nombreAutor(visita.autorId)} · {visita.fechaVisita}
                    </Typography>
                    <Box sx={{ mt: 1.25 }}>
                      <BarraAvance valor={visita.porcentajeAvanceCampo} />
                    </Box>
                  </Box>
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
                <TableCell align="center" sx={{ width: 64 }}>
                  Visto
                </TableCell>
                <TableCell>Obra y autor</TableCell>
                <TableCell sx={{ width: 120 }}>Fecha</TableCell>
                <TableCell sx={{ width: 180 }}>Avance campo</TableCell>
                <TableCell align="center" sx={{ width: 96 }}>
                  Alertas
                </TableCell>
                <TableCell sx={{ width: 150 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visitasOrdenadas.map((visita) => {
                const severidad = severidadMaxima(visita.alertas)
                const alertas = visita.alertas?.length ?? 0
                return (
                  <TableRow
                    key={visita.id}
                    hover
                    onClick={() => setVisitaSeleccionada(visita)}
                    sx={{ cursor: 'pointer', bgcolor: visita.vistoGerencia ? FONDO_VISTO : 'inherit' }}
                  >
                    <TableCell padding="checkbox" align="center" onClick={(e) => e.stopPropagation()}>
                      <ToggleVisto
                        visto={visita.vistoGerencia}
                        onChange={(visto) => toggleVisto(visita, visto)}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            fontWeight: 700,
                            bgcolor: 'rgba(10, 30, 61, 0.06)',
                            color: 'text.secondary',
                          }}
                        >
                          {iniciales(nombreAutor(visita.autorId))}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontWeight: 600,
                              color: visita.vistoGerencia ? 'text.secondary' : 'text.primary',
                            }}
                          >
                            {nombreObra(visita.obraId)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {nombreAutor(visita.autorId)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                      {visita.fechaVisita}
                    </TableCell>
                    <TableCell>
                      <BarraAvance valor={visita.porcentajeAvanceCampo} />
                    </TableCell>
                    <TableCell align="center">
                      {severidad ? (
                        <ChipSeveridad severidad={severidad} cantidad={alertas} />
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
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!cargando && visitasOrdenadas.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <InsightsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {todasLasVisitas.length === 0
              ? 'Todavía no hay visitas registradas.'
              : 'No hay visitas que coincidan con estos filtros.'}
          </Typography>
        </Box>
      )}

      {visitaSeleccionada && (
        <DetalleVisitaDialog
          visita={visitaSeleccionada}
          nombreObra={nombreObra(visitaSeleccionada.obraId)}
          direccionObra={obraPorId.get(visitaSeleccionada.obraId)?.direccion}
          nombreAutor={nombreAutor(visitaSeleccionada.autorId)}
          tiposAlerta={tiposAlerta}
          soloLectura
          vistoGerencia={visitaSeleccionada.vistoGerencia}
          onCambiarVisto={guardarVistaSeleccionada}
          onCerrar={() => setVisitaSeleccionada(null)}
          onGuardar={() => {}}
        />
      )}
    </Box>
  )
}

// --- Piezas de presentación --------------------------------------------------

interface ResumenGerenciaProps {
  resumen: { total: number; revisadas: number; sinRevisar: number; conAlertas: number; cobertura: number }
}

// Franja de KPIs: la identidad "ejecutiva" de la pantalla. Cuatro métricas
// derivadas + una barra de cobertura de revisión, en una sola superficie
// tranquila (Paper sin hover) para que no compita con el listado.
function ResumenGerencia({ resumen }: ResumenGerenciaProps) {
  const divisor = <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 2.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, sm: 3 } }}>
        <Kpi etiqueta="Visitas totales" valor={resumen.total} />
        {divisor}
        <Kpi etiqueta="Revisadas gerencia" valor={resumen.revisadas} color={COLOR_ESTADO.revisada} />
        {divisor}
        <Kpi
          etiqueta="Sin revisar"
          valor={resumen.sinRevisar}
          color={resumen.sinRevisar > 0 ? COLOR_ACENTO : undefined}
        />
        {divisor}
        <Kpi
          etiqueta="Con alertas"
          valor={resumen.conAlertas}
          color={resumen.conAlertas > 0 ? COLOR_SEVERIDAD.alta : undefined}
        />
      </Box>
      <Box sx={{ mt: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography variant="subtitle2" sx={{ textTransform: 'none' }}>
            Cobertura de revisión
          </Typography>
          <Typography variant="subtitle2" sx={{ textTransform: 'none', color: 'text.primary' }}>
            {resumen.cobertura}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={resumen.cobertura}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(10, 30, 61, 0.08)',
            '& .MuiLinearProgress-bar': { bgcolor: COLOR_ACENTO, borderRadius: 4 },
          }}
        />
      </Box>
    </Paper>
  )
}

function Kpi({ etiqueta, valor, color }: { etiqueta: string; valor: number; color?: string }) {
  return (
    <Box sx={{ flex: '1 1 auto', minWidth: { xs: '40%', sm: 0 } }}>
      <Typography sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 700, lineHeight: 1.1, color: color ?? 'text.primary' }}>
        {valor}
      </Typography>
      <Typography variant="subtitle2" sx={{ mt: 0.25 }}>
        {etiqueta}
      </Typography>
    </Box>
  )
}

// Toggle de "visto por gerencia": íconos radio/check inequívocos (antes era
// un ojo de "ver", que se confundía con la acción de abrir el detalle).
function ToggleVisto({ visto, onChange }: { visto: boolean; onChange: (visto: boolean) => void }) {
  return (
    <Tooltip title={visto ? 'Marcar como no revisada' : 'Marcar como revisada'}>
      <Checkbox
        size="small"
        checked={visto}
        onChange={(e) => onChange(e.target.checked)}
        icon={<RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />}
        checkedIcon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
        sx={{ color: 'text.disabled', '&.Mui-checked': { color: COLOR_ESTADO.revisada } }}
      />
    </Tooltip>
  )
}

function ChipSeveridad({ severidad, cantidad }: { severidad: SeveridadAlerta; cantidad: number }) {
  return (
    <Chip
      size="small"
      icon={<WarningAmberIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
      label={cantidad}
      sx={{ height: 22, backgroundColor: COLOR_SEVERIDAD[severidad], color: COLOR_TEXTO_SEVERIDAD[severidad], fontWeight: 700, flexShrink: 0 }}
    />
  )
}

