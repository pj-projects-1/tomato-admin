<template>
  <div class="page-container" ref="pageContainerRef">
    <!-- Pull to refresh indicator -->
    <PullRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshing"
      :threshold="THRESHOLD"
    />

    <div class="page-header">
      <h1 class="page-title">客户管理</h1>
      <div class="header-actions">
        <template v-if="!exportMode">
          <el-button @click="startExportMode" :disabled="customerStore.customers.length === 0">
            <el-icon><Download /></el-icon>
            导出 ({{ totalCustomers }}条)
          </el-button>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增客户
          </el-button>
        </template>
        <template v-else>
          <el-button @click="cancelExportMode">取消</el-button>
          <el-button type="primary" @click="confirmExport" :disabled="selectedCustomers.length === 0">
            <el-icon><Download /></el-icon>
            导出选中 ({{ selectedCustomers.length }}条)
          </el-button>
        </template>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="filter-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索客户名称/微信/电话"
        style="width: 300px"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button icon="Search" @click="handleSearch" />
        </template>
      </el-input>
    </div>

    <!-- Customer List -->
    <el-card shadow="never">
      <!-- Export Selection Toolbar -->
      <div v-if="exportMode && selectedCustomers.length > 0" class="export-toolbar">
        <span class="export-info">已选择 {{ selectedCustomers.length }} 个客户</span>
        <el-button size="small" @click="selectAllCustomers">
          {{ selectedCustomers.length === customerStore.customers.length ? '取消全选' : '全选' }}
        </el-button>
      </div>

      <!-- Desktop: Table view -->
      <el-table
        ref="tableRef"
        :data="desktopCustomers"
        v-loading="customerStore.loading"
        style="width: 100%"
        class="desktop-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="40" :selectable="() => exportMode" />
        <el-table-column prop="name" label="客户名称" min-width="120" />
        <el-table-column prop="wechat" label="微信" width="140" />
        <el-table-column prop="phone" label="电话" width="130">
          <template #default="{ row }">
            <PhoneField :phone="row.phone" />
          </template>
        </el-table-column>
        <el-table-column prop="addresses" label="地址数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.addresses?.length || 0 }} 个</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="100">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <div class="action-buttons-grid">
              <div class="action-row">
                <el-button link type="primary" @click="showDetailDialog(row)">详情</el-button>
                <el-button link type="primary" @click="viewOrders(row)">订单</el-button>
              </div>
              <div class="action-row">
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile: Card view with virtual scrolling -->
      <div class="mobile-card-list" v-loading="customerStore.loading">
        <!-- Count indicator -->
        <div v-if="customerStore.customers.length > 0" class="mobile-count-indicator">
          <template v-if="exportMode">
            <el-checkbox
              :model-value="selectedCustomers.length === customerStore.customers.length"
              :indeterminate="selectedCustomers.length > 0 && selectedCustomers.length < customerStore.customers.length"
              @change="toggleSelectAll"
            >全选 ({{ selectedCustomers.length }}/{{ totalCustomers }})</el-checkbox>
          </template>
          <template v-else>
            共 {{ totalCustomers }} 条
          </template>
        </div>

        <DynamicScroller
          v-if="customerStore.customers.length > 0"
          class="mobile-scroller"
          :items="customerStore.customers"
          :min-item-size="130"
          key-field="id"
          v-slot="{ item, active }"
        >
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :size-dependencies="[item.note, item.wechat, item.phone]"
          >
            <div
              class="customer-mobile-card"
              :class="{ 'export-selectable': exportMode, 'selected': isCustomerSelected(item) }"
              @click="exportMode ? toggleCustomerSelection(item) : showDetailDialog(item)"
            >
              <div class="card-header-row">
                <template v-if="exportMode">
                  <el-checkbox
                    :model-value="isCustomerSelected(item)"
                    @click.stop
                    @change="toggleCustomerSelection(item)"
                  />
                </template>
                <span class="customer-name">{{ item.name }}</span>
                <el-tag size="small" type="info">{{ item.addresses?.length || 0 }}地址</el-tag>
              </div>
              <div class="card-info-row">
                <span v-if="item.wechat">微信: {{ item.wechat }}</span>
                <span v-if="item.phone">电话: <PhoneField :phone="item.phone" /></span>
              </div>
              <div class="card-footer" v-if="item.note">
                <span class="note">{{ item.note }}</span>
              </div>
              <div class="card-actions" v-if="!exportMode">
                <el-button size="small" type="primary" @click.stop="showDetailDialog(item)">详情</el-button>
                <el-button size="small" @click.stop="viewOrders(item)">订单</el-button>
                <el-button size="small" type="danger" @click.stop="handleDelete(item)">删除</el-button>
              </div>
            </div>
          </DynamicScrollerItem>
        </DynamicScroller>

        <el-empty v-if="customerStore.customers.length === 0" description="暂无客户" />
      </div>

      <!-- Desktop: Pagination -->
      <div v-if="totalCustomers > pageSize" class="pagination-container desktop-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalCustomers"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Detail Dialog -->
    <el-dialog
      v-model="detailDialogVisible"
      title="客户详情"
      width="560px"
      destroy-on-close
      class="customer-detail-dialog"
    >
      <div v-if="detailCustomer" class="detail-content">
        <!-- Header with name and edit button -->
        <div class="detail-header">
          <div class="customer-avatar">
            <span>{{ detailCustomer.name?.charAt(0) || '客' }}</span>
          </div>
          <div class="customer-header-info">
            <h2 class="customer-full-name">{{ detailCustomer.name }}</h2>
            <span class="customer-meta">创建于 {{ formatDate(detailCustomer.created_at) }}</span>
          </div>
          <el-button type="primary" @click="enterEditMode" v-if="!isEditMode">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>

        <!-- View Mode -->
        <div v-if="!isEditMode" class="detail-view">
          <!-- Contact Info -->
          <div class="detail-section">
            <div class="section-title">联系方式</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">微信</span>
                <span class="info-value">{{ detailCustomer.wechat || '未填写' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">电话</span>
                <span class="info-value">
                  <PhoneField v-if="detailCustomer.phone" :phone="detailCustomer.phone" />
                  <span v-else>未填写</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Addresses -->
          <div class="detail-section" v-if="detailCustomer.addresses?.length">
            <div class="section-title">收货地址</div>
            <div class="address-list-view">
              <div
                v-for="(addr, index) in detailCustomer.addresses"
                :key="index"
                class="address-card"
                :class="{ 'is-default': addr.is_default }"
              >
                <div class="address-card-header">
                  <span class="address-label">{{ addr.label || '地址' + (index + 1) }}</span>
                  <el-tag v-if="addr.is_default" type="success" size="small">默认</el-tag>
                </div>
                <div class="address-text">{{ addr.address }}</div>
              </div>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="detail-section">
            <div class="section-title">最近订单</div>
            <div v-if="loadingOrders" class="orders-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
            <div v-else-if="recentOrders.length === 0" class="no-orders">
              暂无订单
            </div>
            <div v-else class="recent-orders-list">
              <div
                v-for="order in recentOrders"
                :key="order.id"
                class="order-item"
                @click="goToOrder(order.id)"
              >
                <div class="order-main">
                  <span class="order-number">{{ order.order_number }}</span>
                  <el-tag
                    size="small"
                    :style="{
                      backgroundColor: getOrderStatusBg(order.status),
                      color: getOrderStatusColor(order.status),
                      border: 'none'
                    }"
                  >{{ getOrderStatusText(order.status) }}</el-tag>
                </div>
                <div class="order-meta">
                  <span class="order-date">{{ formatDate(order.created_at) }}</span>
                  <span class="order-amount">¥{{ order.total_amount }}</span>
                  <span class="order-boxes">{{ order.total_boxes }}箱</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Note -->
          <div class="detail-section" v-if="detailCustomer.note">
            <div class="section-title">备注</div>
            <div class="note-content">{{ detailCustomer.note }}</div>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="detail-edit">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="80px"
            label-position="top"
          >
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入客户姓名" />
            </el-form-item>
            <el-form-item label="微信" prop="wechat">
              <el-input v-model="form.wechat" placeholder="请输入微信号" />
            </el-form-item>
            <el-form-item label="电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入电话号码" />
            </el-form-item>
            <el-form-item label="地址">
              <div class="address-list">
                <div
                  v-for="(addr, index) in form.addresses"
                  :key="index"
                  class="address-item"
                >
                  <div class="address-row-main">
                    <el-input
                      v-model="addr.label"
                      placeholder="标签（如：家、公司）"
                      class="address-label-input"
                    />
                    <AddressInput
                      v-model="addr.address"
                      v-model:location="addr.location"
                      placeholder="输入地址搜索..."
                      class="address-input"
                    />
                  </div>
                  <div class="address-row-actions">
                    <el-checkbox v-model="addr.is_default">默认</el-checkbox>
                    <el-button
                      text
                      type="danger"
                      size="small"
                      @click="removeAddress(index)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <el-button text type="primary" @click="addAddress">
                  <el-icon><Plus /></el-icon>
                  添加地址
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="备注" prop="note">
              <el-input
                v-model="form.note"
                type="textarea"
                :rows="3"
                placeholder="备注信息"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <template v-if="!isEditMode">
            <el-button @click="detailDialogVisible = false">关闭</el-button>
          </template>
          <template v-else>
            <el-button @click="cancelEdit">取消</el-button>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">
              保存
            </el-button>
          </template>
        </div>
      </template>
    </el-dialog>

    <!-- Add Dialog -->
    <el-dialog
      v-model="addDialogVisible"
      title="新增客户"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="addFormRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入客户姓名" />
        </el-form-item>
        <el-form-item label="微信" prop="wechat">
          <el-input v-model="form.wechat" placeholder="请输入微信号" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入电话号码" />
        </el-form-item>
        <el-form-item label="地址">
          <div class="address-list">
            <div
              v-for="(addr, index) in form.addresses"
              :key="index"
              class="address-item"
            >
              <div class="address-row-main">
                <el-input
                  v-model="addr.label"
                  placeholder="标签（如：家、公司）"
                  class="address-label-input"
                />
                <AddressInput
                  v-model="addr.address"
                  v-model:location="addr.location"
                  placeholder="输入地址搜索..."
                  class="address-input"
                />
              </div>
              <div class="address-row-actions">
                <el-checkbox v-model="addr.is_default">默认</el-checkbox>
                <el-button
                  text
                  type="danger"
                  size="small"
                  @click="removeAddress(index)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <el-button text type="primary" @click="addAddress">
              <el-icon><Plus /></el-icon>
              添加地址
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            :rows="3"
            placeholder="备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleAddSubmit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, TableInstance } from 'element-plus'
import { Edit, Loading } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useCustomerStore } from '@/stores/customers'
import { useOrderStore } from '@/stores/orders'
import { exportCustomers } from '@/api/export'
import { usePullRefresh } from '@/composables/usePullRefresh'
import PullRefreshIndicator from '@/components/PullRefreshIndicator.vue'
import PhoneField from '@/components/PhoneField.vue'
import AddressInput from '@/components/AddressInput.vue'
import type { Customer, CustomerAddress, Order } from '@/types'

