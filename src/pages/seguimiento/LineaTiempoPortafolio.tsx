import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar, Box, Chip, Paper, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import * as obrasVisorApi from '../../api/obrasVisorApi'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { listarTodasLasVisitas } from '../../features/seguimiento/seguimientoSlice'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { useFotoUrl } from '../../components/seguimiento/FotoVisitaImg'
import { PageHeader } from '../../components/layout/PageHeader'
import { DetalleVisitaDialog } from '../../components/seguimiento/DetalleVisitaDialog'
import { BarraAvance } from '../../components/seguimiento/BarraAvance'
import { ContadorAnimado } from '../../components/seguimiento/ContadorAnimado'
import { agruparPortafolio } from '../../utils/seguimiento/portafolio.util'
import { severidadMaxima } from '../../utils/seguimiento/alertas.util'
import { COLOR_ESTADO, COLOR_SEVERIDAD, COLOR_SIDEBAR } from '../../theme/theme'
import type { ObraVisor } from '../../types/obra.types'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// Rampa ordinal (skill de dataviz): las 4 etapas del portafolio son una
// posición en una secuencia ("funnel stage"), no identidades sueltas —
// un solo hue en pasos monótonos de claro a oscuro, no un color
// arbitrario por categoría. Validado con validate_palette.js --ordinal
// contra superficie blanca: luminancia monótona, ΔL ≥ 0.06 entre pasos,
// extremo claro a 2.27:1 (≥2:1) — los 4 checks pasan. El paso más oscuro
// reusa COLOR_SIDEBAR (marca), no un hex nuevo.
const COLOR_ETAPA_PLANEACION = '#4fb8e0'
const COLOR_ETAPA_EJECUCION = '#0f8fc7'
const COLOR_ETAPA_POR_ENTREGAR = '#0a5f8f'
const COLOR_ETAPA_ENTREGADA = COLOR_SIDEBAR

const MAX_VISITAS_MOSTRADAS = 30

