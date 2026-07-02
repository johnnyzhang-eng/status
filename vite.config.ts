import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages project path: johnnyzhang-eng.github.io/status/
export default defineConfig({
  base: '/status/',
  plugins: [react()],
})
