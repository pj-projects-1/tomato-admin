<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 v-if="task">{{ task.name || '配送任务' }}</h2>
        <el-tag v-if="task" :type="getStatusType(task.status)" style="margin-left: 8px;">
          {{ getStatusText(task.status) }}
        </el-tag>
      </div>
    </div>

    <!-- Primary Actions - Mobile friendly -->
    <div class="action-bar" v-if="task">
      <div class="action-group">
        <el-button @click="handleExportTask" :disabled="sortedDeliveries.length === 0">
          <el-icon><Download /></el-icon>
          <span class="btn-text">导出清单</span>
        </el-button>
        <el-button type="primary" @click="handleCopyNavLink" :disabled="!hasValidLocations">
          <el-icon><Link /></el-icon>
          <span class="btn-text">导航链接</span>
        </el-button>
      </div>
      <div class="action-group" v-if="task.status === 'planning'">
        <el-button @click="showAdjustRouteDialog">
          <el-icon><Edit /></el-icon>
          <span class="btn-text">调整路线</span>
        </el-button>
        <el-button type="success" @click="startTask">
          <el-icon><VideoPlay /></el-icon>
          <span class="btn-text">开始配送</span>
        </el-button>
      </div>
      <div class="action-group" v-if="task.status === 'in_progress'">
        <el-button type="warning" @click="cancelTask">
          <el-icon><RefreshLeft /></el-icon>
          <span class="btn-text">撤销配送</span>
        </el-button>
        <el-button type="primary" @click="completeTask">
          <el-icon><Check /></el-icon>
          <span class="btn-text">完成配送</span>
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" v-if="task">
      <!-- Map View -->
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="map-card">
          <template #header>
            <span>地图预览</span>
            <el-button-group v-if="alternativeRoutes.length > 1">
              <el-button
                v-for="(route, index) in alternativeRoutes"
                :key="index"
                :type="currentRouteIndex === index ? 'primary' : 'default'"
                size="small"
                @click="switchRoute(index)"
              >
                {{ route.strategyName }}
              </el-button>
            </el-button-group>
          </template>

          <div id="map-container" ref="mapContainer" class="map-container">
            <div v-if="!mapLoaded" class="map-placeholder">
              <el-icon size="48"><MapLocation /></el-icon>
              <p>{{ amapJsKey ? '地图加载中...' : '请配置高德地图 JS API Key' }}</p>
            </div>
          </div>

          <el-alert
            v-if="mapError"
            :title="mapError"
            type="error"
            :closable="false"
            style="margin-top: 12px;"
          />
        </el-card>

        <!-- Route Summary -->
        <el-card shadow="never" class="route-summary-card">
          <template #header>路线概览</template>
          <div class="route-stats">
            <div class="stat-item">
              <span class="stat-label">总距离</span>
              <span class="stat-value">{{ task.total_distance || 0 }}<span class="stat-unit">km</span></span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预计时间</span>
              <span class="stat-value">{{ task.estimated_duration || 0 }}<span class="stat-unit">分钟</span></span>
            </div>
            <div class="stat-item">
              <span class="stat-label">配送点</span>
              <span class="stat-value">{{ task.deliveries?.length || 0 }}<span class="stat-unit">个</span></span>
            </div>
            <div class="stat-item">
              <span class="stat-label">已送达</span>
              <span class="stat-value delivered">{{ deliveredCount }}<span class="stat-unit">个</span></span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- Task Info & Route List -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header>任务信息</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="任务ID">{{ task.id.slice(0, 8) }}</el-descriptions-item>
            <el-descriptions-item label="出发地点">{{ departureName }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(task.created_at) }}</el-descriptions-item>
            <el-descriptions-item v-if="task.started_at" label="开始时间">
              {{ formatDateTime(task.started_at) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="task.completed_at" label="完成时间">
              {{ formatDateTime(task.completed_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- Route List -->
        <el-card shadow="never" style="margin-top: 16px;">
          <template #header>配送路线</template>
          <el-timeline>
            <el-timeline-item
              v-for="(delivery, index) in sortedDeliveries"
              :key="delivery.id"
              :type="getDeliveryStatusType(delivery.status)"
              :hollow="delivery.status !== 'delivered'"
              size="large"
            >
              <div class="route-item">
                <div class="route-header">
                  <span class="route-index">{{ index + 1 }}</span>
                  <div class="route-names">
                    <el-tag size="small" type="info">{{ delivery.order?.customer?.name }}</el-tag>
                    <el-icon v-if="delivery.recipient_name && delivery.recipient_name !== delivery.order?.customer?.name">
                      <Right />
                    </el-icon>
                    <el-tag v-if="delivery.recipient_name && delivery.recipient_name !== delivery.order?.customer?.name"
                      size="small" type="success">
                      {{ delivery.recipient_name }}
                    </el-tag>
                  </div>
                  <el-tag :type="getDeliveryStatusType(delivery.status)" size="small">
                    {{ getDeliveryStatusText(delivery.status) }}
                  </el-tag>
                </div>
                <div class="route-info">
                  <p class="address-line">
                    <el-icon><Location /></el-icon>
                    {{ delivery.address }}
                  </p>
                  <p v-if="delivery.recipient_phone || delivery.order?.customer?.phone">
                    <el-icon><Phone /></el-icon>
                    {{ delivery.recipient_phone || delivery.order?.customer?.phone }}
                    <el-button text size="small" @click="callPhone(delivery.recipient_phone || delivery.order?.customer?.phone)">
                      拨打
                    </el-button>
                  </p>
                  <p>
                    <el-icon><Box /></el-icon>
                    {{ delivery.quantity }} 箱
                  </p>
                </div>
                <div v-if="delivery.status !== 'delivered' && task.status === 'in_progress'" class="route-actions">
                  <el-button
                    size="small"
                    type="success"
                    @click="markDelivered(delivery)"
                  >
                    标记已送达
                  </el-button>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- Copy Button -->
        <el-card shadow="never" style="margin-top: 16px;">
          <el-button type="primary" style="width: 100%;" @click="copyRouteInfo">
            <el-icon><CopyDocument /></el-icon>
            复制配送信息发司机
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- Adjust Route Dialog -->
    <el-dialog
      v-model="adjustRouteDialogVisible"
      title="调整配送路线"
      width="600px"
      destroy-on-close
    >
      <el-alert
        type="info"
        :closable="false"
        style="margin-bottom: 16px;"
      >
        拖动配送点调整顺序，或选择其他路线策略
      </el-alert>

      <div class="sortable-list">
        <div
          v-for="(delivery, index) in adjustDeliveries"
          :key="delivery.id"
          class="sortable-item"
          draggable="true"
          @dragstart="dragStart(index)"
          @dragover.prevent
          @drop="drop(index)"
        >
          <el-icon class="drag-handle"><Rank /></el-icon>
          <span class="sort-index">{{ index + 1 }}</span>
          <div class="sort-content">
            <div class="sort-main">
              {{ delivery.order?.customer?.name }}
              <el-icon v-if="delivery.recipient_name && delivery.recipient_name !== delivery.order?.customer?.name">
                <Right />
              </el-icon>
              <span v-if="delivery.recipient_name && delivery.recipient_name !== delivery.order?.customer?.name"
                class="recipient-name">
                {{ delivery.recipient_name }}
              </span>
            </div>
            <div class="sort-address">{{ delivery.address }}</div>
          </div>
        </div>
      </div>

      <el-divider />

      <h4>重新规划路线</h4>
      <el-checkbox-group v-model="selectedStrategies">
        <el-checkbox :value="0">速度优先</el-checkbox>
        <el-checkbox :value="2">距离优先</el-checkbox>
        <el-checkbox :value="4">躲避拥堵</el-checkbox>
        <el-checkbox :value="10">免费且躲避拥堵</el-checkbox>
      </el-checkbox-group>

      <template #footer>
        <el-button @click="adjustRouteDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="replanningRoute" @click="replanRoute">
          重新规划
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useDeliveryStore } from '@/stores/deliveries'
import { getAmapService, DEFAULT_DEPARTURE, DEFAULT_DEPARTURE_ADDRESS, type Location } from '@/api/amap'
import { exportDeliveryTask, copyNavigationLink, generateAmapAutoNavLink, copyToClipboard } from '@/api/export'
import type { DeliveryTask, DeliveryTaskStatus, OrderDelivery, DeliveryStatus, OptimizedRoute } from '@/types'

const route = useRoute()
const router = useRouter()
const deliveryStore = useDeliveryStore()

const loading = ref(false)
const task = ref<DeliveryTask | null>(null)
const mapContainer = ref<HTMLElement>()
const mapLoaded = ref(false)
const mapError = ref('')
const mapInstance = ref<any>(null)

// 出发地点
const departure = ref<Location & { address: string }>({
  lng: DEFAULT_DEPARTURE.lng,
  lat: DEFAULT_DEPARTURE.lat,
  address: DEFAULT_DEPARTURE_ADDRESS,
})

// 目的地（结束地）
const destination = ref<Location & { address: string }>({
  lng: DEFAULT_DEPARTURE.lng,
  lat: DEFAULT_DEPARTURE.lat,
  address: DEFAULT_DEPARTURE_ADDRESS,
})

// 路线调整
const adjustRouteDialogVisible = ref(false)
const adjustDeliveries = ref<OrderDelivery[]>([])
const dragIndex = ref(-1)
const replanningRoute = ref(false)
const selectedStrategies = ref([0, 2, 4])

// 多路线支持
const alternativeRoutes = ref<{
  strategy: number
  strategyName: string
  distance: number
  duration: number
  polyline: string
}[]>([])
const currentRouteIndex = ref(0)

const amapKey = computed(() => import.meta.env.VITE_AMAP_KEY)
const amapJsKey = computed(() => import.meta.env.VITE_AMAP_JS_KEY)
const amapJsSecurityKey = computed(() => import.meta.env.VITE_AMAP_JS_SECURITY_KEY)
const departureName = computed(() => departure.value.address || '吴江')
const deliveredCount = computed(() =>
  task.value?.deliveries?.filter((d: OrderDelivery) => d.status === 'delivered').length || 0
)
const sortedDeliveries = computed(() => {
  if (!task.value?.deliveries) return []
  return [...task.value.deliveries]
    .map((d: OrderDelivery, i: number) => ({ ...d, _index: i }))
    .sort((a, b) => (a.sequence_in_route ?? a._index) - (b.sequence_in_route ?? b._index))
})
const hasValidLocations = computed(() =>
  sortedDeliveries.value.some((d: OrderDelivery) => d.location?.lng && d.location?.lat)
)

onMounted(async () => {
  loading.value = true
  try {
    task.value = await deliveryStore.fetchDeliveryTask(route.params.id as string)
    if (!task.value) {
      ElMessage.error('任务不存在')
      router.push('/deliveries')
      return
    }

    // 从任务数据读取出发地
    if (task.value.departure_location) {
      departure.value = {
        lng: task.value.departure_location.lng,
        lat: task.value.departure_location.lat,
        address: task.value.departure_location.address,
      }
    }

    // 从任务数据读取目的地（结束地）
    if (task.value.destination_location) {
      destination.value = {
        lng: task.value.destination_location.lng,
        lat: task.value.destination_location.lat,
        address: task.value.destination_location.address,
      }
    } else {
      // 如果没有设置目的地，默认与出发地相同
      destination.value = { ...departure.value }
    }

    // Load alternative routes if available
    if (task.value.optimized_route) {
      alternativeRoutes.value = [{
        strategy: 0,
        strategyName: '当前路线',
        distance: task.value.total_distance ? task.value.total_distance * 1000 : 0,
        duration: task.value.estimated_duration ? task.value.estimated_duration * 60 : 0,
        polyline: task.value.optimized_route.polyline || '',
      }]
    }

    // Initialize map
    if (amapJsKey.value) {
      await nextTick()
      setTimeout(() => initMap(), 500)
    }
  } catch (error) {
    ElMessage.error('加载失败')
    router.push('/deliveries')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
})

function formatDateTime(date: string) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function getStatusType(status: DeliveryTaskStatus) {
  const map: Record<DeliveryTaskStatus, string> = {
    planning: 'info',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

function getStatusText(status: DeliveryTaskStatus) {
  const map: Record<DeliveryTaskStatus, string> = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getDeliveryStatusType(status: DeliveryStatus) {
  const map: Record<DeliveryStatus, string> = {
    pending: 'info',
    assigned: 'warning',
    delivering: 'primary',
    delivered: 'success',
  }
  return map[status] || 'info'
}

function getDeliveryStatusText(status: DeliveryStatus) {
  const map: Record<DeliveryStatus, string> = {
    pending: '待配送',
    assigned: '已分配',
    delivering: '配送中',
    delivered: '已送达',
  }
  return map[status] || status
}

// Map initialization
function initMap() {
  if (!mapContainer.value || !amapJsKey.value) return

  // 设置安全密钥
  // @ts-ignore
  window._AMapSecurityConfig = {
    securityJsCode: amapJsSecurityKey.value,
  }

  // Check if AMap is already loaded
  // @ts-ignore
  if (window.AMap) {
    createMap()
    return
  }

  // Check if script is already being loaded
  const existingScript = document.querySelector('script[src*="webapi.amap.com/maps"]')
  if (existingScript) {
    if (existingScript.getAttribute('data-loaded') === 'true') {
      createMap()
    } else {
      existingScript.addEventListener('load', createMap)
    }
    return
  }

  // Load AMap JS API
  const script = document.createElement('script')
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapJsKey.value}`
  script.onload = () => {
    script.setAttribute('data-loaded', 'true')
    createMap()
  }
  script.onerror = () => {
    mapError.value = '地图脚本加载失败'
  }

  document.head.appendChild(script)
}

function createMap() {
  try {
    // @ts-ignore
    const AMap = window.AMap
    if (!AMap) {
      mapError.value = '地图加载失败'
      return
    }

    mapInstance.value = new AMap.Map('map-container', {
      zoom: 11,
      center: [departure.value.lng, departure.value.lat],
    })

    mapLoaded.value = true
    mapError.value = ''

    // Add markers and route
    renderMapElements()
  } catch (e) {
    mapError.value = '地图初始化失败'
    console.error(e)
  }
}

function renderMapElements() {
  if (!mapInstance.value || !task.value?.deliveries) return

  // @ts-ignore
  const AMap = window.AMap

  // Add start marker
  const startMarker = new AMap.Marker({
    position: [departure.value.lng, departure.value.lat],
    title: '出发地',
    content: '<div class="marker start"><span>起</span></div>',
  })
  mapInstance.value.add(startMarker)

  // Add delivery markers
  sortedDeliveries.value.forEach((delivery, index) => {
    if (delivery.location) {
      const marker = new AMap.Marker({
        position: [delivery.location.lng, delivery.location.lat],
        title: delivery.address,
        content: `<div class="marker delivery ${delivery.status === 'delivered' ? 'completed' : ''}"><span>${index + 1}</span></div>`,
      })
      mapInstance.value.add(marker)
    }
  })

  // Draw route if polyline available
  if (task.value.optimized_route?.polyline) {
    const polylineStr = task.value.optimized_route.polyline
    const path = polylineStr.split(';').map((p: string) => {
      const parts = p.split(',')
      const lng = parts[0] || '0'
      const lat = parts[1] || '0'
      return [parseFloat(lng), parseFloat(lat)]
    })

    const polyline = new AMap.Polyline({
      path,
      strokeColor: '#409eff',
      strokeWeight: 6,
      strokeOpacity: 0.8,
    })
    mapInstance.value.add(polyline)

    // Fit view
    mapInstance.value.setFitView([polyline])
  }
}

function switchRoute(index: number) {
  currentRouteIndex.value = index
  // Re-render map with new route
  renderMapElements()
}

// Route adjustment
function showAdjustRouteDialog() {
  adjustDeliveries.value = [...sortedDeliveries.value]
  selectedStrategies.value = [0, 2, 4]
  adjustRouteDialogVisible.value = true
}

function dragStart(index: number) {
  dragIndex.value = index
}

function drop(index: number) {
  if (dragIndex.value === -1 || dragIndex.value === index) return

  const item = adjustDeliveries.value.splice(dragIndex.value, 1)[0]
  if (item) {
    adjustDeliveries.value.splice(index, 0, item)
  }
  dragIndex.value = -1
}

async function replanRoute() {
  if (!amapKey.value) {
    ElMessage.error('未配置高德地图 API Key')
    return
  }

  replanningRoute.value = true
  try {
    const amap = getAmapService()
    if (!amap) throw new Error('Amap service not available')

    // Get coordinates
    const waypoints: Location[] = []
    for (const d of adjustDeliveries.value) {
      if (d.location) {
        waypoints.push({ lng: d.location.lng, lat: d.location.lat })
      } else {
        const loc = await amap.geocode(d.address, '苏州')
        if (loc) {
          d.location = { lng: loc.lng, lat: loc.lat }
          waypoints.push(loc)
        }
      }
    }

    if (waypoints.length === 0) {
      ElMessage.error('没有可用的配送点坐标')
      return
    }

    // Plan route
    const lastWaypoint = waypoints[waypoints.length - 1]
    if (!lastWaypoint) {
      ElMessage.error('终点坐标无效')
      return
    }
    const middleWaypoints = waypoints.slice(0, -1)

    const result = await amap.drivingRoute(
      { lng: departure.value.lng, lat: departure.value.lat },
      lastWaypoint,
      middleWaypoints.length > 0 ? middleWaypoints : undefined,
      selectedStrategies.value
    )

    if (result && result.routes.length > 0 && result.routes[0]) {
      const selectedRoute = result.routes[0]
      const optimizedRoute: OptimizedRoute = {
        distance: selectedRoute.distance,
        duration: selectedRoute.duration,
        polyline: selectedRoute.polyline,
        steps: selectedRoute.steps,
      }

      // Update task
      const routeOrder = adjustDeliveries.value.map((_d: OrderDelivery, i: number) => i)
      const updateResult = await deliveryStore.updateTaskRoute(
        task.value!.id,
        routeOrder,
        optimizedRoute
      )

      if (updateResult.success) {
        ElMessage.success('路线已更新')
        adjustRouteDialogVisible.value = false
        task.value = await deliveryStore.fetchDeliveryTask(task.value!.id)

        // Re-render map
        if (mapInstance.value) {
          mapInstance.value.clearMap()
          renderMapElements()
        }
      } else {
        ElMessage.error(updateResult.error || '更新失败')
      }
    } else {
      ElMessage.error('路线规划失败')
    }
  } catch (error) {
    ElMessage.error('路线规划失败，请重试')
  } finally {
    replanningRoute.value = false
  }
}

function handleExportTask() {
  if (!task.value || sortedDeliveries.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  exportDeliveryTask(task.value, sortedDeliveries.value)
  ElMessage.success('配送清单已导出')
}

async function handleCopyNavLink() {
  if (!task.value || !hasValidLocations.value) {
    ElMessage.warning('配送点缺少坐标信息')
    return
  }

  const validDeliveries = sortedDeliveries.value.filter(d => d.location?.lng && d.location?.lat)

  // amapuri://route/plan/ 支持多途经点，直接复制
  const success = await copyNavigationLink(departure.value, destination.value, sortedDeliveries.value)
  if (success) {
    const viaCount = validDeliveries.length - 1
    if (viaCount > 0) {
      ElMessage.success(`导航链接已复制（含${viaCount}个途经点）`)
    } else {
      ElMessage.success('导航链接已复制')
    }
  } else {
    ElMessage.error('复制失败，请重试')
  }
}

async function startTask() {
  try {
    await ElMessageBox.confirm('开始配送后，相关订单状态将变为"配送中"，确定开始？', '开始配送')
    const result = await deliveryStore.startDeliveryTask(task.value!.id)
    if (result.success) {
      ElMessage.success('配送任务已开始')
      task.value = await deliveryStore.fetchDeliveryTask(task.value!.id)
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function completeTask() {
  try {
    await ElMessageBox.confirm('确定标记此配送任务为已完成？', '完成配送')
    const result = await deliveryStore.completeDeliveryTask(task.value!.id)
    if (result.success) {
      ElMessage.success('配送任务已完成')
      task.value = await deliveryStore.fetchDeliveryTask(task.value!.id)
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function cancelTask() {
  try {
    await ElMessageBox.confirm(
      '撤销后，配送任务将取消，相关订单将返回待配送状态。确定撤销？',
      '撤销配送任务',
      { type: 'warning' }
    )
    const result = await deliveryStore.cancelDeliveryTask(task.value!.id)
    if (result.success) {
      ElMessage.success('配送任务已撤销，订单已返回待配送列表')
      router.push('/deliveries')
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

function callPhone(phone?: string) {
  if (phone) {
    window.open(`tel:${phone}`)
  }
}

async function markDelivered(delivery: OrderDelivery) {
  try {
    await ElMessageBox.confirm('确认该配送点已送达？', '确认送达')
    const result = await deliveryStore.markDeliveryDelivered(delivery.id)
    if (result.success) {
      ElMessage.success('已标记为送达')
      task.value = await deliveryStore.fetchDeliveryTask(task.value!.id)
      // Re-render map
      if (mapInstance.value) {
        mapInstance.value.clearMap()
        renderMapElements()
      }
    } else {
      ElMessage.error((result as any).error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function copyRouteInfo() {
  if (!task.value?.deliveries) return

  const lines = sortedDeliveries.value.map((delivery, index) => {
    const buyerName = delivery.order?.customer?.name || ''
    const recipientName = delivery.recipient_name || buyerName
    const nameLine = recipientName !== buyerName
      ? `${buyerName} → ${recipientName}`
      : buyerName

    return `${index + 1}. ${nameLine}
地址：${delivery.address}
数量：${delivery.quantity}箱${delivery.recipient_phone || delivery.order?.customer?.phone ? `\n电话：${delivery.recipient_phone || delivery.order?.customer?.phone}` : ''}`
  })

  // 添加导航链接
  const navLink = generateAmapAutoNavLink(departure.value, destination.value, sortedDeliveries.value)
  const linkSection = navLink
    ? `\n━━━━━━━━━━\n【导航链接】\n${navLink}\n提示：打开链接即可在高德地图中开始导航`
    : ''

  const text = `【配送任务】${task.value.name || ''}
出发地：${departureName.value}
━━━━━━━━━━
${lines.join('\n\n')}
━━━━━━━━━━
共 ${sortedDeliveries.value.length} 个配送点${linkSection}`

  try {
    const success = await copyToClipboard(text)
    if (success) {
      ElMessage.success('已复制到剪贴板（含导航链接）')
    } else {
      ElMessage.error('复制失败')
    }
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
}

/* Action bar styles */
.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-text {
  margin-left: 4px;
}

/* Route summary stats */
.route-summary-card {
  margin-top: 16px;
}

.route-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-value.delivered {
  color: #67c23a;
}

.stat-unit {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}

.map-container {
  width: 100%;
  height: 450px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
}

.route-item {
  padding: 8px 0;
}

.route-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.route-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.route-names {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}

.route-info {
  padding-left: 32px;
}

.route-info p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.route-info .address-line {
  color: #303133;
}

.route-actions {
  padding-left: 32px;
  margin-top: 8px;
}

/* Sortable list for route adjustment */
.sortable-list {
  max-height: 300px;
  overflow-y: auto;
}

.sortable-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: move;
  transition: background 0.2s;
}

.sortable-item:hover {
  background: #ebeef5;
}

.drag-handle {
  cursor: grab;
  color: #909399;
  margin-right: 12px;
}

.sort-index {
  width: 24px;
  height: 24px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.sort-content {
  flex: 1;
  min-width: 0;
}

.sort-main {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.recipient-name {
  color: #67c23a;
}

.sort-address {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Map markers */
:deep(.marker) {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

:deep(.marker.start) {
  background: #67c23a;
}

:deep(.marker.delivery) {
  background: #409eff;
}

:deep(.marker.delivery.completed) {
  background: #67c23a;
}

:deep(.el-card__header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    width: 100%;
  }

  .header-left h2 {
    font-size: 16px;
  }

  .action-bar {
    flex-direction: column;
    gap: 8px;
  }

  .action-group {
    width: 100%;
    justify-content: flex-start;
  }

  .action-group .el-button {
    flex: 1;
    min-width: 0;
  }

  .action-group .el-button {
    font-size: 13px;
    padding: 8px 12px;
  }

  .action-group .el-button .el-icon {
    margin-right: 4px;
  }

  /* Route stats - 2x2 grid on mobile */
  .route-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .stat-item {
    min-width: auto;
    padding: 10px 8px;
  }

  .stat-value {
    font-size: 18px;
  }

  .stat-label {
    font-size: 11px;
  }

  .map-container {
    height: 280px;
  }

  .route-info {
    padding-left: 0;
    margin-top: 8px;
  }

  .route-actions {
    padding-left: 0;
  }

  .route-header {
    gap: 6px;
  }

  :deep(.el-timeline-item__wrapper) {
    padding-left: 12px;
  }

  :deep(.el-timeline-item__tail) {
    left: 11px;
  }

  :deep(.el-timeline-item__node) {
    left: 4px;
  }

  /* Dialog responsive */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto !important;
  }

  .sortable-item {
    padding: 10px 8px;
  }

  .drag-handle {
    margin-right: 8px;
  }

  .sort-index {
    margin-right: 8px;
  }
}

/* Tablet styles */
@media (min-width: 768px) and (max-width: 1024px) {
  .action-bar {
    flex-wrap: wrap;
  }

  .route-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }

  .map-container {
    height: 350px;
  }
}
</style>
