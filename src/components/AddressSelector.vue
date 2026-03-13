<template>
  <div class="address-selector">
    <!-- 已有地址列表 -->
    <div v-if="savedAddresses.length > 0" class="saved-addresses">
      <div class="section-title">
        <span>已保存地址</span>
        <el-button text type="primary" size="small" @click="showManualInput = true">
          手动输入新地址
        </el-button>
      </div>
      <div class="address-list">
        <div
          v-for="(addr, index) in savedAddresses"
          :key="index"
          class="address-item"
          :class="{ selected: selectedAddressIndex === index && !showManualInput }"
          @click="selectAddress(index)"
        >
          <div class="address-info">
            <div class="address-label">
              <el-tag v-if="addr.is_default" type="success" size="small">默认</el-tag>
              <span class="label-text">{{ addr.label || `地址 ${index + 1}` }}</span>
            </div>
            <div class="address-detail">{{ addr.address }}</div>
            <div class="address-contact" v-if="addr.recipient_name || addr.recipient_phone">
              {{ addr.recipient_name || '' }} {{ addr.recipient_phone || '' }}
            </div>
          </div>
          <el-icon v-if="selectedAddressIndex === index && !showManualInput" class="check-icon">
            <CircleCheck />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 手动输入区域 -->
    <div v-if="showManualInput || savedAddresses.length === 0" class="manual-input">
      <div class="section-title" v-if="savedAddresses.length > 0">
        <span>手动输入地址</span>
        <el-button
          v-if="savedAddresses.length > 0"
          text
          size="small"
          @click="showManualInput = false; selectedAddressIndex = 0"
        >
          选择已保存地址
        </el-button>
      </div>
      <AddressInput
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :location="location"
        @update:location="$emit('update:location', $event)"
        :placeholder="placeholder"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AddressInput from './AddressInput.vue'
import type { CustomerAddress } from '@/types'

interface Props {
  modelValue?: string
  location?: { lng: number; lat: number } | null
  savedAddresses?: CustomerAddress[]
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  savedAddresses: () => [],
  placeholder: '输入地址搜索...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:location': [value: { lng: number; lat: number } | null]
  'update:recipientName': [value: string]
  'update:recipientPhone': [value: string]
}>()

const showManualInput = ref(props.savedAddresses.length === 0)
const selectedAddressIndex = ref(props.savedAddresses.length > 0 ? -1 : -1)

// 选择已保存地址
function selectAddress(index: number) {
  selectedAddressIndex.value = index
  showManualInput.value = false
  const addr = props.savedAddresses[index]
  if (addr) {
    emit('update:modelValue', addr.address)
    emit('update:location', addr.location || null)
    emit('update:recipientName', addr.recipient_name || '')
    emit('update:recipientPhone', addr.recipient_phone || '')
  }
}

// 监听已保存地址变化
watch(() => props.savedAddresses, (newVal) => {
  if (newVal.length === 0) {
    showManualInput.value = true
    selectedAddressIndex.value = -1
  }
}, { immediate: true })

// 重置选择状态
function reset() {
  selectedAddressIndex.value = -1
  showManualInput.value = props.savedAddresses.length === 0
}

defineExpose({ reset })
</script>

<style scoped>
.address-selector {
  width: 100%;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.address-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.address-item:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.address-item.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.address-info {
  flex: 1;
}

.address-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.label-text {
  font-weight: 500;
  color: #303133;
}

.address-detail {
  font-size: 13px;
  color: #606266;
  margin-bottom: 2px;
}

.address-contact {
  font-size: 12px;
  color: #909399;
}

.check-icon {
  color: #409eff;
  font-size: 18px;
  margin-top: 2px;
}

.manual-input {
  width: 100%;
}
</style>