const router = useRouter()
const customerStore = useCustomerStore()
const orderStore = useOrderStore()

// Pull to refresh setup
const pageContainerRef = ref<HTMLElement | null>(null)
const {
  isRefreshing,
  pullDistance,
  setupListeners,
  cleanupListeners,
  THRESHOLD,
} = usePullRefresh(async () => {
  await customerStore.fetchCustomers(searchKeyword.value)
})

// Pagination
const currentPage = ref(1)
const pageSize = 20

const searchKeyword = ref('')
const addDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEditMode = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const addFormRef = ref<FormInstance>()
const editingId = ref('')
const detailCustomer = ref<Customer | null>(null)
const recentOrders = ref<Order[]>([])
const loadingOrders = ref(false)

// Export mode
const exportMode = ref(false)
const selectedCustomers = ref<Customer[]>([])
const tableRef = ref<TableInstance>()

// Computed for pagination
const totalCustomers = computed(() => customerStore.customers.length)

// Desktop: show only current page
const desktopCustomers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return customerStore.customers.slice(start, end)
})

function handlePageChange(page: number) {
  currentPage.value = page
}

function resetPagination() {
  currentPage.value = 1
}

const form = reactive({
  name: '',
  wechat: '',
  phone: '',
  addresses: [] as CustomerAddress[],
  note: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' },
  ],
}

