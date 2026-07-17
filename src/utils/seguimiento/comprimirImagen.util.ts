// Las fotos de campo (celular, cámara nativa vía galería o captura en página)
// pueden pesar varios MB cada una — eso hace la subida lenta con datos
// móviles y come rápido la cuota de Storage del plan gratuito de Supabase.
// Se redimensionan a un máximo razonable para documentación y se recodifican
// como JPEG liviano antes de guardarlas — Canvas es nativo del navegador, no
// hace falta ninguna librería.
const DIMENSION_MAXIMA = 1600
const CALIDAD_JPEG = 0.8

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

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', CALIDAD_JPEG))
    if (!blob) return archivo

    return new File([blob], archivo.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    // Si algo falla (formato no soportado por createImageBitmap, etc.), se
    // sube la foto original antes que perderla.
    return archivo
  }
}
