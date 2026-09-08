import { useState } from 'react'
import { Dialog } from '@mui/material'
import { useEnPantalla } from '../../hooks/useEnPantalla'
import { useFotoUrl } from '../../hooks/useFotoUrl'

const BASE_STYLE = { width: 120, height: 90, borderRadius: 4 }


interface FotoVisitaImgProps {
  storagePath: string
  // Si se pasa, se llama al hacer click en vez de abrir el dialog de zoom
  // interno — así CarruselFotos puede controlar la navegación entre fotos.
  onAbrir?: () => void
}

export function FotoVisitaImg({ storagePath, onAbrir }: FotoVisitaImgProps) {
  const { ref, visible } = useEnPantalla<HTMLDivElement>()
  const { url, error } = useFotoUrl(storagePath, visible)
  const [expandida, setExpandida] = useState(false)

  if (error) {
    return (
      <div
        ref={ref}
        style={{
          ...BASE_STYLE,
          background: '#fee2e2',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: 10,
          padding: 4,
        }}
      >
        No se pudo cargar la foto
      </div>
    )
  }

  if (!url) return <div ref={ref} style={{ ...BASE_STYLE, background: '#eee' }} />

  return (
    <div ref={ref}>
      <img
        src={url}
        alt=""
        style={{ ...BASE_STYLE, objectFit: 'cover', cursor: 'zoom-in' }}
        onClick={() => (onAbrir ? onAbrir() : setExpandida(true))}
      />
      {!onAbrir && (
        <Dialog open={expandida} onClose={() => setExpandida(false)} maxWidth="lg">
          <img
            src={url}
            alt=""
            style={{ display: 'block', maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            onClick={() => setExpandida(false)}
          />
        </Dialog>
      )}
    </div>
  )
}
