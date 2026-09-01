import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Sin sourcemap, el stack que muestra ErrorBoundary en producción sale
  // minificado ("at Xe (index-a3f9.js:1:48210)") y no sirve para ubicar el
  // componente que falló — que es justamente para lo que se agregó.
  build: { sourcemap: true },
})
