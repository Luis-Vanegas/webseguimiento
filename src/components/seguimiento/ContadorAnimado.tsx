import { useEffect, useState } from 'react'
import { animate, useMotionValue } from 'framer-motion'

// Cuenta de 0 al valor real en ~0.8s — el mismo número estático se siente
// plano; contarlo transmite movimiento apenas carga la pantalla.
export function ContadorAnimado({ valor }: { valor: number }) {
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
