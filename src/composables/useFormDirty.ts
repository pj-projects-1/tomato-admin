/**
 * Composable for tracking form dirty state
 * Automatically registers with the global error recovery system
 */

import { ref, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { registerUnsavedCheck, setHasUnsavedChanges } from '@/utils/errorRecovery'

type FormModel = Record<string, any>

/**
 * Track form dirty state and register with error recovery system
 */
export function useFormDirty(
  formModel: Ref<FormModel> | ComputedRef<FormModel>,
  options: {
    /**
     * Initial/clean state to compare against
     * If not provided, captures the initial state on mount
     */
    initialState?: Ref<FormModel> | FormModel
    /**
     * Custom dirty check function
     * Return true if form has unsaved changes
     */
    isDirty?: (current: FormModel, initial: FormModel) => boolean
    /**
     * Fields to ignore in comparison
     */
    ignoreFields?: string[]
  } = {}
) {
  const isDirty = ref(false)
  let initialState: FormModel = {}
  let cleanup: (() => void) | null = null

  // Deep compare two objects (ignoring specified fields)
  function deepEqual(a: any, b: any, ignore: Set<string> = new Set()): boolean {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (a === null || b === null) return a === b
    if (typeof a !== 'object') return a === b

    const keysA = Object.keys(a).filter(k => !ignore.has(k))
    const keysB = Object.keys(b).filter(k => !ignore.has(k))

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!deepEqual(a[key], b[key], ignore)) return false
    }

    return true
  }

  // Calculate dirty state
  function checkDirty(): boolean {
    if (options.isDirty) {
      return options.isDirty(formModel.value, initialState)
    }

    const ignoreSet = new Set(options.ignoreFields || [])
    return !deepEqual(formModel.value, initialState, ignoreSet)
  }

  onMounted(() => {
    // Capture initial state
    if (options.initialState) {
      initialState = typeof options.initialState === 'object' && 'value' in options.initialState
        ? JSON.parse(JSON.stringify(options.initialState.value))
        : JSON.parse(JSON.stringify(options.initialState))
    } else {
      initialState = JSON.parse(JSON.stringify(formModel.value))
    }

    // Register with global system
    cleanup = registerUnsavedCheck(() => isDirty.value)

    // Watch for changes
    watch(
      formModel,
      () => {
        isDirty.value = checkDirty()
        setHasUnsavedChanges(isDirty.value)
      },
      { deep: true }
    )

    // Initial check
    isDirty.value = checkDirty()
  })

  onUnmounted(() => {
    cleanup?.()
    setHasUnsavedChanges(false)
  })

  /**
   * Reset dirty state (call after successful save)
   */
  function resetDirty() {
    initialState = JSON.parse(JSON.stringify(formModel.value))
    isDirty.value = false
    setHasUnsavedChanges(false)
  }

  /**
   * Mark as having unsaved changes
   */
  function markDirty() {
    isDirty.value = true
    setHasUnsavedChanges(true)
  }

  return {
    isDirty,
    resetDirty,
    markDirty
  }
}

/**
 * Simpler version - just track if form has been touched
 */
export function useFormTouched() {
  const touched = ref(false)
  let cleanup: (() => void) | null = null

  onMounted(() => {
    cleanup = registerUnsavedCheck(() => touched.value)
  })

  onUnmounted(() => {
    cleanup?.()
    setHasUnsavedChanges(false)
  })

  function markTouched() {
    touched.value = true
    setHasUnsavedChanges(true)
  }

  function resetTouched() {
    touched.value = false
    setHasUnsavedChanges(false)
  }

  return {
    touched,
    markTouched,
    resetTouched
  }
}
