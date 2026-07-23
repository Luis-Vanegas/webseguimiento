import type { UsuarioSeguimiento } from '../../types/seguimiento.types'

// Regla única para borrar visitas y recorridos: el autor puede borrar lo
// suyo, y cualquier ingeniero puede borrar de cualquiera (rol de supervisor).
// Un visitador o visualizador no puede borrar lo de otro.
export function puedeBorrar(autorId: string, usuario: UsuarioSeguimiento | null): boolean {
  if (!usuario) return false
  return usuario.id === autorId || usuario.rol === 'ingeniero'
}
