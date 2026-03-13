import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable for pull-to-refresh functionality
 *
 * Handles:
 * - Touch event detection when at top of scroll
 * - Pull direction verification (downward only)
 * - Horizontal vs vertical scroll disambiguation
 * - Multi-touch handling (only first touch)
 * - Touch cancel events
 * - Double-trigger prevention
 */
export function usePullRefresh(refreshFn: () => Promise<void>) {
  const isRefreshing = ref(false)
  const isPulling = ref(false)
  const pullDistance = ref(0)

  // Configuration
  const THRESHOLD = 80 // pixels to trigger refresh
  const MAX_PULL = 120 // maximum visual pull distance

  // Internal state (non-reactive for performance)
  let startY = 0
  let startX = 0
  let containerRef: HTMLElement | null = null

  /**
   * Find the scrollable ancestor container (.main-content)
   */
  function getScrollContainer(el: HTMLElement): Element | null {
    let parent: HTMLElement | null = el
    while (parent) {
      if (parent.classList && parent.classList.contains('main-content')) {
        return parent
      }
      parent = parent.parentElement
    }
    return null
  }

  /**
   * Check if we're at the top of the scrollable area
   */
  function isAtTop(target: HTMLElement): boolean {
    const scrollContainer = getScrollContainer(target)
    return scrollContainer ? scrollContainer.scrollTop === 0 : false
  }

  /**
   * Handle touch start - begin tracking if at top
   */
  const onTouchStart = (e: TouchEvent) => {
    // Only track single touch
    if (e.touches.length !== 1) return

    const target = e.target as HTMLElement

    // Only start if at top of scroll
    if (!isAtTop(target)) return

    // Store container reference for later
    containerRef = getScrollContainer(target) as HTMLElement

    isPulling.value = true
    const touch = e.touches[0]
    if (touch) {
      startY = touch.clientY
      startX = touch.clientX
    }
    pullDistance.value = 0
  }

  /**
   * Handle touch move - track pull distance and prevent scroll if pulling
   */
  const onTouchMove = (e: TouchEvent) => {
    if (!isPulling.value) return

    // Don't interfere if already refreshing
    if (isRefreshing.value) {
      pullDistance.value = 0
      return
    }

    const touch = e.touches[0]
    if (!touch) return
    const currentY = touch.clientY
    const currentX = touch.clientX
    const deltaY = currentY - startY
    const deltaX = Math.abs(currentX - startX)

    // Must be pulling DOWN more than horizontally
    // This prevents conflicts with horizontal swipes
    if (deltaY < 0 || deltaY < deltaX * 1.5) {
      pullDistance.value = 0
      return
    }

    // Check if user scrolled down while pulling (no longer at top)
    if (containerRef && containerRef.scrollTop > 0) {
      isPulling.value = false
      pullDistance.value = 0
      return
    }

    // Apply resistance (pull becomes harder as you go further)
    const resistedDistance = deltaY * (1 - Math.min(deltaY / MAX_PULL, 0.5) * 0.5)
    pullDistance.value = Math.min(Math.max(0, resistedDistance), MAX_PULL)

    // Prevent native scroll bounce during pull
    if (pullDistance.value > 0) {
      e.preventDefault()
    }
  }

  /**
   * Handle touch end - trigger refresh if threshold exceeded
   */
  const onTouchEnd = async () => {
    if (!isPulling.value) return

    const shouldRefresh = pullDistance.value >= THRESHOLD && !isRefreshing.value

    if (shouldRefresh) {
      isRefreshing.value = true
      try {
        await refreshFn()
      } catch (error) {
        console.error('Pull-to-refresh failed:', error)
      } finally {
        isRefreshing.value = false
      }
    }

    // Reset state
    isPulling.value = false
    pullDistance.value = 0
    startY = 0
    startX = 0
    containerRef = null
  }

  /**
   * Handle touch cancel - reset without triggering refresh
   */
  const onTouchCancel = () => {
    isPulling.value = false
    pullDistance.value = 0
    startY = 0
    startX = 0
    containerRef = null
  }

  /**
   * Setup and cleanup event listeners
   * We need passive: false for touchmove to allow preventDefault
   */
  let targetElement: HTMLElement | null = null

  function setupListeners(element: HTMLElement) {
    targetElement = element
    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd, { passive: true })
    element.addEventListener('touchcancel', onTouchCancel, { passive: true })
  }

  function cleanupListeners() {
    if (targetElement) {
      targetElement.removeEventListener('touchstart', onTouchStart)
      targetElement.removeEventListener('touchmove', onTouchMove)
      targetElement.removeEventListener('touchend', onTouchEnd)
      targetElement.removeEventListener('touchcancel', onTouchCancel)
      targetElement = null
    }
  }

  return {
    isRefreshing,
    isPulling,
    pullDistance,
    setupListeners,
    cleanupListeners,
    THRESHOLD,
    MAX_PULL,
  }
}
