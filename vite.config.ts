import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/entry.tsx',
      name: 'ReactBlocks',
      fileName: 'app',
      formats: ['iife'], // browser-ready
    },
  },
})
