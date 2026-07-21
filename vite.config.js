import { defineConfig, loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // load env into import.meta.env for Vite (do not manually define import.meta.env keys)
  loadEnv(mode, process.cwd())

  return {
    root: 'src',
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      open: true,
    },
  }
})
