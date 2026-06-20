import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: '0.0.0.0',   // ← expose to network
    https: true,      // ← disable https
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws':  'http://localhost:8080'
    }
  }
})