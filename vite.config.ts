import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Sin esto, el stack que muestra ErrorBoundary en producción sale
  // minificado ("at Xe (index-a3f9.js:1:48210)") y no sirve para ubicar el
  // componente que falló — que es justamente para lo que se agregó.
  //
  // keepNames es lo que realmente funciona hoy: preserva los nombres de
  // funciones y clases, así el componentStack de React dice
  // "MapaSeguimiento", "Popup", "Marker" en vez de letras sueltas.
  // El sourcemap se genera igual, pero Vercel sirve los .map con 403 hasta
  // que se habilite en Project Settings; sin ese toggle no aporta nada.
  esbuild: { keepNames: true },
  build: { sourcemap: true },
})
