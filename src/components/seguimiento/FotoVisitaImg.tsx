import { useEffect, useState } from 'react'
import { Dialog } from '@mui/material'
import { obtenerUrlFoto } from '../../features/seguimiento/seguimientoApi'
import { convertirBlobHeicAJpeg, esRutaHeic } from '../../utils/seguimiento/heic.util'

const BASE_STYLE = { width: 120, height: 90, borderRadius: 4 }

// Cache a nivel de módulo por storagePath: la misma foto se re-monta seguido
// (abrir/cerrar el diálogo de detalle, o aparecer dos veces en el timeline
// de HistorialObra como "antes" y "después") y, si es HEIC, reconvertirla
// cada vez cuesta varios segundos. Se cachea la PROMESA (no el resultado)
// para que montajes concurrentes de la misma foto compartan la conversión.
// ponytail: los blob URL cacheados nunca se revocan — viven hasta cerrar la
// pestaña. Aceptable para una sesión normal; si se vuelve un problema real
// de memoria, agregar un LRU con revokeObjectURL al desalojar.
const urlCache = new Map<string, Promise<string>>()

async function resolverUrl(storagePath: string): Promise<string> {
  const signedUrl = await obtenerUrlFoto(storagePath)

  // Fotos subidas antes de convertir HEIC del lado del cliente (o subidas
  // por fuera de la app) quedan guardadas tal cual en Storage — se
  // convierten acá, al mostrarlas, sin tocar el archivo original ni la
  // base. Fallback temporal: una vez migradas (scripts/convertir-fotos-heic.mjs)
  // o si se refuerza la validación en el punto de subida, este branch deja
  // de ejecutarse en la práctica.
  if (!esRutaHeic(storagePath)) return signedUrl

  const blobOriginal = await (await fetch(signedUrl)).blob()
  const blobJpeg = await convertirBlobHeicAJpeg(blobOriginal)
  return URL.createObjectURL(blobJpeg)
}

export function FotoVisitaImg({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [expandida, setExpandida] = useState(false)

  useEffect(() => {
    let activo = true
    setUrl(null)
    setError(false)

    urlCache.set(storagePath, urlCache.get(storagePath) ?? resolverUrl(storagePath))
    urlCache
      .get(storagePath)!
      .then((u) => {
        if (activo) setUrl(u)
      })
      .catch(() => {
        urlCache.delete(storagePath) // no dejar cacheado un fallo: el próximo intento reintenta
        if (activo) setError(true)
      })

    return () => {
      activo = false
    }
  }, [storagePath])

  if (error) {
    return (
      <div
        style={{
          ...BASE_STYLE,
          background: '#fee2e2',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: 10,
          padding: 4,
        }}
      >
        No se pudo cargar la foto
      </div>
    )
  }

  if (!url) return <div style={{ ...BASE_STYLE, background: '#eee' }} />

  return (
    <>
      <img
        src={url}
        alt=""
        style={{ ...BASE_STYLE, objectFit: 'cover', cursor: 'zoom-in' }}
        onClick={() => setExpandida(true)}
      />
      <Dialog open={expandida} onClose={() => setExpandida(false)} maxWidth="lg">
        <img
          src={url}
          alt=""
          style={{ display: 'block', maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
          onClick={() => setExpandida(false)}
        />
      </Dialog>
    </>
  )
}
