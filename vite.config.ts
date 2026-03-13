import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // PWA for offline support and home screen install
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['Logo.png', 'favicon.ico'],
      manifest: {
        name: '四月红番天 - 有机番茄销售管理',
        short_name: '红番天',
        description: '有机番茄销售管理系统',
        theme_color: '#409EFF',
        background_color: '#f5f7fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'Logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'Logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'Logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Immediate update for fresh content
        skipWaiting: true,
        clientsClaim: true,
        // Cache strategies for China performance
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache Supabase API calls - NetworkFirst for fresh data
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 2, // 2 minutes - shorter for fresher data
              },
              networkTimeoutSeconds: 10, // Faster timeout for better UX
            },
          },
          {
            // Cache Amap static resources
            urlPattern: /^https:\/\/.*\.amap\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'amap-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // Cache API calls - NetworkFirst
            urlPattern: /^https:\/\/.*\.pages\.dev\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10, // Faster timeout
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60, // 1 minute
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid confusion
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    // China performance optimization: code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries for better caching
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          // Note: echarts removed - not currently used in the app
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Increase chunk size warning limit since we're splitting manually
    chunkSizeWarningLimit: 600,
  },
})
