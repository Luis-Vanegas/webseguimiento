import { configureStore } from '@reduxjs/toolkit'
import { seguimientoReducer } from '../features/seguimiento/seguimientoSlice'

export const store = configureStore({
  reducer: {
    seguimiento: seguimientoReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
