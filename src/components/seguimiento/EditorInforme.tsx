import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { Box, Button, Divider, IconButton } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import TitleIcon from '@mui/icons-material/Title'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import FormatColorTextIcon from '@mui/icons-material/FormatColorText'
import TableChartIcon from '@mui/icons-material/TableChart'
import ImageIcon from '@mui/icons-material/Image'
import InsertPageBreakIcon from '@mui/icons-material/InsertPageBreak'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import CloseIcon from '@mui/icons-material/Close'
import { TextoConFormato } from './TextoConFormato'
import { urlFotoCacheada } from '../../hooks/useFotoUrl'
import { severidadMaxima } from '../../utils/seguimiento/alertas.util'
import {
  COLOR_DESVIACION_GRAVE,
  formatearFechaNumerica,
  metricasInforme,
  nombreGrupoInforme,
} from '../../utils/seguimiento/informe.util'
import type { TipoAlerta, VisitaSeguimiento } from '../../types/seguimiento.types'

interface EditorInformeProps {
  visitas: VisitaSeguimiento[]
  nombreObra: (obraId: number) => string
  direccionObra: (obraId: number) => string | null | undefined
  proyectoObra: (obraId: number) => string | null | undefined
  tiposAlerta: TipoAlerta[]
  onCerrar: () => void
}

const CLAVE_BORRADOR = 'seguimiento_borrador_informe'
// Tope de espera por las fotos: si alguna URL firmada no llega, se imprime
// igual en vez de colgar el botón para siempre.
const ESPERA_MAXIMA_FOTOS_MS = 20000

