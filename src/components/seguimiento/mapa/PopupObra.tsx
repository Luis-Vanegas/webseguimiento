import { Box, Button, Typography } from '@mui/material'
import { infoObra } from './mapaEstado.util'
import { etiquetaEtapa } from '../../../utils/seguimiento/etapas.util'
import type { ObraVisor } from '../../../types/obra.types'

interface PopupObraProps {
  obra: ObraVisor
  ultimaVisitaPorObra: Map<number, string>
  puedeVisitar: boolean
  onVisitar: () => void
  onVerHistorial: () => void
}

export function PopupObra({ obra, ultimaVisitaPorObra, puedeVisitar, onVisitar, onVerHistorial }: PopupObraProps) {
  const info = infoObra(obra, ultimaVisitaPorObra)

  return (
    <Box sx={{ p: 1.5, minWidth: 220, maxWidth: 280 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3, mb: 0.5 }}>
        {obra.nombre}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: info.color,
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {info.etiqueta}
        </Typography>
      </Box>
      {obra.dependencia && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {obra.dependencia}
        </Typography>
      )}
      {obra.direccion && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {obra.direccion}
        </Typography>
      )}
      {obra.fechaEstimadaEntrega && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Entrega estimada: {obra.fechaEstimadaEntrega}
        </Typography>
      )}

      {obra.etapas.some((e) => !e.noAplica) && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            maxHeight: 150,
            overflowY: 'auto',
          }}
        >
          {obra.etapas
            .filter((etapa) => !etapa.noAplica)
            .map((etapa) => (
              <Box key={etapa.nombre} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                  {etiquetaEtapa(etapa.nombre)}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, flexShrink: 0 }}>
                  {etapa.porcentaje}%
                </Typography>
              </Box>
            ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
        {puedeVisitar && (
          <Button size="small" variant="contained" sx={{ fontSize: 11, py: 0.3 }} onClick={onVisitar}>
            Visitar
          </Button>
        )}
        <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.3 }} onClick={onVerHistorial}>
          Historial
        </Button>
      </Box>
    </Box>
  )
}
