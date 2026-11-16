import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// Backend runs on 8421; dev proxy forwards API + OAuth paths.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const API_TARGET = env.VITE_API_TARGET || 'http://localhost:8421'
  return {
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8420,
    host: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/oauth-continue.js': { target: API_TARGET, changeOrigin: true },
      '/oauth2': { target: API_TARGET, changeOrigin: true, bypass(req) { if (req.method === 'GET' && ['/oauth2/consent', '/oauth2/account-confirm'].includes(req.url.split('?')[0])) return '/index.html' } },
      '/oidc': { target: API_TARGET, changeOrigin: true },
      '/userinfo': { target: API_TARGET, changeOrigin: true },
      '/.well-known': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
  }
})
