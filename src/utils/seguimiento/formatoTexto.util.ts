// Parser de un subconjunto mínimo de Markdown para observaciones de visita:
// negrita (**texto**), itálica (*texto*) y listas (líneas que empiezan con
// "- "). Devuelve una estructura de datos plana — el componente que la
// renderiza (TextoConFormato.tsx) arma el JSX; separado así para poder
// testear el parseo sin depender de React.

export type SegmentoTexto =
  | { tipo: 'texto'; contenido: string }
  | { tipo: 'negrita'; contenido: string }
  | { tipo: 'italica'; contenido: string }

export type BloqueTexto =
  | { tipo: 'parrafo'; lineas: SegmentoTexto[][] }
  | { tipo: 'lista'; items: SegmentoTexto[][] }

export function parsearTextoConFormato(texto: string): BloqueTexto[] {
  if (!texto) return []

  const lineas = texto.split('\n')
  const bloques: BloqueTexto[] = []
  let listaActual: SegmentoTexto[][] = []
  let parrafoActual: SegmentoTexto[][] = []

  function cerrarLista() {
    if (listaActual.length === 0) return
    bloques.push({ tipo: 'lista', items: listaActual })
    listaActual = []
  }

  function cerrarParrafo() {
    if (parrafoActual.length === 0) return
    bloques.push({ tipo: 'parrafo', lineas: parrafoActual })
    parrafoActual = []
  }

  for (const linea of lineas) {
    if (linea.startsWith('- ')) {
      cerrarParrafo()
      listaActual.push(parsearLineaInline(linea.slice(2)))
      continue
    }
    cerrarLista()
    parrafoActual.push(parsearLineaInline(linea))
  }
  cerrarLista()
  cerrarParrafo()

  return bloques
}

function parsearLineaInline(linea: string): SegmentoTexto[] {
  return linea
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter((parte) => parte !== '')
    .map((parte): SegmentoTexto => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        return { tipo: 'negrita', contenido: parte.slice(2, -2) }
      }
      if (parte.startsWith('*') && parte.endsWith('*')) {
        return { tipo: 'italica', contenido: parte.slice(1, -1) }
      }
      return { tipo: 'texto', contenido: parte }
    })
}
