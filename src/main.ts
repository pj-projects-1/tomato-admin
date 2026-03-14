import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueVirtualScroller from 'vue-virtual-scroller'

import App from './App.vue'
import router from './router'
import { isAuthError } from './api/supabase'
import { checkUnsavedChanges } from './utils/errorRecovery'
import { initErrorMonitoring } from './lib/errorMonitoring'
import { useAuthStore } from './stores/auth'
import 'element-plus/dist/index.css'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
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

// Initialize app - mount immediately, auth runs in background
function initializeApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })
  app.use(VueVirtualScroller)

  // Initialize error monitoring (Sentry + Fundebug)
  initErrorMonitoring(app, router)

  // Register Element Plus icons
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  // Set global error handler
  app.config.errorHandler = globalErrorHandler

  // Mount app immediately - don't wait for auth
  // This improves perceived performance and allows immediate interaction
  app.mount('#app')

  // Initialize auth in background - router guards will wait for it
  const authStore = useAuthStore()
  authStore.initialize().catch((error) => {
    console.error('Auth initialization failed:', error)
    // Auth store handles the error state internally
  })

  // Remove loading indicator after mount
  const loadingEl = document.getElementById('app-loading')
  if (loadingEl) {
    loadingEl.style.display = 'none'
  }
}

// Start the app
initializeApp()

// Note: Service worker is handled by vite-plugin-pwa, no manual registration needed
