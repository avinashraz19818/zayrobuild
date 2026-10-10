import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    manifest: 'build-manifest.json',
    // Explicit Android WebView baseline; do not inherit Vite's moving modern-browser target.
    target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
    outDir: '../public',
    emptyOutDir: false,
  }
})
