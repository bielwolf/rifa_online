import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanStackStartVite from '@tanstack/start-plugin'

export default defineConfig({
  plugins: [
    tanStackStartVite({
      nitro: {
        preset: 'node-server'
      }
    }),
    react(),
  ],
})