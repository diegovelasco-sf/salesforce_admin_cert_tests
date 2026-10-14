import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// El progreso se guarda en localStorage, que depende del origen: dev y preview
// usan el mismo puerto fijo para no "perder" las estadísticas al cambiar de puerto.
const port = 5173

export default defineConfig({
  plugins: [react()],
  server: { port, strictPort: true },
  preview: { port, strictPort: true },
  // El banco de preguntas (unos 420 kB de JSON) va dentro del bundle a propósito: la app es local y lo usa
  // entero desde el arranque, así que trocearlo no ahorra nada.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
