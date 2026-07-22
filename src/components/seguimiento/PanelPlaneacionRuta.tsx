import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import RouteIcon from '@mui/icons-material/Route'
import UndoIcon from '@mui/icons-material/Undo'
import CheckIcon from '@mui/icons-material/Check'
import { crearRecorrido } from '../../features/seguimiento/recorridosApi'
import { calcularDistanciaTotal } from '../../utils/seguimiento/geo.util'
import { useEsMovil } from '../../hooks/useEsMovil'
import { COLOR_FONDO_DIALOGO, COLOR_RUTA_PLANEADA } from '../../theme/theme'
import type { PuntoTrazo, RecorridoSeguimiento } from '../../types/seguimiento.types'

function formatearDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`
  return `${(metros / 1000).toFixed(1)} km`
}

interface PanelPlaneacionRutaProps {
  // El estado (modo activo + puntos clickeados) vive en MapaSeguimiento para
  // que el mapa dibuje la línea de previsualización y los marcadores numerados
  // desde los mismos puntos — mismo patrón de prop-lifting que PanelRecorrido.
  activo: boolean
  puntos: PuntoTrazo[]
  autorId: string
  onIniciar: () => void
  onDeshacer: () => void
  onCancelar: () => void
  onGuardado: (recorrido: RecorridoSeguimiento) => void
}

export function PanelPlaneacionRuta({
  activo,
  puntos,
  autorId,
  onIniciar,
  onDeshacer,
  onCancelar,
  onGuardado,
}: PanelPlaneacionRutaProps) {
  const esMovil = useEsMovil()

  // Formulario de guardado (paso "terminar ruta").
  const [mostrandoDialogo, setMostrandoDialogo] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const distanciaMetros = calcularDistanciaTotal(puntos)
  const puedeTerminar = puntos.length >= 2

  function limpiarFormulario() {
    setMostrandoDialogo(false)
    setTitulo('')
    setObservaciones('')
    setError(null)
  }

  async function guardar() {
    if (!titulo.trim() || puntos.length < 2) return
    setEnviando(true)
    setError(null)
    try {
      // Sin tiempo caminado real: fechaInicio y fechaFin son ambas el momento
      // de guardar. Es intencional para 'planeado' — así lo documenta el
      // comentario de la tabla en la base.
      const ahora = new Date().toISOString()
      const recorrido = await crearRecorrido({
        autorId,
        titulo: titulo.trim(),
        observaciones,
        trazo: puntos,
        distanciaMetros,
        fechaInicio: ahora,
        fechaFin: ahora,
        tipo: 'planeado',
      })
      onGuardado(recorrido)
      limpiarFormulario()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ruta.')
    } finally {
      setEnviando(false)
    }
  }

  // --- Inactivo: botón de arranque, apilado debajo de "Grabar recorrido" ---
  if (!activo) {
    return (
      <Button
        variant="contained"
        startIcon={<RouteIcon sx={{ color: COLOR_RUTA_PLANEADA }} />}
        onClick={onIniciar}
        sx={{
          position: 'absolute',
          top: 56,
          left: 10,
          zIndex: 2,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 2px 12px rgba(0,0,0,0.16)',
          '&:hover': { bgcolor: 'background.paper', boxShadow: '0 4px 16px rgba(0,0,0,0.22)' },
        }}
      >
        Planear ruta
      </Button>
    )
  }

  // --- Activo: HUD de planeación (índigo) sobre el mapa ---
  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 2,
          minWidth: 232,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: `1px solid ${COLOR_RUTA_PLANEADA}`,
          boxShadow: `0 4px 20px ${COLOR_RUTA_PLANEADA}44`,
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
            bgcolor: `${COLOR_RUTA_PLANEADA}14`,
            borderBottom: `1px solid ${COLOR_RUTA_PLANEADA}33`,
          }}
        >
          <RouteIcon sx={{ fontSize: 18, color: COLOR_RUTA_PLANEADA }} />
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: 0.6, color: COLOR_RUTA_PLANEADA, textTransform: 'uppercase' }}
          >
            Planeando ruta
          </Typography>
        </Box>

        <Box sx={{ px: 1.5, py: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Tocá el mapa para agregar puntos.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Puntos
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>{puntos.length}</Typography>
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

          <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<UndoIcon />}
              onClick={onDeshacer}
              disabled={puntos.length === 0}
              sx={{
                flex: 1,
                color: COLOR_RUTA_PLANEADA,
                borderColor: COLOR_RUTA_PLANEADA,
                '&:hover': { borderColor: COLOR_RUTA_PLANEADA, bgcolor: `${COLOR_RUTA_PLANEADA}0f` },
              }}
            >
              Deshacer
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckIcon />}
              onClick={() => setMostrandoDialogo(true)}
              disabled={!puedeTerminar}
              sx={{ flex: 1, bgcolor: COLOR_RUTA_PLANEADA, '&:hover': { bgcolor: '#4f46e5' } }}
            >
              Terminar
            </Button>
          </Box>

          <Button fullWidth size="small" color="inherit" onClick={onCancelar} sx={{ mt: 0.75 }}>
            Cancelar
          </Button>
        </Box>
      </Box>

      {/* Paso "terminar ruta": formulario corto, sin fotos ni cronómetro. */}
      <Dialog open={mostrandoDialogo} onClose={() => setMostrandoDialogo(false)} fullWidth maxWidth="sm" fullScreen={esMovil}>
        <DialogTitle sx={{ pb: 0.5 }}>
          Guardar ruta planeada
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <ResumenDato etiqueta="Distancia" valor={formatearDistancia(distanciaMetros)} />
            <ResumenDato etiqueta="Puntos" valor={String(puntos.length)} />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ bgcolor: COLOR_FONDO_DIALOGO }}>
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
            sx={{ bgcolor: 'background.paper' }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setMostrandoDialogo(false)} disabled={enviando}>
            Volver
          </Button>
          <Button
            variant="contained"
            onClick={guardar}
            disabled={!titulo.trim() || enviando}
            sx={{ bgcolor: COLOR_RUTA_PLANEADA, '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {enviando ? 'Guardando…' : 'Guardar ruta'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
