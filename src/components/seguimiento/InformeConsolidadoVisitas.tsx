import { Box, Chip, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { TextoConFormato } from './TextoConFormato'
import { useFotoUrl } from '../../hooks/useFotoUrl'
import { severidadMaxima } from '../../utils/seguimiento/alertas.util'
import { COLOR_SEVERIDAD, COLOR_TEXTO_SEVERIDAD } from '../../theme/theme'
import type { TipoAlerta, VisitaSeguimiento } from '../../types/seguimiento.types'

interface InformeConsolidadoVisitasProps {
  visitas: VisitaSeguimiento[]
  nombreObra: (obraId: number) => string
  direccionObra: (obraId: number) => string | null | undefined
  tiposAlerta: TipoAlerta[]
}

// Vista imprimible (window.print, ver DetalleVisitaDialog para el mismo
// patrón): una "página" por visita con sus métricas, observaciones, alertas
// y fotos, más una página final que junta las obras con alertas media/alta.
// Solo visible en pantalla mientras se imprime — el resto de GestionVisitas
// se oculta vía el mismo truco de #id en index.css.
export function InformeConsolidadoVisitas({
  visitas,
  nombreObra,
  direccionObra,
  tiposAlerta,
}: InformeConsolidadoVisitasProps) {
  const nombreTipoAlerta = (id: string) => tiposAlerta.find((t) => t.id === id)?.nombre ?? 'Alerta'
  const visitasConAlerta = visitas.filter((v) => severidadMaxima(v.alertas) === 'alta' || severidadMaxima(v.alertas) === 'media')

  return (
    <Box id="informe-consolidado-imprimible" sx={{ display: 'none', '@media print': { display: 'block' } }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Informe consolidado de visitas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generado el {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
      </Typography>

      {visitas.map((visita) => (
        <PaginaVisita
          key={visita.id}
          visita={visita}
          nombreObra={nombreObra(visita.obraId)}
          direccion={direccionObra(visita.obraId)}
          nombreTipoAlerta={nombreTipoAlerta}
        />
      ))}

      {visitasConAlerta.length > 0 && (
        <Box sx={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Alertas consolidadas
          </Typography>
          {visitasConAlerta.map((visita) => (
            <Box key={visita.id} sx={{ mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700 }}>{nombreObra(visita.obraId)}</Typography>
              {visita.alertas!.map((alerta) => (
                <Typography key={alerta.id} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <WarningAmberIcon sx={{ fontSize: 16, color: COLOR_SEVERIDAD[alerta.severidad] }} />
                  {nombreTipoAlerta(alerta.tipoAlertaId)}
                  {alerta.detalle ? `: ${alerta.detalle}` : ''}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

function PaginaVisita({
  visita,
  nombreObra,
  direccion,
  nombreTipoAlerta,
}: {
  visita: VisitaSeguimiento
  nombreObra: string
  direccion?: string | null
  nombreTipoAlerta: (id: string) => string
}) {
  const desviacion =
    visita.porcentajeProgramado != null ? visita.porcentajeAvanceCampo - visita.porcentajeProgramado : null

  return (
    <Box sx={{ breakAfter: 'page', pageBreakAfter: 'always', '&:last-of-type': { breakAfter: 'auto', pageBreakAfter: 'auto' } }}>
      <Typography variant="h6">{nombreObra}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {direccion ? `${direccion} · ` : ''}Visita: {visita.fechaVisita}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <MetricaInforme etiqueta="Avance observado" valor={`${visita.porcentajeAvanceCampo}%`} />
        {visita.porcentajeProgramado != null && (
          <MetricaInforme etiqueta="Programado" valor={`${visita.porcentajeProgramado}%`} />
        )}
        {desviacion !== null && (
          <MetricaInforme
            etiqueta="Desviación"
            valor={`${desviacion > 0 ? '+' : ''}${desviacion} p.p.`}
            color={desviacion < 0 ? '#c62828' : undefined}
          />
        )}
        {visita.porcentajePagado != null && <MetricaInforme etiqueta="Pagado" valor={`${visita.porcentajePagado}%`} />}
        {visita.proximoFrente && <MetricaInforme etiqueta="Próximo frente" valor={visita.proximoFrente} />}
        <MetricaInforme etiqueta="Próxima visita" valor={visita.fechaProximaVisita ?? '—'} />
      </Box>

      {visita.observaciones && (
        <Typography variant="body2" component="div" sx={{ mb: 2 }}>
          <TextoConFormato texto={visita.observaciones} />
        </Typography>
      )}

      {(visita.alertas?.length ?? 0) > 0 && (
        <Box sx={{ mb: 2 }}>
          {visita.alertas!.map((alerta) => (
            <Box key={alerta.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <WarningAmberIcon sx={{ fontSize: 16, color: COLOR_SEVERIDAD[alerta.severidad] }} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {nombreTipoAlerta(alerta.tipoAlertaId)}
                {alerta.detalle ? ` — ${alerta.detalle}` : ''}
              </Typography>
              <Chip
                size="small"
                label={alerta.severidad}
                sx={{ height: 18, fontSize: 10, bgcolor: COLOR_SEVERIDAD[alerta.severidad], color: COLOR_TEXTO_SEVERIDAD[alerta.severidad] }}
              />
            </Box>
          ))}
        </Box>
      )}

      {(visita.fotos?.length ?? 0) > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {[...visita.fotos!].sort((a, b) => a.orden - b.orden).map((foto) => (
            <FotoInforme key={foto.id} storagePath={foto.storagePath} />
          ))}
        </Box>
      )}
    </Box>
  )
}

function MetricaInforme({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <Box sx={{ minWidth: 110 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {etiqueta}
      </Typography>
      <Typography sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>{valor}</Typography>
    </Box>
  )
}

// A diferencia de FotoVisitaImg, sin lazy-load por IntersectionObserver: en
// una página impresa no hay "fuera de pantalla", todas las fotos deben pedir
// su URL firmada de una.
function FotoInforme({ storagePath }: { storagePath: string }) {
  const { url } = useFotoUrl(storagePath)
  if (!url) return <Box sx={{ aspectRatio: '4 / 3', bgcolor: '#eee', borderRadius: 1 }} />
  return (
    <Box
      component="img"
      src={url}
      sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 1 }}
    />
  )
}
