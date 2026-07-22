import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { Box, Chip, Paper, Typography } from '@mui/material'
import type { ObraVisor } from '../../types/obra.types'

export interface ParadaTemporal {
  etiqueta: string
  descripcion: string
  color: string
  obras: ObraVisor[]
}

// Cuenta de 0 al valor real en ~0.8s — el mismo número estático se siente
// plano; contarlo hace que la vista transmita movimiento apenas carga.
function ContadorAnimado({ valor }: { valor: number }) {
  const motionValue = useMotionValue(0)
  const [mostrado, setMostrado] = useState(0)

  useEffect(() => {
    const controles = animate(motionValue, valor, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setMostrado(Math.round(v)),
    })
    return () => controles.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return <>{mostrado}</>
}

const MAX_OBRAS_LISTADAS = 5

export function RielTemporal({ paradas }: { paradas: ParadaTemporal[] }) {
  return (
    <Box>
      {paradas.map((parada, indice) => {
        const esUltima = indice === paradas.length - 1
        return (
          <Box key={parada.etiqueta} sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: indice * 0.15, type: 'spring', stiffness: 300, damping: 18 }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: parada.color,
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              {!esUltima && (
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: indice * 0.15 + 0.15, duration: 0.5, ease: 'easeOut' }}
                  style={{ width: 2, flex: 1, minHeight: 40, background: 'rgba(10, 30, 61, 0.12)', transformOrigin: 'top' }}
                />
              )}
            </Box>

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: indice * 0.15 + 0.1, duration: 0.4, ease: 'easeOut' }}
              style={{ flex: 1, marginBottom: 32 }}
            >
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="h6">{parada.etiqueta}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: parada.color, lineHeight: 1 }}>
                    <ContadorAnimado valor={parada.obras.length} />
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: parada.obras.length ? 1.5 : 0 }}>
                  {parada.descripcion}
                </Typography>

                {parada.obras.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {parada.obras.slice(0, MAX_OBRAS_LISTADAS).map((obra) => (
                      <Chip key={obra.obraId} size="small" label={obra.nombre} sx={{ maxWidth: 260 }} />
                    ))}
                    {parada.obras.length > MAX_OBRAS_LISTADAS && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`+${parada.obras.length - MAX_OBRAS_LISTADAS} más`}
                      />
                    )}
                  </Box>
                )}
              </Paper>
            </motion.div>
          </Box>
        )
      })}
    </Box>
  )
}
