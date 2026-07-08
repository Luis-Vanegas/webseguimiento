import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'
import type { EditarVisitaInput, NuevaVisitaInput } from './seguimientoApi'

export interface SeguimientoState {
  misVisitas: VisitaSeguimiento[]
  pendientes: VisitaSeguimiento[]
  visitasObraActual: VisitaSeguimiento[]
  cargando: boolean
  error: string | null
}

const estadoInicial: SeguimientoState = {
  misVisitas: [],
  pendientes: [],
  visitasObraActual: [],
  cargando: false,
  error: null,
}

const seguimientoSlice = createSlice({
  name: 'seguimiento',
  initialState: estadoInicial,
  reducers: {
    // --- Crear visita ---
    crearVisitaSolicitada: (
      state,
      _action: PayloadAction<NuevaVisitaInput & { fotos?: File[] }>,
    ) => {
      state.cargando = true
      state.error = null
    },
    crearVisitaExito: (state, action: PayloadAction<VisitaSeguimiento>) => {
      state.misVisitas.unshift(action.payload)
      state.cargando = false
    },

    // --- Listar mis visitas ---
    listarMisVisitasSolicitada: (state, _action: PayloadAction<{ autorId: string }>) => {
      state.cargando = true
      state.error = null
    },
    listarMisVisitasExito: (state, action: PayloadAction<VisitaSeguimiento[]>) => {
      state.misVisitas = action.payload
      state.cargando = false
    },

    // --- Listar pendientes (bandeja del ingeniero) ---
    listarPendientesSolicitada: (state, _action: PayloadAction<{ usuarioId: string }>) => {
      state.cargando = true
      state.error = null
    },
    listarPendientesExito: (state, action: PayloadAction<VisitaSeguimiento[]>) => {
      state.pendientes = action.payload
      state.cargando = false
    },

    // --- Listar visitas de una obra (para HistorialObra) ---
    listarVisitasDeObraSolicitada: (state, _action: PayloadAction<{ obraId: number }>) => {
      state.cargando = true
      state.error = null
    },
    listarVisitasDeObraExito: (state, action: PayloadAction<VisitaSeguimiento[]>) => {
      state.visitasObraActual = action.payload
      state.cargando = false
    },

    // --- Editar visita ---
    editarVisitaSolicitada: (state, _action: PayloadAction<EditarVisitaInput>) => {
      state.cargando = true
      state.error = null
    },
    editarVisitaExito: (state, action: PayloadAction<VisitaSeguimiento>) => {
      reemplazarEnListas(state, action.payload)
      state.cargando = false
    },

    // --- Marcar en revisión / revisada ---
    marcarEnRevisionSolicitada: (
      state,
      _action: PayloadAction<{ id: string; usuarioId: string }>,
    ) => {
      state.cargando = true
      state.error = null
    },
    marcarRevisadaSolicitada: (
      state,
      _action: PayloadAction<{ id: string; revisadoPor: string }>,
    ) => {
      state.cargando = true
      state.error = null
    },
    marcarEstadoExito: (state, action: PayloadAction<VisitaSeguimiento>) => {
      reemplazarEnListas(state, action.payload)
      state.cargando = false
      state.error = null
    },

    // --- Error genérico de cualquier operación anterior ---
    operacionFallida: (state, action: PayloadAction<string>) => {
      state.cargando = false
      state.error = action.payload
    },
  },
})

function reemplazarEnListas(state: SeguimientoState, visita: VisitaSeguimiento) {
  for (const lista of ['misVisitas', 'pendientes', 'visitasObraActual'] as const) {
    const idx = state[lista].findIndex((v) => v.id === visita.id)
    if (idx !== -1) state[lista][idx] = visita
  }
}

export const {
  crearVisitaSolicitada,
  crearVisitaExito,
  listarMisVisitasSolicitada,
  listarMisVisitasExito,
  listarPendientesSolicitada,
  listarPendientesExito,
  listarVisitasDeObraSolicitada,
  listarVisitasDeObraExito,
  editarVisitaSolicitada,
  editarVisitaExito,
  marcarEnRevisionSolicitada,
  marcarRevisadaSolicitada,
  marcarEstadoExito,
  operacionFallida,
} = seguimientoSlice.actions

export const seguimientoReducer = seguimientoSlice.reducer
