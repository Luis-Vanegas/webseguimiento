import { useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { GeolocateControl, Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl'
import maplibregl from 'maplibre-gl'
import { Alert, Box, Button, Snackbar } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as obrasVisorApi from '../../api/obrasVisorApi'
import * as seguimientoApi from '../../features/seguimiento/seguimientoApi'
import { eliminarRecorrido, listarRecorridos } from '../../features/seguimiento/recorridosApi'
import { puedeBorrar } from '../../utils/seguimiento/permisos.util'
import { useGrabacionRecorrido } from '../../features/seguimiento/useGrabacionRecorrido'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { PanelRecorrido } from '../../components/seguimiento/PanelRecorrido'
import { PanelPlaneacionRuta } from '../../components/seguimiento/PanelPlaneacionRuta'
import { DetalleRecorridoDialog } from '../../components/seguimiento/DetalleRecorridoDialog'
import { BarraFiltrosMapa } from '../../components/seguimiento/mapa/BarraFiltrosMapa'
import { PanelLateralMapa } from '../../components/seguimiento/mapa/PanelLateralMapa'
import { LeyendaMapa } from '../../components/seguimiento/mapa/LeyendaMapa'
import { PopupObra } from '../../components/seguimiento/mapa/PopupObra'
import { COLOR_COMUNA, COLOR_DESATENDIDA, infoObra } from '../../components/seguimiento/mapa/mapaEstado.util'
import { obrasAGeoJSON } from '../../components/seguimiento/mapa/geojson.util.ts'
import { calcularBounds, puntosALinea, recorridosALineas } from '../../utils/seguimiento/geojson.util.ts'
import { COLOR_ACENTO, COLOR_PROXIMA_ENTREGA, COLOR_RUTA_PLANEADA } from '../../theme/theme'
import { estaDesatendida, estaProximaAEntregar } from '../../utils/seguimiento/fechas.util'
import { FILTROS_MAPA_VACIOS, filtrarObras, obrasDeLaAgenda, opcionesDeDimension } from '../../utils/seguimiento/filtrar-obras.util'
import type { FiltrosMapaObra } from '../../utils/seguimiento/filtrar-obras.util'
import type { ObraVisor } from '../../types/obra.types'
import type { PuntoTrazo, RecorridoSeguimiento } from '../../types/seguimiento.types'

;(maplibregl as any).supported = () => true

const ESTILOS_MAPA = {
  calles: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satelite: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const

export function MapaSeguimiento() {
  const navigate = useNavigate()
  const { usuario } = useUsuarioActual()
  const mapRef = useRef<any>(null)
  const [obras, setObras] = useState<ObraVisor[]>([])
  const [ultimaVisitaPorObra, setUltimaVisitaPorObra] = useState<Map<number, string>>(new Map())
  const [comunasGeoJSON, setComunasGeoJSON] = useState<any>(null)
  const [filtros, setFiltros] = useState<FiltrosMapaObra>(FILTROS_MAPA_VACIOS)
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

  // Las opciones de cada select se acotan por las OTRAS dimensiones activas
  // (ver filtrar-obras.util.ts) — elegir una comuna ya recalcula qué
  // proyectos y dependencias existen ahí, y viceversa.
  const nombresComunas = useMemo(
    () => opcionesDeDimension(obras, ultimaVisitaPorObra, filtros, 'comuna'),
    [obras, ultimaVisitaPorObra, filtros],
  )

  const nombresProyectos = useMemo(
    () => opcionesDeDimension(obras, ultimaVisitaPorObra, filtros, 'proyecto'),
    [obras, ultimaVisitaPorObra, filtros],
  )

  const nombresSubproyectos = useMemo(
    () => opcionesDeDimension(obras, ultimaVisitaPorObra, filtros, 'subproyecto'),
    [obras, ultimaVisitaPorObra, filtros],
  )

  const nombresDependencias = useMemo(
    () => opcionesDeDimension(obras, ultimaVisitaPorObra, filtros, 'dependencia'),
    [obras, ultimaVisitaPorObra, filtros],
  )

  const obrasFiltradas = useMemo(
    () => filtrarObras(obras, ultimaVisitaPorObra, filtros),
    [obras, ultimaVisitaPorObra, filtros],
  )

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

  function actualizarFiltro<K extends keyof FiltrosMapaObra>(campo: K, valor: FiltrosMapaObra[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }))
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_MAPA_VACIOS)
  }

  // Solo las dimensiones categóricas: el X del panel lateral cierra la
  // lista de obras sin tirar abajo los rangos de fecha elegidos.
  function limpiarFiltrosCategoricos() {
    setFiltros((f) => ({
      ...f,
      comunaFiltro: null,
      proyectoFiltro: null,
      subproyectoFiltro: null,
      dependenciaFiltro: null,
    }))
  }

  // Al elegir una comuna, proyecto, subproyecto o dependencia en el filtro,
  // encuadrar el mapa en sus obras.
  useEffect(() => {
    if (!filtros.comunaFiltro && !filtros.proyectoFiltro && !filtros.subproyectoFiltro && !filtros.dependenciaFiltro)
      return
    const bounds = calcularBounds(obrasFiltradas)
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.comunaFiltro, filtros.proyectoFiltro, filtros.subproyectoFiltro, filtros.dependenciaFiltro])

  const obrasAgendaPrioritaria = useMemo(() => obrasDeLaAgenda(obras), [obras])

  return (
    <Box sx={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      <BarraFiltrosMapa
        fechaDesde={filtros.fechaDesde}
        fechaHasta={filtros.fechaHasta}
        entregaDesde={filtros.entregaDesde}
        entregaHasta={filtros.entregaHasta}
        comunaFiltro={filtros.comunaFiltro}
        proyectoFiltro={filtros.proyectoFiltro}
        subproyectoFiltro={filtros.subproyectoFiltro}
        dependenciaFiltro={filtros.dependenciaFiltro}
        estiloMapa={estiloMapa}
        esVisualizador={usuario?.rol === 'visualizador'}
        onCambiarFechaDesde={(v) => actualizarFiltro('fechaDesde', v)}
        onCambiarFechaHasta={(v) => actualizarFiltro('fechaHasta', v)}
        onCambiarEntregaDesde={(v) => actualizarFiltro('entregaDesde', v)}
        onCambiarEntregaHasta={(v) => actualizarFiltro('entregaHasta', v)}
        onLimpiarFiltros={limpiarFiltros}
        onCambiarEstiloMapa={setEstiloMapa}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 0 }}>
        <PanelLateralMapa
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          comunaFiltro={filtros.comunaFiltro}
          onCambiarComunaFiltro={(v) => actualizarFiltro('comunaFiltro', v)}
          proyectoFiltro={filtros.proyectoFiltro}
          onCambiarProyectoFiltro={(v) => actualizarFiltro('proyectoFiltro', v)}
          subproyectoFiltro={filtros.subproyectoFiltro}
          onCambiarSubproyectoFiltro={(v) => actualizarFiltro('subproyectoFiltro', v)}
          dependenciaFiltro={filtros.dependenciaFiltro}
          onCambiarDependenciaFiltro={(v) => actualizarFiltro('dependenciaFiltro', v)}
          onLimpiarFiltrosCategoricos={limpiarFiltrosCategoricos}
          nombresComunas={nombresComunas}
          nombresProyectos={nombresProyectos}
          nombresSubproyectos={nombresSubproyectos}
          nombresDependencias={nombresDependencias}
          obrasDeLaAgenda={obrasAgendaPrioritaria}
          resultadosBusqueda={resultadosBusqueda}
          obrasFiltradas={obrasFiltradas}
          ultimaVisitaPorObra={ultimaVisitaPorObra}
          onSeleccionarObra={seleccionarObra}
        />

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
            // El 'supported' esperado viene del hack de arriba y se ignora; el
            // resto se loguea — sin esto, un fallo de maplibre en un celular
            // (WebGL, estilo que no carga) no deja ningun rastro.
            onError={(e: any) => {
              if (e?.error?.message?.includes('supported')) return
              console.error('[MapaSeguimiento]', e?.error ?? e)
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
                {filtros.comunaFiltro && (
                  <Layer
                    id="comunas-resaltado"
                    source="comunas"
                    type="fill"
                    filter={['==', ['get', 'nombre'], filtros.comunaFiltro]}
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
                <PopupObra
                  obra={obraSeleccionada}
                  ultimaVisitaPorObra={ultimaVisitaPorObra}
                  puedeVisitar={usuario?.rol !== 'visualizador'}
                  onVisitar={() => navigate(`/seguimiento/registrar/${obraSeleccionada.obraId}`)}
                  onVerHistorial={() => navigate(`/seguimiento/historial/${obraSeleccionada.obraId}`)}
                />
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

          <LeyendaMapa
            cantidadObras={obrasFiltradas.length}
            cantidadComunas={cantidadComunas}
            cantidadProximasAEntregar={obrasProximasAEntregar.length}
          />
        </Box>
      </Box>

      {recorridoSeleccionado && (
        <DetalleRecorridoDialog
          recorrido={recorridoSeleccionado}
          onCerrar={() => setRecorridoSeleccionado(null)}
          onBorrar={
            puedeBorrar(recorridoSeleccionado.autorId, usuario)
              ? async () => {
                  try {
                    await eliminarRecorrido(recorridoSeleccionado.id)
                    setRecorridos((prev) => prev.filter((r) => r.id !== recorridoSeleccionado.id))
                    setRecorridoSeleccionado(null)
                  } catch (err) {
                    window.alert(err instanceof Error ? err.message : 'No se pudo borrar el recorrido')
                  }
                }
              : undefined
          }
        />
      )}
    </Box>
  )
}
