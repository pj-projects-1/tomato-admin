<template>
  <div class="page-container" ref="pageContainerRef">
    <!-- Pull to refresh indicator -->
    <PullRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshing"
      :threshold="THRESHOLD"
    />
    <div class="page-header">
      <h1 class="page-title">库存管理</h1>
      <div class="header-actions">
        <el-button @click="showExportDialog" :disabled="stockStore.stocks.length === 0">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="success" @click="showStockInDialog">
          <el-icon><Plus /></el-icon>
          入库登记
        </el-button>
        <el-button type="warning" @click="showStockOutDialog">
          <el-icon><Minus /></el-icon>
          出库登记
        </el-button>
        <el-button @click="showEditDialog">
          <el-icon><Edit /></el-icon>
          库存编辑
        </el-button>
      </div>
    </div>

    <!-- Current Stock Card -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon stock-stat-icon--balance">
              <el-icon size="32"><Box /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stockStore.currentBalance }}</div>
              <div class="stat-label">当前库存（箱）</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Stock Flow Table -->
    <el-card shadow="never">
      <template #header>库存流水</template>
      <!-- Desktop: Table view -->
      <el-table
        :data="stockStore.stocks"
        v-loading="stockStore.loading"
        style="width: 100%"
        class="desktop-table"
      >
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getTypeColor(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" align="center">
          <template #default="{ row }">
            <span :class="row.type === 'in' || (row.type === 'adjust' && row.quantity > 0) ? 'qty-positive' : 'qty-negative'">
              {{ row.quantity >= 0 ? '+' : '' }}{{ row.quantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="balance_after" label="余额" width="70" align="center" />
        <el-table-column prop="unit_price" label="单价" width="90">
          <template #default="{ row }">
            {{ row.unit_price ? `¥${row.unit_price}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="harvest_date" label="采摘日期" width="100">
          <template #default="{ row }">
            {{ row.harvest_date || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="storage_date" label="入库日期" width="100">
          <template #default="{ row }">
            {{ row.storage_date || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="order" label="关联订单" width="110">
          <template #default="{ row }">
            <div v-if="row.order" class="order-cell">
              <el-button
                text
                :type="row.order.status === 'cancelled' ? 'info' : 'primary'"
                @click="viewOrder(row.order_id)"
              >
                查看
              </el-button>
              <el-tag v-if="row.order.status === 'cancelled'" type="info" size="small">已取消</el-tag>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="100" show-overflow-tooltip />
        <el-table-column prop="created_at" label="操作时间" width="110">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showRecordEditDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile: Card view -->
      <div class="mobile-card-list" v-loading="stockStore.loading">
        <div
          v-for="row in stockStore.stocks"
          :key="row.id"
          class="stock-mobile-card"
          :class="'stock-' + row.type"
        >
          <div class="card-header-row">
            <el-tag :type="getTypeColor(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
            <span class="quantity" :class="row.type === 'in' || (row.type === 'adjust' && row.quantity > 0) ? 'qty-positive' : 'qty-negative'">
              {{ row.quantity >= 0 ? '+' : '' }}{{ row.quantity }}箱
            </span>
            <span class="balance">余额: {{ row.balance_after }}</span>
          </div>
          <div class="card-info-row">
            <span v-if="row.unit_price">单价: ¥{{ row.unit_price }}</span>
            <span v-if="row.harvest_date">采摘: {{ row.harvest_date }}</span>
            <span v-if="row.storage_date">入库: {{ row.storage_date }}</span>
          </div>
          <div class="card-footer">
            <span class="time">{{ formatDateTime(row.created_at) }}</span>
            <div class="card-actions">
              <template v-if="row.order && row.order_id">
                <el-button
                  size="small"
                  :type="row.order.status === 'cancelled' ? 'info' : 'primary'"
                  link
                  @click="viewOrder(row.order_id)"
                >订单</el-button>
                <el-tag v-if="row.order.status === 'cancelled'" type="info" size="small">已取消</el-tag>
              </template>
              <el-button size="small" link @click="showRecordEditDialog(row)">编辑</el-button>
            </div>
          </div>
          <div class="card-note" v-if="row.note">{{ row.note }}</div>
        </div>
        <el-empty v-if="stockStore.stocks.length === 0" description="暂无库存记录" />
      </div>
    </el-card>

    <!-- Stock In Dialog -->
    <el-dialog v-model="stockInDialogVisible" title="入库登记" width="450px">
      <el-form ref="stockInFormRef" :model="stockInForm" :rules="stockRules" label-width="80px">
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="stockInForm.quantity" :min="1" :max="9999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="stockInForm.unitPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="采摘日期">
          <el-date-picker
            v-model="stockInForm.harvestDate"
            type="date"
            placeholder="选择采摘日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="disableFutureDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="入库日期">
          <el-date-picker
            v-model="stockInForm.storageDate"
            type="date"
            placeholder="选择入库日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="disableFutureDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockInForm.note" placeholder="入库来源等备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockInDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleStockIn">
          确认入库
        </el-button>
      </template>
    </el-dialog>

    <!-- Stock Out Dialog -->
    <el-dialog v-model="stockOutDialogVisible" title="出库登记" width="400px">
      <el-form ref="stockOutFormRef" :model="stockOutForm" :rules="stockRules" label-width="80px">
        <el-alert
          :title="`当前库存: ${stockStore.currentBalance} 箱`"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        />
        <el-form-item label="数量" prop="quantity">
          <el-input-number
            v-model="stockOutForm.quantity"
            :min="1"
            :max="stockStore.currentBalance"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockOutForm.note" placeholder="出库原因等备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockOutDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleStockOut">
          确认出库
        </el-button>
      </template>
    </el-dialog>

    <!-- Edit Menu Dialog -->
    <el-dialog v-model="editDialogVisible" title="库存编辑" width="400px">
      <div class="edit-menu">
        <div class="edit-menu-item" @click="showAdjustDialog">
          <el-icon size="24"><Setting /></el-icon>
          <div class="edit-menu-content">
            <div class="edit-menu-title">库存调整</div>
            <div class="edit-menu-desc">调整当前库存数量（盘点差异等）</div>
          </div>
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="edit-menu-item" @click="showRecordListDialog">
          <el-icon size="24"><Document /></el-icon>
          <div class="edit-menu-content">
            <div class="edit-menu-title">数据编辑</div>
            <div class="edit-menu-desc">修改流水记录的日期、单价等信息</div>
          </div>
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
    </el-dialog>

    <!-- Adjust Dialog -->
    <el-dialog v-model="adjustDialogVisible" title="库存调整" width="400px">
      <el-form ref="adjustFormRef" :model="adjustForm" label-width="80px">
        <el-alert
          :title="`当前库存: ${stockStore.currentBalance} 箱`"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        />
        <el-form-item label="调整后">
          <el-input-number v-model="adjustForm.newBalance" :min="0" :max="99999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="adjustForm.note" placeholder="盘点差异原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleAdjust">
          确认调整
        </el-button>
      </template>
    </el-dialog>

    <!-- Record Edit Dialog -->
    <el-dialog v-model="recordEditDialogVisible" title="编辑流水记录" width="450px">
      <el-form ref="recordEditFormRef" :model="recordEditForm" label-width="80px">
        <el-form-item label="类型">
          <el-tag :type="getTypeColor(recordEditForm.type)">
            {{ getTypeText(recordEditForm.type) }}
          </el-tag>
          <span style="margin-left: 12px; color: var(--text-regular);">
            数量：{{ recordEditForm.quantity }} 箱
          </span>
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="recordEditForm.unitPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="采摘日期">
          <el-date-picker
            v-model="recordEditForm.harvestDate"
            type="date"
            placeholder="选择采摘日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="disableFutureDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="入库日期">
          <el-date-picker
            v-model="recordEditForm.storageDate"
            type="date"
            placeholder="选择入库日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="disableFutureDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="recordEditForm.note" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recordEditDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleRecordEdit">
          保存修改
        </el-button>
      </template>
    </el-dialog>

    <!-- Export Dialog -->
    <el-dialog v-model="exportDialogVisible" title="导出库存记录" width="450px">
      <el-form label-width="80px">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="exportFilters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            clearable
          />
        </el-form-item>
        <el-form-item label="记录类型">
          <el-checkbox-group v-model="exportFilters.types">
            <el-checkbox label="in">入库</el-checkbox>
            <el-checkbox label="out">出库</el-checkbox>
            <el-checkbox label="adjust">调整</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="预览">
          <span style="color: var(--tomato-red);">将导出 {{ filteredExportCount }} 条记录</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="filteredExportCount === 0" @click="handleExport">
          确认导出
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import dayjs from 'dayjs'
import { useStockStore } from '@/stores/stocks'
import { exportStocks } from '@/api/export'
import { usePullRefresh } from '@/composables/usePullRefresh'
import PullRefreshIndicator from '@/components/PullRefreshIndicator.vue'
import type { Stock, StockType } from '@/types'

const router = useRouter()
const stockStore = useStockStore()

// Pull to refresh setup
const pageContainerRef = ref<HTMLElement | null>(null)
const {
  isRefreshing,
  pullDistance,
  setupListeners,
  cleanupListeners,
  THRESHOLD,
} = usePullRefresh(async () => {
  await stockStore.fetchStocks()
  await stockStore.fetchCurrentBalance()
})

const submitting = ref(false)
const stockInDialogVisible = ref(false)
const stockOutDialogVisible = ref(false)
const editDialogVisible = ref(false)
const adjustDialogVisible = ref(false)
const recordEditDialogVisible = ref(false)
const exportDialogVisible = ref(false)

const exportFilters = reactive({
  dateRange: [] as string[],
  types: [] as StockType[],
})

// Computed count of filtered records for export preview
const filteredExportCount = computed(() => {
  let filtered = stockStore.stocks

  // Filter by date range
  if (exportFilters.dateRange && exportFilters.dateRange.length === 2 && exportFilters.dateRange[0] && exportFilters.dateRange[1]) {
    const startDate = new Date(exportFilters.dateRange[0])
    const endDate = new Date(exportFilters.dateRange[1])
    endDate.setDate(endDate.getDate() + 1) // Include end date
    filtered = filtered.filter(s => {
      const date = new Date(s.created_at)
      return date >= startDate && date < endDate
    })
  }

  // Filter by type
  if (exportFilters.types.length > 0) {
    filtered = filtered.filter(s => exportFilters.types.includes(s.type))
  }

  return filtered.length
})

const stockInFormRef = ref<FormInstance>()
const stockOutFormRef = ref<FormInstance>()
const adjustFormRef = ref<FormInstance>()
const recordEditFormRef = ref<FormInstance>()

const stockInForm = reactive({
  quantity: 1,
  unitPrice: 0,
  harvestDate: '',
  storageDate: dayjs().format('YYYY-MM-DD'),
  note: '',
})

const stockOutForm = reactive({
  quantity: 1,
  note: '',
})

const adjustForm = reactive({
  newBalance: 0,
  note: '',
})

const recordEditForm = reactive({
  id: '',
  type: '' as StockType,
  quantity: 0,
  unitPrice: 0 as number | undefined,
  harvestDate: '',
  storageDate: '',
  note: '',
})

const stockRules: FormRules = {
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

onMounted(() => {
  stockStore.fetchStocks()
  stockStore.fetchCurrentBalance()
  // Setup pull-to-refresh listeners
  if (pageContainerRef.value) {
    setupListeners(pageContainerRef.value)
  }
})

onUnmounted(() => {
  cleanupListeners()
})

function formatDateTime(date: string) {
  return dayjs(date).format('MM-DD HH:mm')
}

// 禁止选择未来日期
function disableFutureDate(time: Date) {
  return time.getTime() > Date.now()
}

function getTypeColor(type: StockType) {
  const map: Record<StockType, string> = {
    in: 'success',
    out: 'danger',
    adjust: 'warning',
  }
  return map[type] || 'info'
}

function getTypeHexColor(type: StockType) {
  const map: Record<StockType, string> = {
    in: '#7D9D6C',
    out: '#CF4B3F',
    adjust: '#D4A574',
  }
  return map[type] || '#6B5B50'
}

function getTypeText(type: StockType) {
  const map: Record<StockType, string> = {
    in: '入库',
    out: '出库',
    adjust: '调整',
  }
  return map[type] || type
}

function showExportDialog() {
  // Reset filters
  exportFilters.dateRange = []
  exportFilters.types = []
  exportDialogVisible.value = true
}

function handleExport() {
  let filtered = stockStore.stocks

  // Filter by date range
  if (exportFilters.dateRange && exportFilters.dateRange.length === 2 && exportFilters.dateRange[0] && exportFilters.dateRange[1]) {
    const startDate = new Date(exportFilters.dateRange[0])
    const endDate = new Date(exportFilters.dateRange[1])
    endDate.setDate(endDate.getDate() + 1) // Include end date
    filtered = filtered.filter(s => {
      const date = new Date(s.created_at)
      return date >= startDate && date < endDate
    })
  }

  // Filter by type
  if (exportFilters.types.length > 0) {
    filtered = filtered.filter(s => exportFilters.types.includes(s.type))
  }

  // Build filename suffix
  const filterParts: string[] = []
  if (exportFilters.types.length > 0) {
    filterParts.push(exportFilters.types.map(t => getTypeText(t)).join('-'))
  }
  if (exportFilters.dateRange && exportFilters.dateRange.length === 2 && exportFilters.dateRange[0] && exportFilters.dateRange[1]) {
    filterParts.push(`${exportFilters.dateRange[0]}至${exportFilters.dateRange[1]}`)
  }
  const filenameSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : ''

  exportStocks(filtered, filenameSuffix)
  ElMessage.success(`已导出 ${filtered.length} 条库存记录`)
  exportDialogVisible.value = false
}

function showStockInDialog() {
  Object.assign(stockInForm, {
    quantity: 1,
    unitPrice: 0,
    harvestDate: '',
    storageDate: dayjs().format('YYYY-MM-DD'),
    note: '',
  })
  stockInDialogVisible.value = true
}

function showStockOutDialog() {
  Object.assign(stockOutForm, { quantity: 1, note: '' })
  stockOutDialogVisible.value = true
}

function showEditDialog() {
  editDialogVisible.value = true
}

function showAdjustDialog() {
  editDialogVisible.value = false
  adjustForm.newBalance = stockStore.currentBalance
  adjustForm.note = ''
  adjustDialogVisible.value = true
}

function showRecordListDialog() {
  editDialogVisible.value = false
  // 流水列表已经在表格中展示，关闭菜单即可
  ElMessage.info('请点击表格中的"编辑"按钮修改对应记录')
}

function showRecordEditDialog(record: Stock) {
  Object.assign(recordEditForm, {
    id: record.id,
    type: record.type,
    quantity: record.quantity,
    unitPrice: record.unit_price || undefined,
    harvestDate: record.harvest_date || '',
    storageDate: record.storage_date || '',
    note: record.note || '',
  })
  recordEditDialogVisible.value = true
}

async function handleStockIn() {
  const valid = await stockInFormRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const result = await stockStore.stockIn(
      stockInForm.quantity,
      stockInForm.unitPrice || undefined,
      stockInForm.note || undefined,
      stockInForm.harvestDate || undefined,
      stockInForm.storageDate || undefined
    )
    if (result.success) {
      ElMessage.success('入库成功')
      stockInDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('入库失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleStockOut() {
  const valid = await stockOutFormRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const result = await stockStore.stockOut(
      stockOutForm.quantity,
      undefined,
      stockOutForm.note || undefined
    )
    if (result.success) {
      ElMessage.success('出库成功')
      stockOutDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('出库失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleAdjust() {
  submitting.value = true
  try {
    const diff = adjustForm.newBalance - stockStore.currentBalance
    const result = await stockStore.stockAdjust(diff, adjustForm.note || undefined)
    if (result.success) {
      ElMessage.success('调整成功')
      adjustDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('调整失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleRecordEdit() {
  submitting.value = true
  try {
    const result = await stockStore.updateRecord(recordEditForm.id, {
      unit_price: recordEditForm.unitPrice || null,
      harvest_date: recordEditForm.harvestDate || null,
      storage_date: recordEditForm.storageDate || null,
      note: recordEditForm.note || null,
    })
    if (result.success) {
      ElMessage.success('修改成功')
      recordEditDialogVisible.value = false
      // 刷新数据确保显示最新内容
      await stockStore.fetchStocks()
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('修改失败，请重试')
  } finally {
    submitting.value = false
  }
}

function viewOrder(orderId: string) {
  router.push(`/orders/${orderId}`)
}
</script>

<style scoped>
.order-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-container {
  position: relative;
  min-height: 100%;
}

.stat-row {
  margin-bottom: 20px;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stock-stat-icon--balance {
  background: var(--soft-sage);
}

.qty-positive {
  color: var(--soft-sage);
}

.qty-negative {
  color: var(--el-color-danger);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.edit-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-menu-item:hover {
  border-color: var(--tomato-red);
  background-color: var(--status-confirmed-bg);
}

.edit-menu-item .el-icon:first-child {
  color: var(--tomato-red);
  margin-right: 12px;
}

.edit-menu-content {
  flex: 1;
}

.edit-menu-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.edit-menu-desc {
  font-size: 13px;
  color: #909399;
}

.edit-menu-item .el-icon:last-child {
  color: #c0c4cc;
}

/* Mobile card list - hidden on desktop */
.mobile-card-list {
  display: none;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  /* Hide desktop table */
  .desktop-table {
    display: none !important;
  }

  .mobile-card-list {
    display: block;
  }

  .header-actions {
    flex-wrap: wrap;
    width: 100%;
    gap: 8px;
  }

  .header-actions .el-button {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
    font-size: 13px;
  }

  .stat-row {
    margin-bottom: 12px;
  }

  .stat-card {
    margin-bottom: 12px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
  }

  .stat-icon :deep(.el-icon) {
    font-size: 24px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 12px;
  }

  /* Mobile card styles */
  .stock-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    border-left: 4px solid var(--tomato-red);
  }

  .stock-mobile-card.stock-in {
    border-left-color: var(--soft-sage);
  }

  .stock-mobile-card.stock-out {
    border-left-color: var(--el-color-danger);
  }

  .stock-mobile-card.stock-adjust {
    border-left-color: var(--harvest-gold);
  }

  .stock-mobile-card .card-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stock-mobile-card .quantity {
    font-size: 18px;
    font-weight: 600;
  }

  .stock-mobile-card .balance {
    margin-left: auto;
    font-size: 13px;
    color: #909399;
  }

  .stock-mobile-card .card-info-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: #606266;
  }

  .stock-mobile-card .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stock-mobile-card .time {
    font-size: 12px;
    color: #909399;
  }

  .stock-mobile-card .card-note {
    font-size: 12px;
    color: #909399;
    padding-top: 8px;
    border-top: 1px solid #ebeef5;
  }

  :deep(.el-card__body) {
    padding: 8px;
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

  .edit-menu-item {
    padding: 12px;
  }

  .edit-menu-title {
    font-size: 14px;
  }

  .edit-menu-desc {
    font-size: 12px;
  }
}
</style>
