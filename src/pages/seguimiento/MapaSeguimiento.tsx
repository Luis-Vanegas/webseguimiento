import { useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { GeolocateControl, Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl'
import maplibregl from 'maplibre-gl'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
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
import { listarRecorridos } from '../../features/seguimiento/recorridosApi'
import { useGrabacionRecorrido } from '../../features/seguimiento/useGrabacionRecorrido'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { PanelRecorrido } from '../../components/seguimiento/PanelRecorrido'
import { PanelPlaneacionRuta } from '../../components/seguimiento/PanelPlaneacionRuta'
import { DetalleRecorridoDialog } from '../../components/seguimiento/DetalleRecorridoDialog'
import { COLOR_ACENTO, COLOR_PROXIMA_ENTREGA, COLOR_RUTA_PLANEADA } from '../../theme/theme'
import { DIAS_PROXIMA_ENTREGA, estaDesatendida, estaProximaAEntregar } from '../../utils/seguimiento/fechas.util'
import type { ObraVisor } from '../../types/obra.types'
import type { PuntoTrazo, RecorridoSeguimiento } from '../../types/seguimiento.types'

;(maplibregl as any).supported = () => true

const COLOR_COMUNA = '#f97316'
const COLOR_DESATENDIDA = '#9ca3af'

const ESTILOS_MAPA = {
  calles: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satelite: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const

// El color del punto marca si ALGUIEN ya subió una visita para esa obra
// (ultimaVisitaPorObra la trae del backend, así que "visitada" es "tiene
// entrada en ese mapa"), no el % de avance oficial — eso sigue disponible
// por etapa en el popup, pero dejó de pintar el mapa para bajar la cantidad
// de colores simultáneos.
function infoObra(obra: ObraVisor, ultimaVisitaPorObra: Map<number, string>) {
  if (obra.entregada) return { color: '#3b82f6', etiqueta: 'Entregada' }
  if (ultimaVisitaPorObra.has(obra.obraId)) return { color: '#22c55e', etiqueta: 'Visitada' }
  return { color: '#ef4444', etiqueta: 'Sin visitar' }
}

const LEYENDA: { color: string; label: string; border?: boolean }[] = [
  { color: '#3b82f6', label: 'Entregada' },
  { color: '#22c55e', label: 'Visitada' },
  { color: '#ef4444', label: 'Sin visitar' },
  { color: '#fff', label: 'Sin visitar hace más de 30 días', border: true },
  { color: COLOR_PROXIMA_ENTREGA, label: `Próxima a entregar (≤${DIAS_PROXIMA_ENTREGA} días)` },
]

// FeatureCollection de puntos: uno por obra, con su color de estado y si
// está desatendida ya resueltos como propiedades — así el layer de
// MapLibre solo necesita 'get', sin duplicar la lógica en el paint.
function obrasAGeoJSON(obras: ObraVisor[], ultimaVisitaPorObra: Map<number, string>) {
  return {
    type: 'FeatureCollection' as const,
    features: obras.map((obra) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [obra.longitud, obra.latitud] },
      properties: {
        obraId: obra.obraId,
        color: infoObra(obra, ultimaVisitaPorObra).color,
        desatendida: estaDesatendida(ultimaVisitaPorObra.get(obra.obraId)),
      },
    })),
  }
}

// Un LineString por recorrido con trazo utilizable (>= 2 puntos), con su id
// como propiedad — mismo criterio que obrasAGeoJSON: la lógica de selección
// se resuelve en el click leyendo `get('recorridoId')`, sin duplicarla.
function recorridosALineas(recorridos: RecorridoSeguimiento[]) {
  return {
    type: 'FeatureCollection' as const,
    features: recorridos
      .filter((r) => r.trazo.length >= 2)
      .map((r) => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: r.trazo.map((p) => [p.lon, p.lat]) },
        properties: { recorridoId: r.id, tipo: r.tipo },
      })),
  }
}

