import { useEffect, useState } from 'react'
import { Box, Dialog, IconButton, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import { FotoVisitaImg } from './FotoVisitaImg'
import { useFotoUrl } from '../../hooks/useFotoUrl'
import type { FotoVisita } from '../../types/seguimiento.types'

// Fila de thumbnails (igual que antes) + un visor grande con navegación
// prev/next y flechas de teclado, en vez de abrir cada foto suelta en su
// propio dialog de zoom sin forma de pasar a la siguiente.
export function CarruselFotos({ fotos }: { fotos: FotoVisita[] }) {
  const ordenadas = [...fotos].sort((a, b) => a.orden - b.orden)
  const [indice, setIndice] = useState<number | null>(null)

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {ordenadas.map((foto, i) => (
          <FotoVisitaImg key={foto.id} storagePath={foto.storagePath} onAbrir={() => setIndice(i)} />
        ))}
      </Box>

      <Dialog open={indice !== null} onClose={() => setIndice(null)} maxWidth="lg" fullWidth>
        {indice !== null && (
          <VisorCarrusel
            fotos={ordenadas}
            indice={indice}
            onCambiar={setIndice}
            onCerrar={() => setIndice(null)}
          />
        )}
      </Dialog>
    </>
  )
}

interface VisorCarruselProps {
  fotos: FotoVisita[]
  indice: number
  onCambiar: (indice: number) => void
  onCerrar: () => void
}

function VisorCarrusel({ fotos, indice, onCambiar, onCerrar }: VisorCarruselProps) {
  const { url } = useFotoUrl(fotos[indice].storagePath)
  const hayAnterior = indice > 0
  const haySiguiente = indice < fotos.length - 1

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && hayAnterior) onCambiar(indice - 1)
      if (e.key === 'ArrowRight' && haySiguiente) onCambiar(indice + 1)
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [indice, hayAnterior, haySiguiente, onCambiar, onCerrar])

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
      }}
    >
      <IconButton onClick={onCerrar} sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 1 }}>
        <CloseIcon />
      </IconButton>

      {hayAnterior && (
        <IconButton
          onClick={() => onCambiar(indice - 1)}
          sx={{ position: 'absolute', left: 8, color: '#fff', zIndex: 1 }}
        >
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
      )}

      {url ? (
        <img
          src={url}
          alt=""
          style={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }}
        />
      ) : (
        <Typography sx={{ color: '#fff' }}>Cargando…</Typography>
      )}

      {haySiguiente && (
        <IconButton
          onClick={() => onCambiar(indice + 1)}
          sx={{ position: 'absolute', right: 8, color: '#fff', zIndex: 1 }}
        >
          <ChevronRightIcon fontSize="large" />
        </IconButton>
      )}

      <Typography sx={{ position: 'absolute', bottom: 8, color: '#fff', fontSize: 12 }}>
        {indice + 1} / {fotos.length}
      </Typography>
    </Box>
  )
}
