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
import 'element-plus/dist/index.css'
import './style.css'

const app = createApp(App)

// Initialize error monitoring (Sentry + Fundebug)
initErrorMonitoring(app, router)

// Register Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Global error handler for Vue errors - minimal, non-intrusive
app.config.errorHandler = (err, _instance, info) => {
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

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
