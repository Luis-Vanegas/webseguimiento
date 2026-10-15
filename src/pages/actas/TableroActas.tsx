import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Button,
  CircularProgress,
  Container,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { listarActas, listarCompromisos } from '../../features/actas/actasApi'
import { contarEstados, resumenPorOrigen } from '../../utils/actas/tablero.util'
import { PageHeader } from '../../components/layout/PageHeader'
import { TarjetasEstado } from '../../components/actas/tablero/TarjetasEstado'
import { TablaResumenOrigen } from '../../components/actas/tablero/TablaResumenOrigen'
import { TablaCompromisos } from '../../components/actas/tablero/TablaCompromisos'
import { NuevaActaDialog } from '../../components/actas/tablero/NuevaActaDialog'
import { fechaLegible } from '../../components/actas/tablero/filasCompromisos'
import type { Acta, Compromiso } from '../../types/actas.types'

export function TableroActas() {
  const [actas, setActas] = useState<Acta[]>([])
  const [compromisos, setCompromisos] = useState<Compromiso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

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
  const compromisosPorActa = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of compromisos) m.set(c.actaId, (m.get(c.actaId) ?? 0) + 1)
    return m
  }, [compromisos])

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
      <PageHeader
        titulo="Tablero de control – Actas y compromisos"
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
              Resumen por origen
            </Typography>
            <TablaResumenOrigen filas={resumen} />
          </section>

          <section>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Compromisos
            </Typography>
            <TablaCompromisos compromisos={compromisos} origenDeActa={origenDeActa} origenes={origenes} />
          </section>

          <section>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Actas
            </Typography>
            <Paper variant="outlined">
              {actas.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  Todavía no hay actas. Crea la primera con «Nueva acta».
                </Typography>
              ) : (
                <List disablePadding>
                  {actas.map((a) => (
                    <ListItemButton key={a.id} component={RouterLink} to={`/actas/${a.id}`} divider>
                      <ListItemText
                        primary={a.origen}
                        secondary={`${fechaLegible(a.fecha)} · ${compromisosPorActa.get(a.id) ?? 0} compromisos`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Paper>
          </section>
        </Stack>
      )}

      <NuevaActaDialog abierto={dialogoAbierto} onCerrar={() => setDialogoAbierto(false)} />
    </Container>
  )
}
