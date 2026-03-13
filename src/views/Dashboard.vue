<template>
  <div class="dashboard-container">
    <!-- 销售数据卡片 -->
    <el-row :gutter="20" class="stats-row" v-loading="loadingStats">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <el-icon :size="28"><ShoppingCart /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-label">今日销售额</div>
              <div class="stats-value">¥{{ formatMoney(periodStats.today.totalAmount) }}</div>
              <div class="stats-sub">
                <span class="paid">已收款 ¥{{ formatMoney(periodStats.today.paidAmount) }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <el-icon :size="28"><Money /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-label">本月销售额</div>
              <div class="stats-value">¥{{ formatMoney(periodStats.thisMonth.totalAmount) }}</div>
              <div class="stats-sub">
                <span class="paid">已收款 ¥{{ formatMoney(periodStats.thisMonth.paidAmount) }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stats-card clickable" @click="$router.push('/stocks')">
          <div class="stats-content">
            <div class="stats-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              <el-icon :size="28"><Box /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-label">当前库存</div>
              <div class="stats-value link-text">{{ currentStock }} 箱</div>
              <div class="stats-sub">点击查看详情</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stats-card pending-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
              <el-icon :size="28"><Warning /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-label">待处理</div>
              <div class="stats-value pending-value">
                <div class="pending-item clickable" @click="$router.push('/deliveries')">
                  <span class="pending-text">配送</span>
                  <el-badge :value="pendingDeliveries" :hidden="pendingDeliveries === 0" />
                </div>
                <div class="pending-item clickable" @click="$router.push('/orders')">
                  <span class="pending-text">收款</span>
                  <el-badge :value="unpaidOrders" :hidden="unpaidOrders === 0" />
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 销售收益对比 -->
    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>销售与收益对比</span>
              <el-radio-group v-model="periodType" size="small">
                <el-radio-button value="today">今日</el-radio-button>
                <el-radio-button value="thisWeek">本周</el-radio-button>
                <el-radio-button value="thisMonth">本月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="comparison-section">
            <div class="comparison-item">
              <div class="comparison-label">总销售额</div>
              <div class="comparison-bar">
                <el-progress
                  :percentage="getPercentage(currentPeriodStats.totalAmount, currentPeriodStats.totalAmount)"
                  :stroke-width="20"
                  :show-text="false"
                  color="#667eea"
                />
              </div>
              <div class="comparison-value">¥{{ formatMoney(currentPeriodStats.totalAmount) }}</div>
            </div>
            <div class="comparison-item">
              <div class="comparison-label paid-label">
                <el-icon><CircleCheck /></el-icon>
                实际收益（已收款）
              </div>
              <div class="comparison-bar">
                <el-progress
                  :percentage="getPercentage(currentPeriodStats.paidAmount, currentPeriodStats.totalAmount)"
                  :stroke-width="20"
                  :show-text="false"
                  color="#67c23a"
                />
              </div>
              <div class="comparison-value paid-value">¥{{ formatMoney(currentPeriodStats.paidAmount) }}</div>
            </div>
            <div class="comparison-item">
              <div class="comparison-label unpaid-label">
                <el-icon><Clock /></el-icon>
                待收款
              </div>
              <div class="comparison-bar">
                <el-progress
                  :percentage="getPercentage(currentPeriodStats.unpaidAmount, currentPeriodStats.totalAmount)"
                  :stroke-width="20"
                  :show-text="false"
                  color="#e6a23c"
                />
              </div>
              <div class="comparison-value unpaid-value">¥{{ formatMoney(currentPeriodStats.unpaidAmount) }}</div>
            </div>
            <div class="collection-rate">
              <span>回款率</span>
              <span class="rate-value">{{ getCollectionRate() }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span>订单状态分布</span>
          </template>
          <div class="order-stats">
            <div class="order-stat-item" v-for="item in orderStatusList" :key="item.status">
              <div class="stat-label">
                <el-tag :type="item.type" size="small">{{ item.label }}</el-tag>
              </div>
              <div class="stat-count">{{ getOrderCount(item.status) }}</div>
              <div class="stat-bar">
                <div
                  class="stat-bar-fill"
                  :style="{
                    width: getOrderPercentage(item.status) + '%',
                    backgroundColor: item.color
                  }"
                />
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 近期数据 -->
    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" v-loading="loadingOrders">
          <template #header>
            <div class="card-header">
              <span>近期订单</span>
              <el-button text type="primary" @click="$router.push('/orders')">
                查看全部
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <!-- Desktop table -->
          <el-table :data="recentOrders" style="width: 100%" class="desktop-table">
            <el-table-column label="客户" prop="customer.name" min-width="100">
              <template #default="{ row }">
                {{ row.customer?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="金额" prop="total_amount" width="100">
              <template #default="{ row }">
                <span :class="{ 'unpaid-text': !row.paid }">
                  ¥{{ row.total_amount || 0 }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" prop="status" width="90">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" prop="created_at" width="120">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
          <!-- Mobile cards -->
          <div class="mobile-card-list">
            <div v-for="row in recentOrders" :key="row.id" class="order-mini-card">
              <div class="mini-card-row">
                <span class="customer">{{ row.customer?.name || '-' }}</span>
                <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
              </div>
              <div class="mini-card-row">
                <span class="amount" :class="{ 'unpaid-text': !row.paid }">¥{{ row.total_amount || 0 }}</span>
                <span class="time">{{ formatTime(row.created_at) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-if="recentOrders.length === 0 && !loadingOrders" description="暂无订单" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" v-loading="loadingStocks">
          <template #header>
            <div class="card-header">
              <span>库存流水</span>
              <el-button text type="primary" @click="$router.push('/stocks')">
                查看全部
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <!-- Desktop table -->
          <el-table :data="recentStocks" style="width: 100%" class="desktop-table">
            <el-table-column label="类型" prop="type" width="80">
              <template #default="{ row }">
                <el-tag :type="getStockType(row.type)" size="small">
                  {{ getStockTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数量" prop="quantity" width="80">
              <template #default="{ row }">
                <span :class="row.type === 'in' ? 'stock-in' : row.type === 'out' ? 'stock-out' : ''">
                  {{ row.type === 'out' ? '-' : '+' }}{{ row.quantity }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="库存余额" prop="balance_after" width="90">
              <template #default="{ row }">
                {{ row.balance_after }} 箱
              </template>
            </el-table-column>
            <el-table-column label="备注" prop="note" min-width="100">
              <template #default="{ row }">
                {{ row.note || '-' }}
              </template>
            </el-table-column>
          </el-table>
          <!-- Mobile cards -->
          <div class="mobile-card-list">
            <div v-for="row in recentStocks" :key="row.id" class="stock-mini-card">
              <div class="mini-card-row">
                <el-tag :type="getStockType(row.type)" size="small">{{ getStockTypeText(row.type) }}</el-tag>
                <span class="quantity" :class="row.type === 'in' ? 'stock-in' : row.type === 'out' ? 'stock-out' : ''">
                  {{ row.type === 'out' ? '-' : '+' }}{{ row.quantity }}箱
                </span>
                <span class="balance">余额: {{ row.balance_after }}</span>
              </div>
              <div class="mini-card-row" v-if="row.note">
                <span class="note">{{ row.note }}</span>
              </div>
            </div>
          </div>
          <el-empty v-if="recentStocks.length === 0 && !loadingStocks" description="暂无库存记录" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDashboardStore, type SalesStats } from '@/stores/dashboard'
import type { OrderStatus } from '@/types'
import dayjs from 'dayjs'

const dashboardStore = useDashboardStore()

const loading = computed(() => dashboardStore.loading)
const loadingStats = computed(() => dashboardStore.loadingStats)
const loadingOrders = computed(() => dashboardStore.loadingOrders)
const loadingStocks = computed(() => dashboardStore.loadingStocks)
const periodStats = computed(() => dashboardStore.periodStats)
const orderStats = computed(() => dashboardStore.orderStats)
const currentStock = computed(() => dashboardStore.currentStock)
const pendingDeliveries = computed(() => dashboardStore.pendingDeliveries)
const unpaidOrders = computed(() => dashboardStore.unpaidOrders)
const recentOrders = computed(() => dashboardStore.recentOrders)
const recentStocks = computed(() => dashboardStore.recentStocks)

const periodType = ref<'today' | 'thisWeek' | 'thisMonth'>('today')

const currentPeriodStats = computed<SalesStats>(() => {
  return periodStats.value[periodType.value]
})

const orderStatusList: { status: OrderStatus; label: string; type: string; color: string }[] = [
  { status: 'pending', label: '未确认', type: 'warning', color: '#e6a23c' },
  { status: 'confirmed', label: '待配送', type: 'primary', color: '#409eff' },
  { status: 'delivering', label: '配送中', type: 'success', color: '#67c23a' },
  { status: 'completed', label: '已完成', type: 'success', color: '#67c23a' },
  { status: 'cancelled', label: '已取消', type: 'danger', color: '#f56c6c' },
]

onMounted(() => {
  dashboardStore.refreshAll()
})

function formatMoney(value: number) {
  return value.toFixed(2)
}

function formatTime(date: string) {
  return dayjs(date).format('MM-DD HH:mm')
}

function getPercentage(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function getCollectionRate() {
  const stats = currentPeriodStats.value
  if (stats.totalAmount === 0) return 0
  return ((stats.paidAmount / stats.totalAmount) * 100).toFixed(1)
}

function getOrderCount(status: OrderStatus) {
  return orderStats.value[status] || 0
}

function getOrderPercentage(status: OrderStatus) {
  const total = orderStats.value.total
  if (total === 0) return 0
  return Math.round((orderStats.value[status] / total) * 100)
}

function getStatusType(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: 'warning',
    confirmed: 'primary',
    delivering: 'success',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

function getStatusText(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: '未确认',
    confirmed: '待配送',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getStockType(type: string) {
  const map: Record<string, string> = {
    in: 'success',
    out: 'danger',
    adjust: 'warning',
  }
  return map[type] || 'info'
}

function getStockTypeText(type: string) {
  const map: Record<string, string> = {
    in: '入库',
    out: '出库',
    adjust: '调整',
  }
  return map[type] || type
}
</script>

<style scoped>
.dashboard-container {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stats-card {
  margin-bottom: 20px;
}

.stats-card.clickable {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stats-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.link-text {
  color: #409eff;
}

.stats-content {
  display: flex;
  align-items: center;
}

.stats-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stats-info {
  margin-left: 16px;
  flex: 1;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stats-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stats-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.stats-sub .paid {
  color: #67c23a;
}

.pending-card .stats-value {
  font-size: 14px;
}

.pending-value {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pending-item.clickable {
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.pending-item.clickable:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.pending-item.clickable .pending-text {
  color: #409eff;
}

.pending-text {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comparison-section {
  padding: 8px 0;
}

.comparison-item {
  margin-bottom: 20px;
}

.comparison-item:last-of-type {
  margin-bottom: 0;
}

.comparison-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.paid-label {
  color: #67c23a;
}

.unpaid-label {
  color: #e6a23c;
}

.comparison-bar {
  margin-bottom: 4px;
}

.comparison-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.paid-value {
  color: #67c23a;
}

.unpaid-value {
  color: #e6a23c;
}

.collection-rate {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #ebeef5;
  font-size: 14px;
  color: #606266;
}

.rate-value {
  font-size: 24px;
  font-weight: 600;
  color: #67c23a;
}

.order-stats {
  padding: 8px 0;
}

.order-stat-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.order-stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  width: 80px;
}

.stat-count {
  width: 40px;
  text-align: right;
  font-weight: 600;
  color: #303133;
  margin-right: 12px;
}

.stat-bar {
  flex: 1;
  height: 8px;
  background: #f0f2f5;
  border-radius: 4px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.unpaid-text {
  color: #e6a23c;
}

.stock-in {
  color: #67c23a;
  font-weight: 600;
}

.stock-out {
  color: #f56c6c;
  font-weight: 600;
}

:deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

/* Mobile card list - hidden on desktop */
.mobile-card-list {
  display: none;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  /* Hide desktop tables */
  .desktop-table {
    display: none !important;
  }

  .mobile-card-list {
    display: block;
  }

  .stats-row {
    margin-bottom: 12px;
  }

  .stats-card {
    margin-bottom: 12px;
  }

  .stats-icon {
    width: 44px;
    height: 44px;
  }

  .stats-icon :deep(.el-icon) {
    font-size: 22px;
  }

  .stats-info {
    margin-left: 12px;
  }

  .stats-label {
    font-size: 12px;
  }

  .stats-value {
    font-size: 18px;
  }

  .stats-sub {
    font-size: 11px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .card-header :deep(.el-radio-group) {
    width: 100%;
  }

  .card-header :deep(.el-radio-button__inner) {
    flex: 1;
    text-align: center;
  }

  .chart-card {
    margin-bottom: 12px;
  }

  .comparison-label {
    font-size: 13px;
  }

  .comparison-value {
    font-size: 15px;
  }

  .collection-rate {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .rate-value {
    font-size: 20px;
  }

  .order-stat-item {
    flex-wrap: wrap;
  }

  .stat-label {
    width: 70px;
  }

  .stat-count {
    width: 30px;
  }

  /* Mobile mini cards */
  .order-mini-card,
  .stock-mini-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0;
    border-bottom: 1px solid #ebeef5;
  }

  .order-mini-card:last-child,
  .stock-mini-card:last-child {
    border-bottom: none;
  }

  .mini-card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .order-mini-card .customer {
    font-weight: 500;
  }

  .order-mini-card .amount {
    font-weight: 600;
    color: #409eff;
  }

  .stock-mini-card .quantity {
    font-weight: 600;
  }

  .stock-mini-card .balance {
    font-size: 12px;
    color: #909399;
  }

  .mini-card-row .time,
  .mini-card-row .note {
    font-size: 12px;
    color: #909399;
  }

  .pending-value {
    font-size: 13px;
  }

  .pending-item {
    gap: 6px;
  }

  .pending-text {
    font-size: 14px;
  }
}

/* Tablet styles */
@media (min-width: 768px) and (max-width: 1024px) {
  .stats-value {
    font-size: 20px;
  }

  .stats-icon {
    width: 50px;
    height: 50px;
  }
}
</style>
