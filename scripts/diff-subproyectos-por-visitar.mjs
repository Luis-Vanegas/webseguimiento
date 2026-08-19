// Compara la lista SUBPROYECTOS_POR_VISITAR contra los subproyectos reales
// que devuelve el Visor, para saber cuáles de los 17 no matchean.
//
// Uso:  node scripts/diff-subproyectos-por-visitar.mjs
//
// Lee .env solo para armar la llamada a la Edge Function `obras-proxy` (la
// misma que usa la app). NO imprime ninguna credencial: la salida son
// únicamente nombres de subproyecto y conteos de obras.

import { readFileSync } from 'node:fs'
import { SUBPROYECTOS_POR_VISITAR } from '../src/utils/seguimiento/filtrar-obras.util.ts'

function leerEnv() {
  const env = {}
  for (const archivo of ['.env.local', '.env']) {
    let texto
    try {
      texto = readFileSync(new URL(`../${archivo}`, import.meta.url), 'utf8')
    } catch {
      continue
    }
    for (const linea of texto.split('\n')) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return env
}

// Misma normalización que filtrar-obras.util.ts. Se duplica a propósito: el
// script es una herramienta de diagnóstico, no debe atarse a que esa función
// siga siendo privada del módulo.
function normalizar(valor) {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const env = leerEnv()
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env o .env.local')
  process.exit(1)
}

const res = await fetch(`${url.replace(/\/+$/, '')}/functions/v1/obras-proxy`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${anon}`, apikey: anon, 'Content-Type': 'application/json' },
  body: '{}',
})

if (!res.ok) {
  console.error(`obras-proxy respondió ${res.status}:`, (await res.text()).slice(0, 300))
  process.exit(1)
}

const json = await res.json()
const filas = json?.data ?? json ?? []
console.log(`Obras recibidas del Visor: ${filas.length}\n`)

// subproyecto real -> cuántas obras tiene
const conteoPorSubproyecto = new Map()
for (const fila of filas) {
  const sub = fila['SUBPROYECTO ESTRATÉGICO']
  if (!sub) continue
  conteoPorSubproyecto.set(sub, (conteoPorSubproyecto.get(sub) ?? 0) + 1)
}

const realesPorNormalizado = new Map()
for (const [sub, n] of conteoPorSubproyecto) {
  realesPorNormalizado.set(normalizar(sub), { sub, n })
}

const encontrados = []
const faltantes = []
for (const buscado of SUBPROYECTOS_POR_VISITAR) {
  const hit = realesPorNormalizado.get(normalizar(buscado))
  if (hit) encontrados.push({ buscado, real: hit.sub, obras: hit.n })
  else faltantes.push(buscado)
}

console.log(`== MATCHEAN (${encontrados.length}/${SUBPROYECTOS_POR_VISITAR.length}) ==`)
for (const e of encontrados) console.log(`  ✓ ${e.buscado}  ->  ${e.obras} obras`)

console.log(`\n== NO MATCHEAN (${faltantes.length}) ==`)
for (const f of faltantes) {
  console.log(`  ✗ ${f}`)
  // Candidatos: subproyectos reales que comparten alguna palabra significativa
  const palabras = normalizar(f)
    .split(' ')
    .filter((p) => p.length > 3)
  const sugerencias = [...conteoPorSubproyecto.keys()]
    .filter((real) => palabras.some((p) => normalizar(real).includes(p)))
    .slice(0, 5)
  for (const s of sugerencias) console.log(`      ¿será? -> ${s}  (${conteoPorSubproyecto.get(s)} obras)`)
}

console.log(`\n== TODOS los subproyectos del Visor (${conteoPorSubproyecto.size}) ==`)
for (const [sub, n] of [...conteoPorSubproyecto].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${sub}  (${n} obras)`)
}

// Segunda pasada: buscar los mismos 17 contra el NOMBRE de la obra. Si la
// lista son obras y no subproyectos, es acá donde tienen que aparecer.
console.log(`\n\n######## BÚSQUEDA CONTRA EL NOMBRE DE LA OBRA ########`)
for (const buscado of SUBPROYECTOS_POR_VISITAR) {
  // Palabras significativas: se descartan las de <=3 letras y los prefijos de
  // tipo (I.E., S.E., Recreo…) que aparecerían en decenas de obras.
  const RUIDO = new Set(['recreo', 'cultural', 'deportivo', 'buen', 'comienzo'])
  const clave = normalizar(buscado)
    .replace(/[.]/g, '')
    .split(' ')
    .filter((p) => p.length > 3 && !RUIDO.has(p))

  const hits = filas.filter((f) => {
    const nombre = normalizar(f.NOMBRE ?? '')
    return clave.length > 0 && clave.every((p) => nombre.includes(p))
  })

  console.log(`\n"${buscado}"  ->  ${hits.length} obra(s)   [clave: ${clave.join(' + ') || '(sin clave)'}]`)
  for (const h of hits.slice(0, 6)) {
    console.log(`     id=${h.id} | ${h.NOMBRE}`)
    console.log(`            subproyecto: ${h['SUBPROYECTO ESTRATÉGICO'] ?? '—'}`)
  }
  if (hits.length > 6) console.log(`     … y ${hits.length - 6} más`)
}
