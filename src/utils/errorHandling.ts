/**
 * Error handling utilities
 * Reduces boilerplate and ensures consistent error handling across the app
 */

import { captureError } from '@/lib/errorMonitoring'

/**
 * Standard error result type for store actions
 */
export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Wraps an async operation with standard error handling
 * - Logs errors in development
 * - Reports to error monitoring in production
 * - Returns a consistent ActionResult
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<ActionResult<T>> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Log in development
    if (import.meta.env.DEV) {
      console.error(`${context || 'Operation'} failed:`, error)
    }

    // Report to error monitoring in production for unexpected errors
    if (import.meta.env.PROD && error instanceof Error) {
      captureError(error, { context: context || 'unknown' })
    }

    return { success: false, error: message }
  }
}

/**
 * Extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}

/**
 * Translate common database errors to user-friendly messages (Chinese)
 */
export function translateDbError(message: string): string {
  const translations: Record<string, string> = {
    'violates foreign key constraint': '关联数据不存在',
    'violates unique constraint': '数据已存在',
    'violates check constraint': '数据格式不正确',
    'permission denied': '没有权限执行此操作',
    'new row violates row-level security policy': '没有权限执行此操作',
  }

  for (const [key, value] of Object.entries(translations)) {
    if (message.toLowerCase().includes(key)) {
      return value
    }
  }

  return message
}
