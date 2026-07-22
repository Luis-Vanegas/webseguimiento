// Extensión .ts explícita (a diferencia del resto del repo): este archivo
// importa VALORES de otro util (no solo tipos), y el runner de tests
// (`node --experimental-strip-types --test`) no resuelve imports de ESM
// sin extensión como sí lo hace Vite en la app.
import { estaEnEjecucion, estaEnPlaneacion } from './etapas.util.ts'
import { estaProximaAEntregar } from './fechas.util.ts'
import type { ObraVisor } from '../../types/obra.types'

export interface PortafolioAgrupado {
  planeacion: ObraVisor[]
  ejecucion: ObraVisor[]
  porEntregar: ObraVisor[]
  entregadas: ObraVisor[]
}

// Cuatro paradas para la línea de tiempo del portafolio. No son
// mutuamente excluyentes en el dominio (una obra "por entregar" está,
// casi siempre, también "en ejecución"), pero acá se prioriza la fecha
// de entrega sobre la etapa — si está por entregar pronto va en esa
// categoría, no repetida en la de ejecución. Una obra puede no caer en
// ninguna (ej. recién en Dotación/Liquidación, sin entrega inminente):
// esta vista resalta los momentos pedidos, no es una taxonomía exhaustiva.
export function agruparPortafolio(obras: ObraVisor[]): PortafolioAgrupado {
  const entregadas: ObraVisor[] = []
  const porEntregar: ObraVisor[] = []
  const planeacion: ObraVisor[] = []
  const ejecucion: ObraVisor[] = []

  for (const obra of obras) {
    if (obra.entregada) entregadas.push(obra)
    else if (estaProximaAEntregar(obra)) porEntregar.push(obra)
    else if (estaEnPlaneacion(obra)) planeacion.push(obra)
    else if (estaEnEjecucion(obra)) ejecucion.push(obra)
  }

  return { planeacion, ejecucion, porEntregar, entregadas }
}
