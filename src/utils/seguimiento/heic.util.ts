// Los iPhone guardan fotos en .HEIC/.HEIF por defecto; ningún navegador
// salvo Safari puede decodificarlas en un <img>. Import dinámico: heic2any
// carga un decodificador WASM pesado que no vale la pena bajar si nadie
// tiene una foto HEIC de por medio.
const REGEX_HEIC = /\.hei[cf]$/i

export function esRutaHeic(ruta: string): boolean {
  return REGEX_HEIC.test(ruta)
}

export function esArchivoHeic(archivo: File): boolean {
  return archivo.type === 'image/heic' || archivo.type === 'image/heif' || REGEX_HEIC.test(archivo.name)
}

// Cada conversión tarda ~3-4s y usa harto WASM/memoria; una visita con
// varias fotos HEIC (ej. 41) las renderiza todas a la vez y, sin límite,
// eso alcanza a trabar el navegador. Semáforo simple: máximo 3 en paralelo,
// el resto espera su turno en la cola.
const MAX_CONVERSIONES_PARALELAS = 3
let conversionesEnCurso = 0
const colaEspera: (() => void)[] = []

async function adquirirTurno(): Promise<void> {
  if (conversionesEnCurso < MAX_CONVERSIONES_PARALELAS) {
    conversionesEnCurso++
    return
  }
  await new Promise<void>((resolve) => colaEspera.push(resolve))
  conversionesEnCurso++
}

function liberarTurno(): void {
  conversionesEnCurso--
  colaEspera.shift()?.()
}

export async function convertirBlobHeicAJpeg(blob: Blob): Promise<Blob> {
  await adquirirTurno()
  try {
    const heic2any = (await import('heic2any')).default
    const resultado = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 })
    return Array.isArray(resultado) ? resultado[0] : resultado
  } finally {
    liberarTurno()
  }
}
