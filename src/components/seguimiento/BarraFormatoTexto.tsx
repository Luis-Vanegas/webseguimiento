import type { RefObject } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'

interface BarraFormatoTextoProps {
  valor: string
  onCambiar: (valor: string) => void
  textareaRef: RefObject<HTMLTextAreaElement>
}

// Aplica marcadores de Markdown (negrita/itálica/lista) sobre la selección
// actual del textarea de observaciones — mismo campo de texto de siempre,
// sin editor de rich-text nuevo. Se renderiza con TextoConFormato.tsx.
export function BarraFormatoTexto({ valor, onCambiar, textareaRef }: BarraFormatoTextoProps) {
  function envolverSeleccion(marcador: string) {
    const el = textareaRef.current
    if (!el) return
    const inicio = el.selectionStart ?? valor.length
    const fin = el.selectionEnd ?? valor.length
    const seleccion = valor.slice(inicio, fin) || 'texto'
    onCambiar(valor.slice(0, inicio) + marcador + seleccion + marcador + valor.slice(fin))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(inicio + marcador.length, inicio + marcador.length + seleccion.length)
    })
  }

  function agregarLista() {
    const el = textareaRef.current
    if (!el) return
    const inicio = el.selectionStart ?? valor.length
    const fin = el.selectionEnd ?? valor.length
    const seleccion = valor.slice(inicio, fin) || 'ítem'
    const conGuiones = seleccion
      .split('\n')
      .map((linea) => (linea.startsWith('- ') ? linea : `- ${linea}`))
      .join('\n')
    onCambiar(valor.slice(0, inicio) + conGuiones + valor.slice(fin))
    requestAnimationFrame(() => el.focus())
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
      <Tooltip title="Negrita">
        <IconButton size="small" onClick={() => envolverSeleccion('**')}>
          <FormatBoldIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Itálica">
        <IconButton size="small" onClick={() => envolverSeleccion('*')}>
          <FormatItalicIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Lista">
        <IconButton size="small" onClick={agregarLista}>
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
