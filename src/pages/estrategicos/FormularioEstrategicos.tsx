import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import EditNoteIcon from '@mui/icons-material/EditNote'
import TableViewIcon from '@mui/icons-material/TableView'
import { CargaMasiva } from './CargaMasiva'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
  createFilterOptions,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckIcon from '@mui/icons-material/Check'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import {
  anularReporte,
  cargarCatalogos,
  guardarReporte,
  obtenerReporte,
  type Dependencia,
  type ProyectoEstrategico,
  type ProyectoInversion,
} from '../../features/estrategicos/estrategicosApi'
import {
  codigoReporte,
  formatearMonto,
  parsearMonto,
  parsearPorcentaje,
  sumaPorcentajes,
  validarAportes,
  validarCampos,
  valorAportado,
  type AporteBorrador,
  type Campos,
} from '../../utils/estrategicos/reporte.util'
import { COLOR_ACENTO, COLOR_SIDEBAR } from '../../theme/theme'

const VIGENCIAS = ['2024', '2025', '2026']

const camposVacios = (base?: Partial<Campos>): Campos => ({
  vigencia: '2026',
  cenGestor: null,
  codBpin: '',
  codSap: '',
  nomProyecto: '',
  pptoInicial: null,
  totalPptoActual: null,
  ejeFinanciera: null,
  reportadoPor: '',
  correo: '',
  observaciones: '',
  ...base,
})
const aporteVacio = (): AporteBorrador => ({ proyectoEstrategicoId: null, porcentaje: '' })

const filtroProyectos = createFilterOptions<ProyectoInversion>({
  stringify: (p) => `${p.codBpin} ${p.codSap ?? ''} ${p.nombre}`,
  limit: 30,
})

