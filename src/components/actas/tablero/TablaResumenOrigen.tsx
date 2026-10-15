import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { ESTADOS_COMPROMISO } from '../../../types/actas.types'
import type { ResumenOrigen } from '../../../utils/actas/tablero.util'

export function TablaResumenOrigen({ filas }: { filas: ResumenOrigen[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Origen</TableCell>
            <TableCell align="right">Total</TableCell>
            {ESTADOS_COMPROMISO.map((e) => (
              <TableCell key={e} align="right">
                {e}
              </TableCell>
            ))}
            <TableCell align="right">% avance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.origen}>
              <TableCell>{f.origen}</TableCell>
              <TableCell align="right">{f.total}</TableCell>
              {ESTADOS_COMPROMISO.map((e) => (
                <TableCell key={e} align="right">
                  {f[e]}
                </TableCell>
              ))}
              <TableCell align="right">{Math.round(f.avance * 100)}%</TableCell>
            </TableRow>
          ))}
          {filas.length === 0 && (
            <TableRow>
              <TableCell colSpan={ESTADOS_COMPROMISO.length + 3}>
                <Typography variant="body2" color="text.secondary">
                  Todavía no hay compromisos.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
