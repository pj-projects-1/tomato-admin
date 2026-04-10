<template>
  <span class="phone-field" @click.stop="copyPhone" :title="phone ? '点击复制' : ''">
    <span class="phone-number">{{ displayPhone }}</span>
    <el-icon v-if="phone" class="copy-icon" :class="{ 'copy-success': justCopied }">
      <CopyDocument v-if="!justCopied" />
      <Check v-else />
    </el-icon>
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = withDefaults(defineProps<{
  phone?: string | null
}>(), {
  phone: null,
})

const justCopied = ref(false)

const displayPhone = computed(() => {
  if (!props.phone) return '-'
  return props.phone
})

async function copyPhone() {
  if (!props.phone) return

  try {
    await navigator.clipboard.writeText(props.phone)
    justCopied.value = true
    ElMessage.success('已复制到剪贴板')

    // Reset icon after 2 seconds
    setTimeout(() => {
      justCopied.value = false
    }, 2000)
  } catch (error) {
    // Fallback for browsers that don't support clipboard API
    const textArea = document.createElement('textarea')
    textArea.value = props.phone
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()

    try {
      document.execCommand('copy')
      justCopied.value = true
      ElMessage.success('已复制到剪贴板')
      setTimeout(() => {
        justCopied.value = false
      }, 2000)
    } catch (fallbackError) {
      ElMessage.error('复制失败，请手动复制')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}
</script>

<style scoped>
.phone-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 4px;
  margin: -2px -4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.phone-field:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.phone-field:hover .copy-icon {
  opacity: 1;
}

.phone-number {
  color: inherit;
}

.copy-icon {
  font-size: 14px;
  color: #909399;
  opacity: 0.5;
  transition: all 0.2s;
}

.copy-icon.copy-success {
  color: var(--soft-sage);
  opacity: 1;
}

/* Mobile: always show icon */
@media (max-width: 767px) {
  .copy-icon {
    opacity: 0.8;
  }
}

/* Touch-friendly tap target */
@media (pointer: coarse) {
  .phone-field {
    padding: 6px 8px;
    margin: -6px -8px;
  }
}
</style>
