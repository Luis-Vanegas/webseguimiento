import { useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl'
import maplibregl from 'maplibre-gl'
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import InputAdornment from '@mui/material/InputAdornment'
import { useNavigate } from 'react-router-dom'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as obrasVisorApi from '../../api/obrasVisorApi'
import * as seguimientoApi from '../../features/seguimiento/seguimientoApi'
import type { ObraVisor } from '../../types/obra.types'

;(maplibregl as any).supported = () => true

const DIAS_DESATENDIDA = 30
const DIAS_PROXIMA_ENTREGA = 15
const COLOR_COMUNA = '#f97316'
const COLOR_PROXIMA_ENTREGA = '#a855f7'

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

// "Próxima a entregar": fecha estimada dentro de los próximos 15 días.
// No incluye obras vencidas (fecha estimada ya pasada) — con el mapeo de
// `entregada` corregido, esas ya deberían venir marcadas como entregadas.
function estaProximaAEntregar(obra: ObraVisor): boolean {
  if (obra.entregada || !obra.fechaEstimadaEntrega) return false
  const dias = (new Date(obra.fechaEstimadaEntrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return dias >= 0 && dias <= DIAS_PROXIMA_ENTREGA
}

const LEYENDA: { color: string; label: string; border?: boolean }[] = [
  { color: '#3b82f6', label: 'Entregada' },
  { color: '#22c55e', label: 'Avance ≥ 70%' },
  { color: '#eab308', label: 'Avance 35–70%' },
  { color: '#ef4444', label: 'Avance < 35%' },
  { color: '#fff', label: 'Desatendida (>30 días)', border: true },
  { color: COLOR_PROXIMA_ENTREGA, label: `Próxima a entregar (≤${DIAS_PROXIMA_ENTREGA} días)` },
]

// FeatureCollection de puntos: uno por obra, con su color de estado ya
// resuelto como propiedad — así el layer de MapLibre solo necesita
// 'circle-color': ['get', 'color'], sin duplicar la lógica de infoObra().
function obrasAGeoJSON(obras: ObraVisor[]) {
  return {
    type: 'FeatureCollection' as const,
    features: obras.map((obra) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [obra.longitud, obra.latitud] },
      properties: { obraId: obra.obraId, color: infoObra(obra).color },
    })),
  }
}

function calcularBounds(obras: ObraVisor[]): [[number, number], [number, number]] | null {
  const conCoordenadas = obras.filter((o) => o.latitud !== null && o.longitud !== null)
  if (conCoordenadas.length === 0) return null
  const lons = conCoordenadas.map((o) => o.longitud!)
  const lats = conCoordenadas.map((o) => o.latitud!)
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ]
}

