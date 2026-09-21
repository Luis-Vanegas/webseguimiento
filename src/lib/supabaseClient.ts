import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// TEMPORAL: cliente Supabase para la fase de pruebas del módulo de seguimiento.
// Reemplazar cuando exista backend definitivo / se fusione con el Visor real.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — configura .env.local',
  )
}

// Tipado con el esquema real: renombrar o borrar una columna rompe la
// compilación en vez de fallar en runtime. Regenerar con `npm run db:tipos`.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
