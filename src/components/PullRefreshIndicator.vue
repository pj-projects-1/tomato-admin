<template>
  <div
    class="pull-refresh-indicator"
    :class="{ 'is-refreshing': isRefreshing }"
    :style="indicatorStyle"
  >
    <!-- Pulling state: arrow rotates based on progress -->
    <div v-if="!isRefreshing" class="pull-arrow" :style="arrowStyle">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="currentColor"
          d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"
        />
      </svg>
    </div>

    <!-- Refreshing state: spinner -->
    <div v-else class="pull-spinner">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-dasharray="31.416"
          stroke-dashoffset="10"
        />
      </svg>
    </div>

    <!-- Status text -->
    <span class="pull-text">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pullDistance: number
  isRefreshing: boolean
  threshold: number
}>()

// Calculate progress (0 to 1+)
const progress = computed(() => {
  if (props.threshold === 0) return 0
  return props.pullDistance / props.threshold
})

// Indicator position - slides down from hidden above viewport
const indicatorStyle = computed(() => {
  // Only show if pulling or refreshing
  if (props.pullDistance === 0 && !props.isRefreshing) {
    return {
      opacity: 0,
      transform: 'translateY(-100%)',
    }
  }

  // Max visible distance for indicator
  const visibleDistance = Math.min(props.pullDistance, 60)

  return {
    opacity: Math.min(1, progress.value * 1.5),
    transform: `translateY(${visibleDistance - 40}px)`,
  }
})

// Arrow rotation: 0° at start, 180° when ready
const arrowStyle = computed(() => {
  // Rotate based on progress, cap at 180° when past threshold
  const rotation = Math.min(progress.value, 1) * 180
  return {
    transform: `rotate(${rotation}deg)`,
    transition: props.pullDistance === 0 ? 'transform 0.2s ease' : 'none',
  }
})

// Status text
const statusText = computed(() => {
  if (props.isRefreshing) return '刷新中...'
  if (progress.value >= 1) return '松开刷新'
  return '下拉刷新'
})
</script>

<style scoped>
.pull-refresh-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  font-size: 13px;
  z-index: 10;
  pointer-events: none;
  /* Smooth transitions for opacity */
  transition: opacity 0.15s ease;
  /* Prevent overscroll interference on iOS */
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.pull-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Smooth rotation transition when not actively pulling */
}

.pull-arrow svg {
  color: #606266;
}

.pull-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 0.8s linear infinite;
}

.pull-spinner svg {
  color: var(--tomato-red);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pull-text {
  white-space: nowrap;
}

/* Platform-specific adjustments */
@supports (-webkit-touch-callout: none) {
  /* iOS/iPadOS */
  .pull-refresh-indicator {
    /* Use system font for better integration */
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}

@supports not (-webkit-touch-callout: none) {
  /* Android and other platforms */
  .pull-spinner svg {
    /* Slightly larger spinner for Android */
    width: 26px;
    height: 26px;
  }
}

/* Reduce animation for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  .pull-spinner {
    animation: none;
  }

  .pull-refresh-indicator,
  .pull-arrow {
    transition: none;
  }
}
</style>
