import { useEffect, useRef } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import { parsearTextoConFormato, type SegmentoTexto } from '../../utils/seguimiento/formatoTexto.util'

interface EditorTextoConFormatoProps {
  valor: string
  onCambiar: (valor: string) => void
  placeholder?: string
}

// Editor con negrita/itálica/lista visibles AL TOQUE mientras se escribe
// (WYSIWYG), no marcadores de Markdown crudos como en el intento anterior
// (BarraFormatoTexto + TextField). contentEditable + document.execCommand
// — deprecado pero universal para estos tres comandos puntuales — en vez de
// reinventar selección/rango a mano o sumar una librería de rich-text para
// tres botones.
//
// Sigue guardando el mismo subconjunto de Markdown que ya lee
// TextoConFormato.tsx (no HTML): el contenido inicial se arma con
// textContent/createElement (nunca parseando un string como markup), y cada
// tecleo se vuelve a serializar a ese mismo texto plano antes de subir el
// cambio — así una visita guardada por este editor y una guardada por el
// textarea viejo se leen exactamente igual.
export function EditorTextoConFormato({ valor, onCambiar, placeholder }: EditorTextoConFormatoProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) poblarContentEditable(ref.current, valor)
    // Solo al montar: es un componente no controlado a propósito — como
    // cualquier editor contentEditable en React, no pelea el cursor del
    // usuario re-poblando el DOM en cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function manejarInput() {
    if (ref.current) onCambiar(serializarContentEditable(ref.current))
  }

  function aplicarComando(comando: string) {
    document.execCommand(comando)
    manejarInput()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        <Tooltip title="Negrita">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicarComando('bold')}>
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Itálica">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicarComando('italic')}>
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Lista">
          <IconButton
            size="small"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => aplicarComando('insertUnorderedList')}
          >
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={manejarInput}
        data-placeholder={placeholder}
        sx={{
          minHeight: 84,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1.5,
          fontSize: 14,
          // Un contenteditable abre el teclado igual que un input: por debajo
          // de 16px iOS zoomea al enfocarlo, y este es el campo donde mas se
          // escribe estando en la obra. En escritorio se queda en 14.
          '@media (pointer: coarse)': { fontSize: 16 },
          fontFamily: 'inherit',
          lineHeight: 1.5,
          '&:focus': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -1 },
          '& ul': { margin: '4px 0', paddingLeft: '20px' },
          '&:empty::before': { content: 'attr(data-placeholder)', color: 'text.disabled' },
        }}
      />
    </Box>
  )
}

function crearNodoSegmento(segmento: SegmentoTexto): Node {
  if (segmento.tipo === 'negrita') {
    const strong = document.createElement('strong')
    strong.textContent = segmento.contenido
    return strong
  }
  if (segmento.tipo === 'italica') {
    const em = document.createElement('em')
    em.textContent = segmento.contenido
    return em
  }
  return document.createTextNode(segmento.contenido)
}

function poblarContentEditable(contenedor: HTMLElement, texto: string) {
  contenedor.textContent = ''
  const bloques = parsearTextoConFormato(texto)
  bloques.forEach((bloque, indice) => {
    if (indice > 0) contenedor.appendChild(document.createElement('br'))
    if (bloque.tipo === 'lista') {
      const ul = document.createElement('ul')
      for (const item of bloque.items) {
        const li = document.createElement('li')
        item.forEach((segmento) => li.appendChild(crearNodoSegmento(segmento)))
        ul.appendChild(li)
      }
      contenedor.appendChild(ul)
      return
    }
    bloque.lineas.forEach((linea, i) => {
      if (i > 0) contenedor.appendChild(document.createElement('br'))
      linea.forEach((segmento) => contenedor.appendChild(crearNodoSegmento(segmento)))
    })
  })
}

// Recorre el contenido inline de un nodo (texto/negrita/itálica/saltos) y lo
// vuelve al mismo subconjunto de Markdown que consume TextoConFormato.tsx.
function serializarInline(nodo: ChildNode): string {
  if (nodo.nodeType === Node.TEXT_NODE) return nodo.textContent ?? ''
  const el = nodo as HTMLElement
  const tag = el.tagName?.toLowerCase()
  if (tag === 'br') return '\n'
  const contenido = Array.from(el.childNodes).map(serializarInline).join('')
  if (tag === 'strong' || tag === 'b') return `**${contenido}**`
  if (tag === 'em' || tag === 'i') return `*${contenido}*`
  // div/p defensivos: algunos navegadores envuelven cada renglón en uno de
  // estos al tocar Enter en vez de insertar <br> — se trata igual como salto.
  if (tag === 'div' || tag === 'p') return `\n${contenido}`
  return contenido
}

function serializarContentEditable(raiz: HTMLElement): string {
  const partes: string[] = []
  for (const nodo of Array.from(raiz.childNodes)) {
    if (nodo.nodeType === Node.ELEMENT_NODE && (nodo as HTMLElement).tagName.toLowerCase() === 'ul') {
      const ul = nodo as HTMLElement
      const items = Array.from(ul.children).map(
        (li) => `- ${Array.from(li.childNodes).map(serializarInline).join('')}`,
      )
      partes.push(items.join('\n'))
    } else {
      partes.push(serializarInline(nodo))
    }
  }
  return partes
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
}
