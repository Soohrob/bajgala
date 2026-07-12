import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // relative asset paths so the build works on any static host (tiiny.host etc.)
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
    host: true,
  },
})