onMounted(() => {
  customerStore.fetchCustomers()
  // Setup pull-to-refresh listeners
  if (pageContainerRef.value) {
    setupListeners(pageContainerRef.value)
  }
})

onUnmounted(() => {
  cleanupListeners()
})

function handleSearch() {
  resetPagination()
  customerStore.fetchCustomers(searchKeyword.value)
}

// Export mode functions
function startExportMode() {
  exportMode.value = true
  selectedCustomers.value = []
}

function cancelExportMode() {
  exportMode.value = false
  selectedCustomers.value = []
  tableRef.value?.clearSelection()
}

function confirmExport() {
  if (selectedCustomers.value.length === 0) {
    ElMessage.warning('请选择要导出的客户')
    return
  }
  const filenameSuffix = searchKeyword.value ? `_搜索${searchKeyword.value}` : ''
  exportCustomers(selectedCustomers.value, filenameSuffix)
  ElMessage.success(`已导出 ${selectedCustomers.value.length} 条客户`)
  cancelExportMode()
}

function handleSelectionChange(selection: Customer[]) {
  selectedCustomers.value = selection
}

function selectAllCustomers() {
  if (selectedCustomers.value.length === customerStore.customers.length) {
    // Deselect all
    tableRef.value?.clearSelection()
  } else {
    // Select all (need to select across all pages)
    customerStore.customers.forEach(customer => {
      tableRef.value?.toggleRowSelection(customer, true)
    })
  }
}

