<template>
  <div class="page-container" ref="pageContainerRef">
    <!-- Pull to refresh indicator -->
    <PullRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshing"
      :threshold="THRESHOLD"
    />

    <div class="page-header">
      <h1 class="page-title">订单管理</h1>
      <div class="header-actions">
        <el-button @click="handleExport" :disabled="orderStore.orders.length === 0">
          <el-icon><Download /></el-icon>
          导出 ({{ totalOrders }}条)
        </el-button>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          新增订单
        </el-button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <el-date-picker
        v-model="filters.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 260px"
        clearable
        @change="handleFilter"
      />
      <el-select
        v-model="filters.customerId"
        placeholder="选择客户"
        clearable
        filterable
        style="width: 180px"
        @change="handleFilter"
      >
        <el-option
          v-for="customer in customerList"
          :key="customer.id"
          :label="customer.name"
          :value="customer.id"
        />
      </el-select>
      <el-select
        v-model="filters.status"
        placeholder="订单状态"
        clearable
        style="width: 120px"
        @change="handleFilter"
      >
        <el-option label="未确认" value="pending" />
        <el-option label="待配送" value="confirmed" />
        <el-option label="配送中" value="delivering" />
        <el-option label="已完成" value="completed" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
      <el-select
        v-model="filters.paid"
        placeholder="付款状态"
        clearable
        style="width: 120px"
        @change="handleFilter"
      >
        <el-option label="已付款" :value="true" />
        <el-option label="未付款" :value="false" />
      </el-select>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <!-- Order List -->
    <el-card shadow="never">
      <!-- Batch Operations Toolbar -->
      <div v-if="selectedOrders.length > 0" class="batch-toolbar">
        <span class="batch-info">已选择 {{ selectedOrders.length }} 个订单</span>
        <el-button type="danger" @click="batchDelete" :loading="batchDeleting">
          <el-icon><Delete /></el-icon>
          批量删除/取消
        </el-button>
      </div>

      <!-- Desktop: Table view -->
      <el-table
        ref="tableRef"
        :data="desktopOrders"
        v-loading="orderStore.loading"
        style="width: 100%"
        class="desktop-table"
        @row-click="toggleRowExpand"
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="delivery-expanded" @click.stop>
              <div class="delivery-expanded-title">配送明细 ({{ row.deliveries?.length || 0 }}个配送点)</div>
              <el-table
                :data="row.deliveries"
                size="small"
                border
              >
                <el-table-column label="方式" width="70" align="center">
                  <template #default="{ row: delivery }">
                    <el-tag
                      :type="delivery.delivery_method === 'express' ? 'warning' : 'primary'"
                      size="small"
                    >
                      {{ delivery.delivery_method === 'express' ? '快递' : '自送' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="收货人" width="100">
                  <template #default="{ row: delivery }">
                    {{ delivery.recipient_name || row.customer?.name || '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="地址" min-width="200">
                  <template #default="{ row: delivery }">
                    <span class="truncated-address">{{ delivery.address }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="数量" width="60" align="center">
                  <template #default="{ row: delivery }">
                    {{ delivery.quantity }}
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="{ row: delivery }">
                    <el-tag
                      size="small"
                      :style="{
                        backgroundColor: getDeliveryDisplayBgColor(delivery),
                        color: getDeliveryDisplayColor(delivery),
                        border: 'none'
                      }"
                    >
                      {{ getDeliveryDisplayText(delivery) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="快递公司" width="100">
                  <template #default="{ row: delivery }">
                    <span v-if="delivery.delivery_method === 'express'">
                      {{ getExpressCompanyName(delivery.express_company) }}
                    </span>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>
                <el-table-column label="运单号" width="140">
                  <template #default="{ row: delivery }">
                    <div v-if="delivery.delivery_method === 'express' && delivery.tracking_number" class="tracking-cell">
                      <a
                        :href="getTrackingUrl(delivery.express_company, delivery.tracking_number)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="tracking-link"
                      >{{ delivery.tracking_number }}</a>
                      <el-button
                        link
                        size="small"
                        @click="handleCopyTracking(delivery.tracking_number)"
                      >
                        <el-icon><CopyDocument /></el-icon>
                      </el-button>
                    </div>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="order_number" label="订单号" min-width="140">
          <template #default="{ row }">
            <span class="order-number">{{ row.order_number || row.id.slice(0, 8) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customer" label="客户" min-width="100">
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="total_boxes" label="箱数" width="70" align="center" />
        <el-table-column prop="total_amount" label="金额" width="90" align="right">
          <template #default="{ row }">
            <span class="amount-text">¥{{ row.total_amount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="paid" label="付款" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.paid ? 'success' : 'warning'" size="small">
              {{ row.paid ? '已付' : '未付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :style="{ backgroundColor: getStatusBgColor(row.status), color: getStatusColor(row.status), border: 'none' }">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deliveries" label="配送" min-width="110" align="center">
          <template #default="{ row }">
            <div class="delivery-badges">
              <el-tag v-if="getSelfDeliveryCount(row.deliveries) > 0" type="primary" size="small">
                自送{{ getSelfDeliveryCount(row.deliveries) }}
              </el-tag>
              <el-tag v-if="getExpressDeliveryCount(row.deliveries) > 0" type="warning" size="small">
                快递{{ getExpressDeliveryCount(row.deliveries) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="100">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons-grid">
              <div class="action-row">
                <el-button link type="primary" @click.stop="viewOrder(row)">详情</el-button>
                <el-button v-if="row.status === 'pending'" link type="success" @click.stop="confirmOrder(row)">确认</el-button>
              </div>
              <div class="action-row">
                <el-button v-if="!row.paid" link type="warning" @click.stop="markPaid(row)">收款</el-button>
                <el-button v-if="row.status !== 'completed' && row.status !== 'cancelled'" link type="danger" @click.stop="cancelOrder(row)">
                  {{ row.status === 'pending' ? '删除' : '取消' }}
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile: Card view with virtual scrolling -->
      <div class="mobile-card-list" v-loading="orderStore.loading">
        <!-- Count indicator -->
        <div v-if="orderStore.orders.length > 0" class="mobile-count-indicator">
          共 {{ totalOrders }} 条
        </div>

        <RecycleScroller
          v-if="orderStore.orders.length > 0"
          class="mobile-scroller"
          :items="orderStore.orders"
          :item-size="160"
          key-field="id"
          v-slot="{ item }"
        >
          <div class="order-mobile-card">
            <div class="card-header-row">
              <span class="order-number-mobile">{{ item.order_number || item.id.slice(0, 8) }}</span>
              <el-tag size="small" :style="{ backgroundColor: getStatusBgColor(item.status), color: getStatusColor(item.status), border: 'none' }">
                {{ getStatusText(item.status) }}
              </el-tag>
            </div>
            <div class="card-customer">{{ item.customer?.name || '-' }}</div>
            <div class="card-info-row">
              <span class="amount">¥{{ item.total_amount || 0 }}</span>
              <span>{{ item.total_boxes }}箱</span>
              <el-tag :type="item.paid ? 'success' : 'warning'" size="small">
                {{ item.paid ? '已付' : '未付' }}
              </el-tag>
            </div>
            <div class="card-footer">
              <span class="time">{{ formatDate(item.created_at) }}</span>
              <div class="delivery-badges-mobile">
                <span v-if="getSelfDeliveryCount(item.deliveries) > 0" class="badge-self">自送{{ getSelfDeliveryCount(item.deliveries) }}</span>
                <span v-if="getExpressDeliveryCount(item.deliveries) > 0" class="badge-express">快递{{ getExpressDeliveryCount(item.deliveries) }}</span>
              </div>
            </div>
            <div class="card-actions">
              <el-button size="small" type="primary" link @click.stop="viewOrder(item)">详情</el-button>
              <el-button v-if="item.status === 'pending'" size="small" type="success" @click.stop="confirmOrder(item)">确认</el-button>
              <el-button v-if="!item.paid" size="small" type="warning" @click.stop="markPaid(item)">收款</el-button>
              <el-button v-if="item.status === 'pending'" size="small" type="danger" @click.stop="cancelOrder(item)">删除</el-button>
            </div>
          </div>
        </RecycleScroller>

        <el-empty v-if="orderStore.orders.length === 0" description="暂无订单" />
      </div>

      <!-- Desktop: Pagination -->
      <div v-if="totalOrders > pageSize" class="pagination-container desktop-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalOrders"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Add Order Dialog -->
    <el-dialog
      v-model="dialogVisible"
      title="新增订单"
      width="700px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户" prop="customer_id">
              <el-select
                v-model="form.customer_id"
                placeholder="选择客户"
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="c in customerStore.customers"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总箱数" prop="total_boxes">
              <el-input-number
                v-model="form.total_boxes"
                :min="1"
                :max="999"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单价">
              <el-input-number
                v-model="form.unit_price"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总价">
              <el-input
                :model-value="calculatedTotalAmount"
                disabled
                style="width: 100%"
                class="total-amount-input"
              >
                <template #prefix>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="付款方式">
              <el-select v-model="form.payment_method" placeholder="选择付款方式">
                <el-option label="微信" value="wechat" />
                <el-option label="现金" value="cash" />
                <el-option label="银行转账" value="bank_transfer" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.note" placeholder="订单备注" />
        </el-form-item>

        <!-- Delivery Addresses -->
        <el-divider>
          <span class="divider-text">配送地址（一单多地址）</span>
        </el-divider>
        <div class="delivery-list">
          <div
            v-for="(delivery, index) in form.deliveries"
            :key="index"
            class="delivery-item"
          >
            <div class="delivery-header">
              <span>配送点 {{ index + 1 }}</span>
              <el-button
                v-if="form.deliveries.length > 1"
                text
                type="danger"
                @click="removeDelivery(index)"
              >
                删除
              </el-button>
            </div>
            <el-form-item label="配送方式">
              <el-radio-group v-model="delivery.delivery_method">
                <el-radio value="self">自送</el-radio>
                <el-radio value="express">快递</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-row v-if="delivery.delivery_method === 'express'" :gutter="12">
              <el-col :span="12">
                <el-form-item label="快递公司">
                  <el-select v-model="delivery.express_company" placeholder="选择快递公司" style="width: 100%">
                    <el-option
                      v-for="company in expressCompanies"
                      :key="company.id"
                      :label="company.name"
                      :value="company.code"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预估重量">
                  <el-input-number
                    v-model="delivery.weight"
                    :min="0.1"
                    :max="999"
                    :precision="1"
                    :step="0.5"
                    style="width: 100%"
                    placeholder="kg"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="收货人">
                  <el-input v-model="delivery.recipient_name" placeholder="收货人姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="电话">
                  <el-input v-model="delivery.recipient_phone" placeholder="联系电话" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="数量" required>
                  <el-input-number
                    v-model="delivery.quantity"
                    :min="1"
                    :max="form.total_boxes"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="地址" required>
              <AddressSelector
                v-model="delivery.address"
                v-model:location="delivery.location"
                :saved-addresses="selectedCustomerAddresses"
                @update:recipient-name="(name: string) => { delivery.recipient_name = name }"
                @update:recipient-phone="(phone: string) => { delivery.recipient_phone = phone }"
                placeholder="输入地址搜索..."
              />
            </el-form-item>
          </div>
          <div class="delivery-summary">
            <span>已分配: {{ totalDeliveryBoxes }} 箱</span>
            <span v-if="remainingBoxes !== 0" :class="remainingBoxes > 0 ? 'remaining' : 'excess'">
              {{ remainingBoxes > 0 ? `剩余: ${remainingBoxes} 箱待分配` : `超出: ${Math.abs(remainingBoxes)} 箱` }}
            </span>
            <span v-else class="complete">分配完成</span>
          </div>
          <el-button text type="primary" @click="addDelivery" :disabled="remainingBoxes <= 0">
            <el-icon><Plus /></el-icon>
            添加配送地址
          </el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          创建订单
        </el-button>
      </template>
    </el-dialog>

    <!-- Payment Dialog -->
    <el-dialog v-model="paymentDialogVisible" title="确认收款" width="400px">
      <el-form label-width="80px">
        <el-form-item label="金额">
          <span style="font-size: 20px; color: #409eff;">
            ¥{{ selectedOrder?.total_amount || 0 }}
          </span>
        </el-form-item>
        <el-form-item label="付款方式">
          <el-select v-model="paymentMethod" placeholder="选择付款方式">
            <el-option label="微信" value="wechat" />
            <el-option label="现金" value="cash" />
            <el-option label="银行转账" value="bank_transfer" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmPayment">
          确认收款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, TableInstance } from 'element-plus'
import dayjs from 'dayjs'
import { useOrderStore } from '@/stores/orders'
import { useCustomerStore } from '@/stores/customers'
import { exportOrders } from '@/api/export'
import { usePullRefresh } from '@/composables/usePullRefresh'
import PullRefreshIndicator from '@/components/PullRefreshIndicator.vue'
import AddressSelector from '@/components/AddressSelector.vue'
import type { Order, OrderStatus, OrderDelivery, DeliveryMethod, ExpressCompany, ExpressStatus } from '@/types'
import {
  fetchExpressCompanies,
  getExpressStatusText,
  getExpressStatusColor,
  getExpressBgColor,
  copyTrackingNumber as copyTracking,
  getTrackingUrl,
} from '@/api/express'

const router = useRouter()
const route = useRoute()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()

// Pull to refresh setup
const pageContainerRef = ref<HTMLElement | null>(null)
const {
  isRefreshing,
  pullDistance,
  setupListeners,
  cleanupListeners,
  THRESHOLD,
} = usePullRefresh(async () => {
  await customerStore.fetchCustomers()
  await handleFilter()
})

// Pagination
const currentPage = ref(1)
const pageSize = 20

// Computed for pagination
const totalOrders = computed(() => orderStore.orders.length)

// Desktop: show only current page
const desktopOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return orderStore.orders.slice(start, end)
})

function handlePageChange(page: number) {
  currentPage.value = page
}

function toggleRowExpand(row: Order) {
  tableRef.value?.toggleRowExpansion(row)
}

function resetPagination() {
  currentPage.value = 1
}

const dialogVisible = ref(false)
const paymentDialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const selectedOrder = ref<Order | null>(null)
const paymentMethod = ref('wechat')
const tableRef = ref()
const selectedOrders = ref<Order[]>([])
const batchDeleting = ref(false)
const expressCompanies = ref<ExpressCompany[]>([])

const filters = reactive({
  status: '' as OrderStatus | '',
  paid: undefined as boolean | undefined,
  dateRange: [] as string[],
  customerId: '',
})

// Customer list for filter dropdown
const customerList = computed(() => customerStore.customers)

const form = reactive({
  customer_id: '',
  total_boxes: 1,
  unit_price: 40,
  payment_method: undefined as 'wechat' | 'cash' | 'bank_transfer' | 'other' | undefined,
  note: '',
  deliveries: [
    {
      recipient_name: '',
      recipient_phone: '',
      address: '',
      quantity: 1,
      location: undefined as { lng: number; lat: number } | undefined,
      delivery_method: 'self' as DeliveryMethod,
      express_company: '' as string,
      weight: undefined as number | undefined,
    },
  ] as Partial<OrderDelivery>[],
})

const rules: FormRules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  total_boxes: [{ required: true, message: '请输入箱数', trigger: 'blur' }],
}

const totalDeliveryBoxes = computed(() =>
  form.deliveries.reduce((sum: number, d) => sum + (d.quantity || 0), 0)
)

// 计算总金额 = 单价 × 箱数
const calculatedTotalAmount = computed(() =>
  (form.unit_price || 0) * (form.total_boxes || 0)
)

// 计算剩余未分配的箱数
const remainingBoxes = computed(() =>
  form.total_boxes - totalDeliveryBoxes.value
)

// 监听总箱数变化，自动同步配送数量
watch(() => form.total_boxes, (newTotal) => {
  if (form.deliveries.length === 1 && form.deliveries[0]) {
    // 只有一个配送点时，直接同步数量
    form.deliveries[0].quantity = newTotal
  } else if (form.deliveries.length > 1) {
    // 多个配送点时，检查是否超出，如果超出则调整最后一个
    if (totalDeliveryBoxes.value > newTotal) {
      // 从后往前调整
      let excess = totalDeliveryBoxes.value - newTotal
      for (let i = form.deliveries.length - 1; i >= 0 && excess > 0; i--) {
        const delivery = form.deliveries[i]
        if (!delivery) continue
        const current = delivery.quantity || 0
        const deduction = Math.min(current - 1, excess)
        if (current > 1 && deduction > 0) {
          delivery.quantity = current - deduction
          excess -= deduction
        }
      }
    }
  }
})

// 获取选中客户的地址列表
const selectedCustomerAddresses = computed(() => {
  if (!form.customer_id) return []
  const customer = customerStore.customers.find(c => c.id === form.customer_id)
  return customer?.addresses || []
})

onMounted(async () => {
  await customerStore.fetchCustomers()
  await handleFilter()
  // Load express companies for display
  expressCompanies.value = await fetchExpressCompanies()
  // Setup pull-to-refresh listeners
  if (pageContainerRef.value) {
    setupListeners(pageContainerRef.value)
  }
})

onUnmounted(() => {
  cleanupListeners()
})

async function handleFilter() {
  resetPagination()
  const params: any = {}
  if (filters.status) params.status = filters.status
  if (filters.paid !== undefined) params.paid = filters.paid
  if (filters.customerId) params.customerId = filters.customerId
  if (filters.dateRange && filters.dateRange.length === 2) {
    params.startDate = filters.dateRange[0]
    params.endDate = filters.dateRange[1]
  }

  // Check for customer filter from query
  const customerId = route.query.customerId as string
  if (customerId && !filters.customerId) {
    params.customerId = customerId
    filters.customerId = customerId
  }

  await orderStore.fetchOrders(params)
}

function resetFilters() {
  filters.status = ''
  filters.paid = undefined
  filters.dateRange = []
  filters.customerId = ''
  handleFilter()
}

function handleExport() {
  // Build filename suffix based on active filters
  const filterParts: string[] = []
  if (filters.status) {
    filterParts.push(getStatusText(filters.status))
  }
  if (filters.paid !== undefined) {
    filterParts.push(filters.paid ? '已付款' : '未付款')
  }
  if (filters.customerId) {
    const customer = customerStore.customers.find(c => c.id === filters.customerId)
    if (customer) {
      filterParts.push(customer.name)
    }
  }
  if (filters.dateRange && filters.dateRange.length === 2) {
    filterParts.push(`${filters.dateRange[0]}至${filters.dateRange[1]}`)
  }

  const filenameSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : ''
  exportOrders(orderStore.orders, filenameSuffix)
  ElMessage.success(`已导出 ${totalOrders.value} 条订单`)
}

function formatDate(date: string) {
  return dayjs(date).format('MM-DD HH:mm')
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

function getStatusColor(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: '#E6A23C',      // Orange - needs attention
    confirmed: '#409EFF',    // Blue - ready for action
    delivering: '#00C9B7',   // Teal - in progress, active
    completed: '#67C23A',    // Green - success, done
    cancelled: '#F56C6C',    // Red - danger, cancelled
  }
  return map[status] || ''
}

function getStatusBgColor(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: '#FDF6EC',      // Light orange bg
    confirmed: '#ECF5FF',    // Light blue bg
    delivering: '#E8FAF8',   // Light teal bg
    completed: '#F0F9EB',    // Light green bg
    cancelled: '#FEF0F0',    // Light red bg
  }
  return map[status] || ''
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

// Delivery status helpers - use express_status for express, status for self
function getDeliveryDisplayText(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'express') {
    // Default to first status if express_status not set
    return getExpressStatusText(delivery.express_status || 'pending_pack')
  }
  // Self delivery status map
  const map: Record<string, string> = {
    pending: '待配送',
    assigned: '已分配',
    delivering: '配送中',
    delivered: '已送达',
  }
  return map[delivery.status] || '待配送'
}

function getDeliveryDisplayColor(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'express') {
    return getExpressStatusColor(delivery.express_status || 'pending_pack')
  }
  // Self delivery color map
  const map: Record<string, string> = {
    pending: '#909399',
    assigned: '#E6A23C',
    delivering: '#00C9B7',
    delivered: '#67C23A',
  }
  return map[delivery.status] || '#909399'
}

function getDeliveryDisplayBgColor(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'express') {
    return getExpressBgColor(delivery.express_status || 'pending_pack')
  }
  // Self delivery bg color map
  const map: Record<string, string> = {
    pending: '#F4F4F5',
    assigned: '#FDF6EC',
    delivering: '#E8FAF8',
    delivered: '#F0F9EB',
  }
  return map[delivery.status] || '#F4F4F5'
}

function getSelfDeliveryCount(deliveries?: OrderDelivery[]): number {
  return deliveries?.filter(d => d.delivery_method !== 'express').length || 0
}

function getExpressDeliveryCount(deliveries?: OrderDelivery[]): number {
  return deliveries?.filter(d => d.delivery_method === 'express').length || 0
}

function getExpressCompanyName(code?: string): string {
  if (!code) return '-'
  const company = expressCompanies.value.find(c => c.code === code)
  return company?.name || code
}

async function handleCopyTracking(trackingNumber: string) {
  const success = await copyTracking(trackingNumber)
  if (success) {
    ElMessage.success('运单号已复制')
  } else {
    ElMessage.error('复制失败')
  }
}

async function showAddDialog() {
  Object.assign(form, {
    customer_id: '',
    total_boxes: 1,
    unit_price: 40,
    payment_method: undefined,
    note: '',
    deliveries: [
      {
        recipient_name: '',
        recipient_phone: '',
        address: '',
        quantity: 1,
        location: undefined,
        delivery_method: 'self' as DeliveryMethod,
        express_company: '',
        weight: undefined,
      },
    ],
  })
  // Fetch express companies if not already loaded
  if (expressCompanies.value.length === 0) {
    expressCompanies.value = await fetchExpressCompanies()
  }
  dialogVisible.value = true
}

function addDelivery() {
  const remaining = form.total_boxes - totalDeliveryBoxes.value
  form.deliveries.push({
    recipient_name: '',
    recipient_phone: '',
    address: '',
    quantity: Math.max(1, remaining),
    location: undefined,
    delivery_method: 'self' as DeliveryMethod,
    express_company: '',
    weight: undefined,
  })
}

function removeDelivery(index: number) {
  form.deliveries.splice(index, 1)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  if (remainingBoxes.value !== 0) {
    if (remainingBoxes.value > 0) {
      ElMessage.error(`还有 ${remainingBoxes.value} 箱未分配到配送点`)
    } else {
      ElMessage.error(`配送总数超出订单箱数 ${Math.abs(remainingBoxes.value)} 箱`)
    }
    return
  }

  submitting.value = true
  try {
    const orderData = {
      customer_id: form.customer_id,
      total_boxes: form.total_boxes,
      total_amount: calculatedTotalAmount.value,
      payment_method: form.payment_method,
      note: form.note,
    }
    const result = await orderStore.createOrder(orderData, form.deliveries)
    if (result.success) {
      ElMessage.success('订单创建成功')
      dialogVisible.value = false
    } else {
      // Business logic error from store (e.g., validation)
      ElMessage.error(result.error || '创建失败')
    }
  } catch (error) {
    // Unexpected error - global handler will deal with it
    // Still show brief message to user
    ElMessage.error('创建失败，请重试')
  } finally {
    submitting.value = false
  }
}

function viewOrder(row: Order) {
  router.push(`/orders/${row.id}`)
}

async function confirmOrder(order: Order) {
  try {
    await ElMessageBox.confirm(
      '确认订单后将自动扣减库存，确定继续？',
      '确认订单',
      { type: 'warning' }
    )
    const result = await orderStore.updateOrderStatus(order.id, 'confirmed')
    if (result.success) {
      ElMessage.success('订单已确认，等待配送')
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Confirm order error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

function markPaid(order: Order) {
  selectedOrder.value = order
  paymentMethod.value = 'wechat'
  paymentDialogVisible.value = true
}

async function confirmPayment() {
  if (!selectedOrder.value) return
  submitting.value = true
  try {
    const result = await orderStore.markAsPaid(selectedOrder.value.id, paymentMethod.value)
    if (result.success) {
      ElMessage.success('已确认收款')
      paymentDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('收款失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function cancelOrder(order: Order) {
  try {
    // pending 状态直接删除
    if (order.status === 'pending') {
      await ElMessageBox.confirm(
        '确定要删除此订单吗？删除后无法恢复。',
        '删除订单',
        { type: 'warning' }
      )
      const result = await orderStore.deleteOrder(order.id)
      if (result.success) {
        ElMessage.success('订单已删除')
      } else {
        ElMessage.error(result.error || '删除失败')
      }
      return
    }

    // 已确认待配送或配送中的订单，取消并回补库存
    const confirmMsg = order.status === 'confirmed'
      ? '订单已确认出库，取消后将自动回补库存，订单状态将恢复为"未确认"，确定继续？'
      : order.status === 'delivering'
        ? '订单正在配送中，取消后将自动回补库存，订单状态将恢复为"未确认"，确定继续？'
        : '确定要取消此订单吗？'

    await ElMessageBox.confirm(confirmMsg, '取消订单', { type: 'warning' })
    const result = await orderStore.cancelOrder(order.id)
    if (result.success) {
      if (result.stockReturned) {
        ElMessage.success('订单已取消，库存已回补，可重新确认')
      } else {
        ElMessage.success('订单已取消')
      }
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Cancel order error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

function handleSelectionChange(selection: Order[]) {
  selectedOrders.value = selection
}

async function batchDelete() {
  if (selectedOrders.value.length === 0) return

  const pendingOrders = selectedOrders.value.filter(o => o.status === 'pending')
  const confirmedOrders = selectedOrders.value.filter(o => o.status === 'confirmed' || o.status === 'delivering')

  let confirmText = `确定要处理选中的 ${selectedOrders.value.length} 个订单吗？\n`
  if (pendingOrders.length > 0) {
    confirmText += `- ${pendingOrders.length} 个未确认订单将被删除\n`
  }
  if (confirmedOrders.length > 0) {
    confirmText += `- ${confirmedOrders.length} 个待配送/配送中订单将被取消，库存自动回补`
  }

  try {
    await ElMessageBox.confirm(confirmText, '批量处理订单', { type: 'warning' })

    batchDeleting.value = true
    let deleteCount = 0
    let cancelCount = 0
    let failCount = 0

    for (const order of selectedOrders.value) {
      if (order.status === 'pending') {
        // 删除未确认订单
        const result = await orderStore.deleteOrder(order.id)
        if (result.success) {
          deleteCount++
        } else {
          failCount++
        }
      } else if (order.status === 'confirmed' || order.status === 'delivering') {
        // 取消待配送订单，回补库存
        const result = await orderStore.cancelOrder(order.id)
        if (result.success) {
          cancelCount++
        } else {
          failCount++
        }
      }
    }

    if (deleteCount > 0) {
      ElMessage.success(`已删除 ${deleteCount} 个订单`)
    }
    if (cancelCount > 0) {
      ElMessage.success(`已取消 ${cancelCount} 个订单，库存已回补`)
    }
    if (failCount > 0) {
      ElMessage.warning(`${failCount} 个订单处理失败`)
    }

    // Clear selection
    selectedOrders.value = []
    tableRef.value?.clearSelection()
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Batch delete error:', e)
    ElMessage.error(e.message || '操作失败')
  } finally {
    batchDeleting.value = false
  }
}
</script>

<style scoped>
.page-container {
  position: relative;
  min-height: 100%;
}

.order-number {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-weight: 600;
  font-size: 13px;
  color: #409eff;
  letter-spacing: 0.5px;
}

.amount-text {
  font-weight: 500;
  color: #303133;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px solid #ebeef5;
  margin-top: 16px;
}

/* Hide desktop pagination on mobile */
@media (max-width: 767px) {
  .desktop-pagination {
    display: none;
  }
}

.delivery-list {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
  margin-top: 16px;
}

/* Delivery summary status */
.delivery-summary {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
}

.delivery-summary .remaining {
  color: #e6a23c;
}

.delivery-summary .excess {
  color: #f56c6c;
  font-weight: 500;
}

.delivery-summary .complete {
  color: #67c23a;
  font-weight: 500;
}

/* Total amount input - center the value */
.total-amount-input :deep(.el-input__wrapper) {
  text-align: center;
}

.total-amount-input :deep(.el-input__inner) {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
}

/* Divider text - no wrap */
.divider-text {
  white-space: nowrap;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #f0f9ff;
  border: 1px solid #b3d9ff;
  border-radius: 4px;
}

.batch-info {
  font-weight: 500;
  color: #409eff;
}

.delivery-item {
  padding: 12px;
  margin-bottom: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.delivery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
}

.el-table {
  cursor: pointer;
}

.action-buttons-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-row {
  display: flex;
  gap: 12px;
}

/* Expanded delivery table */
.delivery-expanded {
  padding: 12px 20px;
  background: #fafafa;
}

.delivery-expanded-title {
  font-weight: 500;
  margin-bottom: 12px;
  color: #606266;
}

.delivery-expanded .truncated-address {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.delivery-expanded .tracking-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.delivery-expanded .tracking-link {
  color: #409eff;
  text-decoration: none;
  font-size: inherit;
}

.delivery-expanded .tracking-link:hover {
  text-decoration: underline;
}

.delivery-expanded .text-muted {
  color: #c0c4cc;
}

/* Delivery badges */
.delivery-badges {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
}

.delivery-badges-mobile {
  display: flex;
  gap: 4px;
}

.badge-self {
  background: #ECF5FF;
  color: #409EFF;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.badge-express {
  background: #FDF6EC;
  color: #E6A23C;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

/* Mobile card list - hidden on desktop */
.mobile-card-list {
  display: none;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  /* Hide desktop table, show mobile cards */
  .desktop-table {
    display: none !important;
  }

  .mobile-card-list {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 280px);
    min-height: 300px;
  }

  .mobile-count-indicator {
    text-align: center;
    padding: 8px;
    font-size: 13px;
    color: #909399;
    background: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .mobile-scroller {
    flex: 1;
  }

  .filter-bar {
    flex-direction: column;
    gap: 8px;
  }

  .filter-bar .el-select {
    width: 100% !important;
  }

  .batch-toolbar {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  /* Mobile card styles */
  .order-mobile-card {
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

  .order-mobile-card:active {
    background: #f5f7fa;
  }

  .order-mobile-card .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .order-mobile-card .order-number-mobile {
    font-family: monospace;
    font-size: 14px;
    font-weight: 600;
    color: #409eff;
  }

  .order-mobile-card .card-customer {
    font-size: 15px;
    font-weight: 500;
  }

  .order-mobile-card .card-info-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .order-mobile-card .amount {
    font-size: 16px;
    font-weight: 600;
    color: #409eff;
  }

  .order-mobile-card .card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #909399;
  }

  .order-mobile-card .card-actions {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #ebeef5;
  }

  .delivery-item {
    padding: 8px;
  }

  .delivery-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  :deep(.el-card__body) {
    padding: 8px;
  }

  /* Dialog responsive */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto !important;
  }

  :deep(.el-dialog__body) {
    padding: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }

  /* Only target form items inside dialog */
  :deep(.el-dialog .el-form-item__label) {
    float: none;
    text-align: left;
    padding-bottom: 4px;
    width: 80px !important;
  }

  :deep(.el-dialog .el-form-item__content) {
    margin-left: 0 !important;
  }

  /* Make dialog form columns stack vertically */
  :deep(.el-dialog .el-col-12),
  :deep(.el-dialog .el-col-8) {
    max-width: 100%;
    flex: 0 0 100%;
  }

  :deep(.el-dialog .el-row) {
    flex-direction: column;
    gap: 0;
  }

  .delivery-item {
    padding: 12px 8px;
  }

  .delivery-list {
    padding: 12px 8px;
  }

  .delivery-header {
    margin-bottom: 8px;
  }

  /* Make dialog inputs full width */
  :deep(.el-dialog .el-input),
  :deep(.el-dialog .el-input-number),
  :deep(.el-dialog .el-select) {
    width: 100% !important;
  }
}
</style>
