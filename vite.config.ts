import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://lhuyett.github.io/smart-shuffle/ on GitHub Pages.
  base: '/smart-shuffle/',
  plugins: [react()],
})
