import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages: set VITE_BASE_PATH to your repo name, e.g. /UnClutter/
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5174,
  },
})
