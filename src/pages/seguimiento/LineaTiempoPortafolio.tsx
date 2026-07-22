import { useEffect, useMemo, useState } from 'react'
import { Box } from '@mui/material'
import * as obrasVisorApi from '../../api/obrasVisorApi'
import { PageHeader } from '../../components/layout/PageHeader'
import { RielTemporal, type ParadaTemporal } from '../../components/seguimiento/RielTemporal'
import { agruparPortafolio } from '../../utils/seguimiento/portafolio.util'
import { DIAS_PROXIMA_ENTREGA } from '../../utils/seguimiento/fechas.util'
import { COLOR_ACENTO, COLOR_ESTADO, COLOR_PROXIMA_ENTREGA } from '../../theme/theme'
import type { ObraVisor } from '../../types/obra.types'

// Violeta para "en planeación" — todavía sin obra física en el terreno,
// distinto de cualquier color ya usado en el Mapa (ese es su propio
// dominio: estado de visita, no etapa de portafolio).
const COLOR_PLANEACION = '#8b5cf6'

export function LineaTiempoPortafolio() {
  const [obras, setObras] = useState<ObraVisor[]>([])

  useEffect(() => {
    obrasVisorApi
      .obtenerObras()
      .then(setObras)
      .catch(() => {})
  }, [])

  const grupos = useMemo(() => agruparPortafolio(obras), [obras])

  const paradas: ParadaTemporal[] = useMemo(
    () => [
      {
        etiqueta: 'En planeación',
        descripcion: 'Estudios, diseños y trámites antes de contratar la obra.',
        color: COLOR_PLANEACION,
        obras: grupos.planeacion,
      },
      {
        etiqueta: 'En ejecución',
        descripcion: 'Ya contratada, con obra física en curso.',
        color: COLOR_ACENTO,
        obras: grupos.ejecucion,
      },
      {
        etiqueta: 'Por entregar pronto',
        descripcion: `Entrega estimada dentro de los próximos ${DIAS_PROXIMA_ENTREGA} días.`,
        color: COLOR_PROXIMA_ENTREGA,
        obras: grupos.porEntregar,
      },
      {
        etiqueta: 'Entregadas',
        descripcion: 'Obra finalizada y entregada a la comunidad.',
        color: COLOR_ESTADO.revisada,
        obras: grupos.entregadas,
      },
    ],
    [grupos],
  )

  return (
    <Box sx={{ width: '100%', maxWidth: 820 }}>
      <PageHeader
        titulo="Línea de tiempo"
        subtitulo="El portafolio de obras, de la planeación a la entrega"
      />
      <RielTemporal paradas={paradas} />
    </Box>
  )
}
