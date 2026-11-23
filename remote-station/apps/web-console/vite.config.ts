import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8790',
      '/healthz': 'http://127.0.0.1:8790',
    },
  },
  test: {
    environment: 'jsdom',
    testTimeout: 20000,
    setupFiles: './src/test/setup.ts',
  },
})
