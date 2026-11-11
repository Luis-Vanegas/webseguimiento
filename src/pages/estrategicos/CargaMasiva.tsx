import { useRef, useState, type ReactNode } from 'react'
import { readSheet } from 'read-excel-file/browser'
import { Alert, Box, Button, Chip, CircularProgress, LinearProgress, Paper, TextField, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { guardarReporte } from '../../features/estrategicos/estrategicosApi'
import { aCsv, aPayload, procesarFilas, type Catalogo, type Celda, type GrupoCarga } from '../../utils/estrategicos/cargaMasiva.util'
import { codigoReporte, formatearMonto, parsearPorcentaje } from '../../utils/estrategicos/reporte.util'
import { COLOR_ACENTO, COLOR_SIDEBAR } from '../../theme/theme'

const RE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
type Resultado = { ok: true; id: number; token: string } | { ok: false; error: string }

export function CargaMasiva({ catalogo }: { catalogo: Catalogo }) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [archivo, setArchivo] = useState<string | null>(null)
  const [filas, setFilas] = useState<Celda[][] | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [resultados, setResultados] = useState<Map<string, Resultado> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const nombreValido = nombre.trim().length >= 3
  const correoValido = !correo.trim() || RE_CORREO.test(correo.trim())
  // Se recalcula al cambiar nombre/correo porque van dentro de cada payload.
  const procesado = filas ? procesarFilas(filas, catalogo, { nombre, correo }) : null
  const grupos = procesado?.grupos ?? []
  const validos = grupos.filter((g) => g.errores.length === 0)
  const conError = grupos.length - validos.length

  async function leer(file: File) {
    setLeyendo(true)
    setErrorArchivo(null)
    setResultados(null)
    setFilas(null)
    setArchivo(file.name)
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Sube el archivo en formato .xlsx (la plantilla).')
      // Si renombraron la hoja, se lee la primera con datos.
      const datos = (await readSheet(file, 'Reporte').catch(() => readSheet(file))) as Celda[][]
      setFilas(datos)
      const r = procesarFilas(datos, catalogo, { nombre, correo })
      if (r.errorArchivo) setErrorArchivo(r.errorArchivo)
    } catch (e) {
      setErrorArchivo((e as Error).message || 'No se pudo leer el archivo.')
    } finally {
      setLeyendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function enviar() {
    setEnviando(true)
    const mapa = new Map<string, Resultado>()
    setResultados(new Map(mapa))
    // ponytail: envío secuencial; para miles de filas convendría una RPC por lotes.
    for (const g of validos) {
      try {
        const r = await guardarReporte(aPayload(g))
        mapa.set(g.clave, { ok: true, ...r })
      } catch (e) {
        mapa.set(g.clave, { ok: false, error: (e as Error).message })
      }
      setResultados(new Map(mapa))
    }
    setEnviando(false)
  }

  function descargarResultados() {
    const base = window.location.origin
    const csv = aCsv([
      ['reporte', 'vigencia', 'cod_sap', 'nom_proyecto', 'filas_excel', 'estado', 'enlace_correccion', 'detalle'],
      ...grupos.map((g) => {
        const r = resultados?.get(g.clave)
        const estado = !r ? (g.errores.length ? 'No enviado (errores)' : 'No enviado') : r.ok ? 'Enviado' : 'Rechazado'
        return [
          r?.ok ? codigoReporte(r.id) : '',
          g.campos.vigencia,
          g.campos.codSap,
          g.campos.nomProyecto,
          g.filas.join(', '),
          estado,
          r?.ok ? `${base}/estrategicos/editar/${r.token}` : '',
          r && 'error' in r ? r.error : g.errores.join(' | '),
        ]
      }),
    ])
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `resultado-carga-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const enviados = resultados ? [...resultados.values()].filter((r) => r.ok).length : 0
  const terminado = resultados !== null && !enviando

  return (
    <Box>
      <Paso numero={1} titulo="Descarga la plantilla">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Una fila por cada proyecto estratégico. Si un proyecto de inversión aporta a varios, repite sus datos (mismo código SAP)
          en varias filas. Escribe el porcentaje o el presupuesto que aporta: el otro se calcula. La suma de porcentajes de un
          proyecto de inversión no puede superar el 100 %.
        </Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} href="/plantilla-proyectos-estrategicos.xlsx" download>
          Descargar plantilla Excel
        </Button>
      </Paso>

      <Paso numero={2} titulo="Quién reporta">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField label="Nombre completo" required value={nombre} onChange={(e) => setNombre(e.target.value)}
            error={!!filas && !nombreValido} helperText={filas && !nombreValido ? 'Escribe tu nombre.' : undefined} />
          <TextField label="Correo institucional" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
            error={!correoValido} helperText={!correoValido ? 'Correo no válido.' : 'Opcional.'} />
        </Box>
      </Paso>

      <Paso numero={3} titulo="Sube el archivo">
        <Box
          component="label"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f && !enviando) leer(f)
          }}
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: { xs: 3, sm: 4 }, textAlign: 'center',
            border: '2px dashed', borderColor: errorArchivo ? 'error.light' : '#c7d2e0', borderRadius: 3, bgcolor: '#f7f9fc',
            cursor: enviando ? 'default' : 'pointer', transition: 'border-color .2s', '&:hover': { borderColor: COLOR_ACENTO },
          }}
        >
          <input ref={inputRef} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={enviando} onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} />
          {leyendo ? <CircularProgress size={32} /> : <UploadFileIcon sx={{ fontSize: 40, color: COLOR_SIDEBAR }} />}
          <Typography fontWeight={700}>{archivo ?? 'Arrastra aquí la plantilla llena o haz clic para elegirla'}</Typography>
          <Typography variant="caption" color="text.secondary">Formato .xlsx · máximo 2.000 filas</Typography>
        </Box>
        {errorArchivo && <Alert severity="error" sx={{ mt: 2 }}>{errorArchivo}</Alert>}
      </Paso>

      {grupos.length > 0 && (
        <Paso numero={4} titulo="Revisa y envía">
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label={`${grupos.length} proyectos`} />
            <Chip color="success" variant="outlined" label={`${validos.length} listos`} />
            {conError > 0 && <Chip color="error" variant="outlined" label={`${conError} con errores`} />}
            {resultados && <Chip color="primary" label={`${enviados} enviados`} />}
          </Box>
          {conError > 0 && !resultados && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Los proyectos con errores no se envían. Puedes enviar los que están listos y luego subir un archivo solo con los corregidos.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {grupos.map((g) => <TarjetaGrupo key={g.clave} grupo={g} resultado={resultados?.get(g.clave)} />)}
          </Box>

          {enviando && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>Enviando {resultados?.size ?? 0} de {validos.length}…</Typography>
              <LinearProgress variant="determinate" value={((resultados?.size ?? 0) / Math.max(validos.length, 1)) * 100} />
            </Box>
          )}

          {terminado ? (
            <>
              <Alert severity={enviados === validos.length ? 'success' : 'warning'} sx={{ mt: 2 }}>
                Se enviaron {enviados} de {validos.length} proyectos. <strong>Descarga el resultado:</strong> trae el código REP y el
                enlace de corrección de cada uno. Es la única forma de corregirlos después.
              </Alert>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2 }}>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={descargarResultados} sx={{ bgcolor: COLOR_SIDEBAR }}>
                  Descargar resultado (CSV)
                </Button>
                <Button onClick={() => { setFilas(null); setArchivo(null); setResultados(null) }}>Subir otro archivo</Button>
              </Box>
            </>
          ) : (
            <Button fullWidth size="large" variant="contained" disabled={enviando || validos.length === 0 || !nombreValido || !correoValido}
              onClick={enviar} sx={{ mt: 2, py: 1.4, fontWeight: 700, bgcolor: COLOR_SIDEBAR, '&:hover': { bgcolor: '#14305c' } }}>
              {enviando ? <CircularProgress size={24} color="inherit" /> : `Enviar ${validos.length} proyecto${validos.length === 1 ? '' : 's'}`}
            </Button>
          )}
          {!nombreValido && validos.length > 0 && !resultados && (
            <Typography variant="caption" color="error" component="p" sx={{ mt: 1 }}>Escribe tu nombre en el paso 2 para poder enviar.</Typography>
          )}
        </Paso>
      )}
    </Box>
  )
}

function TarjetaGrupo({ grupo: g, resultado }: { grupo: GrupoCarga; resultado?: Resultado }) {
  const malo = g.errores.length > 0 || (resultado && !resultado.ok)
  return (
    <Box sx={{
      p: 1.75, borderRadius: 2, border: '1px solid', bgcolor: '#fff',
      borderColor: malo ? 'error.light' : resultado?.ok ? 'success.light' : '#e3e8ef',
    }}>
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        {malo ? <ErrorOutlineIcon color="error" sx={{ mt: 0.25 }} /> : <CheckCircleIcon color={resultado?.ok ? 'success' : 'disabled'} sx={{ mt: 0.25 }} />}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{g.campos.nomProyecto || '(sin nombre)'}</Typography>
          <Typography variant="caption" color="text.secondary" component="p">
            {g.campos.vigencia} · SAP {g.campos.codSap || '—'} · {g.dependencia || 'sin dependencia'} · fila{g.filas.length > 1 ? 's' : ''} {g.filas.join(', ')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
            {g.aportes.map((a, i) => {
              const p = parsearPorcentaje(a.porcentaje)
              const pct = p === null ? '?' : p.toLocaleString('es-CO', { maximumFractionDigits: 2 })
              return (
                <Chip key={i} size="small" variant="outlined"
                  label={`${g.nombresEstrategicos[i] || '—'} · ${pct} %${a.valor !== null ? ` · $ ${formatearMonto(a.valor)}` : ''}`}
                  sx={{ maxWidth: '100%' }} />
              )
            })}
          </Box>
          {g.errores.map((e) => <Typography key={e} variant="body2" color="error" sx={{ mt: 0.75 }}>{e}</Typography>)}
          {g.advertencias.map((e) => <Typography key={e} variant="body2" sx={{ mt: 0.75, color: 'warning.dark' }}>{e}</Typography>)}
          {resultado && 'error' in resultado && <Typography variant="body2" color="error" sx={{ mt: 0.75 }}>{resultado.error}</Typography>}
        </Box>
        {resultado?.ok && <Chip color="success" label={codigoReporte(resultado.id)} sx={{ fontWeight: 700 }} />}
      </Box>
    </Box>
  )
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <Paper component="section" elevation={0} sx={{
      p: { xs: 2, sm: 3, md: 4 }, mb: 2.5, borderRadius: 3, border: '1px solid #e3e8ef',
      boxShadow: '0 1px 2px rgba(10,30,61,0.04), 0 8px 24px rgba(10,30,61,0.04)',
    }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '50%', bgcolor: COLOR_ACENTO, color: COLOR_SIDEBAR,
          display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0,
        }}>{numero}</Box>
        <Typography component="h2" variant="h6" fontWeight={700}>{titulo}</Typography>
      </Box>
      {children}
    </Paper>
  )
}
