import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'
import * as api from './seguimientoApi'
import type { EditarVisitaInput, NuevaVisitaInput } from './seguimientoApi'

export interface SeguimientoState {
  misVisitas: VisitaSeguimiento[]
  pendientes: VisitaSeguimiento[]
  visitasObraActual: VisitaSeguimiento[]
  todasLasVisitas: VisitaSeguimiento[]
  cargando: boolean
  error: string | null
}

const estadoInicial: SeguimientoState = {
  misVisitas: [],
  pendientes: [],
  visitasObraActual: [],
  todasLasVisitas: [],
  cargando: false,
  error: null,
}

export const crearVisita = createAsyncThunk(
  'seguimiento/crearVisita',
  async (input: NuevaVisitaInput & { fotos?: File[] }) => {
    const { fotos = [], ...datos } = input
    const visita = await api.crearVisita(datos)
    for (let i = 0; i < fotos.length; i++) {
      await api.subirFoto(visita.id, fotos[i], null, i)
    }
    return visita
  },
)

export const listarMisVisitas = createAsyncThunk('seguimiento/listarMisVisitas', (autorId: string) =>
  api.listarMisVisitas(autorId),
)

export const listarPendientes = createAsyncThunk(
  'seguimiento/listarPendientes',
  (usuarioId: string) => api.listarPendientes(usuarioId),
)

export const listarVisitasDeObra = createAsyncThunk(
  'seguimiento/listarVisitasDeObra',
  (obraId: number) => api.listarVisitasDeObra(obraId),
)

export const editarVisita = createAsyncThunk(
  'seguimiento/editarVisita',
  (input: EditarVisitaInput) => api.editarVisita(input),
)

export const marcarEnRevision = createAsyncThunk(
  'seguimiento/marcarEnRevision',
  ({ id, usuarioId }: { id: string; usuarioId: string }) => api.marcarEnRevision(id, usuarioId),
)

export const marcarRevisada = createAsyncThunk(
  'seguimiento/marcarRevisada',
  ({ id, revisadoPor }: { id: string; revisadoPor: string }) => api.marcarRevisada(id, revisadoPor),
)

export const listarTodasLasVisitas = createAsyncThunk('seguimiento/listarTodasLasVisitas', () =>
  api.listarTodasLasVisitas(),
)

export const marcarVistoGerencia = createAsyncThunk(
  'seguimiento/marcarVistoGerencia',
  ({ id, visto }: { id: string; visto: boolean }) => api.marcarVistoGerencia(id, visto),
)

const thunksDeEstado = [
  crearVisita,
  listarMisVisitas,
  listarPendientes,
  listarVisitasDeObra,
  editarVisita,
  marcarEnRevision,
  marcarRevisada,
  listarTodasLasVisitas,
  marcarVistoGerencia,
]

function reemplazarEnListas(state: SeguimientoState, visita: VisitaSeguimiento) {
  for (const lista of ['misVisitas', 'pendientes', 'visitasObraActual', 'todasLasVisitas'] as const) {
    const idx = state[lista].findIndex((v) => v.id === visita.id)
    if (idx !== -1) state[lista][idx] = visita
  }
}

const seguimientoSlice = createSlice({
  name: 'seguimiento',
  initialState: estadoInicial,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(crearVisita.fulfilled, (state, action) => {
        state.misVisitas.unshift(action.payload)
      })
      .addCase(listarMisVisitas.fulfilled, (state, action) => {
        state.misVisitas = action.payload
      })
      .addCase(listarPendientes.fulfilled, (state, action) => {
        state.pendientes = action.payload
      })
      .addCase(listarVisitasDeObra.fulfilled, (state, action) => {
        state.visitasObraActual = action.payload
      })
      .addCase(editarVisita.fulfilled, (state, action) => {
        reemplazarEnListas(state, action.payload)
      })
      .addCase(marcarEnRevision.fulfilled, (state, action) => {
        reemplazarEnListas(state, action.payload)
      })
      .addCase(marcarRevisada.fulfilled, (state, action) => {
        reemplazarEnListas(state, action.payload)
      })
      .addCase(listarTodasLasVisitas.fulfilled, (state, action) => {
        state.todasLasVisitas = action.payload
      })
      .addCase(marcarVistoGerencia.fulfilled, (state, action) => {
        reemplazarEnListas(state, action.payload)
      })
      .addMatcher(isAnyOf(...thunksDeEstado.map((t) => t.pending)), (state) => {
        state.cargando = true
        state.error = null
      })
      .addMatcher(isAnyOf(...thunksDeEstado.map((t) => t.fulfilled)), (state) => {
        state.cargando = false
      })
      .addMatcher(isAnyOf(...thunksDeEstado.map((t) => t.rejected)), (state, action) => {
        state.cargando = false
        state.error = action.error.message ?? 'Error inesperado en seguimiento'
      })
  },
})

export const seguimientoReducer = seguimientoSlice.reducer
