import { createClient } from '@supabase/supabase-js'
import { ElMessage } from 'element-plus'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Track auth state globally to prevent race conditions
let isRefreshingToken = false
let refreshPromise: Promise<void> | null = null

/**
 * Custom fetch with timeout and retry
 */
function createTimeoutFetch(timeoutMs: number = 15000) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Prevent multiple refresh attempts
    storageKey: 'tomato-admin-auth',
    storage: window.localStorage,
  },
  global: {
    headers: {
      'x-client-info': 'tomato-admin',
    },
    fetch: createTimeoutFetch(15000),
  },
  db: {
    schema: 'public',
  },
})

/**
 * Handle auth state errors and token refresh
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Session error:', error)
      return false
    }

    if (!session) {
      return false
    }

    // Check if token is about to expire (within 5 minutes)
    const expiresAt = session.expires_at
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt - now

      if (timeUntilExpiry < 300) { // Less than 5 minutes
        // Prevent concurrent refresh attempts
        if (isRefreshingToken && refreshPromise) {
          await refreshPromise
        } else {
          isRefreshingToken = true
          refreshPromise = (async () => {
            try {
              const { error: refreshError } = await supabase.auth.refreshSession()
              if (refreshError) {
                console.error('Token refresh failed:', refreshError)
                // If refresh fails, redirect to login
                localStorage.clear()
                window.location.href = '/login'
              }
            } finally {
              isRefreshingToken = false
              refreshPromise = null
            }
          })()
          await refreshPromise
        }
      }
    }

    return true
  } catch (error) {
    console.error('Session check failed:', error)
    return false
  }
}

/**
 * Check if an error is an auth error requiring re-login
 */
export function isAuthError(error: any): boolean {
  if (!error) return false

  const message = (error.message || '').toLowerCase()
  const status = error.status || error.code

  return (
    status === 401 ||
    status === 'PGRST301' ||
    message.includes('jwt') ||
    message.includes('token') ||
    message.includes('unauthorized') ||
    message.includes('session') ||
    message.includes('expired')
  )
}

/**
 * Check if an error is retryable (transient network issue)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false
  if (isAuthError(error)) return false // Auth errors should not be retried

  const message = (error.message || '').toLowerCase()
  const code = error.code || ''

  // Network/connection errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('abort') ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND'
  ) {
    return true
  }

  // Supabase/Postgres transient errors (but not auth errors)
  if (
    code === 'PGRST' ||
    message.includes('too many connections') ||
    message.includes('connection pool')
  ) {
    return true
  }

  return false
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry wrapper for Supabase queries
 * Automatically retries on transient errors with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<{ data: T; error: any }>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    context?: string
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { maxRetries = 2, baseDelay = 500, maxDelay = 5000, context } = options

  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Ensure valid session before operation
      const hasSession = await ensureValidSession()
      if (!hasSession) {
        return { data: null, error: { message: 'Session expired', status: 401 } }
      }

      const result = await operation()

      if (result.error) {
        lastError = result.error

        // Auth errors should not retry
        if (isAuthError(result.error)) {
          // Clear session and redirect
          localStorage.clear()
          if (window.location.pathname !== '/login') {
            ElMessage.warning('登录已过期，请重新登录')
            window.location.href = '/login'
          }
          return result
        }

        // Check if we should retry
        if (attempt < maxRetries && isRetryableError(result.error)) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          console.warn(`${context || 'Query'} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`)
          await sleep(delay)
          continue
        }

        // Non-retryable error or out of retries
        return result
      }

      return result
    } catch (error) {
      lastError = error

      // Auth errors should not retry
      if (isAuthError(error)) {
        localStorage.clear()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return { data: null, error }
      }

      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        console.warn(`${context || 'Query'} threw error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`)
        await sleep(delay)
        continue
      }

      return { data: null, error }
    }
  }

  return { data: null, error: lastError }
}

// Helper functions for common queries
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export const getProfile = async (userId: string): Promise<import('@/types').Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data as import('@/types').Profile
}

export const getCurrentStock = async () => {
  const { data, error } = await supabase.rpc('get_current_stock')
  if (error) throw error
  return data as number
}

// Set up auth state listener for proactive session management
supabase.auth.onAuthStateChange((event, _session) => {
  if (event === 'SIGNED_OUT') {
    localStorage.clear()
  }
})
