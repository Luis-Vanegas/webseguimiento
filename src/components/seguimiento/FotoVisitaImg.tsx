import { useEffect, useState } from 'react'
import { obtenerUrlFoto } from '../../features/seguimiento/seguimientoApi'

export function FotoVisitaImg({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    obtenerUrlFoto(storagePath).then((u) => {
      if (activo) setUrl(u)
    })
    return () => {
      activo = false
    }
  }, [storagePath])

  if (!url) return <div style={{ width: 120, height: 90, background: '#eee' }} />

  return (
    <img
      src={url}
      alt=""
      style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 4 }}
    />
  )
}
