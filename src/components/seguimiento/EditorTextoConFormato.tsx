import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import { parsearTextoConFormato, type SegmentoTexto } from '../../utils/seguimiento/formatoTexto.util'

// La Web Speech API no esta en lib.dom.d.ts (sigue siendo borrador), asi que
// va el minimo que usamos. Chrome/Edge la exponen sin prefijo, Safari solo
// como webkitSpeechRecognition; donde no existe, el boton no se renderiza.
interface ResultadoVoz {
  isFinal: boolean
  0: { transcript: string }
}
interface EventoVoz {
  resultIndex: number
  results: { length: number; [i: number]: ResultadoVoz }
}
interface ReconocimientoVoz {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: EventoVoz) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type ConstructorVoz = new () => ReconocimientoVoz

function obtenerConstructorVoz(): ConstructorVoz | undefined {
  const w = window as unknown as {
    SpeechRecognition?: ConstructorVoz
    webkitSpeechRecognition?: ConstructorVoz
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

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
  const reconocimientoRef = useRef<ReconocimientoVoz | null>(null)
  const [dictando, setDictando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const soportaVoz = typeof window !== 'undefined' && obtenerConstructorVoz() !== undefined

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

  // Corta el dictado si el usuario navega con la grabacion abierta: el
  // reconocimiento sigue vivo aunque el nodo se desmonte.
  useEffect(() => () => reconocimientoRef.current?.stop(), [])

  function alternarDictado() {
    if (reconocimientoRef.current) {
      reconocimientoRef.current.stop()
      return
    }
    const Constructor = obtenerConstructorVoz()
    if (!Constructor || !ref.current) return

    const reconocimiento = new Constructor()
    reconocimiento.lang = 'es-CO'
    reconocimiento.continuous = true
    reconocimiento.interimResults = false
    reconocimiento.onresult = (evento) => {
      let texto = ''
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        if (evento.results[i].isFinal) texto += evento.results[i][0].transcript
      }
      if (texto.trim()) insertarEnEditor(texto.trim() + ' ')
    }
    // onend dispara tanto al parar a mano como por silencio o error, asi que
    // es el unico lugar donde se limpia el estado.
    reconocimiento.onend = () => {
      reconocimientoRef.current = null
      setDictando(false)
    }
    reconocimiento.onerror = () => reconocimiento.stop()

    reconocimiento.start()
    reconocimientoRef.current = reconocimiento
    setDictando(true)
  }

  function insertarEnEditor(texto: string) {
    const editor = ref.current
    if (!editor) return
    editor.focus()
    // Si el cursor quedo fuera del editor (el usuario toco otra cosa mientras
    // dictaba), el dictado se agrega al final en vez de caer en cualquier lado.
    const seleccion = window.getSelection()
    if (!seleccion?.anchorNode || !editor.contains(seleccion.anchorNode)) {
      const rango = document.createRange()
      rango.selectNodeContents(editor)
      rango.collapse(false)
      seleccion?.removeAllRanges()
      seleccion?.addRange(rango)
    }
    document.execCommand('insertText', false, texto)
    manejarInput()
  }

  async function copiar() {
    if (!ref.current) return
    await navigator.clipboard.writeText(serializarContentEditable(ref.current))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
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
        {soportaVoz && (
          <Tooltip title={dictando ? 'Detener dictado' : 'Dictar por voz'}>
            <IconButton
              size="small"
              color={dictando ? 'error' : 'default'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={alternarDictado}
            >
              {dictando ? <StopIcon fontSize="small" /> : <MicIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={copiado ? 'Copiado' : 'Copiar texto'}>
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={copiar}>
            {copiado ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
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
