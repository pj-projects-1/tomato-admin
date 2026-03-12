<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">配送规划</h1>
      <div class="header-top-row">
        <!-- Desktop: Buttons row -->
        <div class="location-buttons">
          <el-button @click="showDepartureDialog">
            <el-icon><Location /></el-icon>
            <span>出发地{{ departure.address ? ': ' + departure.address : '' }}</span>
          </el-button>
          <el-button @click="showDestinationDialog" :disabled="isRoundTrip">
            <el-icon><Flag /></el-icon>
            <span>结束地{{ !isRoundTrip && destination.address ? ': ' + destination.address : '' }}</span>
          </el-button>
          <el-checkbox v-model="isRoundTrip" class="roundtrip-checkbox">
            环形
          </el-checkbox>
          <el-button
            type="primary"
            @click="showCreateTaskDialog"
            :disabled="selectedDeliveries.length === 0 || !isLocationsValid"
          >
            <el-icon><Plus /></el-icon>
            创建任务 ({{ selectedDeliveries.length }})
          </el-button>
        </div>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- Pending Deliveries -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span>待配送订单</span>
            <el-tag type="warning" style="margin-left: 8px;">
              {{ deliveryStore.pendingDeliveries.length }} 个
            </el-tag>
          </template>
          <!-- Desktop: Table view -->
          <el-table
            :data="deliveryStore.pendingDeliveries"
            v-loading="deliveryStore.loading"
            class="desktop-table"
            @selection-change="handleSelectionChange"
            style="width: 100%"
            ref="tableRef"
          >
            <el-table-column type="selection" width="40" />
            <el-table-column prop="order" label="买家" min-width="100">
              <template #default="{ row }">
                <span>{{ row.order?.customer?.name || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="收件人" min-width="100">
              <template #default="{ row }">
                <div class="recipient-info">
                  <span>{{ row.recipient_name || row.order?.customer?.name || '-' }}</span>
                  <el-icon v-if="row.recipient_name && row.recipient_name !== row.order?.customer?.name"
                    class="diff-icon" color="#E6A23C" title="收件人与买家不同"
                  >
                    <Warning />
                  </el-icon>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="address-cell">
                  <span>{{ row.address }}</span>
                  <el-icon v-if="!row.location" color="#F56C6C" size="14" title="未获取坐标">
                    <Location />
                  </el-icon>
                  <el-icon v-else color="#67C23A" size="14" title="已获取坐标">
                    <LocationFilled />
                  </el-icon>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="60" align="center" />
            <el-table-column prop="recipient_phone" label="电话" width="120">
              <template #default="{ row }">
                {{ row.recipient_phone || row.order?.customer?.phone || '-' }}
              </template>
            </el-table-column>
          </el-table>
          <!-- Mobile: Card view for pending deliveries -->
          <div class="mobile-card-list" v-loading="deliveryStore.loading">
            <div
              v-for="row in deliveryStore.pendingDeliveries"
              :key="row.id"
              class="delivery-mobile-card"
              :class="{ selected: selectedDeliveries.includes(row) }"
              @click="toggleDeliverySelection(row)"
            >
              <div class="card-header-row">
                <el-checkbox
                  :model-value="selectedDeliveries.includes(row)"
                  @click.stop
                  @change="toggleDeliverySelection(row)"
                />
                <span class="customer-name">{{ row.order?.customer?.name || '-' }}</span>
                <el-tag size="small">{{ row.quantity }}箱</el-tag>
              </div>
              <div class="card-address">
                <el-icon v-if="!row.location" color="#F56C6C" size="14"><Location /></el-icon>
                <el-icon v-else color="#67C23A" size="14"><LocationFilled /></el-icon>
                <span>{{ row.address }}</span>
              </div>
              <div class="card-footer">
                <span class="phone">{{ row.recipient_phone || row.order?.customer?.phone || '-' }}</span>
                <span v-if="row.recipient_name && row.recipient_name !== row.order?.customer?.name" class="recipient">
                  收件: {{ row.recipient_name }}
                </span>
              </div>
            </div>
            <el-empty v-if="deliveryStore.pendingDeliveries.length === 0" description="暂无待配送订单" />
          </div>
        </el-card>
      </el-col>

      <!-- Delivery Tasks -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>配送任务</template>

          <el-collapse v-model="activeCollapse">
            <!-- 未完成任务 -->
            <el-collapse-item name="active">
              <template #title>
                <div class="collapse-title">
                  <span>进行中的任务</span>
                  <el-tag type="warning" size="small">{{ activeTasks.length }}</el-tag>
                </div>
              </template>

              <!-- Desktop: Table view -->
              <el-table :data="activeTasks" style="width: 100%" class="desktop-table" v-if="activeTasks.length > 0">
                <el-table-column prop="name" label="任务名称" min-width="150">
                  <template #default="{ row }">
                    <el-button text type="primary" @click="viewTask(row)">
                      {{ row.name || '未命名任务' }}
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag :type="getTaskStatusType(row.status)" size="small">
                      {{ getTaskStatusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="total_distance" label="距离" width="80">
                  <template #default="{ row }">
                    {{ row.total_distance ? `${row.total_distance}km` : '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="100">
                  <template #default="{ row }">
                    {{ formatDate(row.created_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="160">
                  <template #default="{ row }">
                    <div class="task-actions">
                      <el-button
                        v-if="row.status === 'planning'"
                        text
                        type="success"
                        @click="startTask(row)"
                      >
                        开始
                      </el-button>
                      <el-button
                        v-if="row.status === 'in_progress'"
                        text
                        type="warning"
                        @click="cancelTask(row)"
                      >
                        撤销
                      </el-button>
                      <el-button text type="primary" @click="viewTask(row)">详情</el-button>
                      <el-button
                        v-if="row.status !== 'in_progress'"
                        text
                        type="danger"
                        @click="deleteTask(row)"
                      >
                        删除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>

              <!-- Mobile: Card view for active tasks -->
              <div class="mobile-card-list">
                <div
                  v-for="row in activeTasks"
                  :key="row.id"
                  class="task-mobile-card"
                  @click="viewTask(row)"
                >
                  <div class="card-header-row">
                    <span class="task-name">{{ row.name || '未命名任务' }}</span>
                    <el-tag :type="getTaskStatusType(row.status)" size="small">
                      {{ getTaskStatusText(row.status) }}
                    </el-tag>
                  </div>
                  <div class="card-info-row">
                    <span v-if="row.total_distance">{{ row.total_distance }}km</span>
                    <span>{{ formatDate(row.created_at) }}</span>
                  </div>
                  <div class="card-actions">
                    <el-button
                      v-if="row.status === 'planning'"
                      size="small"
                      type="success"
                      @click.stop="startTask(row)"
                    >
                      开始
                    </el-button>
                    <el-button
                      v-if="row.status === 'in_progress'"
                      size="small"
                      type="warning"
                      @click.stop="cancelTask(row)"
                    >
                      撤销
                    </el-button>
                    <el-button
                      v-if="row.status !== 'in_progress'"
                      size="small"
                      type="danger"
                      @click.stop="deleteTask(row)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <el-empty v-if="activeTasks.length === 0" description="暂无进行中的任务" :image-size="60" />
              </div>
            </el-collapse-item>

            <!-- 已完成任务 -->
            <el-collapse-item name="completed">
              <template #title>
                <div class="collapse-title">
                  <span>已完成的任务</span>
                  <el-tag type="info" size="small">{{ completedTasks.length }}</el-tag>
                </div>
              </template>

              <!-- Desktop: Table view -->
              <el-table :data="completedTasks" style="width: 100%" class="desktop-table" v-if="completedTasks.length > 0">
                <el-table-column prop="name" label="任务名称" min-width="150">
                  <template #default="{ row }">
                    <el-button text type="primary" @click="viewTask(row)">
                      {{ row.name || '未命名任务' }}
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag :type="getTaskStatusType(row.status)" size="small">
                      {{ getTaskStatusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="total_distance" label="距离" width="80">
                  <template #default="{ row }">
                    {{ row.total_distance ? `${row.total_distance}km` : '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="100">
                  <template #default="{ row }">
                    {{ formatDate(row.created_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="{ row }">
                    <div class="task-actions">
                      <el-button text type="primary" @click="viewTask(row)">详情</el-button>
                      <el-button
                        text
                        type="danger"
                        @click="deleteTask(row)"
                      >
                        删除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>

              <!-- Mobile: Card view for completed tasks -->
              <div class="mobile-card-list">
                <div
                  v-for="row in completedTasks"
                  :key="row.id"
                  class="task-mobile-card"
                  @click="viewTask(row)"
                >
                  <div class="card-header-row">
                    <span class="task-name">{{ row.name || '未命名任务' }}</span>
                    <el-tag :type="getTaskStatusType(row.status)" size="small">
                      {{ getTaskStatusText(row.status) }}
                    </el-tag>
                  </div>
                  <div class="card-info-row">
                    <span v-if="row.total_distance">{{ row.total_distance }}km</span>
                    <span>{{ formatDate(row.created_at) }}</span>
                  </div>
                  <div class="card-actions">
                    <el-button
                      size="small"
                      type="danger"
                      @click.stop="deleteTask(row)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <el-empty v-if="completedTasks.length === 0" description="暂无已完成的任务" :image-size="60" />
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>

    <!-- Departure Location Dialog -->
    <el-dialog v-model="departureDialogVisible" title="设置出发地点" width="500px">
      <el-form :model="departureForm" label-width="80px">
        <el-form-item label="出发地址">
          <AddressInput
            v-model="departureForm.address"
            v-model:location="departureForm.location"
            placeholder="输入出发地址搜索..."
          />
        </el-form-item>
        <el-form-item label="常用地点">
          <div class="quick-locations">
            <el-tag
              v-for="loc in quickLocations"
              :key="loc.name"
              :type="departureForm.address === loc.address ? 'primary' : 'info'"
              @click="selectQuickLocation(loc)"
              style="cursor: pointer; margin: 4px;"
            >
              {{ loc.name }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="坐标">
          <el-input
            :value="departureForm.location ? `${departureForm.location.lng}, ${departureForm.location.lat}` : '未获取'"
            disabled
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="departureDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDeparture">保存</el-button>
      </template>
    </el-dialog>

    <!-- Destination Dialog -->
    <el-dialog v-model="destinationDialogVisible" title="设置结束地点" width="500px">
      <el-form :model="destinationForm" label-width="80px">
        <el-form-item label="结束地址">
          <AddressInput
            v-model="destinationForm.address"
            v-model:location="destinationForm.location"
            placeholder="输入结束地址搜索..."
          />
        </el-form-item>
        <el-form-item label="常用地点">
          <div class="quick-locations">
            <el-tag
              v-for="loc in quickLocations"
              :key="loc.name"
              :type="destinationForm.address === loc.address ? 'primary' : 'info'"
              @click="selectQuickLocationForDestination(loc)"
              style="cursor: pointer; margin: 4px;"
            >
              {{ loc.name }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="坐标">
          <el-input
            :value="destinationForm.location ? `${destinationForm.location.lng}, ${destinationForm.location.lat}` : '未获取'"
            disabled
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="destinationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDestination">保存</el-button>
      </template>
    </el-dialog>

    <!-- Create Task Dialog -->
    <el-dialog
      v-model="createTaskDialogVisible"
      title="创建配送任务"
      width="800px"
      destroy-on-close
    >
      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 20px;">
        <el-step title="选择配送点" />
        <el-step title="路线规划" />
        <el-step title="确认创建" />
      </el-steps>

      <!-- Step 1: Delivery Points -->
      <div v-show="currentStep === 0">
        <el-alert
          v-if="deliveriesWithoutLocation.length > 0"
          type="warning"
          :closable="false"
          style="margin-bottom: 12px;"
        >
          有 {{ deliveriesWithoutLocation.length }} 个配送点未获取坐标，将自动尝试解析地址
        </el-alert>
        <div class="selected-deliveries">
          <div
            v-for="(d, index) in selectedDeliveries"
            :key="d.id"
            class="delivery-card"
          >
            <div class="delivery-index">{{ index + 1 }}</div>
            <div class="delivery-content">
              <div class="delivery-main">
                <span class="buyer">{{ d.order?.customer?.name }}</span>
                <span class="arrow">→</span>
                <span class="recipient">{{ d.recipient_name || d.order?.customer?.name }}</span>
              </div>
              <div class="delivery-address">{{ d.address }}</div>
              <div class="delivery-meta">
                <span>{{ d.quantity }} 箱</span>
                <span>{{ d.recipient_phone || d.order?.customer?.phone || '无电话' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Route Planning -->
      <div v-show="currentStep === 1" v-loading="planningRoute">
        <el-alert
          v-if="!amapKey"
          title="未配置高德地图 API Key，无法使用路线规划功能"
          type="error"
          :closable="false"
          style="margin-bottom: 12px;"
        />

        <div class="route-options">
          <h4>选择路线策略</h4>
          <el-radio-group v-model="selectedStrategy">
            <el-radio
              v-for="route in routeResults"
              :key="route.strategy"
              :value="route.strategy"
              border
              style="margin: 4px;"
            >
              <div class="route-option">
                <span class="route-name">{{ route.strategyName }}</span>
                <span class="route-info">
                  {{ (route.distance / 1000).toFixed(1) }} km /
                  {{ Math.round(route.duration / 60) }} 分钟
                </span>
              </div>
            </el-radio>
          </el-radio-group>
        </div>

        <!-- 地图预览 -->
        <div v-if="routeResults.length > 0 && selectedStrategy >= 0" class="route-map-preview">
          <h4>路线预览</h4>
          <div id="route-map-container" ref="mapContainer" class="route-map-container">
            <div v-if="!mapLoaded" class="map-placeholder">
              <el-icon size="48"><MapLocation /></el-icon>
              <p>{{ amapJsKey ? '地图加载中...' : '请配置高德地图 JS API Key' }}</p>
            </div>
          </div>
        </div>

        <div v-if="routeResults.length === 0 && !planningRoute" class="no-routes">
          点击"开始规划"按钮获取推荐路线
        </div>
      </div>

      <!-- Step 3: Confirm -->
      <div v-show="currentStep === 2">
        <el-form :model="taskForm" label-width="80px">
          <el-form-item label="任务名称">
            <el-input v-model="taskForm.name" placeholder="例如：2024-01-15 上午配送" />
          </el-form-item>
          <el-form-item label="出发地点">
            <el-input :value="departureName" disabled />
          </el-form-item>
          <el-form-item label="配送点数">
            <el-input :value="selectedDeliveries.length + ' 个'" disabled />
          </el-form-item>
          <el-form-item label="预计距离">
            <el-input :value="selectedRoute ? `${(selectedRoute.distance / 1000).toFixed(1)} km` : '-'" disabled />
          </el-form-item>
          <el-form-item label="预计时间">
            <el-input :value="selectedRoute ? `${Math.round(selectedRoute.duration / 60)} 分钟` : '-'" disabled />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
        <el-button v-if="currentStep === 0" @click="startRoutePlanning" type="primary" :loading="planningRoute">
          开始规划
        </el-button>
        <el-button v-if="currentStep === 1" @click="currentStep++" type="primary" :disabled="selectedStrategy < 0">
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 2"
          type="primary"
          :loading="submitting"
          @click="createTask"
        >
          创建任务
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useDeliveryStore } from '@/stores/deliveries'
import { getAmapService, DEFAULT_DEPARTURE, DEFAULT_DEPARTURE_ADDRESS, type Location } from '@/api/amap'
import AddressInput from '@/components/AddressInput.vue'
import type { DeliveryTask, DeliveryTaskStatus, OrderDelivery, OptimizedRoute, RouteStep } from '@/types'
import type { TableInstance } from 'element-plus'

const router = useRouter()
const deliveryStore = useDeliveryStore()

const tableRef = ref<TableInstance>()
const selectedDeliveries = ref<OrderDelivery[]>([])
const createTaskDialogVisible = ref(false)
const departureDialogVisible = ref(false)
const destinationDialogVisible = ref(false)
const submitting = ref(false)
const planningRoute = ref(false)
const currentStep = ref(0)
const isRoundTrip = ref(true) // 默认环形路线
const activeCollapse = ref(['active']) // 默认展开进行中的任务

const taskForm = reactive({
  name: '',
})

// 出发地点相关
const departure = reactive<Location & { address: string }>({
  lng: 0,
  lat: 0,
  address: '',
})

const departureForm = reactive({
  address: '',
  location: null as Location | null,
})

// 结束地点相关
const destination = reactive<Location & { address: string }>({
  lng: 0,
  lat: 0,
  address: '',
})

const destinationForm = reactive({
  address: '',
  location: null as Location | null,
})

// Recent departure locations (persisted to localStorage)
const RECENT_LOCATIONS_KEY = 'tomato-admin-recent-locations'
const MAX_RECENT_LOCATIONS = 5

interface SavedLocation {
  name: string
  address: string
  location: Location
}

const quickLocations = ref<SavedLocation[]>([])

function isValidLocation(loc: unknown): loc is Location {
  return (
    typeof loc === 'object' &&
    loc !== null &&
    typeof (loc as Location).lng === 'number' &&
    typeof (loc as Location).lat === 'number' &&
    !isNaN((loc as Location).lng) &&
    !isNaN((loc as Location).lat)
  )
}

function isValidSavedLocation(item: unknown): item is SavedLocation {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as SavedLocation).name === 'string' &&
    typeof (item as SavedLocation).address === 'string' &&
    isValidLocation((item as SavedLocation).location)
  )
}

function loadRecentLocations() {
  try {
    const saved = localStorage.getItem(RECENT_LOCATIONS_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      // Validate the parsed data is an array of valid SavedLocation objects
      if (Array.isArray(parsed) && parsed.every(isValidSavedLocation)) {
        quickLocations.value = parsed
      } else {
        // Clear invalid data from localStorage
        localStorage.removeItem(RECENT_LOCATIONS_KEY)
        console.warn('Invalid recent locations data cleared from localStorage')
      }
    }
  } catch (e) {
    console.error('Failed to load recent locations:', e)
  }
}

function saveRecentLocation(name: string, address: string, location: Location) {
  // Remove if already exists (by address)
  const filtered = quickLocations.value.filter(l => l.address !== address)
  // Add to beginning
  const updated = [{ name, address, location }, ...filtered].slice(0, MAX_RECENT_LOCATIONS)
  quickLocations.value = updated
  try {
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('Failed to save recent locations:', e)
  }
}

// 路线规划结果
const routeResults = ref<{
  strategy: number
  strategyName: string
  distance: number
  duration: number
  polyline: string
  steps: RouteStep[]
}[]>([])
const selectedStrategy = ref(-1)

// 地图相关
const mapContainer = ref<HTMLElement>()
const mapLoaded = ref(false)
const mapInstance = ref<any>(null)
const currentPolyline = ref<any>(null)

const amapKey = computed(() => import.meta.env.VITE_AMAP_KEY)
const amapJsKey = computed(() => import.meta.env.VITE_AMAP_JS_KEY)
const amapJsSecurityKey = computed(() => import.meta.env.VITE_AMAP_JS_SECURITY_KEY)
const departureName = computed(() => departure.address || '未设置')
const destinationName = computed(() => isRoundTrip.value ? departure.address || '未设置' : destination.address || '未设置')
const selectedRoute = computed(() => routeResults.value.find(r => r.strategy === selectedStrategy.value))

// 检查位置是否有效配置
const isLocationsValid = computed(() => {
  const hasDeparture = departure.address && departure.lng !== 0 && departure.lat !== 0
  if (!hasDeparture) return false
  if (!isRoundTrip.value) {
    return destination.address && destination.lng !== 0 && destination.lat !== 0
  }
  return true
})

const deliveriesWithoutLocation = computed(() =>
  selectedDeliveries.value.filter((d: OrderDelivery) => !d.location)
)

// 分类配送任务：未完成（planning, in_progress）和已完成（completed, cancelled）
const activeTasks = computed(() =>
  deliveryStore.deliveryTasks.filter((t: DeliveryTask) =>
    t.status === 'planning' || t.status === 'in_progress'
  )
)

const completedTasks = computed(() =>
  deliveryStore.deliveryTasks.filter((t: DeliveryTask) =>
    t.status === 'completed' || t.status === 'cancelled'
  )
)

onMounted(() => {
  loadRecentLocations()
  deliveryStore.fetchPendingDeliveries()
  deliveryStore.fetchDeliveryTasks()
})

onUnmounted(() => {
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
})


function handleSelectionChange(selection: OrderDelivery[]) {
  selectedDeliveries.value = selection
}

function toggleDeliverySelection(delivery: OrderDelivery) {
  const index = selectedDeliveries.value.findIndex(d => d.id === delivery.id)
  if (index >= 0) {
    selectedDeliveries.value.splice(index, 1)
  } else {
    selectedDeliveries.value.push(delivery)
  }
}

function formatDate(date: string) {
  return dayjs(date).format('MM-DD HH:mm')
}

function getTaskStatusType(status: DeliveryTaskStatus) {
  const map: Record<DeliveryTaskStatus, string> = {
    planning: 'info',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

function getTaskStatusText(status: DeliveryTaskStatus) {
  const map: Record<DeliveryTaskStatus, string> = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

// 出发地点设置
function showDepartureDialog() {
  departureForm.address = departure.address
  departureForm.location = { lng: departure.lng, lat: departure.lat }
  departureDialogVisible.value = true
}

function selectQuickLocation(loc: SavedLocation) {
  departureForm.address = loc.address
  departureForm.location = { ...loc.location }
}

function saveDeparture() {
  if (!departureForm.location) {
    ElMessage.warning('请选择或输入出发地点')
    return
  }
  departure.address = departureForm.address
  departure.lng = departureForm.location.lng
  departure.lat = departureForm.location.lat
  // Save as recent location
  const shortName = departureForm.address.split(/[省市县区]/)[0] || departureForm.address.slice(0, 10)
  saveRecentLocation(shortName, departureForm.address, departureForm.location)
  // 如果是环形路线，同步更新结束地
  if (isRoundTrip.value) {
    destination.address = departure.address
    destination.lng = departure.lng
    destination.lat = departure.lat
  }
  departureDialogVisible.value = false
  ElMessage.success('出发地点已更新')
}

// 结束地点设置
function showDestinationDialog() {
  if (isRoundTrip.value) {
    ElMessage.info('环形路线模式下，结束地自动与出发地相同')
    return
  }
  destinationForm.address = destination.address
  destinationForm.location = { lng: destination.lng, lat: destination.lat }
  destinationDialogVisible.value = true
}

function selectQuickLocationForDestination(loc: SavedLocation) {
  destinationForm.address = loc.address
  destinationForm.location = { ...loc.location }
}

function saveDestination() {
  if (!destinationForm.location) {
    ElMessage.warning('请选择或输入结束地点')
    return
  }
  destination.address = destinationForm.address
  destination.lng = destinationForm.location.lng
  destination.lat = destinationForm.location.lat
  destinationDialogVisible.value = false
  ElMessage.success('结束地点已更新')
}

// 监听环形路线选项，自动同步结束地
watch(isRoundTrip, (isRound) => {
  if (isRound) {
    destination.address = departure.address
    destination.lng = departure.lng
    destination.lat = departure.lat
  }
})

// 创建任务流程
function showCreateTaskDialog() {
  if (selectedDeliveries.value.length === 0) {
    ElMessage.warning('请先选择要配送的订单')
    return
  }

  // 检查位置是否设置
  if (!departure.address || departure.lng === 0 || departure.lat === 0) {
    ElMessage.warning('请先设置出发地点')
    return
  }

  if (!isRoundTrip.value && (!destination.address || destination.lng === 0 || destination.lat === 0)) {
    ElMessage.warning('请先设置结束地点')
    return
  }

  currentStep.value = 0
  taskForm.name = dayjs().format('YYYY-MM-DD') + ' 配送任务'
  routeResults.value = []
  selectedStrategy.value = -1
  // 重置地图状态
  mapLoaded.value = false
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
  createTaskDialogVisible.value = true
}

async function startRoutePlanning() {
  if (!amapKey.value) {
    ElMessage.error('未配置高德地图 API Key')
    return
  }

  if (!departure.address || departure.lng === 0 || departure.lat === 0) {
    ElMessage.warning('请先设置出发地点')
    return
  }

  // 非环形路线时，检查结束地是否设置
  if (!isRoundTrip.value && (!destination.address || destination.lng === 0 || destination.lat === 0)) {
    ElMessage.warning('请先设置结束地点')
    return
  }

  planningRoute.value = true
  try {
    const amap = getAmapService()
    if (!amap) throw new Error('Amap service not available')

    // 1. 先解析未获取坐标的地址
    for (const d of deliveriesWithoutLocation.value) {
      const loc = await amap.geocode(d.address, '苏州')
      if (loc) {
        d.location = { lat: loc.lat, lng: loc.lng }
      }
    }

    // 2. 准备配送点坐标
    const waypoints: Location[] = selectedDeliveries.value
      .filter(d => d.location)
      .map(d => ({
        lng: d.location!.lng,
        lat: d.location!.lat,
      }))

    if (waypoints.length === 0) {
      ElMessage.error('没有可用的配送点坐标')
      return
    }

    // 3. 调用路线规划
    const departureLocation: Location = { lng: departure.lng, lat: departure.lat }
    const destinationLocation: Location = isRoundTrip.value
      ? departureLocation
      : { lng: destination.lng, lat: destination.lat }

    const result = await amap.drivingRoute(
      departureLocation,
      destinationLocation,
      waypoints, // 所有配送点作为途经点
      [0, 2, 4, 10] // 多种策略
    )

    if (result && result.routes.length > 0) {
      routeResults.value = result.routes
      selectedStrategy.value = -1 // 不自动选择，让用户手动选择

      // 根据优化后的顺序重新排列配送点
      if (result.optimizedOrder && result.optimizedOrder.length > 0) {
        const optimizedDeliveries = result.optimizedOrder
          .map(i => selectedDeliveries.value.filter(d => d.location)[i])
          .filter((d): d is OrderDelivery => d !== undefined)
        selectedDeliveries.value = optimizedDeliveries
      }

      currentStep.value = 1
      ElMessage.success(`获取到 ${result.routes.length} 条推荐路线`)
    } else {
      ElMessage.error('路线规划失败')
    }
  } catch (error) {
    ElMessage.error('路线规划失败，请重试')
  } finally {
    planningRoute.value = false
  }
}

async function createTask() {
  if (!selectedRoute.value) {
    ElMessage.error('请选择一条路线')
    return
  }

  submitting.value = true
  try {
    const deliveryIds = selectedDeliveries.value.map((d: OrderDelivery) => d.id)

    const optimizedRoute: OptimizedRoute = {
      distance: selectedRoute.value.distance,
      duration: selectedRoute.value.duration,
      polyline: selectedRoute.value.polyline,
      steps: selectedRoute.value.steps,
    }

    // 准备出发地和结束地数据
    const departureData = departure.address ? {
      lng: departure.lng,
      lat: departure.lat,
      address: departure.address,
    } : undefined

    const destinationData = isRoundTrip.value ? departureData : (
      destination.address ? {
        lng: destination.lng,
        lat: destination.lat,
        address: destination.address,
      } : undefined
    )

    const result = await deliveryStore.createDeliveryTask(
      taskForm.name || undefined,
      deliveryIds,
      optimizedRoute,
      departureData,
      destinationData
    )

    if (result.success) {
      ElMessage.success('配送任务创建成功')
      createTaskDialogVisible.value = false
      selectedDeliveries.value = []
      await deliveryStore.fetchPendingDeliveries()
    } else {
      ElMessage.error(result.error || '创建失败')
    }
  } catch (error) {
    ElMessage.error('创建失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function startTask(task: DeliveryTask) {
  try {
    await ElMessageBox.confirm('开始配送后，相关订单状态将变为"配送中"，确定开始？', '开始配送')
    const result = await deliveryStore.startDeliveryTask(task.id)
    if (result.success) {
      ElMessage.success('配送任务已开始')
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function cancelTask(task: DeliveryTask) {
  try {
    await ElMessageBox.confirm(
      '撤销后，配送任务将取消，相关订单将返回待配送状态。确定撤销？',
      '撤销配送任务',
      { type: 'warning' }
    )
    const result = await deliveryStore.cancelDeliveryTask(task.id)
    if (result.success) {
      ElMessage.success('配送任务已撤销')
      await deliveryStore.fetchPendingDeliveries()
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

function viewTask(task: DeliveryTask) {
  router.push(`/deliveries/${task.id}`)
}

async function deleteTask(task: DeliveryTask) {
  try {
    await ElMessageBox.confirm('确定删除此配送任务？已分配的订单将返回待配送状态。', '确认删除')
    const result = await deliveryStore.deleteDeliveryTask(task.id)
    if (result.success) {
      ElMessage.success('删除成功')
      await deliveryStore.fetchPendingDeliveries()
    } else {
      ElMessage.error(result.error || '删除失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

// 地图初始化和渲染
function initRouteMap() {
  if (!mapContainer.value || !amapJsKey.value) return

  // 设置安全密钥
  // @ts-ignore
  window._AMapSecurityConfig = {
    securityJsCode: amapJsSecurityKey.value,
  }

  // Check if AMap is already loaded
  // @ts-ignore
  if (window.AMap) {
    createRouteMap()
    return
  }

  // Check if script is already being loaded
  const existingScript = document.querySelector('script[src*="webapi.amap.com/maps"]')
  if (existingScript) {
    if (existingScript.getAttribute('data-loaded') === 'true') {
      createRouteMap()
    } else {
      existingScript.addEventListener('load', createRouteMap)
    }
    return
  }

  // Load AMap JS API
  const script = document.createElement('script')
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapJsKey.value}`
  script.onload = () => {
    script.onload = null // Clean up to prevent memory leak
    script.onerror = null
    script.setAttribute('data-loaded', 'true')
    createRouteMap()
  }
  script.onerror = () => {
    script.onload = null // Clean up to prevent memory leak
    script.onerror = null
    console.error('Map script load failed')
  }

  document.head.appendChild(script)
}

function createRouteMap() {
  try {
    // @ts-ignore
    const AMap = window.AMap
    if (!AMap) return

    mapInstance.value = new AMap.Map('route-map-container', {
      zoom: 11,
      center: [departure.lng || DEFAULT_DEPARTURE.lng, departure.lat || DEFAULT_DEPARTURE.lat],
    })

    mapLoaded.value = true
    renderRouteOnMap()
  } catch (e) {
    console.error('Map init error:', e)
  }
}

function renderRouteOnMap() {
  if (!mapInstance.value || !selectedRoute.value) return

  // @ts-ignore
  const AMap = window.AMap

  // 清除之前的路线
  if (currentPolyline.value) {
    mapInstance.value.remove(currentPolyline.value)
  }

  // 清除所有标记
  mapInstance.value.clearMap()

  // 添加起点标记
  const startMarker = new AMap.Marker({
    position: [departure.lng, departure.lat],
    title: '出发地',
    content: '<div class="route-marker start"><span>起</span></div>',
  })
  mapInstance.value.add(startMarker)

  // 添加配送点标记
  selectedDeliveries.value.forEach((delivery, index) => {
    if (delivery.location) {
      const marker = new AMap.Marker({
        position: [delivery.location.lng, delivery.location.lat],
        title: delivery.address,
        content: `<div class="route-marker delivery"><span>${index + 1}</span></div>`,
      })
      mapInstance.value.add(marker)
    }
  })

  // 绘制路线
  if (selectedRoute.value.polyline) {
    const path = selectedRoute.value.polyline.split(';').map((p: string) => {
      const parts = p.split(',')
      const lng = parts[0] || '0'
      const lat = parts[1] || '0'
      return [parseFloat(lng), parseFloat(lat)]
    })

    currentPolyline.value = new AMap.Polyline({
      path,
      strokeColor: '#409eff',
      strokeWeight: 6,
      strokeOpacity: 0.8,
    })
    mapInstance.value.add(currentPolyline.value)
    mapInstance.value.setFitView([currentPolyline.value])
  }
}

// 监听路线策略变化，更新地图
watch(selectedStrategy, () => {
  if (mapInstance.value && selectedRoute.value) {
    renderRouteOnMap()
  }
})

// 监听步骤变化，初始化地图
watch(currentStep, async (newStep) => {
  if (newStep === 1 && routeResults.value.length > 0 && amapJsKey.value) {
    await nextTick()
    setTimeout(() => {
      if (!mapInstance.value) {
        initRouteMap()
      } else {
        renderRouteOnMap()
      }
    }, 300)
  }
})

// 监听策略选择，初始化地图
watch(selectedStrategy, async (newStrategy) => {
  if (newStrategy >= 0 && routeResults.value.length > 0 && amapJsKey.value) {
    await nextTick()
    setTimeout(() => {
      if (!mapInstance.value) {
        initRouteMap()
      } else {
        renderRouteOnMap()
      }
    }, 300)
  }
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Desktop only elements */
/* Header layout */
.header-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.location-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.location-buttons .el-button {
  white-space: nowrap;
  max-width: 180px;
}

.location-buttons .el-button span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.roundtrip-checkbox {
  margin: 0 12px;
  white-space: nowrap;
}

/* Collapse title styles */
.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

/* Task table actions alignment */
.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.task-actions .el-button {
  margin: 0;
  padding: 4px 8px;
}

/* Mobile card views - hidden on desktop */
.mobile-card-list {
  display: none;
}

.delivery-mobile-card,
.task-mobile-card {
  display: none;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipient-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.buyer-row,
.recipient-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.buyer-name {
  font-weight: 500;
}

.diff-icon {
  margin-left: 4px;
}

.address-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.quick-locations {
  display: flex;
  flex-wrap: wrap;
}

.selected-deliveries {
  max-height: 300px;
  overflow-y: auto;
}

.delivery-card {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  margin-bottom: 8px;
  background: #f5f7fa;
  border-radius: 8px;
}

.delivery-index {
  width: 28px;
  height: 28px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.delivery-content {
  flex: 1;
}

.delivery-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.buyer {
  font-weight: 500;
}

.arrow {
  color: #909399;
}

.recipient {
  color: #67c23a;
}

.delivery-address {
  color: #606266;
  font-size: 13px;
  margin-bottom: 4px;
}

.delivery-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.route-options {
  margin-bottom: 16px;
}

.route-options h4 {
  margin-bottom: 12px;
}

.route-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-name {
  font-weight: 500;
}

.route-info {
  font-size: 12px;
  color: #909399;
}

.no-routes {
  text-align: center;
  color: #909399;
  padding: 40px;
}

:deep(.el-card__header) {
  display: flex;
  align-items: center;
}

:deep(.el-radio.is-bordered) {
  height: auto;
  padding: 12px 16px;
}

.route-map-preview {
  margin-top: 16px;
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
}

.route-map-preview h4 {
  margin-bottom: 12px;
}

.route-map-container {
  width: 100%;
  height: 350px;
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

/* Route map markers */
:deep(.route-marker) {
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

:deep(.route-marker.start) {
  background: #67c23a;
}

:deep(.route-marker.delivery) {
  background: #409eff;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  .mobile-card-list {
    display: block;
  }

  /* Hide desktop table */
  .desktop-table {
    display: none !important;
  }

  /* Mobile header adjustments */
  .header-top-row {
    width: 100%;
    overflow-x: auto;
  }

  .location-buttons {
    flex-wrap: nowrap;
    gap: 6px;
    min-width: max-content;
  }

  .location-buttons .el-button {
    padding: 6px 10px;
    font-size: 12px;
    max-width: 100px;
  }

  .location-buttons .el-button span {
    display: inline-block;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .location-buttons .el-button--primary {
    max-width: none;
  }

  .location-buttons .el-button--primary span {
    max-width: none;
  }

  .roundtrip-checkbox {
    margin: 0 6px;
    font-size: 12px;
  }

  .roundtrip-checkbox :deep(.el-checkbox__label) {
    font-size: 12px;
    padding-left: 4px;
  }

  /* Mobile card styles - pending deliveries */
  .delivery-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .delivery-mobile-card:active {
    background: #f5f7fa;
  }

  .delivery-mobile-card.selected {
    border-color: #409eff;
    background: #ecf5ff;
  }

  .delivery-mobile-card .card-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .delivery-mobile-card .customer-name {
    flex: 1;
    font-weight: 500;
    font-size: 15px;
  }

  .delivery-mobile-card .card-address {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    font-size: 13px;
    color: #606266;
    line-height: 1.4;
  }

  .delivery-mobile-card .card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #909399;
  }

  .delivery-mobile-card .recipient {
    color: #67c23a;
  }

  /* Mobile card styles - tasks */
  .task-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .task-mobile-card:active {
    background: #f5f7fa;
  }

  .task-mobile-card .card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .task-mobile-card .task-name {
    font-weight: 500;
    font-size: 15px;
    color: #409eff;
  }

  .task-mobile-card .card-info-row {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: #909399;
  }

  .task-mobile-card .card-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  /* Dialog responsive */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto !important;
  }

  :deep(.el-form-item__label) {
    float: none;
    text-align: left;
    padding-bottom: 4px;
  }

  .route-options :deep(.el-radio.is-bordered) {
    padding: 8px 12px;
    margin: 4px !important;
  }

  .route-map-container {
    height: 200px;
  }

  :deep(.el-steps) {
    transform: scale(0.8);
    transform-origin: left center;
  }
}

/* Tablet styles */
@media (min-width: 768px) and (max-width: 1024px) {
  .header-actions {
    flex-wrap: wrap;
  }

  .route-map-container {
    height: 300px;
  }
}
</style>
