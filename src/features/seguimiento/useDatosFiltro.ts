import { useEffect, useMemo, useState } from 'react'
import * as obrasVisorApi from '../../api/obrasVisorApi'
import * as seguimientoApi from '../../features/seguimiento/seguimientoApi'
import type { ObraVisor } from '../../types/obra.types'
import type { TipoAlerta } from '../../types/seguimiento.types'

// Datos auxiliares que necesita la barra de filtros en las tres pantallas
// (MisVisitas, RevisarVisitas, HistorialObra) — se cargan una sola vez acá
// para no repetir el fetch en cada pantalla.
export function useDatosFiltro() {
  const [obras, setObras] = useState<ObraVisor[]>([])
  const [tiposAlerta, setTiposAlerta] = useState<TipoAlerta[]>([])

  useEffect(() => {
    obrasVisorApi.obtenerObras().then(setObras)
    seguimientoApi.listarTiposAlerta().then(setTiposAlerta)
  }, [])

  const proyectoEstrategicoPorObra = useMemo(
    () => new Map(obras.map((o) => [o.obraId, o.proyectoEstrategico])),
    [obras],
  )

  const proyectosEstrategicos = useMemo(
    () => [...new Set(obras.map((o) => o.proyectoEstrategico).filter((p): p is string => !!p))],
    [obras],
  )

  const nombrePorObra = useMemo(() => new Map(obras.map((o) => [o.obraId, o.nombre])), [obras])

  return { proyectoEstrategicoPorObra, proyectosEstrategicos, tiposAlerta, nombrePorObra }
}
