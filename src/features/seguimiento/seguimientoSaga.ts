import { call, put, takeEvery, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import * as api from './seguimientoApi'
import type { EditarVisitaInput, NuevaVisitaInput } from './seguimientoApi'
import {
  crearVisitaExito,
  crearVisitaSolicitada,
  editarVisitaExito,
  editarVisitaSolicitada,
  listarMisVisitasExito,
  listarMisVisitasSolicitada,
  listarPendientesExito,
  listarPendientesSolicitada,
  listarVisitasDeObraExito,
  listarVisitasDeObraSolicitada,
  marcarEnRevisionSolicitada,
  marcarEstadoExito,
  marcarRevisadaSolicitada,
  operacionFallida,
} from './seguimientoSlice'

function* crearVisitaWorker(action: PayloadAction<NuevaVisitaInput & { fotos?: File[] }>) {
  try {
    const { fotos = [], ...input } = action.payload
    const visita: Awaited<ReturnType<typeof api.crearVisita>> = yield call(api.crearVisita, input)

    for (let i = 0; i < fotos.length; i++) {
      yield call(api.subirFoto, visita.id, fotos[i], null, i)
    }

    yield put(crearVisitaExito(visita))
  } catch (err) {
    yield put(operacionFallida(mensajeError(err)))
  }
}

function* listarMisVisitasWorker(action: PayloadAction<{ autorId: string }>) {
  try {
    const visitas: Awaited<ReturnType<typeof api.listarMisVisitas>> = yield call(
      api.listarMisVisitas,
      action.payload.autorId,
    )
    yield put(listarMisVisitasExito(visitas))
  } catch (err) {
    yield put(operacionFallida(mensajeError(err)))
  }
}

function* listarPendientesWorker(action: PayloadAction<{ usuarioId: string }>) {
  try {
    const visitas: Awaited<ReturnType<typeof api.listarPendientes>> = yield call(
      api.listarPendientes,
      action.payload.usuarioId,
    )
    yield put(listarPendientesExito(visitas))
  } catch (err) {
    yield put(operacionFallida(mensajeError(err)))
  }
}

function* listarVisitasDeObraWorker(action: PayloadAction<{ obraId: number }>) {
  try {
    const visitas: Awaited<ReturnType<typeof api.listarVisitasDeObra>> = yield call(
      api.listarVisitasDeObra,
      action.payload.obraId,
    )
    yield put(listarVisitasDeObraExito(visitas))
  } catch (err) {
    yield put(operacionFallida(mensajeError(err)))
  }
}

function* editarVisitaWorker(action: PayloadAction<EditarVisitaInput>) {
  try {
    const visita: Awaited<ReturnType<typeof api.editarVisita>> = yield call(
      api.editarVisita,
      action.payload,
    )
    yield put(editarVisitaExito(visita))
  } catch (err) {
    yield put(operacionFallida(mensajeError(err)))
  }
}

function* marcarEnRevisionWorker(action: PayloadAction<{ id: string; usuarioId: string }>) {
  try {
    const visita: Awaited<ReturnType<typeof api.marcarEnRevision>> = yield call(
      api.marcarEnRevision,
      action.payload.id,
      action.payload.usuarioId,
    )
    yield put(marcarEstadoExito(visita))
  } catch (err) {
    yield put(operacionFallida(mensajeError(err)))
  }
}

function* marcarRevisadaWorker(action: PayloadAction<{ id: string; revisadoPor: string }>) {
  try {
    const visita: Awaited<ReturnType<typeof api.marcarRevisada>> = yield call(
      api.marcarRevisada,
      action.payload.id,
      action.payload.revisadoPor,
    )
    yield put(marcarEstadoExito(visita))
  } catch (err) {
    yield put(operacionFallida(mensajeError(err)))
  }
}

function mensajeError(err: unknown): string {
  return err instanceof Error ? err.message : 'Error inesperado en seguimiento'
}

export function* seguimientoSaga() {
  yield takeLatest(crearVisitaSolicitada.type, crearVisitaWorker)
  yield takeLatest(listarMisVisitasSolicitada.type, listarMisVisitasWorker)
  yield takeLatest(listarPendientesSolicitada.type, listarPendientesWorker)
  yield takeLatest(listarVisitasDeObraSolicitada.type, listarVisitasDeObraWorker)
  yield takeEvery(editarVisitaSolicitada.type, editarVisitaWorker)
  yield takeEvery(marcarEnRevisionSolicitada.type, marcarEnRevisionWorker)
  yield takeEvery(marcarRevisadaSolicitada.type, marcarRevisadaWorker)
}
