import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // El backend (src/web/app.py) monta esta carpeta como estático y sirve
    // index.html para cualquier ruta no-API (research.md §4) -- por eso el
    // build de producción tiene que caer exactamente aquí.
    outDir: 'dist',
  },
  server: {
    proxy: {
      // En desarrollo, el navegador solo habla con el puerto de Vite; las
      // llamadas a /api se reenvían al backend FastAPI para no tener que
      // configurar CORS (research.md §4).
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
