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
        <el-button @click="handleExport" :disabled="customerStore.customers.length === 0">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          新增客户
        </el-button>
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
      <!-- Desktop: Table view -->
      <el-table
        :data="customerStore.customers"
        v-loading="customerStore.loading"
        style="width: 100%"
        class="desktop-table"
      >
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
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <div class="action-buttons-grid">
              <div class="action-row">
                <el-button link type="primary" @click="showEditDialog(row)">编辑</el-button>
                <el-button link type="primary" @click="viewOrders(row)">订单</el-button>
              </div>
              <div class="action-row">
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile: Card view -->
      <div class="mobile-card-list" v-loading="customerStore.loading">
        <div
          v-for="row in customerStore.customers"
          :key="row.id"
          class="customer-mobile-card"
          @click="showEditDialog(row)"
        >
          <div class="card-header-row">
            <span class="customer-name">{{ row.name }}</span>
            <el-tag size="small" type="info">{{ row.addresses?.length || 0 }}地址</el-tag>
          </div>
          <div class="card-info-row">
            <span v-if="row.wechat">微信: {{ row.wechat }}</span>
            <span v-if="row.phone">电话: <PhoneField :phone="row.phone" /></span>
          </div>
          <div class="card-footer" v-if="row.note">
            <span class="note">{{ row.note }}</span>
          </div>
          <div class="card-actions">
            <el-button size="small" type="primary" @click.stop="showEditDialog(row)">编辑</el-button>
            <el-button size="small" @click.stop="viewOrders(row)">订单</el-button>
            <el-button size="small" type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </div>
        </div>
        <el-empty v-if="customerStore.customers.length === 0" description="暂无客户" />
      </div>
    </el-card>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑客户' : '新增客户'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import dayjs from 'dayjs'
import { useCustomerStore } from '@/stores/customers'
import { exportCustomers } from '@/api/export'
import { usePullRefresh } from '@/composables/usePullRefresh'
import PullRefreshIndicator from '@/components/PullRefreshIndicator.vue'
import PhoneField from '@/components/PhoneField.vue'
import AddressInput from '@/components/AddressInput.vue'
import type { Customer, CustomerAddress } from '@/types'

const router = useRouter()
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
  await customerStore.fetchCustomers(searchKeyword.value)
})

const searchKeyword = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref('')

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
  customerStore.fetchCustomers(searchKeyword.value)
}

function handleExport() {
  exportCustomers(customerStore.customers)
  ElMessage.success('导出成功')
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

function showAddDialog() {
  isEdit.value = false
  editingId.value = ''
  Object.assign(form, {
    name: '',
    wechat: '',
    phone: '',
    addresses: [],
    note: '',
  })
  dialogVisible.value = true
}

function showEditDialog(customer: Customer) {
  isEdit.value = true
  editingId.value = customer.id
  Object.assign(form, {
    name: customer.name,
    wechat: customer.wechat || '',
    phone: customer.phone || '',
    addresses: customer.addresses?.length ? [...customer.addresses] : [],
    note: customer.note || '',
  })
  dialogVisible.value = true
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
    const result = isEdit.value
      ? await customerStore.updateCustomer(editingId.value, form)
      : await customerStore.createCustomer(form)

    if (result.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
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
  width: 80px;
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

/* Mobile responsive styles */
@media (max-width: 767px) {
  /* Hide desktop table */
  .desktop-table {
    display: none !important;
  }

  .mobile-card-list {
    display: block;
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

  .customer-mobile-card .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .customer-mobile-card .customer-name {
    font-weight: 500;
    font-size: 15px;
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