export function FormularioEstrategicos() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const modoEdicion = Boolean(token)
  // ?modo=masivo en la URL: así se puede compartir el link directo a la carga por Excel.
  const [params, setParams] = useSearchParams()
  const masivo = !modoEdicion && params.get('modo') === 'masivo'
  const selectorModo = (
    <Paper elevation={0} sx={{ p: 0.75, mb: 2.5, borderRadius: 3, border: '1px solid #e3e8ef' }}>
      <ToggleButtonGroup exclusive fullWidth value={masivo ? 'masivo' : 'uno'}
        onChange={(_, v) => v && setParams(v === 'masivo' ? { modo: 'masivo' } : {}, { replace: true })}
        sx={{ '& .MuiToggleButton-root': { border: 0, borderRadius: '10px !important', py: 1.25, textTransform: 'none', fontWeight: 700, gap: 1 } }}>
        <ToggleButton value="uno"><EditNoteIcon fontSize="small" />Un proyecto</ToggleButton>
        <ToggleButton value="masivo"><TableViewIcon fontSize="small" />Varios proyectos (Excel)</ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  )

  const [catalogos, setCatalogos] = useState<{
    dependencias: Dependencia[]
    estrategicos: ProyectoEstrategico[]
    proyectos: ProyectoInversion[]
  } | null>(null)
  const [campos, setCampos] = useState<Campos>(camposVacios())
  const [aportes, setAportes] = useState<AporteBorrador[]>([aporteVacio()])
  const [reporteId, setReporteId] = useState<number | null>(null)
  const [anulado, setAnulado] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<{ id: number; token: string; editado: boolean } | null>(null)
  const [confirmarAnular, setConfirmarAnular] = useState(false)

  useEffect(() => {
    document.title = 'Proyectos estratégicos · Reporte de dependencias'
    let vigente = true
    Promise.all([cargarCatalogos(), token ? obtenerReporte(token) : Promise.resolve(null)])
      .then(([cats, rep]) => {
        if (!vigente) return
        setCatalogos(cats)
        if (token && !rep) {
          setErrorCarga('El enlace de edición no es válido. Revisa que lo hayas copiado completo.')
          return
        }
        if (rep) {
          setReporteId(rep.id)
          setAnulado(rep.estado === 'anulado')
          setCampos({
            vigencia: String(rep.vigencia),
            cenGestor: rep.cen_gestor,
            codBpin: rep.cod_bpin,
            codSap: rep.cod_sap ?? '',
            nomProyecto: rep.nom_proyecto,
            pptoInicial: Number(rep.ppto_inicial),
            totalPptoActual: Number(rep.total_ppto_actual),
            ejeFinanciera: Number(rep.eje_financiera),
            reportadoPor: rep.reportado_por,
            correo: rep.correo ?? '',
            observaciones: rep.observaciones ?? '',
          })
          setAportes(
            rep.aportes.map((a) => ({
              proyectoEstrategicoId: a.proyecto_estrategico_id,
              porcentaje: String(a.porcentaje).replace('.', ','),
            })),
          )
        }
      })
      .catch((e: Error) => vigente && setErrorCarga(e.message))
    return () => {
      vigente = false
    }
  }, [token])

  const errores = validarCampos(campos)
  const erroresAportes = validarAportes(aportes)
  const hayErrores = Object.keys(errores).length > 0 || Object.keys(erroresAportes.porFila).length > 0 || !!erroresAportes.general
  const suma = sumaPorcentajes(aportes)
  const err = (k: keyof Campos) => (intentado ? errores[k] : undefined)
  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setCampos((c) => ({ ...c, [k]: v }))
  // Avance por sección para el resumen lateral (escritorio) y la barra inferior (móvil).
  const seccionesListas = [
    !errores.vigencia && !errores.cenGestor && !errores.codBpin && !errores.codSap && !errores.nomProyecto,
    !errores.pptoInicial && !errores.totalPptoActual && !errores.ejeFinanciera,
    Object.keys(erroresAportes.porFila).length === 0 && !erroresAportes.general,
    !errores.reportadoPor && !errores.correo,
  ]
  const totalAportado = aportes.reduce((s, a) => s + (valorAportado(campos.ejeFinanciera, a.porcentaje) ?? 0), 0)
  const textoBoton = modoEdicion ? 'Guardar corrección' : 'Enviar reporte'

  const proyectosDeDependencia = useMemo(
    () => (catalogos?.proyectos ?? []).filter((p) => campos.cenGestor === null || p.cenGestor === campos.cenGestor),
    [catalogos, campos.cenGestor],
  )

  async function enviar() {
    setIntentado(true)
    setErrorGuardar(null)
    if (hayErrores) {
      // Lleva al primer campo con error para que no tengan que buscarlo.
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setGuardando(true)
    try {
      const r = await guardarReporte(
        {
          vigencia: Number(campos.vigencia),
          cen_gestor: campos.cenGestor!,
          cod_bpin: campos.codBpin,
          cod_sap: campos.codSap || null,
          nom_proyecto: campos.nomProyecto,
          ppto_inicial: campos.pptoInicial!,
          total_ppto_actual: campos.totalPptoActual!,
          eje_financiera: campos.ejeFinanciera!,
          reportado_por: campos.reportadoPor,
          correo: campos.correo || null,
          observaciones: campos.observaciones || null,
          aportes: aportes.map((a) => ({
            proyecto_estrategico_id: a.proyectoEstrategicoId!,
            porcentaje: parsearPorcentaje(a.porcentaje)!,
          })),
        },
        token,
      )
      setResultado({ ...r, editado: modoEdicion })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setErrorGuardar((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function anular() {
    if (!token) return
    setConfirmarAnular(false)
    setGuardando(true)
    try {
      await anularReporte(token)
      setAnulado(true)
    } catch (e) {
      setErrorGuardar((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  function registrarOtro() {
    // Conserva lo que se repite entre proyectos de la misma dependencia.
    setCampos((c) =>
      camposVacios({ vigencia: c.vigencia, cenGestor: c.cenGestor, reportadoPor: c.reportadoPor, correo: c.correo }),
    )
    setAportes([aporteVacio()])
    setIntentado(false)
    setResultado(null)
    if (modoEdicion) navigate('/estrategicos')
    window.scrollTo({ top: 0 })
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eef2f7', pb: { xs: 14, md: 8 } }}>
      <Box sx={{
        color: '#fff', px: 2, pt: { xs: 4, md: 7 }, pb: { xs: 10, md: 13 },
        // Degradado sobre el azul institucional: da profundidad sin imágenes externas.
        background: `radial-gradient(circle at 85% 0%, rgba(41,182,232,0.35), transparent 45%), linear-gradient(160deg, ${COLOR_SIDEBAR} 0%, #13325f 100%)`,
      }}>
        <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
          <Typography variant="overline" sx={{ color: COLOR_ACENTO, letterSpacing: 2, fontWeight: 700 }}>
            DAP · Unidad de Inversión Pública y Banco de Proyectos
          </Typography>
          <Typography component="h1" sx={{ fontSize: { xs: 26, md: 36 }, fontWeight: 800, lineHeight: 1.15, mt: 1 }}>
            Seguimiento del gasto de inversión en proyectos estratégicos
          </Typography>
          <Typography sx={{ mt: 1.5, opacity: 0.8, maxWidth: 640 }}>
            Registra, por cada proyecto de inversión, cuánto aporta a cada proyecto estratégico. Un formulario por
            proyecto y vigencia. Al enviar recibirás un código y un enlace para corregirlo.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
            {['Corte: septiembre 2026', '4 secciones · ~5 minutos', 'Puedes corregir después'].map((t) => (
              <Box key={t} sx={{
                px: 1.5, py: 0.5, borderRadius: 99, fontSize: 13, border: '1px solid rgba(255,255,255,0.25)',
                bgcolor: 'rgba(255,255,255,0.06)',
              }}>{t}</Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 1.5, sm: 2 }, mt: { xs: -7, md: -9 } }}>
        {errorCarga ? (
          <Paper sx={{ p: 4, maxWidth: 760, mx: 'auto' }}>
            <Alert severity="error">{errorCarga}</Alert>
            <Button sx={{ mt: 2 }} onClick={() => navigate('/estrategicos')}>Ir al formulario nuevo</Button>
          </Paper>
        ) : !catalogos ? (
          <Paper sx={{ p: 6, display: 'grid', placeItems: 'center', maxWidth: 760, mx: 'auto' }}>
            <CircularProgress />
          </Paper>
        ) : masivo ? (
          <Box sx={{ maxWidth: 880, mx: 'auto' }}>
            {selectorModo}
            <CargaMasiva catalogo={catalogos} />
          </Box>
        ) : resultado ? (
          <PantallaExito resultado={resultado} onOtro={registrarOtro} onCorregir={() => {
            setResultado(null)
            if (!modoEdicion) navigate(`/estrategicos/editar/${resultado.token}`)
          }} />
        ) : (
          <>
            {!modoEdicion && selectorModo}
            {modoEdicion && reporteId && (
              <Alert severity={anulado ? 'warning' : 'info'} sx={{ mb: 2 }}
                action={!anulado && (
                  <Button color="error" size="small" onClick={() => setConfirmarAnular(true)}>Anular reporte</Button>
                )}>
                {anulado
                  ? `${codigoReporte(reporteId)} está anulado. Si guardas, vuelve a quedar activo.`
                  : `Estás corrigiendo el reporte ${codigoReporte(reporteId)}.`}
              </Alert>
            )}

            <Box sx={{
              display: 'grid', gap: 3, alignItems: 'start',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' },
            }}>
            <Box sx={{ minWidth: 0 }}>
            <Seccion numero={1} titulo="Proyecto de inversión" lista={seccionesListas[0]}>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' } }}>
                <TextField select label="Vigencia" value={campos.vigencia} required
                  onChange={(e) => set('vigencia', e.target.value)} error={!!err('vigencia')} helperText={err('vigencia')}>
                  {VIGENCIAS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <Autocomplete
                  options={catalogos.dependencias}
                  value={catalogos.dependencias.find((d) => d.cenGestor === campos.cenGestor) ?? null}
                  onChange={(_, d) => set('cenGestor', d?.cenGestor ?? null)}
                  getOptionLabel={(d) => d.nombre}
                  isOptionEqualToValue={(a, b) => a.cenGestor === b.cenGestor}
                  renderOption={(props, d) => (
                    <li {...props} key={d.cenGestor}>
                      <Box>
                        <Typography variant="body2">{d.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">Centro gestor {d.cenGestor}</Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(p) => (
                    <TextField {...p} label="Dependencia" required error={!!err('cenGestor')} helperText={err('cenGestor')} />
                  )}
                />
              </Box>
              <Box sx={{ display: 'grid', gap: 2, mt: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 160px' } }}>
                <Autocomplete
                  freeSolo
                  options={proyectosDeDependencia}
                  filterOptions={filtroProyectos}
                  inputValue={campos.codBpin}
                  onInputChange={(_, v, motivo) => motivo === 'input' && set('codBpin', v.replace(/\D/g, ''))}
                  onChange={(_, p) => {
                    if (!p || typeof p === 'string') return
                    setCampos((c) => ({
                      ...c,
                      codBpin: p.codBpin,
                      codSap: p.codSap ?? '',
                      nomProyecto: p.nombre,
                      cenGestor: c.cenGestor ?? p.cenGestor,
                    }))
                  }}
                  getOptionLabel={(p) => (typeof p === 'string' ? p : p.codBpin)}
                  renderOption={(props, p) => (
                    <li {...props} key={p.codBpin}>
                      <Box>
                        <Typography variant="body2">{p.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">BPIN {p.codBpin} · SAP {p.codSap}</Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(p) => (
                    <TextField {...p} label="Código del proyecto de inversión (BPIN)" required
                      inputProps={{ ...p.inputProps, inputMode: 'numeric' }}
                      error={!!err('codBpin')}
                      helperText={err('codBpin') ?? 'Escribe el código o parte del nombre para buscarlo.'} />
                  )}
                />
                <TextField label="Código SAP" value={campos.codSap} inputProps={{ inputMode: 'numeric' }}
                  onChange={(e) => set('codSap', e.target.value.replace(/\D/g, ''))}
                  error={!!err('codSap')} helperText={err('codSap')} />
              </Box>
              <TextField fullWidth multiline sx={{ mt: 2 }} label="Nombre del proyecto" required value={campos.nomProyecto}
                onChange={(e) => set('nomProyecto', e.target.value)} error={!!err('nomProyecto')} helperText={err('nomProyecto')} />
            </Seccion>

            <Seccion numero={2} titulo="Presupuesto" lista={seccionesListas[1]} ayuda="Valores en pesos colombianos, sin decimales.">
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                <CampoMonto label="Presupuesto inicial" valor={campos.pptoInicial} onChange={(v) => set('pptoInicial', v)} error={err('pptoInicial')} />
                <CampoMonto label="Presupuesto total actual" valor={campos.totalPptoActual} onChange={(v) => set('totalPptoActual', v)} error={err('totalPptoActual')} />
                <CampoMonto label="Ejecución financiera" valor={campos.ejeFinanciera} onChange={(v) => set('ejeFinanciera', v)} error={err('ejeFinanciera')} />
              </Box>
              {campos.ejeFinanciera !== null && campos.totalPptoActual !== null && campos.ejeFinanciera > campos.totalPptoActual && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  La ejecución financiera es mayor que el presupuesto total actual. Verifica los valores antes de enviar.
                </Alert>
              )}
            </Seccion>

            <Seccion numero={3} titulo="Aporte a proyectos estratégicos" lista={seccionesListas[2]}
              ayuda="Agrega todos los proyectos estratégicos a los que aporta este proyecto. El valor se calcula sobre la ejecución financiera.">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {aportes.map((a, i) => {
                  const errFila = intentado ? erroresAportes.porFila[i] : undefined
                  const valor = valorAportado(campos.ejeFinanciera, a.porcentaje)
                  const elegidos = new Set(aportes.map((x) => x.proyectoEstrategicoId))
                  const cambiar = (cambio: Partial<AporteBorrador>) =>
                    setAportes((lista) => lista.map((x, j) => (j === i ? { ...x, ...cambio } : x)))
                  return (
                    <Box key={i} sx={{
                      display: 'grid', gap: 1.5, alignItems: 'start', p: 1.5, borderRadius: 2,
                      bgcolor: '#f7f9fc', border: '1px solid', borderColor: errFila ? 'error.light' : '#e3e8ef',
                      // Móvil: estratégico a lo ancho; debajo %, valor y quitar. Escritorio: todo en una fila.
                      gridTemplateColumns: { xs: '96px minmax(0, 1fr) 40px', lg: 'minmax(0, 1fr) 110px 160px 40px' },
                    }}>
                      <Autocomplete
                        sx={{ gridColumn: { xs: '1 / -1', lg: 'auto' } }}
                        options={catalogos.estrategicos}
                        value={catalogos.estrategicos.find((e) => e.id === a.proyectoEstrategicoId) ?? null}
                        onChange={(_, e) => cambiar({ proyectoEstrategicoId: e?.id ?? null })}
                        getOptionLabel={(e) => e.nombre}
                        getOptionDisabled={(e) => elegidos.has(e.id) && e.id !== a.proyectoEstrategicoId}
                        isOptionEqualToValue={(x, y) => x.id === y.id}
                        renderInput={(p) => (
                          <TextField {...p} size="small" label={`Proyecto estratégico ${i + 1}`} error={!!errFila} helperText={errFila} sx={{ bgcolor: '#fff' }} />
                        )}
                      />
                      <TextField size="small" label="%" value={a.porcentaje} sx={{ bgcolor: '#fff' }}
                        inputProps={{ inputMode: 'decimal' }}
                        error={!!errFila && !!a.proyectoEstrategicoId}
                        onChange={(e) => cambiar({ porcentaje: e.target.value.replace(/[^\d.,]/g, '') })}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
                      <Box sx={{ pt: 0.25, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">Valor aportado</Typography>
                        <Typography variant="body2" fontWeight={600} noWrap>{valor === null ? '—' : `$ ${formatearMonto(valor)}`}</Typography>
                      </Box>
                      <Tooltip title="Quitar">
                        <span>
                          <IconButton aria-label={`Quitar proyecto estratégico ${i + 1}`} disabled={aportes.length === 1}
                            onClick={() => setAportes((lista) => lista.filter((_, j) => j !== i))}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  )
                })}
              </Box>
              <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setAportes((l) => [...l, aporteVacio()])}
                disabled={aportes.length >= catalogos.estrategicos.length}>
                Agregar otro proyecto estratégico
              </Button>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Porcentaje asignado</Typography>
                  <Typography variant="body2" fontWeight={700} color={suma > 100 ? 'error.main' : 'text.primary'}>
                    {suma.toLocaleString('es-CO')} % de 100 %
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(suma, 100)} color={suma > 100 ? 'error' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }} />
                {intentado && erroresAportes.general && <Alert severity="error" sx={{ mt: 1.5 }}>{erroresAportes.general}</Alert>}
              </Box>
            </Seccion>

            <Seccion numero={4} titulo="Quién reporta" lista={seccionesListas[3]}>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField label="Nombre completo" required value={campos.reportadoPor}
                  onChange={(e) => set('reportadoPor', e.target.value)} error={!!err('reportadoPor')} helperText={err('reportadoPor')} />
                <TextField label="Correo institucional" type="email" value={campos.correo}
                  onChange={(e) => set('correo', e.target.value)} error={!!err('correo')}
                  helperText={err('correo') ?? 'Opcional, para contactarte si hay dudas.'} />
              </Box>
              <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="Observaciones (opcional)" value={campos.observaciones}
                inputProps={{ maxLength: 2000 }} onChange={(e) => set('observaciones', e.target.value)} />
            </Seccion>

            {errorGuardar && <Alert severity="error" sx={{ mb: 2 }}>{errorGuardar}</Alert>}
            {intentado && hayErrores && (
              <Alert severity="error" sx={{ mb: 2 }}>Hay campos por corregir. Están marcados en rojo.</Alert>
            )}
            </Box>

            {/* Escritorio: resumen fijo a la derecha mientras se baja por el formulario. */}
            <Paper elevation={0} sx={{
              display: { xs: 'none', md: 'block' }, position: 'sticky', top: 24,
              p: 3, borderRadius: 3, border: '1px solid #e3e8ef',
            }}>
              <Typography fontWeight={800} sx={{ mb: 2 }}>Resumen</Typography>
              {['Proyecto de inversión', 'Presupuesto', 'Proyectos estratégicos', 'Quién reporta'].map((t, i) => (
                <Box key={t} sx={{ display: 'flex', gap: 1.25, alignItems: 'center', py: 0.75 }}>
                  {seccionesListas[i]
                    ? <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                    : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />}
                  <Typography variant="body2" color={seccionesListas[i] ? 'text.primary' : 'text.secondary'}>{t}</Typography>
                </Box>
              ))}
              <Box sx={{ borderTop: '1px solid #e3e8ef', mt: 2, pt: 2 }}>
                <Typography variant="caption" color="text.secondary">Porcentaje asignado</Typography>
                <Typography fontWeight={800} fontSize={22} color={suma > 100 ? 'error.main' : 'text.primary'}>
                  {suma.toLocaleString('es-CO')} %
                </Typography>
                <LinearProgress variant="determinate" value={Math.min(suma, 100)} color={suma > 100 ? 'error' : 'primary'}
                  sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>Valor aportado total</Typography>
                <Typography fontWeight={700}>$ {formatearMonto(totalAportado)}</Typography>
              </Box>
              <Button fullWidth size="large" variant="contained" onClick={enviar} disabled={guardando}
                sx={{ mt: 3, py: 1.4, fontWeight: 700, bgcolor: COLOR_SIDEBAR, '&:hover': { bgcolor: '#14305c' } }}>
                {guardando ? <CircularProgress size={24} color="inherit" /> : textoBoton}
              </Button>
            </Paper>
            </Box>

            {/* Móvil y tablet: barra inferior fija, el botón siempre a mano. */}
            <Box sx={{
              display: { xs: 'flex', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10,
              gap: 1.5, alignItems: 'center', px: 2, py: 1.5, bgcolor: '#fff',
              borderTop: '1px solid #e3e8ef', boxShadow: '0 -6px 20px rgba(10,30,61,0.08)',
              pb: 'calc(12px + env(safe-area-inset-bottom))',
            }}>
              <Box sx={{ minWidth: 0, flex: '0 0 auto' }}>
                <Typography variant="caption" color="text.secondary" component="p" lineHeight={1.2}>
                  {seccionesListas.filter(Boolean).length} de 4 secciones
                </Typography>
                <Typography fontWeight={800} color={suma > 100 ? 'error.main' : 'text.primary'}>
                  {suma.toLocaleString('es-CO')} % asignado
                </Typography>
              </Box>
              <Button variant="contained" onClick={enviar} disabled={guardando}
                sx={{ ml: 'auto', flex: 1, maxWidth: 260, py: 1.25, fontWeight: 700, bgcolor: COLOR_SIDEBAR, '&:hover': { bgcolor: '#14305c' } }}>
                {guardando ? <CircularProgress size={22} color="inherit" /> : textoBoton}
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Dialog open={confirmarAnular} onClose={() => setConfirmarAnular(false)}>
        <DialogTitle>¿Anular este reporte?</DialogTitle>
        <DialogContent>
          <Typography>Dejará de contar en el consolidado. Podrás reactivarlo desde este mismo enlace guardándolo de nuevo.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarAnular(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={anular}>Anular</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function Seccion({ numero, titulo, ayuda, lista, children }: {
  numero: number; titulo: string; ayuda?: string; lista?: boolean; children: ReactNode
}) {
  return (
    <Paper component="section" elevation={0} sx={{
      p: { xs: 2, sm: 3, md: 4 }, mb: 2.5, borderRadius: 3, border: '1px solid #e3e8ef',
      boxShadow: '0 1px 2px rgba(10,30,61,0.04), 0 8px 24px rgba(10,30,61,0.04)',
    }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: ayuda ? 0.5 : 2.5 }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontWeight: 800,
          bgcolor: lista ? 'success.main' : COLOR_ACENTO, color: lista ? '#fff' : COLOR_SIDEBAR, transition: 'background-color .2s',
        }}>{lista ? <CheckIcon sx={{ fontSize: 18 }} /> : numero}</Box>
        <Typography component="h2" variant="h6" fontWeight={700}>{titulo}</Typography>
      </Box>
      {ayuda && <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, ml: { sm: 5.5 } }}>{ayuda}</Typography>}
      {children}
    </Paper>
  )
}

function CampoMonto({ label, valor, onChange, error }: {
  label: string; valor: number | null; onChange: (v: number | null) => void; error?: string
}) {
  return (
    <TextField label={label} required value={formatearMonto(valor)} error={!!error} helperText={error}
      inputProps={{ inputMode: 'numeric' }}
      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
      onChange={(e) => onChange(parsearMonto(e.target.value))} />
  )
}

function PantallaExito({ resultado, onOtro, onCorregir }: {
  resultado: { id: number; token: string; editado: boolean }; onOtro: () => void; onCorregir: () => void
}) {
  const enlace = `${window.location.origin}/estrategicos/editar/${resultado.token}`
  const [copiado, setCopiado] = useState(false)
  return (
    <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, border: '1px solid #e3e8ef', textAlign: 'center', maxWidth: 760, mx: 'auto' }}>
      <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main' }} />
      <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
        {resultado.editado ? 'Corrección guardada' : 'Reporte enviado'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>Código del reporte</Typography>
      <Typography sx={{ fontSize: 40, fontWeight: 800, letterSpacing: 2, color: COLOR_SIDEBAR }}>{codigoReporte(resultado.id)}</Typography>
      <Alert severity="warning" sx={{ mt: 3, textAlign: 'left' }}>
        <strong>Guarda este enlace.</strong> Es la única forma de corregir o anular este reporte más adelante.
      </Alert>
      <TextField fullWidth value={enlace} sx={{ mt: 2 }} InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <Button startIcon={<ContentCopyIcon />} onClick={() => {
              navigator.clipboard?.writeText(enlace).then(() => setCopiado(true)).catch(() => undefined)
            }}>{copiado ? 'Copiado' : 'Copiar'}</Button>
          </InputAdornment>
        ),
      }} onFocus={(e) => e.target.select()} />
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mt: 3, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={onOtro} sx={{ bgcolor: COLOR_SIDEBAR }}>Registrar otro proyecto</Button>
        <Button variant="outlined" onClick={onCorregir}>Corregir este reporte</Button>
      </Box>
    </Paper>
  )
}
