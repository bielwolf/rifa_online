import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStartVite } from '@tanstack/start-plugin'

export default defineConfig({
  plugins: [
    tanstackStartVite({
      nitro: {
        preset: 'node-server'
      }
    }),
    react(),
  ],
})