import { useEffect, useState } from 'react'
import { obtenerUrlFoto } from '../../features/seguimiento/seguimientoApi'
import { convertirBlobHeicAJpeg, esRutaHeic } from '../../utils/seguimiento/heic.util'

export function FotoVisitaImg({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true
    let objectUrlLocal: string | null = null

    async function cargar() {
      try {
        const signedUrl = await obtenerUrlFoto(storagePath)

        // Fotos subidas antes de convertir HEIC del lado del cliente
        // (o subidas por fuera de la app) quedan guardadas tal cual en
        // Storage — se convierten acá, al mostrarlas, sin tocar el archivo
        // original ni la base.
        if (!esRutaHeic(storagePath)) {
          if (activo) setUrl(signedUrl)
          return
        }

        const blobOriginal = await (await fetch(signedUrl)).blob()
        const blobJpeg = await convertirBlobHeicAJpeg(blobOriginal)
        objectUrlLocal = URL.createObjectURL(blobJpeg)
        if (activo) setUrl(objectUrlLocal)
      } catch {
        if (activo) setError(true)
      }
    }

    cargar()
    return () => {
      activo = false
      if (objectUrlLocal) URL.revokeObjectURL(objectUrlLocal)
    }
  }, [storagePath])

  if (error) {
    return (
      <div
        style={{
          width: 120,
          height: 90,
          background: '#fee2e2',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: 10,
          padding: 4,
          borderRadius: 4,
        }}
      >
        No se pudo cargar la foto
      </div>
    )
  }

  if (!url) return <div style={{ width: 120, height: 90, background: '#eee', borderRadius: 4 }} />

  return (
    <img
      src={url}
      alt=""
      style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 4 }}
    />
  )
}
