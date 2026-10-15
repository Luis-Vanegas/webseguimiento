import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import {
  actualizarActa,
  actualizarCompromiso,
  crearCompromiso,
  eliminarActa,
  eliminarCompromiso,
  listarCompromisos,
  obtenerActa,
} from '../../features/actas/actasApi'
import type {
  Acta,
  ActaNueva,
  Compromiso,
  CompromisoNuevo,
  EstadoCompromiso,
} from '../../types/actas.types'
import { EncabezadoActa } from '../../components/actas/detalle/EncabezadoActa'
import { DialogoEditarActa } from '../../components/actas/detalle/DialogoEditarActa'
import { DialogoEliminarActa } from '../../components/actas/detalle/DialogoEliminarActa'
import { DialogoCompromiso } from '../../components/actas/detalle/DialogoCompromiso'
import { DialogoEliminarCompromiso } from '../../components/actas/detalle/DialogoEliminarCompromiso'
import { TablaCompromisos } from '../../components/actas/detalle/TablaCompromisos'

export function DetalleActa() {
  const { actaId } = useParams<{ actaId: string }>()
  const navigate = useNavigate()

  const [acta, setActa] = useState<Acta | null>(null)
  const [compromisos, setCompromisos] = useState<Compromiso[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [noEncontrada, setNoEncontrada] = useState(false)

  // Feedback temporal
  const [notificacion, setNotificacion] = useState<{
    severidad: 'success' | 'error'
    mensaje: string
  } | null>(null)

  // Diálogos
  const [dialogoEditarActa, setDialogoEditarActa] = useState(false)
  const [dialogoEliminarActa, setDialogoEliminarActa] = useState(false)
  const [dialogoCompromiso, setDialogoCompromiso] = useState(false)
  const [compromisoAEditar, setCompromisoAEditar] = useState<Compromiso | null>(null)
  const [dialogoEliminarCompromiso, setDialogoEliminarCompromiso] = useState(false)
  const [compromisoAEliminar, setCompromisoAEliminar] = useState<Compromiso | null>(null)

  const cargarDatos = useCallback(async () => {
    if (!actaId) {
      setNoEncontrada(true)
      setCargando(false)
      return
    }

    setCargando(true)
    setErrorCarga(null)
    setNoEncontrada(false)

    try {
      const [actaObtenida, listaCompromisos] = await Promise.all([
        obtenerActa(actaId),
        listarCompromisos(actaId),
      ])
      setActa(actaObtenida)
      setCompromisos(listaCompromisos)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.includes('JSON object requested') ||
        msg.includes('0 rows') ||
        msg.toLowerCase().includes('not found')
      ) {
        setNoEncontrada(true)
      } else {
        setErrorCarga(`Error al cargar el detalle del acta: ${msg}`)
      }
    } finally {
      setCargando(false)
    }
  }, [actaId])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Guardar cambios en el Acta
  const manejarGuardarActa = async (cambios: Partial<ActaNueva>) => {
    if (!acta) return
    const actaActualizada = await actualizarActa(acta.id, cambios)
    setActa(actaActualizada)
    setNotificacion({
      severidad: 'success',
      mensaje: 'Acta actualizada correctamente.',
    })
  }

  // Eliminar el Acta y navegar a /actas
  const manejarEliminarActa = async () => {
    if (!acta) return
    await eliminarActa(acta.id)
    navigate('/actas', { replace: true })
  }

  // Crear o editar compromiso
  const manejarGuardarCompromiso = async (
    datos: CompromisoNuevo | Partial<CompromisoNuevo>,
  ) => {
    if (compromisoAEditar) {
      const compromisoActualizado = await actualizarCompromiso(
        compromisoAEditar.id,
        datos,
      )
      setCompromisos((prev) =>
        prev.map((c) => (c.id === compromisoActualizado.id ? compromisoActualizado : c)),
      )
      setNotificacion({
        severidad: 'success',
        mensaje: 'Compromiso actualizado con éxito.',
      })
    } else {
      const nuevo = await crearCompromiso(datos as CompromisoNuevo)
      setCompromisos((prev) => [...prev, nuevo])
      setNotificacion({
        severidad: 'success',
        mensaje: 'Compromiso creado con éxito.',
      })
    }
  }

  // Eliminar compromiso individual
  const manejarConfirmarEliminarCompromiso = async (id: string) => {
    await eliminarCompromiso(id)
    setCompromisos((prev) => prev.filter((c) => c.id !== id))
    setNotificacion({
      severidad: 'success',
      mensaje: 'Compromiso eliminado correctamente.',
    })
  }

  // Cambio rápido de estado directo desde la fila o tarjeta
  const manejarCambioEstadoRapido = async (
    c: Compromiso,
    nuevoEstado: EstadoCompromiso,
  ) => {
    const estadoPrevio = c.estado
    // Actualización optimista en la UI
    setCompromisos((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, estado: nuevoEstado } : item)),
    )

    try {
      const actualizado = await actualizarCompromiso(c.id, { estado: nuevoEstado })
      setCompromisos((prev) =>
        prev.map((item) => (item.id === c.id ? actualizado : item)),
      )
      setNotificacion({
        severidad: 'success',
        mensaje: `Estado actualizado a "${nuevoEstado}".`,
      })
    } catch (err: unknown) {
      // Revertir en caso de falla
      setCompromisos((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, estado: estadoPrevio } : item)),
      )
      const msg = err instanceof Error ? err.message : String(err)
      setNotificacion({
        severidad: 'error',
        mensaje: `No se pudo cambiar el estado: ${msg}`,
      })
    }
  }

  // Estado: Cargando
  if (cargando) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Cargando información del acta...
          </Typography>
        </Box>
      </Container>
    )
  }

  // Estado: Acta no encontrada
  if (noEncontrada || !acta) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 6 } }}>
        <Button
          component={Link}
          to="/actas"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3, textTransform: 'none', fontWeight: 600 }}
        >
          Volver al tablero
        </Button>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 5 },
            textAlign: 'center',
            borderRadius: 2.5,
            bgcolor: 'background.paper',
          }}
        >
          <ErrorOutlineIcon color="error" sx={{ fontSize: 56, mb: 1.5 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Acta no encontrada
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 3 }}>
            El acta que intentas consultar no existe o ha sido eliminada previamente.
          </Typography>
          <Button
            component={Link}
            to="/actas"
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Ir al tablero de actas
          </Button>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Alerta de error global de carga si existiera */}
      {errorCarga && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorCarga(null)}>
          {errorCarga}
        </Alert>
      )}

      {/* Encabezado del Acta */}
      <EncabezadoActa
        acta={acta}
        onEditar={() => setDialogoEditarActa(true)}
        onEliminar={() => setDialogoEliminarActa(true)}
      />

      {/* Tabla y lista de compromisos */}
      <TablaCompromisos
        compromisos={compromisos}
        onNuevoCompromiso={() => {
          setCompromisoAEditar(null)
          setDialogoCompromiso(true)
        }}
        onEditarCompromiso={(c) => {
          setCompromisoAEditar(c)
          setDialogoCompromiso(true)
        }}
        onEliminarCompromiso={(c) => {
          setCompromisoAEliminar(c)
          setDialogoEliminarCompromiso(true)
        }}
        onCambiarEstado={manejarCambioEstadoRapido}
      />

      {/* Diálogo Editar Acta */}
      <DialogoEditarActa
        open={dialogoEditarActa}
        acta={acta}
        onCerrar={() => setDialogoEditarActa(false)}
        onGuardar={manejarGuardarActa}
      />

      {/* Diálogo Eliminar Acta */}
      <DialogoEliminarActa
        open={dialogoEliminarActa}
        origen={acta.origen}
        onCerrar={() => setDialogoEliminarActa(false)}
        onConfirmar={manejarEliminarActa}
      />

      {/* Diálogo Crear / Editar Compromiso */}
      <DialogoCompromiso
        open={dialogoCompromiso}
        compromisoAEditar={compromisoAEditar}
        actaId={acta.id}
        onCerrar={() => {
          setDialogoCompromiso(false)
          setCompromisoAEditar(null)
        }}
        onGuardar={manejarGuardarCompromiso}
      />

      {/* Diálogo Eliminar Compromiso */}
      <DialogoEliminarCompromiso
        open={dialogoEliminarCompromiso}
        compromiso={compromisoAEliminar}
        onCerrar={() => {
          setDialogoEliminarCompromiso(false)
          setCompromisoAEliminar(null)
        }}
        onConfirmar={manejarConfirmarEliminarCompromiso}
      />

      {/* Feedback flotante para operaciones */}
      <Snackbar
        open={Boolean(notificacion)}
        autoHideDuration={4000}
        onClose={() => setNotificacion(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notificacion ? (
          <Alert
            severity={notificacion.severidad}
            onClose={() => setNotificacion(null)}
            sx={{ width: '100%', boxShadow: 3 }}
          >
            {notificacion.mensaje}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  )
}
