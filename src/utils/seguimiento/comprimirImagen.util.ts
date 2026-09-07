// Las fotos de campo (celular, cámara nativa vía galería o captura en página)
// pueden pesar varios MB cada una — eso hace la subida lenta con datos
// móviles y come rápido la cuota de Storage del plan gratuito de Supabase.
// Se redimensionan a un máximo razonable para documentación y se recodifican
// antes de guardarlas — Canvas es nativo del navegador, no hace falta
// ninguna librería.
// Los mismos valores están replicados en scripts/recomprimir-fotos.mjs (la
// migración de las fotos viejas) — si se cambian acá, cambiarlos allá también.
const DIMENSION_MAXIMA = 1280
const CALIDAD = 0.72

// Safari (macOS e iOS) no sabe CODIFICAR webp desde canvas.toBlob — solo
// sabe mostrarlo. Si se le pide 'image/webp' y no lo soporta, el navegador
// cae en silencio a PNG (sin pérdida, más pesado que un JPEG), que sería
// peor que no comprimir nada. Se detecta una sola vez con un canvas de
// prueba de 1x1 — mismo truco que usan librerías como Modernizr — y se usa
// webp donde de verdad se soporta (Chrome/Firefox/Android), JPEG en el resto.
let soporteWebpCache: Promise<boolean> | null = null

function soportaWebp(): Promise<boolean> {
  soporteWebpCache ??= new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    canvas.toBlob((blob) => resolve(blob?.type === 'image/webp'), 'image/webp')
  })
  return soporteWebpCache
}

export async function comprimirImagen(archivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, DIMENSION_MAXIMA / Math.max(bitmap.width, bitmap.height))
    const ancho = Math.round(bitmap.width * escala)
    const alto = Math.round(bitmap.height * escala)

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) return archivo

    ctx.drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close()

    const tipo = (await soportaWebp()) ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, CALIDAD))
    if (!blob) return archivo

    const extension = tipo === 'image/webp' ? '.webp' : '.jpg'
    return new File([blob], archivo.name.replace(/\.\w+$/, extension), { type: tipo })
  } catch {
    // Si algo falla (formato no soportado por createImageBitmap, etc.), se
    // sube la foto original antes que perderla.
    return archivo
  }
}
