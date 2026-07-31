import { Box, Card, Stack, Typography, alpha } from '@mui/material'
import EventIcon from '@mui/icons-material/Event'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import TodayIcon from '@mui/icons-material/Today'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import { diasHasta } from '../../utils/seguimiento/fechas.util'
import type { ObraVisor } from '../../types/obra.types'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// El número de días es el dato que da sentido al widget — va grande y a
// color; el ícono referuerza el estado de un vistazo (útil al escanear
// varias tarjetas en la tira horizontal) y el nombre de obra queda como
// contexto secundario debajo.
function infoDias(dias: number): {
  numero: string
  unidad: string
  color: string
  Icono: typeof WarningAmberIcon
} {
  if (dias < 0) {
    return {
      numero: String(-dias),
      unidad: -dias === 1 ? 'día vencido' : 'días vencidos',
      color: '#ef4444',
      Icono: WarningAmberIcon,
    }
  }
  if (dias === 0) return { numero: 'Hoy', unidad: '', color: '#f97316', Icono: TodayIcon }
  if (dias === 1) return { numero: 'Mañana', unidad: '', color: '#f97316', Icono: TodayIcon }
  return {
    numero: String(dias),
    unidad: 'días',
    color: dias <= 7 ? '#eab308' : '#64748b',
    Icono: EventAvailableIcon,
  }
}

// Un dato corrupto en fecha_proxima_visita (ej. un timestamp guardado por
// error donde se esperaba una fecha) puede dar una diferencia de días
// absurda. ±10 años es más rango del que un seguimiento de obra real
// necesita — fuera de eso, se descarta como dato sucio en vez de mostrar
// un número sin sentido.
const LIMITE_DIAS_RAZONABLE = 3650

interface ProximasVisitasProps {
  visitas: VisitaSeguimiento[]
  obraPorId: Map<number, ObraVisor>
  onSeleccionar: (visita: VisitaSeguimiento) => void
}

// Tira horizontal de las visitas con "próxima visita" agendada, ordenadas
// por cercanía — para que el visitador vea de un vistazo qué se le viene
// sin tener que abrir cada tarjeta de la lista de abajo.
export function ProximasVisitas({ visitas, obraPorId, onSeleccionar }: ProximasVisitasProps) {
  // Una obra revisitada ya "cumplió" cualquier próxima-visita agendada por
  // visitas anteriores de esa misma obra — solo la MÁS RECIENTE puede tener
  // una próxima visita todavía pendiente. Sin este dedupe, una obra con 2+
  // visitas mostraba una tarjeta por cada una, incluida la vieja ya superada
  // (ej. "vencida" aunque ya se haya vuelto). No se borra ni se toca el
  // historial — esto solo decide qué tarjeta mostrar acá arriba.
  const masRecientePorObra = new Map<number, VisitaSeguimiento>()
  for (const v of visitas) {
    const actual = masRecientePorObra.get(v.obraId)
    if (!actual || v.fechaVisita > actual.fechaVisita) masRecientePorObra.set(v.obraId, v)
  }

  const proximas = [...masRecientePorObra.values()]
    .filter((v) => !!v.fechaProximaVisita)
    .map((v) => ({ visita: v, dias: diasHasta(v.fechaProximaVisita!) }))
    .filter(({ dias }) => Math.abs(dias) <= LIMITE_DIAS_RAZONABLE)
    .sort((a, b) => a.dias - b.dias)

  if (proximas.length === 0) return null

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <EventIcon sx={{ fontSize: 17 }} /> Próximas visitas
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ overflowX: 'auto', pb: 0.75 }}>
        {proximas.map(({ visita, dias }) => {
          const { numero, unidad, color, Icono } = infoDias(dias)
          return (
            <Card
              key={visita.id}
              variant="outlined"
              sx={{
                flexShrink: 0,
                width: 190,
                minHeight: 104,
                p: 1.75,
                cursor: 'pointer',
                borderRadius: 2.5,
                bgcolor: alpha(color, 0.07),
                borderLeft: '4px solid',
                borderLeftColor: color,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 1,
              }}
              onClick={() => onSeleccionar(visita)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Icono sx={{ fontSize: 18, color, flexShrink: 0 }} />
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 24, lineHeight: 1, color }}>
                    {numero}
                  </Typography>
                  {unidad && (
                    <Typography variant="caption" sx={{ color, fontWeight: 600 }} noWrap>
                      {unidad}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Typography
                variant="body2"
                title={obraPorId.get(visita.obraId)?.nombre}
                sx={{
                  lineHeight: 1.3,
                  fontWeight: 500,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {obraPorId.get(visita.obraId)?.nombre ?? `Obra ${visita.obraId}`}
              </Typography>
            </Card>
          )
        })}
      </Stack>
    </Box>
  )
}
