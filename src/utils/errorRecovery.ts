/**
 * Form dirty state detection for unsaved changes warning
 */

// Global state for tracking unsaved changes
let hasUnsavedChanges = false
const unsavedChecks: (() => boolean)[] = []

/**
 * Register a check function for unsaved changes
 * Returns a cleanup function
 */
export function registerUnsavedCheck(checkFn: () => boolean): () => void {
  unsavedChecks.push(checkFn)
  return () => {
    const index = unsavedChecks.indexOf(checkFn)
    if (index > -1) {
      unsavedChecks.splice(index, 1)
    }
  }
}

/**
 * Set the global unsaved changes state
 */
export function setHasUnsavedChanges(value: boolean): void {
  hasUnsavedChanges = value
}

/**
 * Check if there are any unsaved changes across the app
 */
export function checkUnsavedChanges(): boolean {
  // Check registered check functions
  for (const check of unsavedChecks) {
    if (check()) return true
  }

  // Check global state
  if (hasUnsavedChanges) return true
  // Check for open dialogs with form inputs
  const dialogs = document.querySelectorAll('.el-dialog:not([style*="display: none"])')
  for (const dialog of dialogs) {
    const inputs = dialog.querySelectorAll('input, textarea')
    for (const input of inputs) {
      const el = input as HTMLInputElement | HTMLTextAreaElement
      if (el.value && el.value.trim() !== '') {
        return true
      }
    }
  }

  // Check for active form elements
  const activeElement = document.activeElement
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.getAttribute('contenteditable') === 'true'
  )) {
    const input = activeElement as HTMLInputElement | HTMLTextAreaElement
    if (input.value && input.value.trim() !== '') {
      return true
    }
  }

  return false
}
