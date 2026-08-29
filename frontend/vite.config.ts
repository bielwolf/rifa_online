import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackStartVite } from "@tanstack/start-plugin";

export default defineConfig({
  plugins: [
    TanStackStartVite({
      nitro: {
        preset: "node-server", // <-- GARANTA QUE ESTÁ COMO 'node-server'
      },
    }),
    react(),
  ],
});
