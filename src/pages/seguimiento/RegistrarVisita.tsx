import { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { crearVisita, listarVisitasDeObra } from '../../features/seguimiento/seguimientoSlice'
import { useDatosFiltro } from '../../features/seguimiento/useDatosFiltro'
import { compararVisitas } from '../../utils/seguimiento/visita-comparator.util'
import { claveDeDate } from '../../utils/seguimiento/fechas.util'
import { CambioVisitaItem } from '../../components/seguimiento/CambioVisitaItem'
import { CapturaFotoCamara } from '../../components/seguimiento/CapturaFotoCamara'
import { Seccion } from '../../components/layout/Seccion'
import type { VisitaSeguimiento } from '../../types/seguimiento.types'

// El detalle es obligatorio solo para alertas de tipo "Otra" (regla de
// negocio del schema, ver comentario en supabase/schema.sql). El esquema
// depende del id real de ese tipo, que solo se conoce tras cargar el
// catálogo — de ahí que sea una función y no una constante.
function crearEsquemaVisita(idAlertaOtra: string | undefined) {
  return yup.object({
    fechaVisita: yup.string().required('La fecha de visita es obligatoria'),
    fechaProximaVisita: yup.string().nullable().defined(),
    porcentajeAvanceCampo: yup
      .number()
      .typeError('Ingresá un número')
      .min(0)
      .max(100)
      .required('Obligatorio'),
    observaciones: yup.string().default(''),
    alertas: yup
      .array(
        yup.object({
          tipoAlertaId: yup.string().required(),
          severidad: yup.string().oneOf(['baja', 'media', 'alta']).required(),
          detalle: yup
            .string()
            .nullable()
            .defined()
            .test(
              'detalle-obligatorio-otra',
              'Describí la alerta cuando el tipo es "Otra"',
              function (valor) {
                if (!idAlertaOtra || this.parent.tipoAlertaId !== idAlertaOtra) return true
                return !!valor && valor.trim().length > 0
              },
            ),
        }),
      )
      .default([]),
  })
}

type FormVisita = yup.InferType<ReturnType<typeof crearEsquemaVisita>>

// Secciones de un mismo Paper, con título uniforme — reutilizado tres veces
// en este formulario para no repetir el mismo bloque de estilos.
function DatoObra({
  etiqueta,
  valor,
  sx,
}: {
  etiqueta: string
  valor: string | null
  sx?: SxProps<Theme>
}) {
  return (
    <Box sx={sx}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {etiqueta}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {valor ?? '—'}
      </Typography>
    </Box>
  )
}

export function RegistrarVisita() {
  const { obraId } = useParams<{ obraId: string }>()
  const obraIdNum = Number(obraId)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { usuario } = useUsuarioActual()
  const { obraPorId, tiposAlerta } = useDatosFiltro()
  const obra = obraPorId.get(obraIdNum)
  const { visitasObraActual } = useAppSelector((state) => state.seguimiento)
  const [fotos, setFotos] = useState<File[]>([])
  const [convirtiendoFotos, setConvirtiendoFotos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const idAlertaOtra = useMemo(() => tiposAlerta.find((t) => t.nombre === 'Otra')?.id, [tiposAlerta])
  const esquemaVisita = useMemo(() => crearEsquemaVisita(idAlertaOtra), [idAlertaOtra])

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormVisita>({
    resolver: yupResolver(esquemaVisita),
    defaultValues: {
      fechaVisita: claveDeDate(new Date()),
      fechaProximaVisita: null,
      porcentajeAvanceCampo: 0,
      observaciones: '',
      alertas: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'alertas' })

  useEffect(() => {
    if (obraIdNum) dispatch(listarVisitasDeObra(obraIdNum))
  }, [dispatch, obraIdNum])

  const visitaAnterior = useMemo(
    () => (visitasObraActual.length > 0 ? visitasObraActual[visitasObraActual.length - 1] : null),
    [visitasObraActual],
  )

  // Tarjeta de contexto: compara el borrador actual del form contra la
  // última visita registrada para esta obra (sección 7 del brief).
  const avanceCampo = watch('porcentajeAvanceCampo')
  const alertasForm = watch('alertas')

  const cambios = useMemo(() => {
    const borrador: VisitaSeguimiento = {
      id: 'borrador',
      obraId: obraIdNum,
      autorId: usuario?.id ?? '',
      autorRol: usuario?.rol ?? 'visitador',
      fechaVisita: new Date().toISOString(),
      fechaProximaVisita: null,
      porcentajeAvanceCampo: Number(avanceCampo) || 0,
      observaciones: '',
      estado: 'pendiente_revisar',
      revisadoPor: null,
      fechaRevision: null,
      createdAt: '',
      updatedAt: '',
      vistoGerencia: false,
      alertas: (alertasForm ?? []).map((a, i) => ({
        id: `borrador-${i}`,
        visitaId: 'borrador',
        tipoAlertaId: a.tipoAlertaId,
        detalle: a.detalle ?? null,
        severidad: a.severidad as 'baja' | 'media' | 'alta',
      })),
      fotos: [],
    }
    return compararVisitas(borrador, visitaAnterior)
  }, [avanceCampo, alertasForm, visitaAnterior, obraIdNum, usuario])

  async function onSubmit(datos: FormVisita) {
    if (!usuario) return
    setEnviando(true)
    setError(null)

    try {
      await dispatch(
        crearVisita({
          obraId: obraIdNum,
          autorId: usuario.id,
          autorRol: usuario.rol,
          fechaVisita: datos.fechaVisita,
          // El input date deja '' (no null) cuando queda vacío; la columna es
          // `date` nullable en Postgres, así que hay que normalizar a null.
          fechaProximaVisita: datos.fechaProximaVisita || null,
          porcentajeAvanceCampo: datos.porcentajeAvanceCampo,
          observaciones: datos.observaciones ?? '',
          alertas: (datos.alertas ?? []).map((a) => ({
            tipoAlertaId: a.tipoAlertaId,
            detalle: a.detalle ?? null,
            severidad: a.severidad,
          })),
          fotos,
        }),
      ).unwrap()
      navigate('/seguimiento/mis-visitas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado en seguimiento')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }} component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h5">Registrar visita</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: obra ? 0.5 : 3 }}>
        {obra ? `${obra.nombre} (ID ${obraIdNum})` : `Obra sin datos oficiales (ID ${obraIdNum})`}
      </Typography>

      {obra && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Datos oficiales de la obra
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
            <DatoObra
              etiqueta="Estado"
              valor={obra.estado ? obra.estado.charAt(0).toUpperCase() + obra.estado.slice(1) : null}
            />
            <DatoObra etiqueta="Dependencia" valor={obra.dependencia} />
            <DatoObra etiqueta="Comuna / corregimiento" valor={obra.comuna} />
            <DatoObra etiqueta="Barrio" valor={obra.barrio} />
            <DatoObra etiqueta="Dirección" valor={obra.direccion} />
            <DatoObra
              etiqueta="Presupuesto oficial"
              valor={obra.presupuestoOficial.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
            />
            <DatoObra etiqueta="Avance oficial" valor={`${obra.porcentajeAvanceOficial}%`} />
            <DatoObra etiqueta="Fecha real de entrega" valor={obra.fechaRealEntrega} />
            <DatoObra etiqueta="Descripción" valor={obra.descripcion} sx={{ gridColumn: '1 / -1' }} />
          </Box>
        </Paper>
      )}

      {visitaAnterior && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2.5, bgcolor: '#f7f9fc' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Respecto a la visita anterior ({visitaAnterior.fechaVisita})
          </Typography>
          {cambios.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin cambios todavía — completá los datos de abajo.
            </Typography>
          ) : (
            cambios.map((c) => <CambioVisitaItem key={c.campo} cambio={c} tiposAlerta={tiposAlerta} />)
          )}
        </Paper>
      )}

      <Seccion titulo="Datos de la visita">
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField
            label="Fecha de visita"
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 200px' }}
            {...register('fechaVisita')}
            error={!!errors.fechaVisita}
            helperText={errors.fechaVisita?.message}
          />
          <TextField
            label="Próxima visita estimada"
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: '1 1 200px' }}
            {...register('fechaProximaVisita')}
          />
        </Box>

        <TextField
          label="% de avance observado en campo"
          type="number"
          fullWidth
          sx={{ mb: 2 }}
          {...register('porcentajeAvanceCampo')}
          error={!!errors.porcentajeAvanceCampo}
          helperText={errors.porcentajeAvanceCampo?.message}
        />

        <TextField
          label="Observaciones"
          multiline
          minRows={3}
          fullWidth
          {...register('observaciones')}
        />
      </Seccion>

      <Seccion titulo="Alertas de campo">
        {fields.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Sin alertas registradas.
          </Typography>
        )}
        {fields.map((field, index) => (
          <Box key={field.id}>
            {index > 0 && <Divider sx={{ my: 1.5 }} />}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Controller
                control={control}
                name={`alertas.${index}.tipoAlertaId`}
                render={({ field: f }) => (
                  <TextField {...f} select label="Tipo de alerta" sx={{ flex: 2, minWidth: 120 }}>
                    {tiposAlerta.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.nombre}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                control={control}
                name={`alertas.${index}.severidad`}
                render={({ field: f }) => (
                  <TextField {...f} select label="Severidad" sx={{ flex: 1, minWidth: 100 }}>
                    <MenuItem value="baja">Baja</MenuItem>
                    <MenuItem value="media">Media</MenuItem>
                    <MenuItem value="alta">Alta</MenuItem>
                  </TextField>
                )}
              />
              <IconButton onClick={() => remove(index)} size="small" sx={{ flexShrink: 0 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <TextField
              label={
                alertasForm?.[index]?.tipoAlertaId === idAlertaOtra
                  ? 'Descripción de la alerta (obligatoria)'
                  : 'Descripción de la alerta (opcional)'
              }
              multiline
              minRows={2}
              fullWidth
              sx={{ mt: 1 }}
              {...register(`alertas.${index}.detalle`)}
              error={!!errors.alertas?.[index]?.detalle}
              helperText={errors.alertas?.[index]?.detalle?.message}
            />
          </Box>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          sx={{ mt: fields.length > 0 ? 2 : 0 }}
          onClick={() => append({ tipoAlertaId: tiposAlerta[0]?.id ?? '', severidad: 'media', detalle: null })}
          disabled={tiposAlerta.length === 0}
        >
          Agregar alerta
        </Button>
      </Seccion>

      <Seccion titulo="Fotos">
        <CapturaFotoCamara
          fotos={fotos}
          onAgregar={(archivos) => setFotos((prev) => [...prev, ...archivos])}
          onQuitar={(indice) => setFotos((prev) => prev.filter((_, idx) => idx !== indice))}
          onProcesandoChange={setConvirtiendoFotos}
        />
      </Seccion>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        sx={{ mb: 4 }}
        disabled={enviando || convirtiendoFotos}
      >
        {enviando ? 'Guardando…' : 'Guardar visita'}
      </Button>
    </Box>
  )
}
