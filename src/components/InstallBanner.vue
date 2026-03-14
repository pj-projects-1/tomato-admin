<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePWAInstall } from '@/composables/usePWAInstall'

const {
  canShowInstall,
  isInstalled,
  isIOS,
  isStandalone,
  installPromptEvent,
  install,
  openIOSGuide,
  dismiss,
} = usePWAInstall()

// Local visibility state (for animation)
const isVisible = ref(false)

// Watch canShowInstall to trigger animation
watch(canShowInstall, (show) => {
  if (show) {
    // Slight delay for entrance animation
    setTimeout(() => {
      isVisible.value = true
    }, 500)
  } else {
    isVisible.value = false
  }
}, { immediate: true })

/**
 * Handle install button click
 */
async function handleInstall() {
  if (isIOS.value) {
    // iOS doesn't support beforeinstallprompt, open guide
    openIOSGuide()
    dismiss()
  } else if (installPromptEvent.value) {
    // Trigger native install prompt
    const success = await install()
    if (!success) {
      // User dismissed the prompt, don't show banner again
      dismiss()
    }
  }
}

/**
 * Handle dismiss button click
 */
function handleDismiss() {
  isVisible.value = false
  setTimeout(() => {
    dismiss()
  }, 300) // Wait for animation to complete
}
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="isVisible && canShowInstall && !isInstalled && !isStandalone"
      class="install-banner"
    >
      <div class="banner-content">
        <span class="icon">📱</span>
        <span class="text">添加到主屏幕，像App一样使用</span>
      </div>
      <div class="banner-actions">
        <el-button
          type="primary"
          size="small"
          @click="handleInstall"
        >
          {{ isIOS ? '查看指南' : '安装' }}
        </el-button>
        <el-button
          text
          size="small"
          @click="handleDismiss"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1000;
  gap: 12px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.banner-content .icon {
  font-size: 20px;
  flex-shrink: 0;
}

.banner-content .text {
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* Slide up animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .install-banner {
    padding: 10px 12px;
  }

  .banner-content .text {
    font-size: 13px;
  }
}
</style>
