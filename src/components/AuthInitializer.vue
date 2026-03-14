<template>
  <Transition name="fade">
    <div v-if="showLoading" class="auth-initializer">
      <div class="auth-loading">
        <div class="spinner"></div>
        <div class="text">正在验证身份...</div>
      </div>
    </div>
    <div v-else-if="showError" class="auth-initializer">
      <div class="auth-error">
        <el-icon :size="48" color="#f56c6c"><WarningFilled /></el-icon>
        <div class="error-title">连接失败</div>
        <div class="error-message">{{ authStore.initError }}</div>
        <el-button type="primary" @click="handleRetry" :loading="retrying">
          重试
        </el-button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const retrying = ref(false)

// Show loading for a brief moment to avoid flash
const showLoading = computed(() => {
  return !authStore.initialized && !authStore.initError
})

const showError = computed(() => {
  return authStore.initError && !authStore.isAuthenticated
})

async function handleRetry() {
  retrying.value = true
  await authStore.retry()
  retrying.value = false
}

onMounted(() => {
  // Auth might already be initialized when this mounts
  // That's fine - we just won't show the loading state
})
</script>

<style scoped>
.auth-initializer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  z-index: 9998;
}

.auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.auth-loading .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e4e7ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.auth-loading .text {
  color: #606266;
  font-size: 14px;
}

.auth-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-width: 320px;
  text-align: center;
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.error-message {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
