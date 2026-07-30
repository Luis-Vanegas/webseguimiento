import { useEffect, useRef, useState } from 'react'

// Detecta cuándo un elemento entra en viewport (con margen de precarga) y
// deja de observar apenas lo detecta una vez — no hace falta seguir
// vigilando después de eso. Usado para no disparar de golpe el fetch de
// decenas de fotos que están fuera de pantalla (ver FotoVisitaImg.tsx).
export function useEnPantalla<T extends Element>(margen = '200px') {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: margen },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, margen])

  return { ref, visible }
}
