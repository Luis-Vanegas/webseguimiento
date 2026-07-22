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
import { NodoRiel } from '../../components/seguimiento/NodoRiel'
import { agruparPortafolio } from '../../utils/seguimiento/portafolio.util'
import { severidadMaxima } from '../../utils/seguimiento/alertas.util'
import { COLOR_ACENTO, COLOR_ESTADO, COLOR_PROXIMA_ENTREGA, COLOR_SEVERIDAD } from '../../theme/theme'
import type { ObraVisor } from '../../types/obra.types'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// Violeta para "en planeación" — todavía sin obra física en el terreno,
// distinto de cualquier color ya usado en el Mapa (ese es su propio
// dominio: estado de visita, no etapa de portafolio).
const COLOR_PLANEACION = '#8b5cf6'
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

  // todasLasVisitas ya viene ordenada por fecha_visita descendente desde
  // la API (ver seguimientoApi.ts) — acá solo se recorta a un feed corto.
  const visitasRecientes = useMemo(
    () => todasLasVisitas.slice(0, MAX_VISITAS_MOSTRADAS),
    [todasLasVisitas],
  )

  return (
    <Box sx={{ width: '100%', maxWidth: 820 }}>
      <PageHeader
        titulo="Línea de tiempo"
        subtitulo="Actividad reciente del equipo y estado del portafolio de obras"
      />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 4 }}>
        <EstadisticaPortafolio etiqueta="En planeación" cantidad={grupos.planeacion.length} color={COLOR_PLANEACION} />
        <EstadisticaPortafolio etiqueta="En ejecución" cantidad={grupos.ejecucion.length} color={COLOR_ACENTO} />
        <EstadisticaPortafolio
          etiqueta="Por entregar pronto"
          cantidad={grupos.porEntregar.length}
          color={COLOR_PROXIMA_ENTREGA}
        />
        <EstadisticaPortafolio etiqueta="Entregadas" cantidad={grupos.entregadas.length} color={COLOR_ESTADO.revisada} />
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Actividad reciente
      </Typography>

      {visitasRecientes.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Todavía no hay visitas registradas.
        </Typography>
      )}

      <Box>
        {visitasRecientes.map((visita, indice) => {
          const severidad = severidadMaxima(visita.alertas)
          const color = severidad ? COLOR_SEVERIDAD[severidad] : COLOR_ESTADO[visita.estado]
          const nombreObra = obraPorId.get(visita.obraId)?.nombre ?? `Obra ${visita.obraId}`
          const nombreAutor = nombrePorAutor.get(visita.autorId) ?? 'Autor desconocido'
          const primeraFoto = visita.fotos?.[0]

          return (
            <Box key={visita.id} sx={{ display: 'flex', gap: 2 }}>
              <NodoRiel color={color} indice={indice} esUltimo={indice === visitasRecientes.length - 1} />

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: Math.min(indice, 10) * 0.06, duration: 0.35, ease: 'easeOut' }}
                style={{ flex: 1, marginBottom: 16, minWidth: 0 }}
              >
                <Paper
                  variant="outlined"
                  onClick={() => setVisitaSeleccionada(visita)}
                  sx={{ p: 1.75, display: 'flex', gap: 1.5, alignItems: 'center', cursor: 'pointer', minWidth: 0 }}
                >
                  {primeraFoto ? (
                    <MiniaturaFoto storagePath={primeraFoto.storagePath} />
                  ) : (
                    <Avatar sx={{ width: 44, height: 44, fontSize: 15, bgcolor: 'rgba(10, 30, 61, 0.06)', color: 'text.secondary' }}>
                      {iniciales(nombreAutor)}
                    </Avatar>
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {nombreObra}
                      </Typography>
                      {severidad && (
                        <Chip
                          size="small"
                          icon={<WarningAmberIcon sx={{ fontSize: 13, color: '#fff !important' }} />}
                          label={visita.alertas?.length ?? 0}
                          sx={{ height: 20, bgcolor: COLOR_SEVERIDAD[severidad], color: '#fff', fontWeight: 700, flexShrink: 0 }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.5 }}>
                      {nombreAutor} · {visita.fechaVisita}
                    </Typography>
                    <BarraAvance valor={visita.porcentajeAvanceCampo} />
                  </Box>
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

function EstadisticaPortafolio({ etiqueta, cantidad, color }: { etiqueta: string; cantidad: number; color: string }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.25, flex: '1 1 160px', borderTop: `3px solid ${color}` }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color, lineHeight: 1.1 }}>
        <ContadorAnimado valor={cantidad} />
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {etiqueta}
      </Typography>
    </Paper>
  )
}

function MiniaturaFoto({ storagePath }: { storagePath: string }) {
  const { url } = useFotoUrl(storagePath)
  if (!url) return <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: '#eee', flexShrink: 0 }} />
  return (
    <Box
      component="img"
      src={url}
      alt=""
      sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
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
