<script setup lang="ts">
// Auth initialization runs in background via main.ts
// This component shows loading/error state while auth initializes
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AuthInitializer from '@/components/AuthInitializer.vue'
</script>

<template>
  <el-config-provider :locale="zhCn">
    <!-- Show auth loading/error overlay -->
    <AuthInitializer />

    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </el-config-provider>
</template>

<style>
/* Route transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