export function MapaSeguimiento() {
  const navigate = useNavigate()
  const mapRef = useRef<any>(null)
  const [obras, setObras] = useState<ObraVisor[]>([])
  const [ultimaVisitaPorObra, setUltimaVisitaPorObra] = useState<Map<number, string>>(new Map())
  const [comunasGeoJSON, setComunasGeoJSON] = useState<any>(null)
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [comunaFiltro, setComunaFiltro] = useState<string | null>(null)
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraVisor | null>(null)
  const [estiloMapa, setEstiloMapa] = useState<'calles' | 'satelite'>('calles')
  const [viewport, setViewport] = useState({ longitude: -75.58, latitude: 6.24, zoom: 10 })
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    obrasVisorApi
      .obtenerObras()
      .then(setObras)
      .catch(() => {})
    seguimientoApi
      .obtenerUltimaVisitaPorObra()
      .then(setUltimaVisitaPorObra)
      .catch(() => {})
    fetch('/comunas.geojson')
      .then((r) => r.json())
      .then(setComunasGeoJSON)
      .catch(() => {})
  }, [])

  const nombresComunas = useMemo(
    () =>
      (comunasGeoJSON?.features ?? [])
        .map((f: any) => f.properties.nombre as string)
        .sort(),
    [comunasGeoJSON],
  )

  const obrasFiltradas = useMemo(() => {
    let resultado = obras.filter((o) => o.latitud !== null && o.longitud !== null)
    if (fechaFiltro) resultado = resultado.filter((o) => ultimaVisitaPorObra.get(o.obraId) === fechaFiltro)
    if (comunaFiltro) resultado = resultado.filter((o) => o.comuna === comunaFiltro)
    return resultado
  }, [obras, fechaFiltro, comunaFiltro, ultimaVisitaPorObra])

  const cantidadComunas = useMemo(
    () => new Set(obrasFiltradas.map((o) => o.comuna)).size,
    [obrasFiltradas],
  )

  const obrasProximasAEntregar = useMemo(
    () => obrasFiltradas.filter(estaProximaAEntregar),
    [obrasFiltradas],
  )

  const obrasGeoJSON = useMemo(() => obrasAGeoJSON(obrasFiltradas), [obrasFiltradas])

  const resultadosBusqueda = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return []
    return obrasFiltradas.filter((o) => o.nombre.toLowerCase().includes(texto)).slice(0, 30)
  }, [busqueda, obrasFiltradas])

  function seleccionarObra(obra: ObraVisor) {
    if (obra.latitud === null || obra.longitud === null) return
    setObraSeleccionada(obra)
    setViewport((v) => ({ ...v, longitude: obra.longitud!, latitude: obra.latitud!, zoom: Math.max(v.zoom, 14) }))
  }

  // Al elegir una comuna en el filtro, encuadrar el mapa en sus obras.
  useEffect(() => {
    if (!comunaFiltro) return
    const bounds = calcularBounds(obrasFiltradas)
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comunaFiltro])

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

        {(fechaFiltro || comunaFiltro) && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setFechaFiltro('')
              setComunaFiltro(null)
            }}
          >
            Limpiar filtros
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

      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 0 }}>
        <Box
          sx={{
            width: { xs: '100%', md: 320 },
            flexShrink: 0,
            borderRight: { md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: 260, md: 'none' },
          }}
        >
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar obra por nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: busqueda && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setBusqueda('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <select
              value={comunaFiltro ?? ''}
              onChange={(e) => setComunaFiltro(e.target.value || null)}
              style={{
                padding: '6.5px 8px',
                borderRadius: 4,
                border: '1px solid #c4c4c4',
                fontSize: 14,
                fontFamily: 'inherit',
                width: '100%',
              }}
            >
              <option value="">Todas las comunas</option>
              {nombresComunas.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </Box>

          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            {busqueda && (
              <List dense disablePadding>
                {resultadosBusqueda.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                    Sin resultados para "{busqueda}".
                  </Typography>
                )}
                {resultadosBusqueda.map((obra) => (
                  <ListItemButton key={obra.obraId} onClick={() => seleccionarObra(obra)}>
                    <ListItemText primary={obra.nombre} secondary={obra.comuna ?? 'Sin comuna registrada'} />
                  </ListItemButton>
                ))}
              </List>
            )}

            {!busqueda && comunaFiltro && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
                  <Typography variant="subtitle2">
                    {comunaFiltro} · {obrasFiltradas.length} obras
                  </Typography>
                  <IconButton size="small" onClick={() => setComunaFiltro(null)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense disablePadding>
                  {obrasFiltradas.map((obra) => (
                    <ListItemButton key={obra.obraId} onClick={() => seleccionarObra(obra)}>
                      <ListItemText primary={obra.nombre} secondary={infoObra(obra).etiqueta} />
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}

            {!busqueda && !comunaFiltro && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                Buscá una obra por nombre o elegí una comuna para ver sus obras.
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, position: 'relative', minHeight: 240 }}>
          <MapGL
            ref={mapRef}
            {...viewport}
            mapLib={maplibregl}
            mapStyle={ESTILOS_MAPA[estiloMapa]}
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={['obras-puntos']}
            onMove={(evt) => setViewport(evt.viewState)}
            onClick={(evt: any) => {
              const feature = evt.features?.[0]
              if (!feature) return
              const obra = obrasFiltradas.find((o) => o.obraId === feature.properties.obraId)
              if (obra) seleccionarObra(obra)
            }}
            onError={(e: any) => {
              if (e?.error?.message?.includes('supported')) return
            }}
          >
            <NavigationControl position="top-right" />

            {comunasGeoJSON && (
              <Source id="comunas" type="geojson" data={comunasGeoJSON}>
                <Layer
                  id="comunas-contorno"
                  source="comunas"
                  type="line"
                  paint={{ 'line-color': COLOR_COMUNA, 'line-width': 1.5, 'line-opacity': 0.7 }}
                />
                {comunaFiltro && (
                  <Layer
                    id="comunas-resaltado"
                    source="comunas"
                    type="fill"
                    filter={['==', ['get', 'nombre'], comunaFiltro]}
                    paint={{ 'fill-color': COLOR_COMUNA, 'fill-opacity': 0.15 }}
                  />
                )}
              </Source>
            )}

            {obrasProximasAEntregar.map((obra) => (
              <Marker
                key={`proxima-${obra.obraId}`}
                longitude={obra.longitud!}
                latitude={obra.latitud!}
                onClick={() => seleccionarObra(obra)}
              >
                <div
                  title={`${obra.nombre} — próxima a entregar`}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: COLOR_PROXIMA_ENTREGA,
                    border: '2px solid #fff',
                    boxShadow: `0 0 0 3px ${COLOR_PROXIMA_ENTREGA}59`,
                    cursor: 'pointer',
                  }}
                />
              </Marker>
            ))}

            <Source id="obras" type="geojson" data={obrasGeoJSON}>
              <Layer
                id="obras-puntos"
                source="obras"
                type="circle"
                paint={{
                  'circle-radius': 5,
                  'circle-color': ['get', 'color'],
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#fff',
                }}
              />
            </Source>

            {obraSeleccionada && obraSeleccionada.latitud !== null && obraSeleccionada.longitud !== null && (
              <Marker longitude={obraSeleccionada.longitud} latitude={obraSeleccionada.latitud}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: infoObra(obraSeleccionada).color,
                    border: estaDesatendida(ultimaVisitaPorObra.get(obraSeleccionada.obraId))
                      ? '3px solid #ef4444'
                      : '2px solid #fff',
                    boxShadow: '0 0 0 3px rgba(37,99,235,0.5)',
                  }}
                />
              </Marker>
            )}

            {obraSeleccionada && (
              <Popup
                longitude={obraSeleccionada.longitud!}
                latitude={obraSeleccionada.latitud!}
                onClose={() => setObraSeleccionada(null)}
                closeOnClick={false}
                style={{ padding: 0 }}
              >
                <Box sx={{ p: 1.5, minWidth: 220, maxWidth: 280 }}>
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
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {obraSeleccionada.dependencia}
                    </Typography>
                  )}
                  {obraSeleccionada.fechaEstimadaEntrega && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Entrega estimada: {obraSeleccionada.fechaEstimadaEntrega}
                    </Typography>
                  )}

                  {obraSeleccionada.etapas.some((e) => !e.noAplica) && (
                    <Box
                      sx={{
                        mt: 1,
                        pt: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        maxHeight: 150,
                        overflowY: 'auto',
                      }}
                    >
                      {obraSeleccionada.etapas
                        .filter((etapa) => !etapa.noAplica)
                        .map((etapa) => (
                          <Box
                            key={etapa.nombre}
                            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.2 }}
                          >
                            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                              {etapa.nombre}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, flexShrink: 0 }}>
                              {etapa.porcentaje}%
                            </Typography>
                          </Box>
                        ))}
                    </Box>
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
              {obrasFiltradas.length} obras · {cantidadComunas} comunas
              {obrasProximasAEntregar.length > 0 && ` · ${obrasProximasAEntregar.length} por entregar`}
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
    </Box>
  )
}
