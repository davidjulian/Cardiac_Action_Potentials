import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative assets allow the focused app to deploy from any GitHub Pages
  // repository name without editing this file.
  base: './',
})
