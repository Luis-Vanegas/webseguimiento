import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import StopIcon from '@mui/icons-material/Stop'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import CloseIcon from '@mui/icons-material/Close'
import { crearRecorrido, subirFotoRecorrido } from '../../features/seguimiento/recorridosApi'
import { convertirBlobHeicAJpeg, esArchivoHeic } from '../../utils/seguimiento/heic.util'
import { COLOR_ACENTO } from '../../theme/theme'
import type { useGrabacionRecorrido } from '../../features/seguimiento/useGrabacionRecorrido'
import type { FotoRecorrido, RecorridoSeguimiento } from '../../types/seguimiento.types'

const ROJO_GRABACION = '#ef4444'

// Mismo helper que RegistrarVisita (allí es una función local no exportada):
// las fotos HEIC del iPhone se convierten a JPEG antes de encolarlas.
async function convertirSiEsHeic(archivo: File): Promise<File> {
  if (!esArchivoHeic(archivo)) return archivo
  const blob = await convertirBlobHeicAJpeg(archivo)
  return new File([blob], archivo.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
}

function formatearDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`
  return `${(metros / 1000).toFixed(1)} km`
}

function formatearDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

interface PanelRecorridoProps {
  // El hook vive en MapaSeguimiento (para que el mapa dibuje el trazo en vivo
  // desde los mismos `puntos`); este panel recibe sus valores y acciones.
  grabacion: ReturnType<typeof useGrabacionRecorrido>
  autorId: string
  onGuardado?: (recorrido: RecorridoSeguimiento) => void
}

export function PanelRecorrido({ grabacion, autorId, onGuardado }: PanelRecorridoProps) {
  const { estado, puntos, error, fechaInicio, fechaFin, distanciaMetros, iniciar, detener, descartar } =
    grabacion
  const esMovil = useMediaQuery(useTheme().breakpoints.down('sm'))

  // Cronómetro en vivo: tick cada segundo mientras se graba.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (estado !== 'grabando') return
    setAhora(Date.now())
    const id = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [estado])

  // Detenido: usar fechaFin exacta en vez del último tick del cronómetro
  // (que puede quedar hasta 1s desactualizado respecto al momento real de detener).
  const referenciaFin = estado === 'detenido' && fechaFin ? new Date(fechaFin).getTime() : ahora
  const segundos = fechaInicio ? Math.max(0, Math.floor((referenciaFin - new Date(fechaInicio).getTime()) / 1000)) : 0

  // Estado del formulario de guardado (estado 'detenido').
  const [titulo, setTitulo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [convirtiendoFotos, setConvirtiendoFotos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  async function agregarFotos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return
    setConvirtiendoFotos(true)
    try {
      const resultados = await Promise.allSettled(Array.from(archivos).map(convertirSiEsHeic))
      const convertidas = resultados
        .filter((r): r is PromiseFulfilledResult<File> => r.status === 'fulfilled')
        .map((r) => r.value)
      if (convertidas.length > 0) setFotos((prev) => [...prev, ...convertidas])
      const fallidas = resultados.filter((r) => r.status === 'rejected').length
      if (fallidas > 0) {
        setErrorGuardar(`No se pudo procesar ${fallidas} foto${fallidas > 1 ? 's' : ''}. Probá con otro formato.`)
      }
    } finally {
      setConvirtiendoFotos(false)
    }
  }

  function limpiarFormulario() {
    setTitulo('')
    setObservaciones('')
    setFotos([])
    setErrorGuardar(null)
  }

  function alDescartar() {
    limpiarFormulario()
    descartar()
  }

  async function guardar() {
    if (!titulo.trim() || !fechaInicio || !fechaFin) return
    setEnviando(true)
    setErrorGuardar(null)
    try {
      const recorrido = await crearRecorrido({
        autorId,
        titulo: titulo.trim(),
        observaciones,
        trazo: puntos,
        distanciaMetros,
        fechaInicio,
        fechaFin,
      })
      // Mismo orden que crearVisita: crear el recorrido, luego subir las fotos
      // secuencialmente (necesitan el id ya creado).
      const fotosSubidas: FotoRecorrido[] = []
      for (let i = 0; i < fotos.length; i++) {
        fotosSubidas.push(await subirFotoRecorrido(recorrido.id, fotos[i], i))
      }
      onGuardado?.({ ...recorrido, fotos: fotosSubidas })
      limpiarFormulario()
      descartar()
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : 'No se pudo guardar el recorrido.')
    } finally {
      setEnviando(false)
    }
  }

  // --- Estado inactivo: botón de arranque flotante sobre el mapa ---
  if (estado === 'inactivo') {
    return (
      <Button
        variant="contained"
        startIcon={<FiberManualRecordIcon sx={{ color: ROJO_GRABACION }} />}
        onClick={iniciar}
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 2,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 2px 12px rgba(0,0,0,0.16)',
          '&:hover': { bgcolor: 'background.paper', boxShadow: '0 4px 16px rgba(0,0,0,0.22)' },
        }}
      >
        Grabar recorrido
      </Button>
    )
  }

  // --- Estado grabando: HUD en vivo con presencia (punto latiendo, cronómetro) ---
  if (estado === 'grabando') {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 2,
          minWidth: 232,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: `1px solid ${ROJO_GRABACION}`,
          boxShadow: `0 4px 20px ${ROJO_GRABACION}44`,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            bgcolor: `${ROJO_GRABACION}14`,
            borderBottom: `1px solid ${ROJO_GRABACION}33`,
          }}
        >
          <Box
            sx={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              bgcolor: ROJO_GRABACION,
              flexShrink: 0,
              '@keyframes latidoGrabacion': {
                '0%': { boxShadow: `0 0 0 0 ${ROJO_GRABACION}88` },
                '70%': { boxShadow: `0 0 0 9px ${ROJO_GRABACION}00` },
                '100%': { boxShadow: `0 0 0 0 ${ROJO_GRABACION}00` },
              },
              animation: 'latidoGrabacion 1.4s infinite',
            }}
          />
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: 0.6, color: ROJO_GRABACION, textTransform: 'uppercase' }}
          >
            Grabando
          </Typography>
        </Box>

        <Box sx={{ px: 1.5, py: 1.25 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Tiempo
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {formatearDuracion(segundos)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Distancia
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>
                {formatearDistancia(distanciaMetros)}
              </Typography>
            </Box>
          </Box>

          {error && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: ROJO_GRABACION }}>
              {error}
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            startIcon={<StopIcon />}
            onClick={detener}
            sx={{
              mt: 1.25,
              bgcolor: ROJO_GRABACION,
              '&:hover': { bgcolor: '#dc2626' },
            }}
          >
            Detener
          </Button>
        </Box>
      </Box>
    )
  }

  // --- Estado detenido: formulario de guardado en un Dialog ---
  const puedeGuardar = titulo.trim().length > 0 && !enviando && !convirtiendoFotos

  return (
    <Dialog open onClose={alDescartar} fullWidth maxWidth="sm" fullScreen={esMovil}>
      <DialogTitle sx={{ pb: 0.5 }}>
        Guardar recorrido
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <ResumenDato etiqueta="Distancia" valor={formatearDistancia(distanciaMetros)} />
          <ResumenDato etiqueta="Duración" valor={formatearDuracion(segundos)} />
          <ResumenDato etiqueta="Puntos" valor={String(puntos.length)} />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#f7f9fc' }}>
        <TextField
          label="Título"
          fullWidth
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          sx={{ mt: 1.5, mb: 2, bgcolor: 'background.paper' }}
        />
        <TextField
          label="Observaciones"
          multiline
          minRows={3}
          fullWidth
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          sx={{ mb: 2, bgcolor: 'background.paper' }}
        />

        <Button
          component="label"
          variant="outlined"
          fullWidth
          startIcon={<PhotoCameraIcon />}
          disabled={convirtiendoFotos}
        >
          {convirtiendoFotos ? 'Procesando fotos…' : 'Tomar o adjuntar fotos'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              agregarFotos(e.target.files)
              e.target.value = ''
            }}
          />
        </Button>
        {fotos.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {fotos.map((f, i) => (
              <Chip
                key={`${f.name}-${i}`}
                label={f.name}
                onDelete={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                deleteIcon={<CloseIcon fontSize="small" />}
              />
            ))}
          </Box>
        )}

        {errorGuardar && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorGuardar}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={alDescartar} disabled={enviando}>
          Descartar
        </Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={!puedeGuardar}
          sx={{ bgcolor: COLOR_ACENTO, '&:hover': { bgcolor: '#1f9fce' } }}
        >
          {enviando ? 'Guardando…' : 'Guardar recorrido'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ResumenDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {etiqueta}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{valor}</Typography>
    </Box>
  )
}
