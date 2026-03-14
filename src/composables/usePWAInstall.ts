import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable for PWA install functionality
 *
 * Handles:
 * - Detecting if PWA is installable
 * - Capturing the beforeinstallprompt event
 * - iOS Safari detection
 * - Install state persistence
 */

// Storage keys
const DISMISSED_KEY = 'pwa-install-dismissed'
const INSTALLED_KEY = 'pwa-installed'

// iOS installation guide URL (Apple's official Chinese guide)
const IOS_INSTALL_GUIDE_URL = 'https://support.apple.com/zh-cn/guide/iphone/iph42ab2f3a7/ios'

/**
 * Extended BeforeInstallPromptEvent interface
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Check if running on iOS Safari
 */
function checkIsIOS(): boolean {
  const ua = navigator.userAgent
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isIPhone = /iPhone/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)
  return (isIPad || isIPhone) && isSafari
}

/**
 * Check if running in standalone mode (already installed)
 */
function checkIsStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}

export function usePWAInstall() {
  // State
  const installPromptEvent = ref<BeforeInstallPromptEvent | null>(null)
  const isInstalled = ref(false)
  const isDismissed = ref(false)
  const isIOS = ref(false)
  const isStandalone = ref(false)
  const canShowInstall = ref(false)

  /**
   * Get dismissed state from localStorage
   */
  function getDismissedState(): boolean {
    try {
      return localStorage.getItem(DISMISSED_KEY) === 'true'
    } catch {
      return false
    }
  }

  /**
   * Save dismissed state to localStorage
   */
  function saveDismissedState(dismissed: boolean): void {
    try {
      localStorage.setItem(DISMISSED_KEY, String(dismissed))
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check if app was previously marked as installed
   */
  function getInstalledState(): boolean {
    try {
      return localStorage.getItem(INSTALLED_KEY) === 'true'
    } catch {
      return false
    }
  }

  /**
   * Save installed state
   */
  function saveInstalledState(): void {
    try {
      localStorage.setItem(INSTALLED_KEY, 'true')
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Update canShowInstall based on current state
   */
  function updateCanShow(): void {
    if (isInstalled.value || isStandalone.value) {
      canShowInstall.value = false
      return
    }
    canShowInstall.value = !isDismissed.value
  }

  /**
   * Handle beforeinstallprompt event
   */
  function handleBeforeInstallPrompt(e: Event): void {
    e.preventDefault()
    installPromptEvent.value = e as BeforeInstallPromptEvent
    updateCanShow()
  }

  /**
   * Handle app installed event
   */
  function handleAppInstalled(): void {
    isInstalled.value = true
    installPromptEvent.value = null
    saveInstalledState()
    updateCanShow()
  }

  /**
   * Trigger the native install prompt
   */
  async function install(): Promise<boolean> {
    if (!installPromptEvent.value) {
      return false
    }

    try {
      await installPromptEvent.value.prompt()
      const result = await installPromptEvent.value.userChoice

      if (result.outcome === 'accepted') {
        isInstalled.value = true
        saveInstalledState()
        updateCanShow()
        return true
      }
      return false
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }

  /**
   * Open iOS installation guide
   */
  function openIOSGuide(): void {
    window.open(IOS_INSTALL_GUIDE_URL, '_blank', 'noopener,noreferrer')
  }

  /**
   * Dismiss the install banner
   */
  function dismiss(): void {
    isDismissed.value = true
    saveDismissedState(true)
    updateCanShow()
  }

  /**
   * Reset dismissal (for testing or re-prompting)
   */
  function resetDismissal(): void {
    isDismissed.value = false
    saveDismissedState(false)
    updateCanShow()
  }

  /**
   * Setup event listeners on mount
   */
  onMounted(() => {
    // Check platform
    isIOS.value = checkIsIOS()
    isStandalone.value = checkIsStandalone()

    // Initialize state from storage
    isDismissed.value = getDismissedState()
    isInstalled.value = getInstalledState()

    // If already in standalone mode, mark as installed
    if (isStandalone.value) {
      isInstalled.value = true
      saveInstalledState()
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed
    window.addEventListener('appinstalled', handleAppInstalled)

    // Update visibility
    updateCanShow()
  })

  /**
   * Cleanup event listeners on unmount
   */
  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    // State
    installPromptEvent,
    isInstalled,
    isDismissed,
    isIOS,
    isStandalone,
    canShowInstall,

    // Actions
    install,
    openIOSGuide,
    dismiss,
    resetDismissal,
  }
}
