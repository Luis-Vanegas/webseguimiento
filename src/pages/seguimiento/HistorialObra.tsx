import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Chip, Paper, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { listarVisitasDeObra } from '../../features/seguimiento/seguimientoSlice'
import * as seguimientoApi from '../../features/seguimiento/seguimientoApi'
import { compararVisitas } from '../../utils/seguimiento/visita-comparator.util'
import { filtrarVisitas } from '../../utils/seguimiento/filtrar-visitas.util'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { FiltrosVisitasBar } from '../../components/seguimiento/FiltrosVisitasBar'
import { CambioVisitaItem } from '../../components/seguimiento/CambioVisitaItem'
import { BarraAvance } from '../../components/seguimiento/BarraAvance'
import { PageHeader } from '../../components/layout/PageHeader'
import { FILTROS_VACIOS } from '../../types/filtros.types'
import { FotoVisitaImg } from '../../components/seguimiento/FotoVisitaImg'
import { COLOR_ESTADO, ETIQUETA_ESTADO } from '../../theme/theme'
import type { PuntoReferenciaObra, VisitaSeguimiento } from '../../types/seguimiento.types'

export function HistorialObra() {
  const { obraId } = useParams<{ obraId: string }>()
  const obraIdNum = Number(obraId)
  const dispatch = useAppDispatch()
  const { visitasObraActual } = useAppSelector((state) => state.seguimiento)
  const { proyectoEstrategicoPorObra, proyectosEstrategicos, tiposAlerta, obraPorId } =
    useDatosFiltro()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [puntos, setPuntos] = useState<PuntoReferenciaObra[]>([])

  useEffect(() => {
    if (obraIdNum) {
      dispatch(listarVisitasDeObra(obraIdNum))
      seguimientoApi.listarPuntosReferencia(obraIdNum).then(setPuntos)
    }
  }, [dispatch, obraIdNum])

  const nombrePunto = (id: string) => puntos.find((p) => p.id === id)?.nombre ?? 'Punto sin nombre'

  // El delta siempre se calcula contra la visita anterior REAL (secuencia
  // completa, sin filtrar) — el filtro solo decide qué entradas del timeline
  // se muestran, para no romper la continuidad de la comparación.
  const idsVisibles = useMemo(
    () => new Set(filtrarVisitas(visitasObraActual, filtros, proyectoEstrategicoPorObra).map((v) => v.id)),
    [visitasObraActual, filtros, proyectoEstrategicoPorObra],
  )

  // Índice por id para no hacer findIndex dentro del map (O(n²) innecesario)
  const indicePorId = useMemo(
    () => new Map(visitasObraActual.map((v, i) => [v.id, i])),
    [visitasObraActual],
  )

  const visitasVisibles = visitasObraActual.filter((v) => idsVisibles.has(v.id))

  return (
    <Box sx={{ width: '100%', maxWidth: 1000 }}>
      <PageHeader
        titulo={obraPorId.get(obraIdNum)?.nombre ?? `Obra ${obraId}`}
        subtitulo="Historial de visitas de campo"
        accion={
          <Button
            component={Link}
            to={`/seguimiento/registrar/${obraIdNum}`}
            variant="contained"
            startIcon={<AddLocationAltIcon />}
          >
            Registrar visita
          </Button>
        }
      />

      <FiltrosVisitasBar
        filtros={filtros}
        onChange={setFiltros}
        proyectosEstrategicos={proyectosEstrategicos}
        tiposAlerta={tiposAlerta}
      />

      {/* Línea de tiempo: cada visita es un nodo sobre un riel vertical que
          las encadena en secuencia. El color del nodo lleva el estado (antes
          lo cargaba un borde izquierdo grueso en cada tarjeta), así la tarjeta
          queda limpia y el riel comunica "esto es una cronología". */}
      <Box>
        {visitasVisibles.map((visita, idx) => {
          const index = indicePorId.get(visita.id) ?? 0
          const anterior = index > 0 ? visitasObraActual[index - 1] : null
          const cambios = compararVisitas(visita, anterior)
          const esUltima = idx === visitasVisibles.length - 1

          return (
            <Box key={visita.id} sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 } }}>
              {/* Riel: nodo + línea que se estira hasta la siguiente entrada */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: COLOR_ESTADO[visita.estado],
                    border: '3px solid',
                    borderColor: 'background.paper',
                    boxShadow: `0 0 0 1px ${COLOR_ESTADO[visita.estado]}`,
                    flexShrink: 0,
                  }}
                />
                {!esUltima && (
                  <Box sx={{ flex: 1, width: '2px', bgcolor: 'divider', mt: 0.5, minHeight: 24 }} />
                )}
              </Box>

              {/* Contenido de la visita */}
              <Paper
                variant="outlined"
                sx={{ flex: 1, p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 2.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                      {visita.fechaVisita}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {anterior ? `Visita ${index + 1}` : 'Primera visita registrada'}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={ETIQUETA_ESTADO[visita.estado]}
                    sx={{ backgroundColor: COLOR_ESTADO[visita.estado], color: '#fff' }}
                  />
                </Box>

                <Box sx={{ mt: 1.5, maxWidth: 260 }}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'none', mb: 0.5 }}>
                    Avance en campo
                  </Typography>
                  <BarraAvance valor={visita.porcentajeAvanceCampo} />
                </Box>

                {anterior && (
                  <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ mb: cambios.length === 0 ? 0 : 0.75 }}>
                      Cambios desde la visita anterior
                    </Typography>
                    {cambios.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Sin cambios respecto a la visita anterior.
                      </Typography>
                    ) : (
                      cambios.map((c) => (
                        <CambioVisitaItem key={c.campo} cambio={c} tiposAlerta={tiposAlerta} />
                      ))
                    )}
                  </Box>
                )}

                <ComparacionFotos visita={visita} anterior={anterior} nombrePunto={nombrePunto} />
              </Paper>
            </Box>
          )
        })}
      </Box>

      {visitasObraActual.length === 0 && (
        <Typography color="text.secondary">
          Todavía no hay visitas registradas para esta obra.
        </Typography>
      )}
    </Box>
  )
}

