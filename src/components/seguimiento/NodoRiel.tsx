import { motion } from 'framer-motion'
import { Box } from '@mui/material'

interface NodoRielProps {
  color: string
  indice: number
  esUltimo: boolean
}

// Nodo circular + línea conectora del riel de una línea de tiempo —
// entrada escalonada por índice (nodo) y crecimiento hacia abajo (línea),
// para que la lista se sienta como un recorrido, no una tabla más.
export function NodoRiel({ color, indice, esUltimo }: NodoRielProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ delay: Math.min(indice, 10) * 0.06, type: 'spring', stiffness: 320, damping: 20 }}
        style={{ width: 14, height: 14, borderRadius: '50%', background: color, marginTop: 8, flexShrink: 0 }}
      />
      {!esUltimo && (
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: Math.min(indice, 10) * 0.06 + 0.1, duration: 0.4, ease: 'easeOut' }}
          style={{ width: 2, flex: 1, minHeight: 24, background: 'rgba(10, 30, 61, 0.12)', transformOrigin: 'top' }}
        />
      )}
    </Box>
  )
}
