import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { UsuarioSeguimiento } from '../../types/seguimiento.types'

interface EstadoUsuarioActual {
  usuario: UsuarioSeguimiento | null
  cargando: boolean
}

// Sesión + perfil del módulo (tabla usuarios_seguimiento), independiente del
// auth del Visor real (ver Decisión 5 del plan).
export function useUsuarioActual(): EstadoUsuarioActual {
  const [usuario, setUsuario] = useState<UsuarioSeguimiento | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    async function cargarPerfil(userId: string) {
      const { data } = await supabase
        .from('usuarios_seguimiento')
        .select('id, nombre, rol, activo')
        .eq('id', userId)
        .single()

      if (activo) {
        setUsuario(data as UsuarioSeguimiento | null)
        setCargando(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else if (activo) {
        setCargando(false)
      }
    })

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setUsuario(null)
        setCargando(false)
      }
    })

    return () => {
      activo = false
      suscripcion.subscription.unsubscribe()
    }
  }, [])

  return { usuario, cargando }
}