// Informe consolidado editable "tipo Word". La app arma un borrador con la
// estructura del informe (encabezado, una hoja por visita con métricas,
// texto, alertas y registro fotográfico, y una hoja final de alertas
// consolidadas) y el usuario lo edita libremente antes de descargarlo en PDF.
//
// contentEditable + document.execCommand, igual que EditorTextoConFormato:
// negrita, listas, títulos, color e imágenes los resuelve el navegador, y las
// tablas son <table> comunes que el contentEditable ya deja editar celda por
// celda (solo agregar/quitar filas y columnas es DOM a mano). El esqueleto se
// genera con renderToStaticMarkup — JSX que escapa el texto — y a partir de
// ahí el DOM es del usuario: React no lo vuelve a tocar.
//
// ponytail: el borrador vive en localStorage (un informe por navegador). Si
// hace falta reabrir informes desde otra PC o guardar un historial, pasar el
// HTML a una tabla `informes` en la BD.
export function EditorInforme({
  visitas,
  nombreObra,
  direccionObra,
  proyectoObra,
  tiposAlerta,
  onCerrar,
}: EditorInformeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inicializado = useRef(false)
  const rangoGuardado = useRef<Range | null>(null)
  const inputImagen = useRef<HTMLInputElement>(null)
  const intervaloPdf = useRef<ReturnType<typeof setInterval>>()
  const [preparando, setPreparando] = useState(false)
  const [sinGuardar, setSinGuardar] = useState(false)

  const grupo = nombreGrupoInforme(visitas.map((v) => proyectoObra(v.obraId)))
  const fechaLarga = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    // StrictMode monta dos veces: sin esto el confirm sale repetido.
    if (inicializado.current || !ref.current) return
    inicializado.current = true
    const borrador = leerBorrador()
    const continuar =
      borrador !== null &&
      window.confirm('Tenés un informe sin terminar. ¿Lo continuás?\n\nCancelar arma uno nuevo con las visitas elegidas.')
    // innerHTML seguro: o es markup de renderToStaticMarkup (texto escapado) o
    // el borrador que este mismo editor guardó en el localStorage del origen.
    ref.current.innerHTML = continuar
      ? borrador
      : renderToStaticMarkup(
          <DocumentoInforme
            visitas={visitas}
            nombreObra={nombreObra}
            direccionObra={direccionObra}
            tiposAlerta={tiposAlerta}
            encabezado={<Encabezado grupo={grupo} fecha={fechaLarga} />}
          />,
        )
    prepararImagenes(ref.current)
    guardar()
    // Solo al montar: después el contenido es del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si se cierra el editor mientras espera las fotos, que no quede un
  // window.print() pendiente que imprima la app sin el informe.
  useEffect(() => () => clearInterval(intervaloPdf.current), [])

  function guardar() {
    if (!ref.current) return
    // Las URLs firmadas vencen en una hora: se guarda solo la ruta y se
    // vuelven a pedir al reabrir.
    const copia = ref.current.cloneNode(true) as HTMLElement
    copia.querySelectorAll('img[data-storage-path]').forEach((img) => img.removeAttribute('src'))
    try {
      localStorage.setItem(CLAVE_BORRADOR, copia.innerHTML)
      setSinGuardar(false)
    } catch {
      // Cuota llena (imágenes pegadas muy pesadas): el editor sigue andando,
      // pero se avisa que ese estado no sobrevive a cerrar o recargar.
      setSinGuardar(true)
    }
  }

  function comando(nombre: string, valor?: string) {
    document.execCommand(nombre, false, valor)
    guardar()
  }

  function alternarTitulo() {
    const bloque = elementoEnCursor()?.closest('h3, p, div, li')
    comando('formatBlock', bloque?.tagName === 'H3' ? 'p' : 'h3')
  }

  function insertarTabla() {
    const fila = `<tr>${'<td><br></td>'.repeat(3)}</tr>`
    comando('insertHTML', `<table><tbody>${fila.repeat(3)}</tbody></table><p><br></p>`)
  }

  function modificarTabla(accion: 'agregarFila' | 'quitarFila' | 'agregarColumna' | 'quitarColumna') {
    const celda = elementoEnCursor()?.closest('td, th') as HTMLTableCellElement | null
    const tabla = celda?.closest('table')
    if (!celda || !tabla) return
    const fila = celda.parentElement as HTMLTableRowElement
    const indice = celda.cellIndex

    if (accion === 'agregarFila') {
      const nueva = fila.cloneNode(true) as HTMLTableRowElement
      for (const c of Array.from(nueva.cells)) c.innerHTML = '<br>'
      fila.after(nueva)
    }
    if (accion === 'quitarFila') fila.remove()
    for (const f of Array.from(tabla.rows)) {
      const referencia = f.cells[Math.min(indice, f.cells.length - 1)]
      if (!referencia) continue
      if (accion === 'agregarColumna') {
        const nueva = referencia.cloneNode(false) as HTMLElement
        nueva.removeAttribute('style')
        nueva.innerHTML = '<br>'
        referencia.after(nueva)
      }
      if (accion === 'quitarColumna') f.cells[indice]?.remove()
    }
    if (!tabla.rows[0]?.cells.length) tabla.remove()
    guardar()
  }

  function agregarHoja() {
    if (!ref.current) return
    ref.current.insertAdjacentHTML(
      'beforeend',
      renderToStaticMarkup(
        <section className="informe-hoja">
          <Encabezado grupo={grupo} fecha={fechaLarga} />
          <p>
            <br />
          </p>
        </section>,
      ),
    )
    prepararImagenes(ref.current)
    ref.current.lastElementChild?.scrollIntoView({ behavior: 'smooth' })
    guardar()
  }

  // El selector de archivos le saca el foco al editor: se guarda dónde estaba
  // el cursor para insertar la imagen ahí y no al principio del documento.
  function pedirImagen() {
    const seleccion = window.getSelection()
    if (seleccion?.rangeCount && ref.current?.contains(seleccion.anchorNode)) {
      rangoGuardado.current = seleccion.getRangeAt(0).cloneRange()
    }
    inputImagen.current?.click()
  }

  function insertarImagen(archivo: File | undefined) {
    if (!archivo || !ref.current) return
    const lector = new FileReader()
    lector.onload = () => {
      ref.current?.focus()
      if (rangoGuardado.current) {
        const seleccion = window.getSelection()
        seleccion?.removeAllRanges()
        seleccion?.addRange(rangoGuardado.current)
      }
      comando('insertImage', String(lector.result))
    }
    lector.readAsDataURL(archivo)
  }

  function elementoEnCursor(): Element | null {
    const nodo = window.getSelection()?.anchorNode
    const el = nodo instanceof Element ? nodo : (nodo?.parentElement ?? null)
    return el && ref.current?.contains(el) ? el : null
  }

  function descargarPdf() {
    setPreparando(true)
    const inicio = Date.now()
    clearInterval(intervaloPdf.current)
    const intervalo = setInterval(() => {
      const fotos = Array.from(ref.current?.querySelectorAll<HTMLImageElement>('img[data-storage-path]') ?? [])
      const listo = fotos.every((img) => img.dataset.error !== undefined || (img.src && img.complete))
      if (!listo && Date.now() - inicio < ESPERA_MAXIMA_FOTOS_MS) return
      clearInterval(intervalo)
      // El título del documento es el nombre que el navegador propone al
      // guardar el PDF.
      const tituloOriginal = document.title
      document.title = `Informe consolidado de visitas ${grupo} ${fechaLarga}`
      window.addEventListener(
        'afterprint',
        () => {
          document.title = tituloOriginal
          setPreparando(false)
        },
        { once: true },
      )
      window.print()
    }, 250)
    intervaloPdf.current = intervalo
  }

  // onMouseDown con preventDefault: que tocar la barra no le robe la
  // selección al texto (mismo truco que EditorTextoConFormato).
  const sinPerderSeleccion = (e: MouseEvent) => e.preventDefault()

  // createPortal y no el Portal de MUI: ese monta los hijos un render más
  // tarde, y el efecto de arriba encontraba el ref todavía en null.
  return createPortal(
    <Box id="editor-informe" sx={{ bgcolor: '#e9ebee', minHeight: '100vh', '@media print': { bgcolor: '#fff' } }}>
      <Box
        className="no-imprimir"
        onMouseDown={sinPerderSeleccion}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.5,
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* title nativo y no Tooltip de MUI: los Tooltip van en un portal
            aparte en <body>, que index.css oculta mientras el editor está abierto. */}
        <IconButton size="small" title="Negrita" onClick={() => comando('bold')}>
          <FormatBoldIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Itálica" onClick={() => comando('italic')}>
          <FormatItalicIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Subrayado" onClick={() => comando('underline')}>
          <FormatUnderlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Título / párrafo" onClick={alternarTitulo}>
          <TitleIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Viñetas" onClick={() => comando('insertUnorderedList')}>
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Lista numerada" onClick={() => comando('insertOrderedList')}>
          <FormatListNumberedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Texto en rojo" onClick={() => comando('foreColor', COLOR_DESVIACION_GRAVE)}>
          <FormatColorTextIcon fontSize="small" sx={{ color: COLOR_DESVIACION_GRAVE }} />
        </IconButton>
        <IconButton size="small" title="Texto en negro" onClick={() => comando('foreColor', '#000000')}>
          <FormatColorTextIcon fontSize="small" />
        </IconButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton size="small" title="Insertar tabla" onClick={insertarTabla}>
          <TableChartIcon fontSize="small" />
        </IconButton>
        <Button size="small" title="Agregar fila debajo" onClick={() => modificarTabla('agregarFila')}>
          + Fila
        </Button>
        <Button size="small" title="Agregar columna a la derecha" onClick={() => modificarTabla('agregarColumna')}>
          + Columna
        </Button>
        <Button size="small" title="Quitar fila" onClick={() => modificarTabla('quitarFila')}>
          − Fila
        </Button>
        <Button size="small" title="Quitar columna" onClick={() => modificarTabla('quitarColumna')}>
          − Columna
        </Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton size="small" title="Insertar imagen" onClick={pedirImagen}>
          <ImageIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Salto de página" onClick={() => comando('insertHTML', '<hr class="salto-pagina">')}>
          <InsertPageBreakIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Nueva hoja con encabezado" onClick={agregarHoja}>
          <NoteAddIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        {sinGuardar && (
          <Box component="span" sx={{ color: 'error.main', fontSize: 13, mr: 1 }}>
            El borrador es muy pesado para guardarse: descargá el PDF antes de cerrar.
          </Box>
        )}
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={descargarPdf} disabled={preparando}>
          {preparando ? 'Preparando…' : 'Descargar PDF'}
        </Button>
        <IconButton title="Cerrar (el borrador queda guardado)" onClick={onCerrar}>
          <CloseIcon />
        </IconButton>
        <input
          ref={inputImagen}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            insertarImagen(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </Box>

      <div
        ref={ref}
        className="informe-doc"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        lang="es"
        onInput={guardar}
      />
    </Box>,
    document.body,
  )
}

