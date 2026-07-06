import { useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl'
import maplibregl from 'maplibre-gl'
import useSupercluster from 'use-supercluster'
import { Box, Button, Chip, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as obrasVisorApi from '../../api/obrasVisorApi'
import * as seguimientoApi from '../../features/seguimiento/seguimientoApi'
import type { ObraVisor } from '../../types/obra.types'

;(maplibregl as any).supported = () => true

const DIAS_DESATENDIDA = 30

const ESTILOS_MAPA = {
  calles: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satelite: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const

function infoObra(obra: ObraVisor) {
  if (obra.entregada) return { color: '#3b82f6', etiqueta: 'Entregada' }
  if (obra.porcentajeAvanceOficial >= 70) return { color: '#22c55e', etiqueta: `Avance ${obra.porcentajeAvanceOficial}%` }
  if (obra.porcentajeAvanceOficial >= 35) return { color: '#eab308', etiqueta: `Avance ${obra.porcentajeAvanceOficial}%` }
  return { color: '#ef4444', etiqueta: `Avance ${obra.porcentajeAvanceOficial}%` }
}

function estaDesatendida(ultimaVisita: string | undefined): boolean {
  if (!ultimaVisita) return true
  const dias = (Date.now() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24)
  return dias > DIAS_DESATENDIDA
}

const LEYENDA: { color: string; label: string; border?: boolean }[] = [
  { color: '#3b82f6', label: 'Entregada' },
  { color: '#22c55e', label: 'Avance ≥ 70%' },
  { color: '#eab308', label: 'Avance 35–70%' },
  { color: '#ef4444', label: 'Avance < 35%' },
  { color: '#fff', label: 'Desatendida (>30 días)', border: true },
]

export function MapaSeguimiento() {
  const navigate = useNavigate()
  const mapRef = useRef<any>(null)
  const [obras, setObras] = useState<ObraVisor[]>([])
  const [ultimaVisitaPorObra, setUltimaVisitaPorObra] = useState<Map<number, string>>(new Map())
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraVisor | null>(null)
  const [estiloMapa, setEstiloMapa] = useState<'calles' | 'satelite'>('calles')
  const [viewport, setViewport] = useState({ longitude: -75.58, latitude: 6.24, zoom: 10 })
  const [bounds, setBounds] = useState<[number, number, number, number]>([-76, 5.7, -75, 6.8])

  useEffect(() => {
    obrasVisorApi.obtenerObras().then(setObras).catch(() => {})
    seguimientoApi.obtenerUltimaVisitaPorObra().then(setUltimaVisitaPorObra).catch(() => {})
  }, [])

  const obrasFiltradas = useMemo(() => {
    const conCoordenadas = obras.filter((o) => o.latitud !== null && o.longitud !== null)
    if (!fechaFiltro) return conCoordenadas
    return conCoordenadas.filter((o) => ultimaVisitaPorObra.get(o.obraId) === fechaFiltro)
  }, [obras, fechaFiltro, ultimaVisitaPorObra])

  const puntos = useMemo(
    () =>
      obrasFiltradas.map((obra) => ({
        type: 'Feature' as const,
        properties: { cluster: false, obraId: obra.obraId },
        geometry: { type: 'Point' as const, coordinates: [obra.longitud!, obra.latitud!] },
      })),
    [obrasFiltradas],
  )

  const { clusters, supercluster } = useSupercluster({
    points: puntos,
    bounds,
    zoom: viewport.zoom,
    options: { radius: 60, maxZoom: 16 },
  })

  return (
    <Box sx={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
          Mapa de obras
        </Typography>

        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
        {fechaFiltro && (
          <Button size="small" variant="outlined" onClick={() => setFechaFiltro('')}>
            Limpiar filtro
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        <Chip
          label="Calles"
          size="small"
          variant={estiloMapa === 'calles' ? 'filled' : 'outlined'}
          color={estiloMapa === 'calles' ? 'primary' : 'default'}
          onClick={() => setEstiloMapa('calles')}
        />
        <Chip
          label="Satélite"
          size="small"
          variant={estiloMapa === 'satelite' ? 'filled' : 'outlined'}
          color={estiloMapa === 'satelite' ? 'primary' : 'default'}
          onClick={() => setEstiloMapa('satelite')}
        />
      </Box>

      <Box sx={{ flex: 1, position: 'relative' }}>
        <MapGL
          ref={mapRef}
          {...viewport}
          mapLib={maplibregl}
          mapStyle={ESTILOS_MAPA[estiloMapa]}
          style={{ width: '100%', height: '100%' }}
          onMove={(evt) => setViewport(evt.viewState)}
          onMoveEnd={(evt) => {
            const b = evt.target.getBounds()
            setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
          }}
          onError={(e: any) => {
            if (e?.error?.message?.includes('supported')) return
          }}
        >
          <NavigationControl position="top-right" />

          {clusters.map((cluster) => {
            const [longitude, latitude] = cluster.geometry.coordinates
            const propiedades = cluster.properties as { cluster: boolean; point_count?: number; obraId?: number }
            const { cluster: esCluster, point_count: cantidad } = propiedades

            if (esCluster) {
              // Escala logarítmica: 10 obras ≈ 38px, 100 ≈ 48px, 1000 ≈ 58px.
              // Lineal quedaba gigante con clusters de cientos de obras.
              const size = 28 + Math.log10(Math.max(cantidad ?? 1, 1)) * 10
              return (
                <Marker key={cluster.id} longitude={longitude} latitude={latitude}>
                  <div
                    onClick={() => {
                      const zoomExpandido = supercluster?.getClusterExpansionZoom(Number(cluster.id))
                      setViewport((v) => ({ ...v, longitude, latitude, zoom: zoomExpandido ?? v.zoom + 2 }))
                    }}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                      border: '2px solid rgba(255,255,255,0.6)',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {cantidad}
                  </div>
                </Marker>
              )
            }

            const obra = obrasFiltradas.find((o) => o.obraId === propiedades.obraId)
            if (!obra) return null
            const desatendida = estaDesatendida(ultimaVisitaPorObra.get(obra.obraId))
            const { color } = infoObra(obra)
            const mostrarLabel = viewport.zoom >= 13

            return (
              <Marker
                key={obra.obraId}
                longitude={longitude}
                latitude={latitude}
                onClick={() => setObraSeleccionada(obra)}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: color,
                      border: desatendida ? `3px solid #ef4444` : `2px solid #fff`,
                      boxShadow: desatendida
                        ? '0 0 0 2px #fff, 0 0 0 5px rgba(239,68,68,0.4)'
                        : '0 1px 4px rgba(0,0,0,0.3)',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.4)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    title={`${obra.nombre} — ${infoObra(obra).etiqueta}`}
                  />
                  {mostrarLabel && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 9,
                        lineHeight: 1.1,
                        mt: 0.3,
                        px: 0.5,
                        py: 0.1,
                        borderRadius: 0.5,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        color: 'text.primary',
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        fontWeight: 500,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      {obra.nombre}
                    </Typography>
                  )}
                </Box>
              </Marker>
            )
          })}

          {obraSeleccionada && (
            <Popup
              longitude={obraSeleccionada.longitud!}
              latitude={obraSeleccionada.latitud!}
              onClose={() => setObraSeleccionada(null)}
              closeOnClick={false}
              style={{ padding: 0 }}
            >
              <Box sx={{ p: 1.5, minWidth: 200 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3, mb: 0.5 }}>
                  {obraSeleccionada.nombre}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: infoObra(obraSeleccionada).color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {infoObra(obraSeleccionada).etiqueta}
                  </Typography>
                </Box>
                {obraSeleccionada.dependencia && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {obraSeleccionada.dependencia}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ fontSize: 11, py: 0.3 }}
                    onClick={() => navigate(`/seguimiento/registrar/${obraSeleccionada.obraId}`)}
                  >
                    Visitar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11, py: 0.3 }}
                    onClick={() => navigate(`/seguimiento/historial/${obraSeleccionada.obraId}`)}
                  >
                    Historial
                  </Button>
                </Box>
              </Box>
            </Popup>
          )}
        </MapGL>

        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: 10,
            bgcolor: 'rgba(255,255,255,0.95)',
            borderRadius: 1.5,
            px: 1.5,
            py: 1,
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            zIndex: 1,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            {obrasFiltradas.length} obras
          </Typography>
          {LEYENDA.map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.15 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: item.color,
                  border: item.border ? '2px solid #ef4444' : 'none',
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