// Mobile selection functions
function isCustomerSelected(customer: Customer) {
  return selectedCustomers.value.some(c => c.id === customer.id)
}

function toggleCustomerSelection(customer: Customer) {
  const index = selectedCustomers.value.findIndex(c => c.id === customer.id)
  if (index >= 0) {
    selectedCustomers.value.splice(index, 1)
  } else {
    selectedCustomers.value.push(customer)
  }
}

function toggleSelectAll() {
  if (selectedCustomers.value.length === customerStore.customers.length) {
    selectedCustomers.value = []
  } else {
    selectedCustomers.value = [...customerStore.customers]
  }
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

// Order status helpers
function getOrderStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '未确认',
    confirmed: '未完成',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getOrderStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#E6A23C',
    confirmed: '#409EFF',
    delivering: '#00C9B7',
    completed: '#67C23A',
    cancelled: '#F56C6C',
  }
  return map[status] || '#909399'
}

function getOrderStatusBg(status: string): string {
  const map: Record<string, string> = {
    pending: '#FDF6EC',
    confirmed: '#ECF5FF',
    delivering: '#E8FAF8',
    completed: '#F0F9EB',
    cancelled: '#FEF0F0',
  }
  return map[status] || '#F4F4F5'
}

function goToOrder(orderId: string) {
  router.push(`/orders/${orderId}`)
}

function showAddDialog() {
  editingId.value = ''
  Object.assign(form, {
    name: '',
    wechat: '',
    phone: '',
    addresses: [],
    note: '',
  })
  addDialogVisible.value = true
}

async function showDetailDialog(customer: Customer) {
  detailCustomer.value = customer
  isEditMode.value = false
  editingId.value = customer.id
  Object.assign(form, {
    name: customer.name,
    wechat: customer.wechat || '',
    phone: customer.phone || '',
    addresses: customer.addresses?.length ? [...customer.addresses] : [],
    note: customer.note || '',
  })
  detailDialogVisible.value = true

  // Fetch recent orders for this customer
  loadingOrders.value = true
  try {
    const orders = await orderStore.fetchOrders({ customerId: customer.id })
    // Keep only the last 5 orders
    recentOrders.value = (orders || []).slice(0, 5)
  } catch (error) {
    console.error('Failed to fetch recent orders:', error)
    recentOrders.value = []
  } finally {
    loadingOrders.value = false
  }
  detailDialogVisible.value = true
}

function enterEditMode() {
  isEditMode.value = true
}

function cancelEdit() {
  // Reset form to original customer data
  if (detailCustomer.value) {
    Object.assign(form, {
      name: detailCustomer.value.name,
      wechat: detailCustomer.value.wechat || '',
      phone: detailCustomer.value.phone || '',
      addresses: detailCustomer.value.addresses?.length ? [...detailCustomer.value.addresses] : [],
      note: detailCustomer.value.note || '',
    })
  }
  isEditMode.value = false
}

function addAddress() {
  form.addresses.push({
    label: '',
    address: '',
    is_default: form.addresses.length === 0,
  })
}