// Trazo en vivo mientras se graba: una sola línea a partir de los puntos que
// va emitiendo el hook de grabación.
function puntosALinea(puntos: PuntoTrazo[]) {
  return {
    type: 'FeatureCollection' as const,
    features:
      puntos.length >= 2
        ? [
            {
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: puntos.map((p) => [p.lon, p.lat]) },
              properties: {},
            },
          ]
        : [],
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
  const { usuario } = useUsuarioActual()
  const mapRef = useRef<any>(null)
  const [obras, setObras] = useState<ObraVisor[]>([])
  const [ultimaVisitaPorObra, setUltimaVisitaPorObra] = useState<Map<number, string>>(new Map())
  const [comunasGeoJSON, setComunasGeoJSON] = useState<any>(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [entregaDesde, setEntregaDesde] = useState('')
  const [entregaHasta, setEntregaHasta] = useState('')
  const [comunaFiltro, setComunaFiltro] = useState<string | null>(null)
  const [proyectoFiltro, setProyectoFiltro] = useState<string | null>(null)
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraVisor | null>(null)
  const [estiloMapa, setEstiloMapa] = useState<'calles' | 'satelite'>('calles')
  const [viewport, setViewport] = useState({ longitude: -75.58, latitude: 6.24, zoom: 10 })
  const [busqueda, setBusqueda] = useState('')
  const [recorridos, setRecorridos] = useState<RecorridoSeguimiento[]>([])
  const [recorridoSeleccionado, setRecorridoSeleccionado] = useState<RecorridoSeguimiento | null>(null)

  // Modo "planear ruta": el usuario arma un trazo clickeando el mapa (sin GPS).
  // El estado vive acá para que el mapa dibuje la línea de preview y los
  // marcadores numerados; el panel recibe todo por props.
  const [modoPlaneacion, setModoPlaneacion] = useState(false)
  const [puntosPlaneados, setPuntosPlaneados] = useState<PuntoTrazo[]>([])

  // El hook vive acá (no dentro de PanelRecorrido) para que el mapa pueda
  // dibujar el trazo en vivo desde los mismos `puntos` mientras se graba.
  const grabacion = useGrabacionRecorrido()

  const puedeGrabar = usuario != null && usuario.rol !== 'visualizador'

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
    listarRecorridos()
      .then(setRecorridos)
      .catch(() => {})
  }, [])

  const nombresComunas = useMemo(
    () =>
      (comunasGeoJSON?.features ?? [])
        .map((f: any) => f.properties.nombre as string)
        .sort(),
    [comunasGeoJSON],
  )

  const nombresProyectos = useMemo(
    () => [...new Set(obras.map((o) => o.proyectoEstrategico).filter((p): p is string => !!p))].sort(),
    [obras],
  )

  const obrasFiltradas = useMemo(() => {
    let resultado = obras.filter((o) => o.latitud !== null && o.longitud !== null)
    if (fechaDesde || fechaHasta) {
      resultado = resultado.filter((o) => {
        const ultima = ultimaVisitaPorObra.get(o.obraId)
        if (!ultima) return false
        if (fechaDesde && ultima < fechaDesde) return false
        if (fechaHasta && ultima > fechaHasta) return false
        return true
      })
    }
    if (entregaDesde || entregaHasta) {
      resultado = resultado.filter((o) => {
        if (!o.fechaEstimadaEntrega) return false
        if (entregaDesde && o.fechaEstimadaEntrega < entregaDesde) return false
        if (entregaHasta && o.fechaEstimadaEntrega > entregaHasta) return false
        return true
      })
    }
    if (comunaFiltro) resultado = resultado.filter((o) => o.comuna === comunaFiltro)
    if (proyectoFiltro) resultado = resultado.filter((o) => o.proyectoEstrategico === proyectoFiltro)
    return resultado
  }, [obras, fechaDesde, fechaHasta, entregaDesde, entregaHasta, comunaFiltro, proyectoFiltro, ultimaVisitaPorObra])

  const cantidadComunas = useMemo(
    () => new Set(obrasFiltradas.map((o) => o.comuna)).size,
    [obrasFiltradas],
  )

  const obrasProximasAEntregar = useMemo(
    () => obrasFiltradas.filter(estaProximaAEntregar),
    [obrasFiltradas],
  )

  const obrasGeoJSON = useMemo(
    () => obrasAGeoJSON(obrasFiltradas, ultimaVisitaPorObra),
    [obrasFiltradas, ultimaVisitaPorObra],
  )

  const recorridosGeoJSON = useMemo(() => recorridosALineas(recorridos), [recorridos])

  const trazoEnVivoGeoJSON = useMemo(() => puntosALinea(grabacion.puntos), [grabacion.puntos])

  const rutaPlaneadaGeoJSON = useMemo(() => puntosALinea(puntosPlaneados), [puntosPlaneados])

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

  // Al elegir una comuna o proyecto en el filtro, encuadrar el mapa en sus obras.
  useEffect(() => {
    if (!comunaFiltro && !proyectoFiltro) return
    const bounds = calcularBounds(obrasFiltradas)
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comunaFiltro, proyectoFiltro])

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

        <TextField
          size="small"
          type="date"
          label="Última visita desde"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        />
        <TextField
          size="small"
          type="date"
          label="Última visita hasta"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        />
        <TextField
          size="small"
          type="date"
          label="Entrega desde"
          value={entregaDesde}
          onChange={(e) => setEntregaDesde(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        />
        <TextField
          size="small"
          type="date"
          label="Entrega hasta"
          value={entregaHasta}
          onChange={(e) => setEntregaHasta(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        />

        {(fechaDesde || fechaHasta || entregaDesde || entregaHasta || comunaFiltro || proyectoFiltro) && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setFechaDesde('')
              setFechaHasta('')
              setEntregaDesde('')
              setEntregaHasta('')
              setComunaFiltro(null)
              setProyectoFiltro(null)
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

            <select
              value={proyectoFiltro ?? ''}
              onChange={(e) => setProyectoFiltro(e.target.value || null)}
              style={{
                padding: '6.5px 8px',
                borderRadius: 4,
                border: '1px solid #c4c4c4',
                fontSize: 14,
                fontFamily: 'inherit',
                width: '100%',
              }}
            >
              <option value="">Todos los proyectos</option>
              {nombresProyectos.map((nombre) => (
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

            {!busqueda && (comunaFiltro || proyectoFiltro) && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
                  <Typography variant="subtitle2">
                    {[comunaFiltro, proyectoFiltro].filter(Boolean).join(' · ')} · {obrasFiltradas.length} obras
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setComunaFiltro(null)
                      setProyectoFiltro(null)
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense disablePadding>
                  {obrasFiltradas.map((obra) => (
                    <ListItemButton key={obra.obraId} onClick={() => seleccionarObra(obra)}>
                      <ListItemText primary={obra.nombre} secondary={infoObra(obra, ultimaVisitaPorObra).etiqueta} />
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}

            {!busqueda && !comunaFiltro && !proyectoFiltro && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                Buscá una obra por nombre, o elegí una comuna o proyecto para ver sus obras.
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
            interactiveLayerIds={['obras-puntos', 'recorridos-lineas', 'recorridos-lineas-planeadas']}
            onMove={(evt) => setViewport(evt.viewState)}
            onClick={(evt: any) => {
              const feature = evt.features?.[0]
              if (feature) {
                if (feature.properties.recorridoId != null) {
                  const recorrido = recorridos.find((r) => r.id === feature.properties.recorridoId)
                  if (recorrido) setRecorridoSeleccionado(recorrido)
                  return
                }
                const obra = obrasFiltradas.find((o) => o.obraId === feature.properties.obraId)
                if (obra) seleccionarObra(obra)
                return
              }
              // Sin feature interactiva: en modo planeación, cada click en el
              // mapa suma un punto al trazo (ts no es significativo para un
              // punto clickeado, pero el tipo PuntoTrazo lo exige).
              if (modoPlaneacion) {
                setPuntosPlaneados((prev) => [...prev, { lat: evt.lngLat.lat, lon: evt.lngLat.lng, ts: Date.now() }])
              }
            }}
            onError={(e: any) => {
              if (e?.error?.message?.includes('supported')) return
            }}
          >
            <NavigationControl position="top-right" />
            <GeolocateControl position="top-right" trackUserLocation showUserHeading />

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

            {/* Grabados y planeados salen del mismo array, pero se separan en
                dos capas: 'line-dasharray' no admite expresiones data-driven
                en MapLibre, así que un solo ['case'] no alcanza para puntear
                solo los planeados. Dos capas filtradas por `tipo` lo resuelven. */}
            <Source id="recorridos" type="geojson" data={recorridosGeoJSON}>
              <Layer
                id="recorridos-lineas"
                source="recorridos"
                type="line"
                filter={['==', ['get', 'tipo'], 'grabado']}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{ 'line-color': COLOR_ACENTO, 'line-width': 4, 'line-opacity': 0.85 }}
              />
              <Layer
                id="recorridos-lineas-planeadas"
                source="recorridos"
                type="line"
                filter={['==', ['get', 'tipo'], 'planeado']}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': COLOR_RUTA_PLANEADA,
                  'line-width': 4,
                  'line-opacity': 0.9,
                  'line-dasharray': [2, 1.5],
                }}
              />
            </Source>

            {/* Preview en vivo del modo planeación: línea punteada índigo +
                marcadores numerados por cada punto clickeado. */}
            {modoPlaneacion && (
              <>
                <Source id="ruta-planeada-preview" type="geojson" data={rutaPlaneadaGeoJSON}>
                  <Layer
                    id="ruta-planeada-preview-linea"
                    source="ruta-planeada-preview"
                    type="line"
                    layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    paint={{
                      'line-color': COLOR_RUTA_PLANEADA,
                      'line-width': 4,
                      'line-opacity': 0.95,
                      'line-dasharray': [2, 1.5],
                    }}
                  />
                </Source>
                {puntosPlaneados.map((p, i) => (
                  <Marker key={`plan-${i}`} longitude={p.lon} latitude={p.lat}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: COLOR_RUTA_PLANEADA,
                        border: '2px solid #fff',
                        boxShadow: `0 0 0 3px ${COLOR_RUTA_PLANEADA}59`,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {i + 1}
                    </div>
                  </Marker>
                ))}
              </>
            )}

            {grabacion.estado === 'grabando' && (
              <>
                <Source id="trazo-en-vivo" type="geojson" data={trazoEnVivoGeoJSON}>
                  <Layer
                    id="trazo-en-vivo-linea"
                    source="trazo-en-vivo"
                    type="line"
                    layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    paint={{ 'line-color': '#ef4444', 'line-width': 5, 'line-opacity': 0.95 }}
                  />
                </Source>
                {grabacion.puntos.length > 0 && (
                  <Marker
                    longitude={grabacion.puntos[grabacion.puntos.length - 1].lon}
                    latitude={grabacion.puntos[grabacion.puntos.length - 1].lat}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: '3px solid #fff',
                        boxShadow: '0 0 0 4px rgba(239,68,68,0.35)',
                      }}
                    />
                  </Marker>
                )}
              </>
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
                  'circle-stroke-width': ['case', ['get', 'desatendida'], 2, 1],
                  'circle-stroke-color': ['case', ['get', 'desatendida'], COLOR_DESATENDIDA, '#fff'],
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
                    background: infoObra(obraSeleccionada, ultimaVisitaPorObra).color,
                    border: estaDesatendida(ultimaVisitaPorObra.get(obraSeleccionada.obraId))
                      ? `3px solid ${COLOR_DESATENDIDA}`
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
                        background: infoObra(obraSeleccionada, ultimaVisitaPorObra).color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {infoObra(obraSeleccionada, ultimaVisitaPorObra).etiqueta}
                    </Typography>
                  </Box>
                  {obraSeleccionada.dependencia && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {obraSeleccionada.dependencia}
                    </Typography>
                  )}
                  {obraSeleccionada.direccion && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {obraSeleccionada.direccion}
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
                    {usuario?.rol !== 'visualizador' && (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ fontSize: 11, py: 0.3 }}
                        onClick={() => navigate(`/seguimiento/registrar/${obraSeleccionada.obraId}`)}
                      >
                        Visitar
                      </Button>
                    )}
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

          {/* Mientras se planea una ruta, se oculta PanelRecorrido: la
              planeación solo arranca desde 'inactivo', así que su HUD puede
              reclamar el top:10/left:10 sin superponerse con "Grabar recorrido". */}
          {puedeGrabar && !modoPlaneacion && (
            <PanelRecorrido
              grabacion={grabacion}
              autorId={usuario!.id}
              onGuardado={(recorrido) => setRecorridos((prev) => [recorrido, ...prev])}
            />
          )}

          {/* La planeación solo se ofrece cuando no hay una grabación GPS en
              curso ni un guardado abierto (estado 'inactivo'). */}
          {puedeGrabar && (modoPlaneacion || grabacion.estado === 'inactivo') && (
            <PanelPlaneacionRuta
              activo={modoPlaneacion}
              puntos={puntosPlaneados}
              autorId={usuario!.id}
              onIniciar={() => {
                setPuntosPlaneados([])
                setModoPlaneacion(true)
              }}
              onDeshacer={() => setPuntosPlaneados((prev) => prev.slice(0, -1))}
              onCancelar={() => {
                setModoPlaneacion(false)
                setPuntosPlaneados([])
              }}
              onGuardado={(recorrido) => {
                setRecorridos((prev) => [recorrido, ...prev])
                setModoPlaneacion(false)
                setPuntosPlaneados([])
              }}
            />
          )}

          {/* Red de seguridad: si una grabación anterior quedó a medias (recarga
              o cierre de pestaña), se ofrece retomarla o descartarla. Solo con
              el mapa "en reposo" (sin grabar, sin planear). */}
          <Snackbar
            open={grabacion.hayBorrador && grabacion.estado === 'inactivo' && !modoPlaneacion}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert
              severity="info"
              variant="filled"
              sx={{ alignItems: 'center' }}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button color="inherit" size="small" onClick={grabacion.recuperarBorrador}>
                    Continuar
                  </Button>
                  <Button color="inherit" size="small" onClick={grabacion.descartarBorrador}>
                    Descartar
                  </Button>
                </Box>
              }
            >
              Se encontró un recorrido sin guardar.
            </Alert>
          </Snackbar>

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
                    border: item.border ? `2px solid ${COLOR_DESATENDIDA}` : 'none',
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

      {recorridoSeleccionado && (
        <DetalleRecorridoDialog
          recorrido={recorridoSeleccionado}
          onCerrar={() => setRecorridoSeleccionado(null)}
        />
      )}
    </Box>
  )
}
