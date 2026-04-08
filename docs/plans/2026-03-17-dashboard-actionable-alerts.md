# Dashboard Actionable Alerts - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Today's Tasks" section to Dashboard that shows time-sensitive items requiring attention: today's deliveries, pending express shipments, and orders awaiting confirmation.

**Architecture:** Extend dashboard store with new fetch functions for each alert type, add a clean card-based UI section at top of Dashboard, use subtle visual hierarchy with icons and counts. Keep it minimal and scannable.

**Tech Stack:** Vue 3, Pinia, Element Plus, dayjs

---

## Design Specification

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 今日待办                                              3项    │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌──────────────────────────┐      │
│ │ 🚚 今日配送              │ │ 📦 待发货快递            │      │
│ │                          │ │                          │      │
│ │ 5 单                     │ │ 2 单                     │      │
│ │ 张三(2箱) 李四(1箱)...   │ │ 顺丰待取件               │      │
│ │                          │ │                          │      │
│ │ [去配送规划]             │ │ [去快递发货]             │      │
│ └──────────────────────────┘ └──────────────────────────┘      │
│ ┌──────────────────────────┐                                   │
│ │ ⏰ 待确认订单            │                                   │
│ │                          │                                   │
│ │ 1 单                     │                                   │
│ │ HF20260316012 已等待26h  │                                   │
│ │                          │                                   │
│ │ [去处理]                 │                                   │
│ └──────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Visual Design Principles

1. **Clean cards** - White background, subtle shadow, rounded corners
2. **Icon + title** - Left-aligned, clear visual hierarchy
3. **Count prominent** - Large number for quick scanning
4. **Preview text** - One-line summary of items
5. **Action button** - Right-aligned, links to relevant page
6. **Zero state** - Show "暂无" when no items (don't hide)

### Mobile Responsive

- Cards stack vertically on mobile
- Preview text truncated to single line
- Same button styling

---

## Task 1: Extend Dashboard Store - Fetch Functions

**Files:**
- Modify: `src/stores/dashboard.ts`

**Step 1: Add new reactive state**

Add after existing refs (around line 55):

```typescript
// Actionable alerts
const todayDeliveries = ref<OrderDelivery[]>([])
const pendingExpressDeliveries = ref<OrderDelivery[]>([])
const pendingConfirmationOrders = ref<Order[]>([])
const loadingAlerts = ref(false)
```

**Step 2: Add import for OrderDelivery and Order types**

Update the import at top:

```typescript
import type { Order, Stock, OrderStatus, OrderDelivery } from '@/types'
```

**Step 3: Add fetchTodayDeliveries function**

Add new function after fetchPendingDeliveriesCount:

```typescript
async function fetchTodayDeliveries() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Get delivery tasks created today that are in progress or planning
  const { data: tasks, error: taskError } = await supabase
    .from('delivery_tasks')
    .select('id')
    .gte('created_at', todayStr)
    .in('status', ['planning', 'in_progress'])

  if (taskError) {
    if (import.meta.env.DEV) console.error('Fetch today tasks error:', taskError)
    todayDeliveries.value = []
    return
  }

  if (!tasks || tasks.length === 0) {
    todayDeliveries.value = []
    return
  }

  const taskIds = tasks.map(t => t.id)

  // Get deliveries assigned to today's tasks
  const { data: deliveries, error: deliveryError } = await supabase
    .from('order_deliveries')
    .select(`
      id,
      recipient_name,
      quantity,
      address,
      status,
      delivery_method,
      order:orders(
        id,
        order_number,
        customer:customers(name)
      )
    `)
    .in('delivery_task_id', taskIds)
    .order('sequence_in_route', { ascending: true })

  if (deliveryError) {
    if (import.meta.env.DEV) console.error('Fetch today deliveries error:', deliveryError)
    todayDeliveries.value = []
    return
  }

  todayDeliveries.value = deliveries || []
}
```

**Step 4: Add fetchPendingExpress function**

```typescript
async function fetchPendingExpressDeliveries() {
  // Get express deliveries that are packed but not yet shipped
  const { data: deliveries, error } = await supabase
    .from('order_deliveries')
    .select(`
      id,
      recipient_name,
      quantity,
      express_company,
      express_status,
      order:orders(
        id,
        order_number,
        customer:customers(name)
      )
    `)
    .eq('delivery_method', 'express')
    .in('express_status', ['pending_pack', 'pending_label', 'pending_dropoff'])
    .order('created_at', { ascending: true })

  if (error) {
    if (import.meta.env.DEV) console.error('Fetch pending express error:', error)
    pendingExpressDeliveries.value = []
    return
  }

  pendingExpressDeliveries.value = deliveries || []
}
```

**Step 5: Add fetchPendingConfirmation function**

```typescript
async function fetchPendingConfirmationOrders() {
  // Get orders pending confirmation for more than 24 hours
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_boxes,
      total_amount,
      created_at,
      customer:customers(name)
    `)
    .eq('status', 'pending')
    .lt('created_at', yesterday.toISOString())
    .order('created_at', { ascending: true })
    .limit(5)

  if (error) {
    if (import.meta.env.DEV) console.error('Fetch pending confirmation error:', error)
    pendingConfirmationOrders.value = []
    return
  }

  pendingConfirmationOrders.value = orders || []
}
```

**Step 6: Add fetchAllAlerts function**

```typescript
async function fetchAllAlerts() {
  loadingAlerts.value = true
  try {
    await Promise.all([
      fetchTodayDeliveries(),
      fetchPendingExpressDeliveries(),
      fetchPendingConfirmationOrders(),
    ])
  } finally {
    loadingAlerts.value = false
  }
}
```

**Step 7: Update refreshAll to include alerts**

Update the refreshAll function to call fetchAllAlerts:

```typescript
async function refreshAll(force = false) {
  const now = Date.now()
  if (!force && now - lastFetchTime.value < CACHE_TTL) {
    return
  }

  loading.value = true
  loadingStats.value = true
  loadingOrders.value = true

  try {
    await Promise.all([
      fetchAllOrderStats(),
      fetchPendingDeliveriesCount(),
      fetchAllAlerts(),  // Add this line
    ])
    currentStock.value = await getCurrentStock()
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Fetch stats error:', error)
    }
  } finally {
    loadingStats.value = false
    loadingOrders.value = false
  }

  loadingStocks.value = true
  try {
    await fetchRecentStocks()
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Fetch recent stocks error:', error)
    }
  } finally {
    loadingStocks.value = false
  }

  lastFetchTime.value = now
  loading.value = false
}
```

**Step 8: Export new state and functions**

Add to the return statement:

```typescript
return {
  // ... existing exports
  todayDeliveries,
  pendingExpressDeliveries,
  pendingConfirmationOrders,
  loadingAlerts,
  fetchAllAlerts,
}
```

**Step 9: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 2: Add TodayTasks Component

**Files:**
- Create: `src/components/TodayTasks.vue`

**Step 1: Create the component file**

Create a clean, reusable component:

```vue
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
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import dayjs from 'dayjs'