function removeAddress(index: number) {
  form.addresses.splice(index, 1)
  // Ensure one default
  if (form.addresses.length > 0 && !form.addresses.some(a => a.is_default)) {
    const firstAddr = form.addresses[0]
    if (firstAddr) {
      firstAddr.is_default = true
    }
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const result = await customerStore.updateCustomer(editingId.value, form)

    if (result.success) {
      ElMessage.success('更新成功')
      // Update local detailCustomer to reflect changes
      detailCustomer.value = {
        ...detailCustomer.value!,
        name: form.name,
        wechat: form.wechat,
        phone: form.phone,
        addresses: form.addresses,
        note: form.note,
      }
      isEditMode.value = false
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleAddSubmit() {
  const valid = await addFormRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const result = await customerStore.createCustomer(form)

    if (result.success) {
      ElMessage.success('创建成功')
      addDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(customer: Customer) {
  try {
    await ElMessageBox.confirm(
      `确定要删除客户"${customer.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const result = await customerStore.deleteCustomer(customer.id)
    if (result.success) {
      ElMessage.success('删除成功')
      // Close detail dialog if open
      if (detailDialogVisible.value && detailCustomer.value?.id === customer.id) {
        detailDialogVisible.value = false
      }
    } else {
      ElMessage.error(result.error || '删除失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Delete customer error:', e)
    ElMessage.error(e.message || '删除失败')
  }
}

function viewOrders(customer: Customer) {
  router.push({
    path: '/orders',
    query: { customerId: customer.id },
  })
}
</script>

<style scoped>
.page-container {
  position: relative;
  min-height: 100%;
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

/* Export toolbar */
.export-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #f0f9ff;
  border: 1px solid #b3d9ff;
  border-radius: 4px;
}

.export-info {
  font-weight: 500;
  color: #409eff;
}

.address-list {
  width: 100%;
}

.address-item {
  padding: 12px;
  margin-bottom: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.address-row-main {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.address-label-input {
  width: 120px;
  flex-shrink: 0;
}

.address-input {
  flex: 1;
}

.address-row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* Mobile card list - hidden on desktop */
.mobile-card-list {
  display: none;
}

/* Customer Detail Dialog Styles */
.detail-content {
  min-height: 200px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.customer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.customer-avatar span {
  color: #fff;
  font-size: 24px;
  font-weight: 600;
}

.customer-header-info {
  flex: 1;
}

.customer-full-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.customer-meta {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
  display: block;
}

.detail-view {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  color: #303133;
}

.address-list-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-card {
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 3px solid #e4e7ed;
  transition: all 0.2s;
}

.address-card.is-default {
  background: #f0f9eb;
  border-left-color: #67c23a;
}

.address-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.address-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.address-text {
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
}

.note-content {
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* Recent Orders styles */
.orders-loading,
.no-orders {
  padding: 24px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.orders-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.recent-orders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.order-item:hover {
  background: #f0f0f0;
}

.order-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-number {
  font-family: monospace;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.order-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #909399;
}

.order-amount {
  color: #f56c6c;
  font-weight: 500;
}

.order-boxes {
  color: #409eff;
}

.detail-edit {
  animation: fadeIn 0.2s ease;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  /* Hide desktop table */
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
  }

  .filter-bar .el-input {
    width: 100% !important;
  }

  /* Mobile card styles */
  .customer-mobile-card {
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

  .customer-mobile-card:active {
    background: #f5f7fa;
  }

  /* Export mode card styles */
  .customer-mobile-card.export-selectable {
    cursor: pointer;
  }

  .customer-mobile-card.export-selectable.selected {
    background: #ecf5ff;
    border-color: #409eff;
  }

  .customer-mobile-card .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .customer-mobile-card .customer-name {
    font-weight: 500;
    font-size: 15px;
    flex: 1;
  }

  .customer-mobile-card .card-info-row {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: #606266;
  }

  .customer-mobile-card .card-footer .note {
    font-size: 12px;
    color: #909399;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .customer-mobile-card .card-actions {
    display: flex;
    gap: 8px;
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

  :deep(.el-dialog__body) {
    padding: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }

  :deep(.el-dialog .el-form-item__label) {
    float: none;
    text-align: left;
    padding-bottom: 4px;
    width: 80px !important;
  }

  :deep(.el-dialog .el-form-item__content) {
    margin-left: 0 !important;
  }

  /* Detail dialog mobile styles */
  .detail-header {
    flex-wrap: wrap;
  }

  .customer-header-info {
    flex: 1;
    min-width: 0;
  }

  .detail-header .el-button {
    order: 3;
    width: 100%;
    margin-top: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  /* Address item on mobile - stack vertically */
  .address-item {
    padding: 8px;
  }

  .address-row-main {
    flex-direction: column;
    gap: 8px;
  }

  .address-label-input {
    width: 100%;
  }

  .address-row-actions {
    justify-content: space-between;
    padding-top: 4px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>