interface ComparacionFotosProps {
  visita: VisitaSeguimiento
  anterior: VisitaSeguimiento | null
  nombrePunto: (id: string) => string
}

// Placeholder para el "antes" cuando el punto se fotografía por primera vez
// en esta visita — no es un error, es que no había foto previa que comparar.
function SinFotoPrevia() {
  return (
    <Box
      sx={{
        width: 120,
        height: 90,
        borderRadius: 1,
        border: '1px dashed',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 1,
        color: 'text.disabled',
      }}
    >
      <Typography variant="caption">Sin foto previa</Typography>
    </Box>
  )
}

// Agrupa las fotos de la visita actual por punto de referencia y las
// enfrenta contra la foto del mismo punto en la visita anterior (sección 7
// del brief). Cada par se etiqueta "Antes → Ahora" con la fecha de cada
// visita, para que se lea de un vistazo cuál foto es la vieja y cuál la nueva
// (antes eran dos imágenes pegadas sin ningún rótulo).
function ComparacionFotos({ visita, anterior, nombrePunto }: ComparacionFotosProps) {
  const fotosConPunto = (visita.fotos ?? []).filter((f) => f.puntoReferenciaId)
  if (fotosConPunto.length === 0) return null

  const puntosUnicos = [...new Set(fotosConPunto.map((f) => f.puntoReferenciaId as string))]

  return (
    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Comparación por punto de referencia
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {puntosUnicos.map((puntoId) => {
          const fotoActual = fotosConPunto.find((f) => f.puntoReferenciaId === puntoId)
          const fotoAnterior = (anterior?.fotos ?? []).find((f) => f.puntoReferenciaId === puntoId)

          return (
            <Box key={puntoId}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {nombrePunto(puntoId)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontWeight: 700, letterSpacing: 0.3 }}>
                    ANTES{fotoAnterior && anterior ? ` · ${anterior.fechaVisita}` : ''}
                  </Typography>
                  {fotoAnterior ? (
                    <FotoVisitaImg storagePath={fotoAnterior.storagePath} />
                  ) : (
                    <SinFotoPrevia />
                  )}
                </Box>

                <ArrowRightAltIcon sx={{ color: 'text.disabled', mt: 2.5 }} />

                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, letterSpacing: 0.3, color: 'text.secondary' }}>
                    AHORA · {visita.fechaVisita}
                  </Typography>
                  {fotoActual && <FotoVisitaImg storagePath={fotoActual.storagePath} />}
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
