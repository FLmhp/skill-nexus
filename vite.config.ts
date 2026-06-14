import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Tauri requires relative paths — absolute paths (/) fail on custom protocol
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Prevent vite from obscuring Rust errors
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  // Env variables starting with TAURI_ will be exposed to tauri's source code
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri uses modern Chromium on Windows and modern WebKit on macOS/Linux
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome120' : 'safari17',
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
