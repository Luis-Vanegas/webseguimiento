import { Box, Card, Stack, Typography, alpha } from '@mui/material'
import EventIcon from '@mui/icons-material/Event'
import { diasHasta } from '../../utils/seguimiento/fechas.util'
import type { ObraVisor } from '../../types/obra.types'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// El número de días es el dato que da sentido al widget — va grande y a
// color; el nombre de obra es contexto secundario debajo.
function infoDias(dias: number): { numero: string; unidad: string; color: string } {
  if (dias < 0) {
    return { numero: String(-dias), unidad: -dias === 1 ? 'día vencido' : 'días vencidos', color: '#ef4444' }
  }
  if (dias === 0) return { numero: 'Hoy', unidad: '', color: '#f97316' }
  if (dias === 1) return { numero: 'Mañana', unidad: '', color: '#f97316' }
  return { numero: String(dias), unidad: 'días', color: dias <= 7 ? '#eab308' : '#64748b' }
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
  const proximas = visitas
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
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {proximas.map(({ visita, dias }) => {
          const { numero, unidad, color } = infoDias(dias)
          return (
            <Card
              key={visita.id}
              variant="outlined"
              sx={{
                flexShrink: 0,
                width: 200,
                p: 1.5,
                cursor: 'pointer',
                borderRadius: 2.5,
                bgcolor: alpha(color, 0.06),
                borderLeft: '4px solid',
                borderLeftColor: color,
              }}
              onClick={() => onSeleccionar(visita)}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 26, lineHeight: 1, color }}>
                  {numero}
                </Typography>
                {unidad && (
                  <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                    {unidad}
                  </Typography>
                )}
              </Box>
              <Typography
                variant="body2"
                sx={{ lineHeight: 1.3, fontWeight: 500, mt: 0.75 }}
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
