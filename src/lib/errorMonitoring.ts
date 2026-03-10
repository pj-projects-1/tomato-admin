// Error monitoring configuration
// Supports both Sentry (global) and Fundebug (China)

import type { App } from 'vue'
import type { Router } from 'vue-router'

// Types for optional imports
type SentryInstance = {
  init: (options: any) => void
  setTag: (key: string, value: string) => void
  setUser: (user: { id: string; email?: string; username?: string } | null) => void
  captureException: (error: Error) => void
}

type FundebugInstance = {
  apikey: string
  silent?: boolean
  setUser?: (user: { id: string; name?: string; email?: string }) => void
}

let sentry: SentryInstance | null = null
let fundebug: FundebugInstance | null = null

export function initErrorMonitoring(app: App, router: Router) {
  const isProduction = import.meta.env.PROD
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN
  const fundebugKey = import.meta.env.VITE_FUNDEBUG_APIKEY

  // Initialize Sentry (global error tracking)
  if (sentryDsn && isProduction) {
    import('@sentry/vue').then((Sentry) => {
      sentry = Sentry

      Sentry.init({
        app,
        dsn: sentryDsn,
        integrations: [
          Sentry.browserTracingIntegration({ router }),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],
        // Performance Monitoring
        tracesSampleRate: 0.1, // 10% of transactions
        // Session Replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of errors
        // Environment
        environment: import.meta.env.MODE,
        // Filter out known harmless errors
        ignoreErrors: [
          'NavigationDuplicated',
          'Navigation cancelled',
          'Redirected when going from',
          /Network Error/i,
          /timeout/i,
        ],
      })

      console.log('[ErrorMonitoring] Sentry initialized')
    }).catch((err) => {
      console.warn('[ErrorMonitoring] Failed to load Sentry:', err)
    })
  }

  // Initialize Fundebug (China error tracking)
  if (fundebugKey && isProduction) {
    try {
      // Fundebug uses a global initialization pattern
      fundebug = {
        apikey: fundebugKey,
        silent: false,
      }

      // Make it globally available for Fundebug's script
      ;(window as any).fundebug = fundebug

      // Load Fundebug script dynamically
      const script = document.createElement('script')
      script.src = 'https://js.fundebug.cn/fundebug.2.8.8.min.js'
      script.async = true
      script.onload = () => {
        console.log('[ErrorMonitoring] Fundebug initialized')
      }
      script.onerror = () => {
        console.warn('[ErrorMonitoring] Failed to load Fundebug script')
      }
      document.head.appendChild(script)
    } catch (err) {
      console.warn('[ErrorMonitoring] Failed to initialize Fundebug:', err)
    }
  }

  // Development mode: log errors to console with context
  if (!isProduction) {
    console.log('[ErrorMonitoring] Running in development mode - errors logged to console only')
  }
}

/**
 * Set user context for error reports
 * Call this after user logs in
 */
export function setErrorMonitoringUser(user: { id: string; email?: string; name?: string } | null) {
  if (!user) {
    // Clear user context on logout
    if (sentry) {
      sentry.setUser(null)
    }
    return
  }

  // Set Sentry user
  if (sentry) {
    sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    })
  }

  // Set Fundebug user
  if (fundebug && fundebug.setUser) {
    fundebug.setUser({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  }
}

/**
 * Manually capture an exception
 * Useful for caught errors that should still be reported
 */
export function captureError(error: Error, context?: Record<string, any>) {
  console.error('[ErrorMonitoring] Captured error:', error, context)

  if (sentry) {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        sentry!.setTag(key, String(value))
      })
    }
    sentry.captureException(error)
  }

  // Fundebug automatically captures uncaught errors
  // For manual capture, we rely on the global handler
}

/**
 * Track a custom event/breadcrumb
 */
export function addBreadcrumb(message: string, category?: string) {
  if (sentry) {
    import('@sentry/vue').then((Sentry) => {
      Sentry.addBreadcrumb({
        category: category || 'custom',
        message,
        level: 'info',
      })
    })
  }
}
