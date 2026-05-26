import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const SCHEMA_VERSION = 1
const APP_VERSION = '1.0.0'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cacheId: `app-v${APP_VERSION}-schema-v${SCHEMA_VERSION}`,
      },
      manifest: {
        name: '가계부',
        short_name: '가계부',
        description: '개인 가계부 대시보드',
        theme_color: '#2563EB',
        background_color: '#F1F5F9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
