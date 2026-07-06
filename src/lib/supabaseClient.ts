import { createClient } from '@supabase/supabase-js'

// TEMPORAL: cliente Supabase para la fase de pruebas del módulo de seguimiento.
// Reemplazar cuando exista backend definitivo / se fusione con el Visor real.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — configura .env.local',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
