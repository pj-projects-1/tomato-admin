<template>
  <el-card shadow="never" class="today-tasks-card" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span class="title">
          <el-icon><Calendar /></el-icon>
          今日待办
        </span>
        <el-badge :value="totalTasks" :hidden="totalTasks === 0" type="primary" />
      </div>
    </template>

    <div class="tasks-grid">
      <!-- Pending Confirmation Orders -->
      <div class="task-card" @click="navigateTo('/orders?status=pending')">
        <div class="task-header">
          <span class="task-icon confirm">
            <el-icon><Clock /></el-icon>
          </span>
          <span class="task-title">待确认订单</span>
        </div>
        <div class="task-count">{{ pendingOrders.length || 0 }} 单</div>
        <div class="task-preview" v-if="pendingOrders.length > 0">
          {{ pendingOrdersPreview }}
        </div>
        <div class="task-preview empty" v-else>
          暂无待确认
        </div>
        <div class="task-action">
          <el-button type="primary" link size="small">
            去处理 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- Today's Deliveries -->
      <div class="task-card" @click="navigateTo('/deliveries')">
        <div class="task-header">
          <span class="task-icon delivery">
            <el-icon><Van /></el-icon>
          </span>
          <span class="task-title">今日配送</span>
        </div>
        <div class="task-count">{{ todayDeliveries.length || 0 }} 单</div>
        <div class="task-preview" v-if="todayDeliveries.length > 0">
          {{ todayDeliveriesPreview }}
        </div>
        <div class="task-preview empty" v-else>
          暂无配送任务
        </div>
        <div class="task-action">
          <el-button type="primary" link size="small">
            去配送规划 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- Pending Pickups -->
      <div class="task-card" @click="navigateTo('/deliveries?tab=pickup')">
        <div class="task-header">
          <span class="task-icon pickup">
            <el-icon><ShoppingBag /></el-icon>
          </span>
          <span class="task-title">待自提</span>
        </div>
        <div class="task-count">{{ pendingPickups.length || 0 }} 单</div>
        <div class="task-preview" v-if="pendingPickups.length > 0">
          {{ pendingPickupsPreview }}
        </div>
        <div class="task-preview empty" v-else>
          暂无待自提
        </div>
        <div class="task-action">
          <el-button type="primary" link size="small">
            去确认自提 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- Pending Express -->
      <div class="task-card" @click="navigateTo('/deliveries?tab=express')">
        <div class="task-header">
          <span class="task-icon express">
            <el-icon><Box /></el-icon>
          </span>
          <span class="task-title">待发货快递</span>
        </div>
        <div class="task-count">{{ pendingExpress.length || 0 }} 单</div>
        <div class="task-preview" v-if="pendingExpress.length > 0">
          {{ pendingExpressPreview }}
        </div>
        <div class="task-preview empty" v-else>
          暂无待发货
        </div>
        <div class="task-action">
          <el-button type="primary" link size="small">
            去快递发货 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import { Calendar, Van, Box, Clock, ArrowRight, ShoppingBag } from '@element-plus/icons-vue'

const router = useRouter()
const dashboardStore = useDashboardStore()

const loading = computed(() => dashboardStore.loadingAlerts)
const todayDeliveries = computed(() => dashboardStore.todayDeliveries)
const pendingExpress = computed(() => dashboardStore.pendingExpressDeliveries)
const pendingOrders = computed(() => dashboardStore.pendingConfirmationOrders)
const pendingPickups = computed(() => dashboardStore.pendingPickups)

const totalTasks = computed(() => {
  return todayDeliveries.value.length + pendingExpress.value.length + pendingOrders.value.length + pendingPickups.value.length
})

const todayDeliveriesPreview = computed(() => {
  if (todayDeliveries.value.length === 0) return ''
  const names = todayDeliveries.value.slice(0, 3).map(d => {
    // recipient_name if set, otherwise fall back to customer name
    const customerName = d.recipient_name || d.order?.customer?.name || '未知'
    return `${customerName}(${d.quantity}箱)`
  })
  const suffix = todayDeliveries.value.length > 3 ? '...' : ''
  return names.join(' ') + suffix
})

const pendingExpressPreview = computed(() => {
  if (pendingExpress.value.length === 0) return ''
  const statuses: Record<string, string> = {
    pending_pack: '待打包',
    pending_label: '待贴单',
    pending_dropoff: '待取件',
  }
  const statusCounts = pendingExpress.value.reduce((acc, d) => {
    const status = d.express_status || 'pending_pack'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(statusCounts)
    .map(([status, count]) => `${statuses[status] || status}${count}单`)
    .join(' ')
})

const pendingOrdersPreview = computed(() => {
  if (pendingOrders.value.length === 0) return ''
  const order = pendingOrders.value[0]
  if (!order) return ''
  const hours = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60))
  const orderNum = order.order_number || order.id.slice(0, 8)
  return `${orderNum} 已等待${hours}小时`
})

const pendingPickupsPreview = computed(() => {
  if (pendingPickups.value.length === 0) return ''
  const names = pendingPickups.value.slice(0, 3).map(d => {
    return `${d.order?.customer?.name || '未知'}(${d.quantity}箱)`
  })
  const suffix = pendingPickups.value.length > 3 ? '...' : ''
  return names.join(' ') + suffix
})

function navigateTo(path: string) {
  router.push(path)
}
</script>

<style scoped>
.today-tasks-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.task-card {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.task-card:hover {
  background: #f5f7fa;
  border-color: #e4e7ed;
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.task-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.task-icon.delivery {
  background: #ecf5ff;
  color: var(--tomato-red);
}

.task-icon.express {
  background: #fef0f0;
  color: var(--status-cancelled);
}

.task-icon.confirm {
  background: #fdf6ec;
  color: var(--harvest-gold);
}

.task-icon.pickup {
  background: #f0f9eb;
  color: var(--soft-sage);
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.task-count {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.task-preview {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
  line-height: 1.4;
}

.task-preview.empty {
  color: #c0c4cc;
}

.task-action {
  display: flex;
  justify-content: flex-end;
}

/* Mobile responsive */
@media (max-width: 767px) {
  .tasks-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .task-card {
    padding: 12px;
  }

  .task-count {
    font-size: 20px;
  }
}

@media (min-width: 768px) and (max-width: 1200px) {
  .tasks-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