const router = useRouter()
const dashboardStore = useDashboardStore()

const loading = computed(() => dashboardStore.loadingAlerts)
const todayDeliveries = computed(() => dashboardStore.todayDeliveries)
const pendingExpress = computed(() => dashboardStore.pendingExpressDeliveries)
const pendingOrders = computed(() => dashboardStore.pendingConfirmationOrders)

const totalTasks = computed(() => {
  return todayDeliveries.value.length + pendingExpress.value.length + pendingOrders.value.length
})

const todayDeliveriesPreview = computed(() => {
  if (todayDeliveries.value.length === 0) return ''
  const names = todayDeliveries.value.slice(0, 3).map(d => {
    const customerName = (d.order as any)?.customer?.name || d.recipient_name || '未知'
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
  const hours = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60))
  const orderNum = order.order_number || order.id.slice(0, 8)
  return `${orderNum} 已等待${hours}小时`
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
  grid-template-columns: repeat(3, 1fr);
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
  color: #409eff;
}

.task-icon.express {
  background: #fef0f0;
  color: #f56c6c;
}

.task-icon.confirm {
  background: #fdf6ec;
  color: #e6a23c;
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
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
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

@media (min-width: 768px) and (max-width: 1024px) {
  .tasks-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 3: Integrate TodayTasks into Dashboard

**Files:**
- Modify: `src/views/Dashboard.vue`

**Step 1: Import the component**

Add to script section imports:

```typescript
import TodayTasks from '@/components/TodayTasks.vue'
```

**Step 2: Add component to template**

Insert after the stats-row and before the first chart-card row (around line 77):

```html
<!-- Today's Tasks Section -->
<TodayTasks />
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 4: Add Missing Icon Imports

**Files:**
- Modify: `src/components/TodayTasks.vue`

The component uses Calendar, Van, Box, Clock, ArrowRight icons. These need to be imported from Element Plus.

Add to the script section:

```typescript
import { Calendar, Van, Box, Clock, ArrowRight } from '@element-plus/icons-vue'
```

---

## Task 5: Testing and Verification

**Step 1: Manual test - Empty state**
1. Go to Dashboard
2. Verify: All three cards show "0 单" and "暂无..."
3. Verify: Cards are clickable and navigate correctly

**Step 2: Manual test - With data**
1. Create a delivery task for today
2. Create an express delivery with pending_pack status
3. Create an order with pending status > 24 hours ago
4. Go to Dashboard
5. Verify: Each card shows correct count
6. Verify: Preview text is accurate
7. Verify: Clicking cards navigates to correct page with filters

**Step 3: Mobile responsive test**
1. Open Dashboard on mobile viewport
2. Verify: Cards stack vertically
3. Verify: Text is readable
4. Verify: Buttons are tappable

**Step 4: Build and deploy**

Run: `npm run build`
Expected: Build succeeds

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Add state refs | dashboard.ts | todayDeliveries, pendingExpressDeliveries, pendingConfirmationOrders |
| Add fetch functions | dashboard.ts | fetchTodayDeliveries, fetchPendingExpressDeliveries, fetchPendingConfirmationOrders |
| Add fetchAllAlerts | dashboard.ts | Parallel fetch of all alerts |
| Update refreshAll | dashboard.ts | Include alerts fetch |
| Create component | TodayTasks.vue | Clean card-based UI for alerts |
| Integrate | Dashboard.vue | Add TodayTasks component |
| Add icons | TodayTasks.vue | Element Plus icon imports |

---

## Design Rationale

1. **Three cards max** - Not overwhelming, covers main daily tasks
2. **Preview text** - Quick context without clicking
3. **Consistent navigation** - Each card links to filtered view
4. **Zero states shown** - User knows the feature exists even when empty
5. **Mobile-first** - Stacks cleanly on small screens
6. **Subtle styling** - Doesn't dominate the dashboard
