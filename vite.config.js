import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

const destino = process.env.VITE_PROXY_TARGET || 'http://localhost:3020'

export default defineConfig({
  base: '/porteria/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Portería Los Olivos',
        short_name: 'Portería',
        lang: 'es',
        start_url: '/porteria/',
        scope: '/porteria/',
        display: 'standalone',
        background_color: '#f9fafb',
        theme_color: '#005a3d',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Solo el shell: la portería necesita red para registrar (sin modo offline, decisión 7 del diseño).
        globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
        navigateFallback: '/porteria/index.html',
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    port: Number(process.env.VITE_PORT || 5174),
    proxy: { '/api': { target: destino, changeOrigin: true } }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/*.spec.js'],
    setupFiles: ['./src/testing/setup.js']
  }
})