function leerBorrador(): string | null {
  try {
    return localStorage.getItem(CLAVE_BORRADOR)
  } catch {
    return null
  }
}

// Pide las URLs de las fotos: el HTML solo guarda la ruta en Storage.
function prepararImagenes(raiz: HTMLElement) {
  raiz.querySelectorAll<HTMLImageElement>('img[data-storage-path]').forEach((img) => {
    if (img.src) return
    urlFotoCacheada(img.dataset.storagePath!)
      .then((url) => (img.src = url))
      .catch(() => {
        img.dataset.error = ''
        img.alt = 'Foto no disponible'
      })
  })
}

function Encabezado({ grupo, fecha }: { grupo: string; fecha: string }) {
  return (
    <header className="informe-encabezado">
      <div className="informe-encabezado-texto">
        <strong>INFORME CONSOLIDADO DE VISITAS DE OBRA</strong>
        <br />
        Proyectos {grupo} | {fecha}
      </div>
    </header>
  )
}

function DocumentoInforme({
  visitas,
  nombreObra,
  direccionObra,
  tiposAlerta,
  encabezado,
}: {
  visitas: VisitaSeguimiento[]
  nombreObra: (obraId: number) => string
  direccionObra: (obraId: number) => string | null | undefined
  tiposAlerta: TipoAlerta[]
  encabezado: ReactNode
}) {
  const textoAlertas = (visita: VisitaSeguimiento) =>
    (visita.alertas ?? [])
      .map((a) => {
        const tipo = tiposAlerta.find((t) => t.id === a.tipoAlertaId)?.nombre ?? 'Alerta'
        return a.detalle ? `${tipo}: ${a.detalle}` : tipo
      })
      .join('; ')
  const conAlerta = visitas.filter((v) => ['media', 'alta'].includes(severidadMaxima(v.alertas) ?? ''))

  return (
    <>
      {visitas.map((visita) => {
        const direccion = direccionObra(visita.obraId)
        const metricas = metricasInforme(visita)
        const fotos = [...(visita.fotos ?? [])].sort((a, b) => a.orden - b.orden)
        const paresFotos = Array.from({ length: Math.ceil(fotos.length / 2) }, (_, i) => fotos.slice(i * 2, i * 2 + 2))
        const alertas = textoAlertas(visita)

        return (
          <section key={visita.id} className="informe-hoja">
            {encabezado}
            <h2>{nombreObra(visita.obraId).toUpperCase()}</h2>
            <p className="informe-subtitulo">
              {direccion ? `Dirección: ${direccion} | ` : ''}Visita: {formatearFechaNumerica(visita.fechaVisita)}
            </p>
            <table className="informe-metricas">
              <tbody>
                <tr>
                  {metricas.map((m) => (
                    <th key={m.etiqueta}>{m.etiqueta}</th>
                  ))}
                </tr>
                <tr>
                  {metricas.map((m) => (
                    <td key={m.etiqueta} style={m.color ? { color: m.color } : undefined}>
                      {m.valor}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {visita.observaciones ? (
              <div>
                <TextoConFormato texto={visita.observaciones} />
              </div>
            ) : (
              <>
                <p>
                  <strong>Estado de avance.</strong>{' '}
                </p>
                <p>
                  <strong>Hitos inmediatos.</strong>{' '}
                </p>
              </>
            )}
            <p>
              <strong style={severidadMaxima(visita.alertas) === 'alta' ? { color: COLOR_DESVIACION_GRAVE } : undefined}>
                Alertas.
              </strong>{' '}
              {alertas || 'Sin alertas registradas en la visita.'}
            </p>

            {paresFotos.length > 0 && (
              <>
                <h3>REGISTRO FOTOGRÁFICO</h3>
                <table className="informe-fotos">
                  <tbody>
                    {paresFotos.map((par) => (
                      <tr key={par[0].id}>
                        {par.map((foto) => (
                          <td key={foto.id}>
                            <img className="informe-foto" data-storage-path={foto.storagePath} alt="" />
                            <p className="informe-pie">Descripción de la foto</p>
                          </td>
                        ))}
                        {par.length === 1 && <td />}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )
      })}

      <section className="informe-hoja">
        {encabezado}
        <h2>ALERTAS CONSOLIDADAS DE MODIFICACIÓN</h2>
        {conAlerta.length === 0 && <p>Sin alertas de severidad media o alta en las visitas elegidas.</p>}
        {conAlerta.map((visita) => (
          <div key={visita.id} className="informe-alerta-obra">
            <h4>{nombreObra(visita.obraId)}</h4>
            <p>
              <strong>Costo:</strong> — <strong>Tiempo:</strong> — <strong>Alcance:</strong> —
            </p>
            <p className="informe-referencia">Alertas registradas: {textoAlertas(visita)}.</p>
          </div>
        ))}
        <p>
          <strong>Decisiones prioritarias.</strong>{' '}
        </p>
      </section>
    </>
  )
}
