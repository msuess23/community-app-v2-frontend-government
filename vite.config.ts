import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const tauriDevHost = process.env.TAURI_DEV_HOST

export default defineConfig({
  // Keep Rust/Tauri diagnostics visible while the Vite dev server is running.
  clearScreen: false,
  plugins: [react(), tailwindcss()],

  build: {
    rolldownOptions: {
      output: {
        // Keep third-party code cacheable and prevent the application entry chunk from growing unchecked.
        codeSplitting: {
          groups: [
            {
              maxSize: 250_000,
              minSize: 20_000,
              name: 'vendor',
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    // Tauri expects the development server to stay on the configured port.
    port: 5173,
    strictPort: true,
    host: tauriDevHost || false,
    hmr: tauriDevHost
      ? {
          protocol: 'ws',
          host: tauriDevHost,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  test: {
    environment: 'jsdom',
    environmentOptions: {
      // Align relative generated API requests with the shared MSW handler origin.
      jsdom: { url: 'http://localhost/' },
    },
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
