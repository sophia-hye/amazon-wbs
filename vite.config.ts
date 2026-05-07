import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages base path: https://sophia-hye.github.io/amazon-wbs/
export default defineConfig({
  base: '/amazon-wbs/',
  plugins: [react()],
})
