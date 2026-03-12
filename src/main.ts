import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { isAuthError } from './api/supabase'
import { checkUnsavedChanges } from './utils/errorRecovery'
import { initErrorMonitoring } from './lib/errorMonitoring'
import { useAuthStore } from './stores/auth'
import 'element-plus/dist/index.css'
import './style.css'

// Global error handler for Vue errors - minimal, non-intrusive
const globalErrorHandler = (err: any, _instance: any, info: string) => {
  // Skip navigation errors (harmless, common when clicking rapidly)
  const errorMessage = (err as Error).message || ''
  if (
    errorMessage.includes('navigation') ||
    errorMessage.includes('NavigationDuplicated') ||
    errorMessage.includes('Avoided redundant navigation') ||
    errorMessage === 'cancel' ||
    errorMessage === 'close'
  ) {
    return
  }

  // Log for debugging, but don't spam user
  console.error('Vue error:', err, info)
}

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message = reason?.message || ''

  // Prevent default browser error logging (we handle it ourselves)
  event.preventDefault()

  // Skip cancellation-related errors
  if (reason === 'cancel' || reason === 'close' || message.includes('cancel') || message.includes('close')) {
    return
  }

  // Auth errors are handled by the supabase module
  if (isAuthError(reason)) {
    return
  }

  // Log for debugging
  console.error('Unhandled promise rejection:', reason)
})

// Handle beforeunload - warn about unsaved changes
window.addEventListener('beforeunload', (event) => {
  // Check for open dialogs or forms with values
  const dialogs = document.querySelectorAll('.el-dialog:not([style*="display: none"])')
  for (const dialog of dialogs) {
    const inputs = dialog.querySelectorAll('input, textarea')
    for (const input of inputs) {
      const el = input as HTMLInputElement | HTMLTextAreaElement
      if (el.value && el.value.trim() !== '') {
        event.preventDefault()
        event.returnValue = ''
        return
      }
    }
  }
})

// Initialize app with proper auth initialization order
async function initializeApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  // Initialize error monitoring (Sentry + Fundebug)
  initErrorMonitoring(app, router)

  // Register Element Plus icons
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  // Set global error handler
  app.config.errorHandler = globalErrorHandler

  // IMPORTANT: Initialize auth BEFORE mounting
  // This ensures session is loaded before router guards run
  const authStore = useAuthStore()
  await authStore.initialize()

  // Now mount the app - auth is ready
  app.mount('#app')
}

// Start the app
initializeApp().catch((error) => {
  console.error('Failed to initialize app:', error)
  // Still try to mount even if auth init fails
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })
  app.mount('#app')
})

// Register service worker with update handling for mobile reliability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      // Check for updates on page load (helps mobile reliability)
      await registration.update()

      // Handle updates - force reload when new version available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, force reload to get it
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        }
      })
    } catch {
      // Service Worker registration failed - app still works without SW
    }
  })

  // Reload when new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}
