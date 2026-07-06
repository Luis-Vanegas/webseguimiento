// Edge Function: proxy hacia la API real de obras del Visor Estratégico.
//
// Por qué existe: la API real se autentica con una API key por header HTTP.
// Esa clave no puede vivir en el frontend (con Vite, cualquier variable
// VITE_* queda incrustada en el JS que llega al navegador y es legible desde
// devtools). Esta función guarda la clave como secret de Supabase, agrega el
// header, llama a la API real, y devuelve el JSON tal cual — el mapeo de
// campos al shape del módulo se hace en src/api/obrasVisorApi.ts.
//
// Pendiente de confirmar (ver Decisión 2 del plan): URL exacta del endpoint,
// nombre exacto del header de auth, y forma del JSON de respuesta. Hasta
// entonces, la función responde 501 si los secrets no están configurados.

let OBRAS_API_URL = Deno.env.get('OBRAS_API_URL')
const OBRAS_API_KEY = Deno.env.get('OBRAS_API_KEY')
const OBRAS_API_HEADER_NAME = Deno.env.get('OBRAS_API_HEADER_NAME') ?? 'X-API-KEY'

if (OBRAS_API_URL && !OBRAS_API_URL.endsWith('/obras')) {
  OBRAS_API_URL = OBRAS_API_URL.replace(/\/+$/, '') + '/obras'
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!OBRAS_API_URL || !OBRAS_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          'obras-proxy sin configurar: faltan los secrets OBRAS_API_URL / OBRAS_API_KEY. ' +
          'Configuralos con `supabase secrets set` cuando tengas el acceso real.',
      }),
      { status: 501, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  const respuesta = await fetch(OBRAS_API_URL, {
    headers: { [OBRAS_API_HEADER_NAME]: OBRAS_API_KEY },
  })

  const cuerpo = await respuesta.text()

  return new Response(cuerpo, {
    status: respuesta.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
