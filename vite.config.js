import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the browser talks to Vite, and Vite forwards /api and
// /api-auth to the Django server. To the browser it is all one site, so
// there is no CORS to deal with. Point VITE_API_TARGET at another server
// to use it instead (default: the local Django dev server).
const target = process.env.VITE_API_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target, changeOrigin: true },
    },
  },
})
