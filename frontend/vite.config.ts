import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as TanStackPlugin from '@tanstack/start-plugin'

// Suporta tanto exportação nomeada (TanStackStartVite / tanstackStartVite) quanto default
const tanStackStart = 
  TanStackPlugin.TanStackStartVite || 
  TanStackPlugin.tanstackStartVite || 
  (TanStackPlugin as any).default

export default defineConfig({
  plugins: [
    tanStackStart({
      nitro: {
        preset: 'node-server'
      }
    }),
    react(),
  ],
})