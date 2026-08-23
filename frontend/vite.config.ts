import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Playwright is pointed at :5173; a silent port shift would break PDF export
    proxy: {
      // Same-origin API calls in dev, so the client never needs a base URL.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
