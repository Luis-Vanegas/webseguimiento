import { useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl'
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
const COLOR_COMUNA = '#f97316'

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
  { color: COLOR_COMUNA, label: 'Cantidad de obras por comuna' },
  { color: '#3b82f6', label: 'Obra seleccionada — entregada' },
  { color: '#22c55e', label: 'Obra seleccionada — avance ≥ 70%' },
  { color: '#eab308', label: 'Obra seleccionada — avance 35–70%' },
  { color: '#ef4444', label: 'Obra seleccionada — avance < 35%' },
  { color: '#fff', label: 'Desatendida (>30 días)', border: true },
]

// Centro geográfico de cada comuna: promedio de las coordenadas de sus obras
// (no hay polígonos de comuna disponibles, solo el nombre en el dato oficial
// "COMUNA O CORREGIMIENTO"). Suficiente para ubicar el círculo de conteo.
function agruparPorComuna(obras: ObraVisor[]) {
  const grupos = new Map<string, ObraVisor[]>()
  for (const obra of obras) {
    const clave = obra.comuna ?? 'Sin comuna registrada'
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push(obra)
  }
  return [...grupos.entries()].map(([comuna, obrasComuna]) => ({
    comuna,
    obras: obrasComuna,
    latitud: obrasComuna.reduce((s, o) => s + (o.latitud ?? 0), 0) / obrasComuna.length,
    longitud: obrasComuna.reduce((s, o) => s + (o.longitud ?? 0), 0) / obrasComuna.length,
  }))
}

export function MapaSeguimiento() {
  const navigate = useNavigate()
  const mapRef = useRef<any>(null)
  const [obras, setObras] = useState<ObraVisor[]>([])
  const [ultimaVisitaPorObra, setUltimaVisitaPorObra] = useState<Map<number, string>>(new Map())
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraVisor | null>(null)
  const [estiloMapa, setEstiloMapa] = useState<'calles' | 'satelite'>('calles')
  const [viewport, setViewport] = useState({ longitude: -75.58, latitude: 6.24, zoom: 10 })
  const [busqueda, setBusqueda] = useState('')
  const [comunaActiva, setComunaActiva] = useState<string | null>(null)

  useEffect(() => {
    obrasVisorApi
      .obtenerObras()
      .then(setObras)
      .catch(() => {})
    seguimientoApi
      .obtenerUltimaVisitaPorObra()
      .then(setUltimaVisitaPorObra)
      .catch(() => {})
  }, [])

  const obrasFiltradas = useMemo(() => {
    const conCoordenadas = obras.filter((o) => o.latitud !== null && o.longitud !== null)
    if (!fechaFiltro) return conCoordenadas
    return conCoordenadas.filter((o) => ultimaVisitaPorObra.get(o.obraId) === fechaFiltro)
  }, [obras, fechaFiltro, ultimaVisitaPorObra])

  const comunas = useMemo(() => agruparPorComuna(obrasFiltradas), [obrasFiltradas])

  const resultadosBusqueda = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return []
    return obrasFiltradas.filter((o) => o.nombre.toLowerCase().includes(texto)).slice(0, 30)
  }, [busqueda, obrasFiltradas])

  const obrasComunaActiva = useMemo(
    () => comunas.find((c) => c.comuna === comunaActiva)?.obras ?? [],
    [comunas, comunaActiva],
  )

  function seleccionarObra(obra: ObraVisor) {
    if (obra.latitud === null || obra.longitud === null) return
    setObraSeleccionada(obra)
    setViewport((v) => ({ ...v, longitude: obra.longitud!, latitude: obra.latitud!, zoom: Math.max(v.zoom, 14) }))
  }

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
          <Box sx={{ p: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar obra por nombre…"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setComunaActiva(null)
              }}
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

            {!busqueda && comunaActiva && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
                  <Typography variant="subtitle2">
                    {comunaActiva} · {obrasComunaActiva.length} obras
                  </Typography>
                  <IconButton size="small" onClick={() => setComunaActiva(null)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense disablePadding>
                  {obrasComunaActiva.map((obra) => (
                    <ListItemButton key={obra.obraId} onClick={() => seleccionarObra(obra)}>
                      <ListItemText primary={obra.nombre} secondary={infoObra(obra).etiqueta} />
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}

            {!busqueda && !comunaActiva && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                Buscá una obra por nombre o hacé clic en el número de una comuna en el mapa.
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
            onMove={(evt) => setViewport(evt.viewState)}
            onError={(e: any) => {
              if (e?.error?.message?.includes('supported')) return
            }}
          >
            <NavigationControl position="top-right" />

            {comunas.map((grupo) => (
              <Marker key={grupo.comuna} longitude={grupo.longitud} latitude={grupo.latitud}>
                <div
                  onClick={() => {
                    setComunaActiva(grupo.comuna)
                    setBusqueda('')
                  }}
                  title={grupo.comuna}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: COLOR_COMUNA,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: comunaActiva === grupo.comuna ? '0 0 0 3px rgba(37,99,235,0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.8)',
                  }}
                >
                  {grupo.obras.length}
                </div>
              </Marker>
            ))}

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
              {obrasFiltradas.length} obras · {comunas.length} comunas
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
