<script setup lang="ts">
// Auth initialization moved to main.ts to ensure proper order
// (auth must be initialized before app mounts and router guards run)
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>


<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>