export function LineaTiempoPortafolio() {
  const dispatch = useAppDispatch()
  const { todasLasVisitas } = useAppSelector((state) => state.seguimiento)
  const { obraPorId, nombrePorAutor, tiposAlerta } = useDatosFiltro()
  const [obras, setObras] = useState<ObraVisor[]>([])
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaSeguimiento | null>(null)

  useEffect(() => {
    dispatch(listarTodasLasVisitas())
    obrasVisorApi
      .obtenerObras()
      .then(setObras)
      .catch(() => {})
  }, [dispatch])

  const grupos = useMemo(() => agruparPortafolio(obras), [obras])

  const etapas = useMemo(
    () => [
      { etiqueta: 'En planeación', cantidad: grupos.planeacion.length, color: COLOR_ETAPA_PLANEACION },
      { etiqueta: 'En ejecución', cantidad: grupos.ejecucion.length, color: COLOR_ETAPA_EJECUCION },
      { etiqueta: 'Por entregar pronto', cantidad: grupos.porEntregar.length, color: COLOR_ETAPA_POR_ENTREGAR },
      { etiqueta: 'Entregadas', cantidad: grupos.entregadas.length, color: COLOR_ETAPA_ENTREGADA },
    ],
    [grupos],
  )

  // todasLasVisitas ya viene ordenada por fecha_visita descendente desde
  // la API (ver seguimientoApi.ts) — acá solo se recorta a un feed corto.
  const visitasRecientes = useMemo(
    () => todasLasVisitas.slice(0, MAX_VISITAS_MOSTRADAS),
    [todasLasVisitas],
  )

  return (
    <Box sx={{ width: '100%', maxWidth: 1200 }}>
      <PageHeader
        titulo="Línea de tiempo"
        subtitulo="Actividad reciente del equipo y estado del portafolio de obras"
      />

      {/* Pipeline del portafolio: una sola línea de tiempo horizontal,
          de la planeación a la entrega — no tarjetas sueltas. */}
      <Box sx={{ overflowX: 'auto', mb: 5, pb: 1 }}>
        <Box sx={{ display: 'flex', minWidth: 640 }}>
          {etapas.map((etapa, indice) => (
            <Box
              key={etapa.etiqueta}
              sx={{ display: 'flex', alignItems: 'center', flex: indice === etapas.length - 1 ? '0 0 auto' : 1 }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 130, px: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: etapa.color, lineHeight: 1.1 }}>
                  <ContadorAnimado valor={etapa.cantidad} />
                </Typography>
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    bgcolor: etapa.color,
                    my: 1,
                    boxShadow: '0 0 0 3px #fff',
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {etapa.etiqueta}
                </Typography>
              </Box>
              {indice < etapas.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: indice * 0.1, duration: 0.4, ease: 'easeOut' }}
                  style={{
                    height: 2,
                    flex: 1,
                    minWidth: 32,
                    background: 'rgba(10, 30, 61, 0.14)',
                    transformOrigin: 'left',
                    marginBottom: 28,
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Actividad reciente
      </Typography>

      {visitasRecientes.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Todavía no hay visitas registradas.
        </Typography>
      )}

      {/* Feed de visitas como línea de tiempo horizontal, con scroll
          lateral — la más reciente primero, igual que ya venía ordenado. */}
      <Box sx={{ display: 'flex', overflowX: 'auto', pb: 2 }}>
        {visitasRecientes.map((visita, indice) => {
          const severidad = severidadMaxima(visita.alertas)
          const color = severidad ? COLOR_SEVERIDAD[severidad] : COLOR_ESTADO[visita.estado]
          const nombreObra = obraPorId.get(visita.obraId)?.nombre ?? `Obra ${visita.obraId}`
          const nombreAutor = nombrePorAutor.get(visita.autorId) ?? 'Autor desconocido'
          const primeraFoto = visita.fotos?.[0]
          const esUltimo = indice === visitasRecientes.length - 1

          return (
            <Box key={visita.id} sx={{ width: 224, flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                {visita.fechaVisita}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: Math.min(indice, 12) * 0.05, type: 'spring', stiffness: 320, damping: 20 }}
                  style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }}
                />
                {!esUltimo && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ delay: Math.min(indice, 12) * 0.05 + 0.08, duration: 0.3, ease: 'easeOut' }}
                    style={{ height: 2, flex: 1, background: 'rgba(10, 30, 61, 0.14)', transformOrigin: 'left' }}
                  />
                )}
              </Box>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: Math.min(indice, 12) * 0.05, duration: 0.3, ease: 'easeOut' }}
                style={{ width: '100%', marginTop: 10 }}
              >
                <Paper
                  variant="outlined"
                  onClick={() => setVisitaSeleccionada(visita)}
                  sx={{ p: 1.5, cursor: 'pointer', width: '100%' }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    {primeraFoto ? (
                      <MiniaturaFoto storagePath={primeraFoto.storagePath} />
                    ) : (
                      <Avatar sx={{ width: 36, height: 36, fontSize: 13, bgcolor: 'rgba(10, 30, 61, 0.06)', color: 'text.secondary' }}>
                        {iniciales(nombreAutor)}
                      </Avatar>
                    )}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {nombreObra}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {nombreAutor}
                      </Typography>
                    </Box>
                  </Box>
                  <BarraAvance valor={visita.porcentajeAvanceCampo} />
                  {severidad && (
                    <Chip
                      size="small"
                      icon={<WarningAmberIcon sx={{ fontSize: 13, color: '#fff !important' }} />}
                      label={`${visita.alertas?.length ?? 0} alerta${(visita.alertas?.length ?? 0) > 1 ? 's' : ''}`}
                      sx={{ height: 20, mt: 1, bgcolor: COLOR_SEVERIDAD[severidad], color: '#fff', fontWeight: 700 }}
                    />
                  )}
                </Paper>
              </motion.div>
            </Box>
          )
        })}
      </Box>

      {visitaSeleccionada && (
        <DetalleVisitaDialog
          visita={visitaSeleccionada}
          nombreObra={obraPorId.get(visitaSeleccionada.obraId)?.nombre ?? `Obra ${visitaSeleccionada.obraId}`}
          direccionObra={obraPorId.get(visitaSeleccionada.obraId)?.direccion}
          nombreAutor={nombrePorAutor.get(visitaSeleccionada.autorId)}
          tiposAlerta={tiposAlerta}
          soloLectura
          onCerrar={() => setVisitaSeleccionada(null)}
          onGuardar={() => {}}
        />
      )}
    </Box>
  )
}

function MiniaturaFoto({ storagePath }: { storagePath: string }) {
  const { url } = useFotoUrl(storagePath)
  if (!url) return <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#eee', flexShrink: 0 }} />
  return (
    <Box
      component="img"
      src={url}
      alt=""
      sx={{ width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
    />
  )
}

function iniciales(nombre: string): string {
  return (
    nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase() || '?'
  )
}
