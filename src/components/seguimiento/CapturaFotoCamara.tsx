import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  Typography,
} from '@mui/material'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import CloseIcon from '@mui/icons-material/Close'
import { convertirBlobHeicAJpeg, esArchivoHeic } from '../../utils/seguimiento/heic.util'
import { comprimirImagen } from '../../utils/seguimiento/comprimirImagen.util'
import { useEsMovil } from '../../hooks/useEsMovil'
import { COLOR_ACENTO, COLOR_ACENTO_HOVER, COLOR_TEXTO_SOBRE_ACENTO } from '../../theme/theme'

// Las fotos HEIC del iPhone (solo posibles al elegir de la galería; la captura
// por cámara siempre produce JPEG desde canvas) se convierten a JPEG antes de
// encolarlas. Antes vivía duplicado en RegistrarVisita y PanelRecorrido.
async function convertirSiEsHeic(archivo: File): Promise<File> {
  if (!esArchivoHeic(archivo)) return archivo
  const blob = await convertirBlobHeicAJpeg(archivo)
  return new File([blob], archivo.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
}

interface CapturaFotoCamaraProps {
  fotos: File[]
  onAgregar: (archivos: File[]) => void
  onQuitar: (indice: number) => void
  // El padre deshabilita su botón de guardar mientras se convierten HEIC de
  // galería (tardan segundos), para no enviar la visita sin esas fotos.
  onProcesandoChange?: (procesando: boolean) => void
}

export function CapturaFotoCamara({ fotos, onAgregar, onQuitar, onProcesandoChange }: CapturaFotoCamaraProps) {
  const esMovil = useEsMovil()

  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorProceso, setErrorProceso] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Miniaturas de las fotos ya encoladas (para la tira dentro de la cámara).
  // Se revocan los object URLs previos en cada cambio y al desmontar, para no
  // filtrar memoria.
  const previews = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos])
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  useEffect(() => {
    onProcesandoChange?.(procesando)
  }, [procesando, onProcesandoChange])

  // Abre la cámara en la propia página (getUserMedia) en vez de delegar a la
  // app de cámara del SO — eso mandaría el navegador a segundo plano y el SO
  // podría matar la pestaña, perdiendo la foto y el estado de grabación.
  useEffect(() => {
    if (!camaraAbierta) return
    let cancelado = false
    let streamLocal: MediaStream | null = null

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara('Este dispositivo no permite abrir la cámara desde el navegador. Elegí una foto de la galería.')
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // Si se cerró la vista mientras se pedía permiso, soltar el hardware ya.
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamLocal = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch((err) => {
        if (cancelado) return
        const esPermiso = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
        setErrorCamara(
          esPermiso
            ? 'No se pudo acceder a la cámara: falta el permiso. Habilitalo o elegí una foto de la galería.'
            : 'No hay una cámara disponible. Elegí una foto de la galería.',
        )
      })

    // Cleanup: se ejecuta al cerrar la vista (capturar+Listo, cancelar) y al
    // desmontar. Detener SIEMPRE cada track: un stream abierto drena batería y
    // retiene el candado del hardware.
    return () => {
      cancelado = true
      streamLocal?.getTracks().forEach((t) => t.stop())
    }
  }, [camaraAbierta])

  function abrirCamara() {
    setErrorCamara(null)
    setCamaraAbierta(true)
  }

  function cerrarCamara() {
    setCamaraAbierta(false)
    setErrorCamara(null)
  }

  function capturar() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      async (blob) => {
        if (!blob) return
        const archivo = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })
        // La captura ya sale a resolución de la cámara (puede ser varios MB);
        // se comprime con el mismo criterio que las de galería antes de encolarla.
        onAgregar([await comprimirImagen(archivo)])
      },
      'image/jpeg',
      0.92,
    )
  }

  async function seleccionarDeGaleria(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return
    setProcesando(true)
    setErrorProceso(null)
    try {
      // allSettled: si una foto falla al convertir (ej. un .heic corrupto),
      // las demás del mismo lote no se pierden. Las de galería suelen ser la
      // foto original de la cámara del celular (varios MB) — se comprimen
      // igual que las capturadas en página.
      const resultados = await Promise.allSettled(
        Array.from(archivos).map(async (a) => comprimirImagen(await convertirSiEsHeic(a))),
      )
      const convertidas = resultados
        .filter((r): r is PromiseFulfilledResult<File> => r.status === 'fulfilled')
        .map((r) => r.value)
      if (convertidas.length > 0) onAgregar(convertidas)
      const fallidas = resultados.filter((r) => r.status === 'rejected').length
      if (fallidas > 0) {
        setErrorProceso(`No se pudo procesar ${fallidas} foto${fallidas > 1 ? 's' : ''}. Probá con otro formato.`)
      }
    } finally {
      setProcesando(false)
    }
  }

  const botonGaleria = (variante: 'outlined' | 'contained') => (
    <Button
      component="label"
      variant={variante}
      startIcon={<PhotoLibraryIcon />}
      disabled={procesando}
      sx={{ flex: 1 }}
    >
      {procesando ? 'Procesando…' : 'Elegir de galería'}
      <input
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          seleccionarDeGaleria(e.target.files)
          e.target.value = ''
        }}
      />
    </Button>
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Button
          variant="contained"
          startIcon={<PhotoCameraIcon />}
          onClick={abrirCamara}
          sx={{ flex: 1, minWidth: 140, bgcolor: COLOR_ACENTO, color: COLOR_TEXTO_SOBRE_ACENTO, '&:hover': { bgcolor: COLOR_ACENTO_HOVER } }}
        >
          Tomar foto
        </Button>
        {botonGaleria('outlined')}
      </Box>

      {errorProceso && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setErrorProceso(null)}>
          {errorProceso}
        </Alert>
      )}

      {fotos.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {fotos.map((f, i) => (
            <Chip
              key={`${f.name}-${i}`}
              label={f.name}
              onDelete={() => onQuitar(i)}
              deleteIcon={<CloseIcon fontSize="small" />}
            />
          ))}
        </Box>
      )}

      {/* Vista de cámara en la propia página: preview en vivo + captura */}
      <Dialog
        open={camaraAbierta}
        onClose={cerrarCamara}
        fullScreen={esMovil}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#000', m: esMovil ? 0 : 2 } }}
      >
        <Box sx={{ position: 'relative', width: '100%', height: esMovil ? '100dvh' : '70vh', overflow: 'hidden' }}>
          {errorCamara ? (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                p: 3,
                textAlign: 'center',
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.5)' }} />
              <Typography sx={{ color: '#fff', maxWidth: 320 }}>{errorCamara}</Typography>
              <Box sx={{ display: 'flex', gap: 1, width: '100%', maxWidth: 320 }}>
                {botonGaleria('contained')}
              </Box>
              <Button onClick={cerrarCamara} sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Cerrar
              </Button>
            </Box>
          ) : (
            <>
              <Box
                component="video"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Cerrar (arriba-izquierda), sobre scrim para contraste al sol */}
              <IconButton
                aria-label="Cerrar cámara"
                onClick={cerrarCamara}
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  color: '#fff',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <CloseIcon />
              </IconButton>

              {/* Barra inferior: miniaturas + captura + Listo */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  px: 2,
                  pt: 1.5,
                  pb: 2,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))',
                }}
              >
                {fotos.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5 }}>
                    {previews.map((url, i) => (
                      <Box
                        key={`${url}-${i}`}
                        component="img"
                        src={url}
                        alt={`Foto ${i + 1}`}
                        sx={{
                          width: 48,
                          height: 48,
                          flexShrink: 0,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '2px solid rgba(255,255,255,0.7)',
                        }}
                      />
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#fff', minWidth: 64, fontWeight: 600 }}>
                    {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
                  </Typography>

                  {/* Botón de captura dominante: círculo grande de alto contraste,
                      alcanzable con el pulgar, usable con guantes o manos mojadas */}
                  <IconButton
                    aria-label="Capturar foto"
                    onClick={capturar}
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: '#fff',
                      border: '4px solid rgba(255,255,255,0.5)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                      '&:hover': { bgcolor: '#f0f0f0' },
                      '&:active': { transform: 'scale(0.94)' },
                      transition: 'transform 0.08s ease',
                    }}
                  >
                    <PhotoCameraIcon sx={{ color: '#0A1E3D', fontSize: 32 }} />
                  </IconButton>

                  <Button
                    onClick={cerrarCamara}
                    variant="contained"
                    sx={{
                      minWidth: 64,
                      bgcolor: COLOR_ACENTO,
                      color: COLOR_TEXTO_SOBRE_ACENTO,
                      '&:hover': { bgcolor: COLOR_ACENTO_HOVER },
                    }}
                  >
                    Listo
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Dialog>
    </Box>
  )
}
