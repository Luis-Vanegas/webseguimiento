import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  List,
  ListItemButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  actualizarCompromiso,
  eliminarCompromiso,
  listarActas,
  listarCompromisos,
} from '../../features/actas/actasApi'
import { contarEstados, resumenPorOrigen, type ConteoEstados } from '../../utils/actas/tablero.util'
import { PageHeader } from '../../components/layout/PageHeader'
import { TarjetasEstado } from '../../components/actas/tablero/TarjetasEstado'
import { TablaResumenOrigen } from '../../components/actas/tablero/TablaResumenOrigen'
import { TablaCompromisos } from '../../components/actas/tablero/TablaCompromisos'
import { NuevaActaDialog } from '../../components/actas/tablero/NuevaActaDialog'
import { fechaLegible } from '../../components/actas/tablero/filasCompromisos'
import { DialogoCompromiso } from '../../components/actas/detalle/DialogoCompromiso'
import { DialogoEliminarCompromiso } from '../../components/actas/detalle/DialogoEliminarCompromiso'
import type { Acta, Compromiso, CompromisoNuevo, EstadoCompromiso } from '../../types/actas.types'

interface Notificacion {
  severidad: 'success' | 'error'
  mensaje: string
}

export function TableroActas() {
  const [actas, setActas] = useState<Acta[]>([])
  const [compromisos, setCompromisos] = useState<Compromiso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [aEditar, setAEditar] = useState<Compromiso | null>(null)
  const [aEliminar, setAEliminar] = useState<Compromiso | null>(null)
  const [notificacion, setNotificacion] = useState<Notificacion | null>(null)

  useEffect(() => {
    Promise.all([listarActas(), listarCompromisos()])
      .then(([a, c]) => {
        setActas(a)
        setCompromisos(c)
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las actas.'),
      )
      .finally(() => setCargando(false))
  }, [])

  const origenDeActa = useMemo(() => new Map(actas.map((a) => [a.id, a.origen])), [actas])
  const origenes = useMemo(() => [...new Set(actas.map((a) => a.origen))].sort(), [actas])
  const conteo = useMemo(() => contarEstados(compromisos), [compromisos])
  const resumen = useMemo(() => resumenPorOrigen(compromisos, origenDeActa), [compromisos, origenDeActa])
  const conteoPorActa = useMemo(() => {
    const grupos = new Map<string, Compromiso[]>()
    for (const c of compromisos) grupos.set(c.actaId, [...(grupos.get(c.actaId) ?? []), c])
    return new Map([...grupos].map(([id, lista]) => [id, contarEstados(lista)]))
  }, [compromisos])

  const reemplazar = (actualizado: Compromiso) =>
    setCompromisos((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)))

  const guardarEdicion = async (datos: Partial<CompromisoNuevo>) => {
    if (!aEditar) return
    reemplazar(await actualizarCompromiso(aEditar.id, datos))
    setNotificacion({ severidad: 'success', mensaje: 'Compromiso actualizado.' })
  }

  const confirmarEliminar = async (id: string) => {
    await eliminarCompromiso(id)
    setCompromisos((prev) => prev.filter((c) => c.id !== id))
    setNotificacion({ severidad: 'success', mensaje: 'Compromiso eliminado.' })
  }

  // Optimistic: the chip changes at once and reverts if the save fails.
  const cambiarEstado = async (c: Compromiso, estado: EstadoCompromiso) => {
    reemplazar({ ...c, estado })
    try {
      reemplazar(await actualizarCompromiso(c.id, { estado }))
      setNotificacion({ severidad: 'success', mensaje: `Estado cambiado a «${estado}».` })
    } catch (err) {
      reemplazar(c)
      setNotificacion({
        severidad: 'error',
        mensaje: `No se pudo cambiar el estado: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
      <PageHeader
        titulo="Tablero de control – Actas y compromisos"
        subtitulo="Pendientes, responsables y fechas de cada reunión"
        accion={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoAbierto(true)}>
            Nueva acta
          </Button>
        }
      />

      {cargando && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!cargando && !error && (
        <Stack spacing={4}>
          <TarjetasEstado conteo={conteo} />

          <section>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Actas ({actas.length})
            </Typography>
            <Paper variant="outlined">
              {actas.length === 0 ? (
                <Stack alignItems="center" spacing={1.5} sx={{ p: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Todavía no hay actas.
                  </Typography>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogoAbierto(true)}>
                    Crear la primera acta
                  </Button>
                </Stack>
              ) : (
                <List disablePadding>
                  {actas.map((a) => (
                    <FilaActa key={a.id} acta={a} conteo={conteoPorActa.get(a.id)} />
                  ))}
                </List>
              )}
            </Paper>
          </section>

          <section>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Compromisos
            </Typography>
            <TablaCompromisos
              compromisos={compromisos}
              origenDeActa={origenDeActa}
              origenes={origenes}
              onEditar={setAEditar}
              onEliminar={setAEliminar}
              onCambiarEstado={cambiarEstado}
            />
          </section>

          <section>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Resumen por origen
            </Typography>
            <TablaResumenOrigen filas={resumen} />
          </section>
        </Stack>
      )}

      <NuevaActaDialog abierto={dialogoAbierto} onCerrar={() => setDialogoAbierto(false)} origenes={origenes} />

      <DialogoCompromiso
        open={Boolean(aEditar)}
        compromisoAEditar={aEditar}
        actaId={aEditar?.actaId ?? ''}
        onCerrar={() => setAEditar(null)}
        onGuardar={guardarEdicion}
      />

      <DialogoEliminarCompromiso
        open={Boolean(aEliminar)}
        compromiso={aEliminar}
        onCerrar={() => setAEliminar(null)}
        onConfirmar={confirmarEliminar}
      />

      <Snackbar
        open={Boolean(notificacion)}
        autoHideDuration={4000}
        onClose={() => setNotificacion(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notificacion ? (
          <Alert severity={notificacion.severidad} onClose={() => setNotificacion(null)} sx={{ boxShadow: 3 }}>
            {notificacion.mensaje}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  )
}

function FilaActa({ acta, conteo }: { acta: Acta; conteo?: ConteoEstados }) {
  const total = conteo?.total ?? 0
  const hechos = conteo?.Completada ?? 0
  const abiertos = total - hechos
  return (
    <ListItemButton component={RouterLink} to={`/actas/${acta.id}`} divider sx={{ py: 1.5, gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Typography fontWeight={600}>{acta.origen}</Typography>
          <Typography variant="body2" color="text.secondary">
            {fechaLegible(acta.fecha)}
          </Typography>
          {(conteo?.Crítica ?? 0) > 0 && (
            <Chip size="small" color="error" label={`${conteo?.Crítica} crítica${conteo?.Crítica === 1 ? '' : 's'}`} />
          )}
        </Stack>
        {total > 0 ? (
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ mt: 0.75, maxWidth: 420 }}>
            <LinearProgress
              variant="determinate"
              value={(hechos / total) * 100}
              color={hechos === total ? 'success' : 'primary'}
              sx={{ flex: 1, height: 6, borderRadius: 3 }}
              aria-label={`${hechos} de ${total} compromisos completados`}
            />
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {hechos}/{total} completados{abiertos > 0 ? ` · ${abiertos} abiertos` : ''}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Sin compromisos
          </Typography>
        )}
      </Box>
      <ChevronRightIcon color="action" />
    </ListItemButton>
  )
}
