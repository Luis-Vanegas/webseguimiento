import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { editarVisita, listarMisVisitas } from '../../features/seguimiento/seguimientoSlice'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import {
  DetalleVisitaDialog,
  type CambiosVisitaEditables,
} from '../../components/seguimiento/DetalleVisitaDialog'
import { PageHeader } from '../../components/layout/PageHeader'
import { claveDeDate, claveDia } from '../../utils/seguimiento/fechas.util'
import { COLOR_ACENTO, COLOR_PROXIMA_ENTREGA } from '../../theme/theme'
import type { ObraVisor } from '../../types/obra.types'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// 42 celdas (6 semanas) arrancando en el domingo anterior o igual al día 1
// del mes, para que la grilla siempre calce en filas completas.
function celdasDelMes(mesActual: Date): Date[] {
  const primero = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)
  const inicio = new Date(primero)
  inicio.setDate(primero.getDate() - primero.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    return d
  })
}

function agruparPorDia<T>(items: T[], fechaDe: (item: T) => string | null): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const item of items) {
    const fecha = fechaDe(item)
    if (!fecha) continue
    const clave = claveDia(fecha)
    mapa.set(clave, [...(mapa.get(clave) ?? []), item])
  }
  return mapa
}

export function Calendario() {
  const dispatch = useAppDispatch()
  const { usuario } = useUsuarioActual()
  const { misVisitas } = useAppSelector((state) => state.seguimiento)
  const { obraPorId, tiposAlerta } = useDatosFiltro()
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaSeguimiento | null>(null)

  useEffect(() => {
    if (usuario) dispatch(listarMisVisitas(usuario.id))
  }, [dispatch, usuario])

  function guardarEdicion(cambios: CambiosVisitaEditables) {
    if (!visitaSeleccionada || !usuario) return
    dispatch(editarVisita({ id: visitaSeleccionada.id, usuarioId: usuario.id, cambios }))
    setVisitaSeleccionada(null)
  }

  const obras = useMemo(() => [...obraPorId.values()], [obraPorId])

  const entregasPorDia = useMemo(
    () =>
      agruparPorDia<ObraVisor>(
        obras.filter((o) => o.fechaEstimadaEntrega && !o.entregada),
        (o) => o.fechaEstimadaEntrega,
      ),
    [obras],
  )

  const visitasPorDia = useMemo(
    () => agruparPorDia<VisitaSeguimiento>(misVisitas, (v) => v.fechaVisita),
    [misVisitas],
  )

  const celdas = useMemo(() => celdasDelMes(mesActual), [mesActual])
  const entregasDelDia = diaAbierto ? entregasPorDia.get(diaAbierto) ?? [] : []
  const visitasDelDia = diaAbierto ? visitasPorDia.get(diaAbierto) ?? [] : []

  return (
    <Box sx={{ width: '100%', maxWidth: 1000 }}>
      <PageHeader
        titulo="Calendario"
        subtitulo="Entregas estimadas de obras y visitas registradas por día"
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <IconButton onClick={() => setMesActual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ minWidth: { xs: 140, sm: 180 }, textAlign: 'center', textTransform: 'capitalize' }}
        >
          {mesActual.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton onClick={() => setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
          <ChevronRightIcon />
        </IconButton>
        <Button
          size="small"
          startIcon={<TodayIcon />}
          onClick={() => {
            const hoy = new Date()
            setMesActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
          }}
        >
          Hoy
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
        {DIAS_SEMANA.map((d) => (
          <Typography key={d} variant="caption" sx={{ textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}>
            {d}
          </Typography>
        ))}

        {celdas.map((fecha) => {
          const clave = claveDeDate(fecha)
          const enMes = fecha.getMonth() === mesActual.getMonth()
          const esHoy = clave === claveDeDate(new Date())
          const entregas = entregasPorDia.get(clave) ?? []
          const visitasDia = visitasPorDia.get(clave) ?? []
          const abierto = clave === diaAbierto

          return (
            <Box
              key={clave}
              onClick={() => setDiaAbierto(clave)}
              sx={{
                minHeight: 64,
                p: 0.75,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: abierto ? 'primary.main' : 'divider',
                bgcolor: abierto ? 'rgba(41,182,232,0.1)' : enMes ? 'background.paper' : '#f4f6fa',
                opacity: enMes ? 1 : 0.5,
                cursor: 'pointer',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: esHoy ? 700 : 400, color: esHoy ? 'primary.main' : 'inherit' }}
              >
                {fecha.getDate()}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 0.5 }}>
                {entregas.length > 0 && (
                  <Chip
                    size="small"
                    label={entregas.length}
                    sx={{ height: 16, fontSize: 10, bgcolor: COLOR_PROXIMA_ENTREGA, color: '#fff', '& .MuiChip-label': { px: 0.5 } }}
                  />
                )}
                {visitasDia.length > 0 && (
                  <Chip
                    size="small"
                    label={visitasDia.length}
                    sx={{ height: 16, fontSize: 10, bgcolor: COLOR_ACENTO, color: '#fff', '& .MuiChip-label': { px: 0.5 } }}
                  />
                )}
              </Box>
            </Box>
          )
        })}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLOR_PROXIMA_ENTREGA }} />
          <Typography variant="caption" color="text.secondary">Entrega estimada</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLOR_ACENTO }} />
          <Typography variant="caption" color="text.secondary">Visita registrada</Typography>
        </Box>
      </Box>

      {diaAbierto && (
        <Dialog open onClose={() => setDiaAbierto(null)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ textTransform: 'capitalize' }}>
            {new Date(diaAbierto + 'T00:00:00').toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </DialogTitle>
          <DialogContent>
            {entregasDelDia.length === 0 && visitasDelDia.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sin eventos este día.
              </Typography>
            )}

            {entregasDelDia.map((obra) => (
              <Box key={obra.obraId} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLOR_PROXIMA_ENTREGA, flexShrink: 0 }} />
                <Typography variant="body2">{obra.nombre} — entrega estimada</Typography>
              </Box>
            ))}

            {visitasDelDia.map((visita) => (
              <Box
                key={visita.id}
                onClick={() => setVisitaSeleccionada(visita)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, cursor: 'pointer' }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLOR_ACENTO, flexShrink: 0 }} />
                <Typography variant="body2">
                  {obraPorId.get(visita.obraId)?.nombre ?? `Obra ${visita.obraId}`} — visita registrada
                </Typography>
              </Box>
            ))}
          </DialogContent>
        </Dialog>
      )}

      {visitaSeleccionada && (
        <DetalleVisitaDialog
          visita={misVisitas.find((v) => v.id === visitaSeleccionada.id) ?? visitaSeleccionada}
          nombreObra={obraPorId.get(visitaSeleccionada.obraId)?.nombre ?? `Obra ${visitaSeleccionada.obraId}`}
          direccionObra={obraPorId.get(visitaSeleccionada.obraId)?.direccion}
          tiposAlerta={tiposAlerta}
          onCerrar={() => setVisitaSeleccionada(null)}
          onGuardar={guardarEdicion}
        />
      )}
    </Box>
  )
}
