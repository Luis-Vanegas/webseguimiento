import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Chip, Paper, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { listarVisitasDeObraSolicitada } from '../../features/seguimiento/seguimientoSlice'
import * as seguimientoApi from '../../features/seguimiento/seguimientoApi'
import { compararVisitas } from '../../utils/seguimiento/visita-comparator.util'
import { filtrarVisitas } from '../../utils/seguimiento/filtrar-visitas.util'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { FiltrosVisitasBar } from '../../components/seguimiento/FiltrosVisitasBar'
import { CambioVisitaItem } from '../../components/seguimiento/CambioVisitaItem'
import { PageHeader } from '../../components/layout/PageHeader'
import { FILTROS_VACIOS } from '../../types/filtros.types'
import { FotoVisitaImg } from '../../components/seguimiento/FotoVisitaImg'
import { COLOR_ESTADO } from '../../theme/theme'
import type { EstadoVisita, PuntoReferenciaObra, VisitaSeguimiento } from '../../types/seguimiento.types'

const ETIQUETA_ESTADO: Record<EstadoVisita, string> = {
  pendiente_revisar: 'Pendiente de revisar',
  en_revision: 'En revisión',
  revisada: 'Revisada',
}

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
      dispatch(listarVisitasDeObraSolicitada({ obraId: obraIdNum }))
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

  return (
    <Box sx={{ maxWidth: 760 }}>
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

      {visitasObraActual.filter((v) => idsVisibles.has(v.id)).map((visita) => {
        const index = indicePorId.get(visita.id) ?? 0
        const anterior = index > 0 ? visitasObraActual[index - 1] : null
        const cambios = compararVisitas(visita, anterior)

        return (
          <Paper
            key={visita.id}
            variant="outlined"
            sx={{
              p: 2.5,
              mb: 2,
              borderLeft: '4px solid',
              borderLeftColor: COLOR_ESTADO[visita.estado],
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="subtitle1">{visita.fechaVisita}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {visita.porcentajeAvanceCampo}% de avance observado
                </Typography>
              </Box>
              <Chip
                size="small"
                label={ETIQUETA_ESTADO[visita.estado]}
                sx={{ backgroundColor: COLOR_ESTADO[visita.estado], color: '#fff' }}
              />
            </Box>

            {anterior && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                {cambios.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Sin cambios respecto a la visita anterior.
                  </Typography>
                ) : (
                  cambios.map((c) => <CambioVisitaItem key={c.campo} cambio={c} tiposAlerta={tiposAlerta} />)
                )}
              </Box>
            )}

            <ComparacionFotos visita={visita} anterior={anterior} nombrePunto={nombrePunto} />
          </Paper>
        )
      })}

      {visitasObraActual.length === 0 && (
        <Typography color="text.secondary">Todavía no hay visitas registradas para esta obra.</Typography>
      )}
    </Box>
  )
}

interface ComparacionFotosProps {
  visita: VisitaSeguimiento
  anterior: VisitaSeguimiento | null
  nombrePunto: (id: string) => string
}

// Agrupa las fotos de la visita actual por punto de referencia y las
// enfrenta contra la foto del mismo punto en la visita anterior (sección 7
// del brief). Si el punto no tenía foto antes, se muestra solo la actual —
// no es un error, es la primera vez que se fotografía ese punto.
function ComparacionFotos({ visita, anterior, nombrePunto }: ComparacionFotosProps) {
  const fotosConPunto = (visita.fotos ?? []).filter((f) => f.puntoReferenciaId)
  if (fotosConPunto.length === 0) return null

  const puntosUnicos = [...new Set(fotosConPunto.map((f) => f.puntoReferenciaId as string))]

  return (
    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {puntosUnicos.map((puntoId) => {
        const fotoActual = fotosConPunto.find((f) => f.puntoReferenciaId === puntoId)
        const fotoAnterior = (anterior?.fotos ?? []).find((f) => f.puntoReferenciaId === puntoId)

        return (
          <Box key={puntoId}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {nombrePunto(puntoId)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              {fotoAnterior && <FotoVisitaImg storagePath={fotoAnterior.storagePath} />}
              {fotoActual && <FotoVisitaImg storagePath={fotoActual.storagePath} />}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
