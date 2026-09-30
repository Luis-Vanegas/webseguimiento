import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COLOR_DESVIACION_GRAVE,
  COLOR_DESVIACION_LEVE,
  formatearFechaNumerica,
  metricasInforme,
  nombreGrupoInforme,
} from './informe.util.ts'
import type { VisitaSeguimiento } from '../../types/seguimiento.types.ts'

function visita(parcial: Partial<VisitaSeguimiento>): VisitaSeguimiento {
  return {
    id: 'v1',
    obraId: 1,
    autorId: 'a1',
    autorRol: 'ingeniero',
    fechaVisita: '2026-09-23',
    fechaProximaVisita: null,
    porcentajeAvanceCampo: 27,
    observaciones: '',
    estado: 'pendiente_revisar',
    revisadoPor: null,
    fechaRevision: null,
    createdAt: '',
    updatedAt: '',
    vistoGerencia: false,
    ...parcial,
  }
}

test('formatea la fecha como dd/mm/aaaa sin correrse de día por huso horario', () => {
  assert.equal(formatearFechaNumerica('2026-09-23'), '23/09/2026')
})

test('sin métricas opcionales solo muestra el avance observado', () => {
  assert.deepEqual(metricasInforme(visita({})), [{ etiqueta: 'Avance observado', valor: '27%' }])
})

test('con programado agrega la desviación redondeada y coloreada según gravedad', () => {
  const grave = metricasInforme(visita({ porcentajeAvanceCampo: 27.5, porcentajeProgramado: 47.1 }))
  assert.deepEqual(grave[2], { etiqueta: 'Desviación', valor: '-19.6 p.p.', color: COLOR_DESVIACION_GRAVE })

  const leve = metricasInforme(visita({ porcentajeAvanceCampo: 20, porcentajeProgramado: 25 }))
  assert.equal(leve[2].color, COLOR_DESVIACION_LEVE)

  const adelantada = metricasInforme(visita({ porcentajeAvanceCampo: 30, porcentajeProgramado: 25 }))
  assert.deepEqual(adelantada[2], { etiqueta: 'Desviación', valor: '+5 p.p.', color: undefined })
})

test('incluye pagado, próximo frente y próxima visita solo si están cargados', () => {
  const etiquetas = metricasInforme(
    visita({ porcentajePagado: 11, proximoFrente: '42 pilas', fechaProximaVisita: '2026-10-23' }),
  ).map((m) => m.etiqueta)
  assert.deepEqual(etiquetas, ['Avance observado', 'Pagado', 'Próximo frente', 'Próxima visita'])
})

test('el grupo es el proyecto común en mayúsculas, o VARIOS si hay más de uno o ninguno', () => {
  assert.equal(nombreGrupoInforme(['Recreo deportivos', 'Recreo deportivos', null]), 'RECREO DEPORTIVOS')
  assert.equal(nombreGrupoInforme(['Recreo deportivos', 'Colegios']), 'VARIOS')
  assert.equal(nombreGrupoInforme([undefined]), 'VARIOS')
})
