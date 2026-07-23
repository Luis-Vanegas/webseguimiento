import { Fragment } from 'react'
import {
  parsearTextoConFormato,
  type SegmentoTexto,
} from '../../utils/seguimiento/formatoTexto.util'

function renderSegmentos(segmentos: SegmentoTexto[]) {
  return segmentos.map((segmento, i) => {
    if (segmento.tipo === 'negrita') return <strong key={i}>{segmento.contenido}</strong>
    if (segmento.tipo === 'italica') return <em key={i}>{segmento.contenido}</em>
    return <Fragment key={i}>{segmento.contenido}</Fragment>
  })
}

// Muestra observaciones de visita con el subconjunto de Markdown que permite
// BarraFormatoTexto (negrita/itálica/lista) — nunca vía dangerouslySetInnerHTML,
// el texto pasa por parsearTextoConFormato y se arma como nodos de React.
export function TextoConFormato({ texto }: { texto: string }) {
  const bloques = parsearTextoConFormato(texto)

  return (
    <>
      {bloques.map((bloque, i) => {
        if (bloque.tipo === 'lista') {
          return (
            <ul key={i} style={{ margin: '4px 0', paddingLeft: 20 }}>
              {bloque.items.map((item, j) => (
                <li key={j}>{renderSegmentos(item)}</li>
              ))}
            </ul>
          )
        }
        return (
          <Fragment key={i}>
            {bloque.lineas.map((linea, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderSegmentos(linea)}
              </Fragment>
            ))}
          </Fragment>
        )
      })}
    </>
  )
}
