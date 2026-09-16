import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // keepNames (agregado para que el componentStack de ErrorBoundary sea
  // legible) rompe maplibre-gl en producción: maplibre arma el Worker de
  // tiles haciendo .toString() de sus propias funciones ya minificadas y
  // ejecutando ese texto en un scope aislado. El helper que keepNames
  // inyecta para restaurar fn.name (una sola var al tope del bundle) no
  // viaja con ese texto, así que el Worker revienta con "i is not defined"
  // apenas necesita parsear un tile — mapa en blanco en todo despliegue,
  // reproducido incluso en el deploy anterior a este fix. Sacar keepNames
  // es lo que hace falta para que el mapa funcione.
  //
  // El sourcemap queda: no tiene parte en este bug, y sirve el día que se
  // habilite en Project Settings de Vercel (hoy sirve los .map con 403).
  build: { sourcemap: true },
})
