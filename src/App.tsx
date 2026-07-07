import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { store } from './store/store'
import { theme } from './theme/theme'
import { SeguimientoLayout } from './components/layout/SeguimientoLayout'
import { RutaProtegida } from './components/layout/RutaProtegida'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { LoginSeguimiento } from './pages/seguimiento/LoginSeguimiento'
import { MisVisitas } from './pages/seguimiento/MisVisitas'
import { RegistrarVisita } from './pages/seguimiento/RegistrarVisita'
import { RevisarVisitas } from './pages/seguimiento/RevisarVisitas'
import { HistorialObra } from './pages/seguimiento/HistorialObra'
import { MapaSeguimiento } from './pages/seguimiento/MapaSeguimiento'

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/seguimiento/mis-visitas" replace />} />
              <Route path="/seguimiento/login" element={<LoginSeguimiento />} />
              <Route element={<RutaProtegida />}>
                <Route path="/seguimiento" element={<SeguimientoLayout />}>
                  <Route path="mis-visitas" element={<MisVisitas />} />
                  <Route path="registrar/:obraId" element={<RegistrarVisita />} />
                  <Route path="revisar" element={<RevisarVisitas />} />
                  <Route path="historial/:obraId" element={<HistorialObra />} />
                  <Route path="mapa" element={<MapaSeguimiento />} />
                </Route>
              </Route>
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  )
}

export default App
