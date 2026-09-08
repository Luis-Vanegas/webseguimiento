import { useEffect, useState } from 'react'
import { obtenerUrlFoto } from '../features/seguimiento/seguimientoApi'
import { convertirBlobHeicAJpeg, esRutaHeic } from '../utils/seguimiento/heic.util'

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

// Extraído para que CarruselFotos.tsx pueda resolver la URL de una foto
// arbitraria (no solo la del thumbnail) compartiendo el mismo urlCache.
// `habilitado` (default true) deja el fetch en pausa — lo usan los
// thumbnails fuera de pantalla vía useEnPantalla, para no disparar de
// golpe el pedido de firma + descarga de decenas de fotos a la vez
// (eso saturaba el egress del plan Free y generaba 400 por la ráfaga).
export function useFotoUrl(storagePath: string, habilitado = true) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!habilitado) return
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
  }, [storagePath, habilitado])

  return { url, error }
}
