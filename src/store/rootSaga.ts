import { all } from 'redux-saga/effects'
import { seguimientoSaga } from '../features/seguimiento/seguimientoSaga'

export function* rootSaga() {
  yield all([seguimientoSaga()])
}
