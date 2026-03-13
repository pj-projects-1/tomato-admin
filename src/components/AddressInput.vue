<template>
  <el-autocomplete
    ref="autocompleteRef"
    v-model="inputValue"
    :fetch-suggestions="searchAddress"
    :placeholder="placeholder"
    :disabled="disabled"
    :trigger-on-focus="false"
    :debounce="300"
    clearable
    style="width: 100%"
    @select="handleSelect"
    @clear="handleClear"
    @blur="handleBlur"
  >
    <template #default="{ item }">
      <div class="address-suggestion">
        <div class="address-name">{{ item.name }}</div>
        <div class="address-detail">{{ item.address || item.district }}</div>
      </div>
    </template>
    <template #suffix>
      <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
      <el-icon v-else-if="hasLocation" color="#67C23A"><LocationFilled /></el-icon>
    </template>
  </el-autocomplete>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

export interface AddressData {
  name: string
  address: string
  location?: {
    lng: number
    lat: number
  }
  district?: string
}

const props = withDefaults(defineProps<{
  modelValue?: string
  location?: { lng: number; lat: number } | null
  placeholder?: string
  disabled?: boolean
  city?: string
}>(), {
  modelValue: '',
  placeholder: '请输入地址',
  disabled: false,
  city: '苏州',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:location', value: { lng: number; lat: number } | null): void
  (e: 'change', value: AddressData): void
}>()

const autocompleteRef = ref()
const inputValue = ref(props.modelValue)
const loading = ref(false)
const hasLocation = computed(() => !!props.location)

// 高德地图自动补全服务
let autoCompleteService: any = null
let placeSearchService: any = null

onMounted(async () => {
  await initAmapServices()
})

watch(() => props.modelValue, (val) => {
  inputValue.value = val
})

async function initAmapServices() {
  const jsKey = import.meta.env.VITE_AMAP_JS_KEY
  const securityKey = import.meta.env.VITE_AMAP_JS_SECURITY_KEY

  if (!jsKey) return

  // 设置安全密钥
  // @ts-ignore
  window._AMapSecurityConfig = {
    securityJsCode: securityKey,
  }

  // 检查 AMap 是否已加载
  // @ts-ignore
  if (!window.AMap) {
    await loadAmapScript(jsKey)
  }

  // 初始化服务
  // @ts-ignore
  if (window.AMap) {
    // @ts-ignore
    autoCompleteService = new window.AMap.AutoComplete({
      city: props.city,
    })
    // @ts-ignore
    placeSearchService = new window.AMap.PlaceSearch({
      city: props.city,
      pageSize: 10,
    })
  }
}

function loadAmapScript(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="webapi.amap.com/maps"]')
    if (existingScript) {
      // Script already exists, wait for it to load
      if (existingScript.getAttribute('data-loaded') === 'true') {
        resolve()
      } else {
        existingScript.addEventListener('load', () => resolve())
        existingScript.addEventListener('error', () => reject(new Error('Failed to load AMap script')))
      }
      return
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.AutoComplete,AMap.PlaceSearch`
    script.onload = () => {
      script.setAttribute('data-loaded', 'true')
      resolve()
    }
    script.onerror = () => {
      reject(new Error('Failed to load AMap script'))
    }
    document.head.appendChild(script)
  })
}

interface SuggestionItem {
  value: string
  name: string
  address: string
  district: string
  adcode: string
  location: { lng: number; lat: number } | null
}

async function searchAddress(queryString: string, cb: (results: SuggestionItem[]) => void) {
  if (!queryString || queryString.length < 1) {
    cb([])
    return
  }

  // 如果高德服务未初始化，尝试初始化
  if (!autoCompleteService) {
    await initAmapServices()
  }

  if (!autoCompleteService) {
    cb([])
    return
  }

  loading.value = true

  try {
    autoCompleteService.search(queryString, (status: string, result: any) => {
      loading.value = false

      if (status === 'complete' && result.tips) {
        const suggestions: SuggestionItem[] = result.tips
          .filter((tip: any) => tip.location) // 只保留有坐标的结果
          .map((tip: any) => ({
            value: tip.name,
            name: tip.name,
            address: tip.address || '',
            district: tip.district || '',
            adcode: tip.adcode || '',
            location: tip.location ? {
              lng: tip.location.lng,
              lat: tip.location.lat,
            } : null,
          }))
        cb(suggestions)
      } else {
        cb([])
      }
    })
  } catch (error) {
    loading.value = false
    cb([])
  }
}

function handleSelect(item: SuggestionItem) {
  inputValue.value = item.name
  emit('update:modelValue', item.name)

  if (item.location) {
    emit('update:location', item.location)
    emit('change', {
      name: item.name,
      address: item.address || item.district,
      location: item.location,
      district: item.district,
    })
  }
}

function handleClear() {
  inputValue.value = ''
  emit('update:modelValue', '')
  emit('update:location', null)
}

function handleBlur() {
  // 如果输入了地址但没有选择建议，尝试保持原值
  if (inputValue.value !== props.modelValue) {
    emit('update:modelValue', inputValue.value)
  }
}

// 暴露方法
defineExpose({
  focus: () => autocompleteRef.value?.focus(),
  blur: () => autocompleteRef.value?.blur(),
})
</script>

<style scoped>
.address-suggestion {
  padding: 4px 0;
}

.address-name {
  font-size: 14px;
  color: #303133;
  line-height: 1.4;
}

.address-detail {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
