<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <span v-if="order" class="order-number-header">{{ order.order_number || order.id.slice(0, 8) }}</span>
      </div>
      <div class="header-actions">
        <el-button
          v-if="order?.status === 'pending'"
          type="success"
          @click="confirmOrder"
        >
          确认订单
        </el-button>
        <el-button
          v-if="order && !order.paid"
          type="warning"
          @click="markPaid"
        >
          确认收款
        </el-button>
        <el-button
          v-if="order && order.status !== 'completed'"
          type="danger"
          @click="cancelOrder"
        >
          {{ order?.status === 'pending' ? '删除订单' : '取消订单' }}
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" v-if="order">
      <!-- Order Info -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span>订单信息</span>
            <el-tag size="small" :class="'status-tag--' + order.status" style="margin-left: 8px">
              {{ getStatusText(order.status) }}
            </el-tag>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单号">{{ order.order_number }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(order.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ order.customer?.name }}</el-descriptions-item>
            <el-descriptions-item label="微信">{{ order.customer?.wechat || '-' }}</el-descriptions-item>
            <el-descriptions-item label="电话">
              <PhoneField :phone="order.customer?.phone" />
            </el-descriptions-item>
            <el-descriptions-item label="总箱数">{{ order.total_boxes }} 箱</el-descriptions-item>
            <el-descriptions-item label="金额">
              <span style="font-size: 18px; color: var(--el-color-danger);">¥{{ order.total_amount || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="付款状态">
              <el-tag :type="order.paid ? 'success' : 'warning'">
                {{ order.paid ? '已付款' : '未付款' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="order.paid" label="付款时间">
              {{ formatDateTime(order.paid_at!) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="order.paid" label="付款方式">
              {{ getPaymentMethod(order.payment_method) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="order.note" label="备注" :span="2">
              {{ order.note }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- Delivery Addresses -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span>配送地址</span>
            <el-button
              v-if="order.status !== 'completed'"
              text
              type="primary"
              @click="showAddDeliveryDialog"
            >
              <el-icon><Plus /></el-icon>
              添加地址
            </el-button>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="(delivery, index) in order.deliveries"
              :key="delivery.id"
              :type="getDeliveryTimelineType(delivery)"
              :hollow="!isDeliveryCompleted(delivery)"
            >
              <div class="delivery-card">
                <div class="delivery-header">
                  <div class="delivery-title-row">
                    <span class="delivery-title">配送点 {{ index + 1 }}</span>
                    <el-tag
                      v-if="delivery.delivery_method === 'express'"
                      type="warning"
                      size="small"
                      class="method-tag"
                    >
                      快递
                    </el-tag>
                    <el-tag
                      v-else-if="delivery.delivery_method === 'pickup'"
                      type="success"
                      size="small"
                      class="method-tag"
                    >
                      自提
                    </el-tag>
                    <el-tag
                      v-else
                      type="primary"
                      size="small"
                      class="method-tag"
                    >
                      自送
                    </el-tag>
                  </div>
                  <div class="delivery-header-actions">
                    <el-tag size="small" :class="getDeliveryStatusClass(delivery)">
                      {{ getDeliveryDisplayText(delivery) }}
                    </el-tag>
                    <el-button
                      v-if="!isDeliveryCompleted(delivery)"
                      text
                      type="primary"
                      size="small"
                      @click="showEditDeliveryDialog(delivery)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="!isDeliveryCompleted(delivery) && order.deliveries && order.deliveries.length > 1"
                      text
                      type="danger"
                      size="small"
                      @click="deleteDelivery(delivery)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <div class="delivery-info">
                  <!-- Only show recipient/address for non-pickup -->
                  <template v-if="delivery.delivery_method !== 'pickup'">
                    <p><strong>收货人：</strong>{{ delivery.recipient_name || order.customer?.name }}</p>
                    <p><strong>电话：</strong><PhoneField :phone="delivery.recipient_phone || order.customer?.phone" /></p>
                    <p><strong>地址：</strong>{{ delivery.address }}</p>
                  </template>
                  <p><strong>数量：</strong>{{ delivery.quantity }} 箱</p>

                  <!-- Express-specific fields -->
                  <template v-if="delivery.delivery_method === 'express'">
                    <p v-if="delivery.express_company">
                      <strong>快递公司：</strong>{{ getExpressCompanyName(delivery.express_company) }}
                    </p>
                    <!-- Tracking Numbers -->
                    <div v-if="getTrackingNumbers(delivery).length > 0" class="tracking-numbers-section">
                      <p class="tracking-label">
                        <strong>运单号：</strong>
                      </p>
                      <div class="tracking-numbers-list">
                        <div
                          v-for="(item, index) in getTrackingNumbers(delivery)"
                          :key="item.number + '-' + index"
                          class="tracking-number-item"
                        >
                          <span class="tracking-index">{{ index + 1 }}.</span>
                          <a
                            :href="getTrackingUrlFromItem(item, delivery.express_company)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="tracking-link"
                          >{{ item.number }}</a>
                          <el-tag
                            v-if="item.carrier && item.carrier !== (delivery.express_company ? EXPRESS_COMPANY_CODES[delivery.express_company] || '' : '')"
                            size="small"
                            type="info"
                            class="company-tag"
                          >
                            {{ getExpressCompanyNameByCode(item.carrier) }}
                          </el-tag>
                          <el-button
                            link
                            size="small"
                            @click="handleCopyTracking(item.number)"
                          >
                            <el-icon><CopyDocument /></el-icon>
                          </el-button>
                        </div>
                      </div>
                    </div>
                    <p v-if="delivery.weight"><strong>重量：</strong>{{ delivery.weight }} kg</p>
                    <p v-if="delivery.packed_at"><strong>包装时间：</strong>{{ formatShortDate(delivery.packed_at) }}</p>
                    <p v-if="delivery.shipped_at"><strong>发货时间：</strong>{{ formatShortDate(delivery.shipped_at) }}</p>
                  </template>

                  <!-- Pickup-specific fields -->
                  <template v-if="delivery.delivery_method === 'pickup' && delivery.picked_up_at">
                    <p><strong>自提时间：</strong>{{ formatShortDate(delivery.picked_up_at) }}</p>
                  </template>

                  <p v-if="delivery.delivery_note"><strong>备注：</strong>{{ delivery.delivery_note }}</p>
                </div>

                <!-- Self delivery: mark delivered button -->
                <div v-if="delivery.delivery_method === 'self' && delivery.status !== 'delivered'" class="delivery-actions">
                  <el-button
                    size="small"
                    type="success"
                    @click="markDelivered(delivery)"
                  >
                    标记已送达
                  </el-button>
                </div>

                <!-- Pickup: mark picked up button -->
                <div v-if="delivery.delivery_method === 'pickup' && delivery.pickup_status !== 'picked_up'" class="delivery-actions">
                  <el-button
                    size="small"
                    type="success"
                    @click="markPickedUp(delivery)"
                  >
                    确认自提
                  </el-button>
                </div>

                <!-- Express delivery: link to shipping page -->
                <div v-if="delivery.delivery_method === 'express' && !isDeliveryCompleted(delivery)" class="delivery-actions">
                  <el-button
                    size="small"
                    type="primary"
                    @click="goToExpressShipping(delivery)"
                  >
                    前往快递发货
                  </el-button>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <!-- Edit Delivery Dialog -->
    <el-dialog
      v-model="editDeliveryDialogVisible"
      :title="isAddDelivery ? '添加配送地址' : '编辑配送地址'"
      width="500px"
      destroy-on-close
    >
      <el-form :model="deliveryForm" label-width="80px">
        <template v-if="deliveryForm.delivery_method !== 'pickup'">
          <el-form-item label="收货人">
            <el-input v-model="deliveryForm.recipient_name" placeholder="留空则使用客户名" />
          </el-form-item>
          <el-form-item label="电话">
            <el-input v-model="deliveryForm.recipient_phone" placeholder="留空则使用客户电话" />
          </el-form-item>
          <el-form-item label="地址" required>
            <AddressInput
              v-model="deliveryForm.address"
              v-model:location="deliveryForm.location"
              placeholder="输入地址搜索..."
            />
          </el-form-item>
        </template>
        <el-form-item label="数量" required>
          <el-input-number
            v-model="deliveryForm.quantity"
            :min="1"
            style="width: 100%"
          />
          <div v-if="quantityWarning" style="color: var(--harvest-gold); font-size: 12px; margin-top: 4px;">
            {{ quantityWarning }}
          </div>
        </el-form-item>
        <el-form-item label="配送方式">
          <el-radio-group v-model="deliveryForm.delivery_method">
            <el-radio value="self">自送</el-radio>
            <el-radio value="express">快递</el-radio>
            <el-radio value="pickup">自提</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="deliveryForm.delivery_method === 'express'">
          <el-form-item label="快递公司" required>
            <el-select v-model="deliveryForm.express_company" placeholder="选择快递公司" style="width: 100%">
              <el-option
                v-for="company in expressCompanies"
                :key="company.code"
                :label="company.name"
                :value="company.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="预估重量">
            <el-input-number
              v-model="deliveryForm.weight"
              :min="0.1"
              :step="0.5"
              :precision="1"
              style="width: 100%"
            />
          </el-form-item>
        </template>
        <el-form-item label="备注">
          <el-input
            v-model="deliveryForm.delivery_note"
            type="textarea"
            :rows="2"
            placeholder="配送备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDeliveryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveDelivery">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { supabase } from '@/api/supabase'
import { useOrderStore } from '@/stores/orders'
import PhoneField from '@/components/PhoneField.vue'
import AddressInput from '@/components/AddressInput.vue'
import type { Order, OrderStatus, OrderDelivery, DeliveryStatus, ExpressCompany, DeliveryMethod, PickupStatus } from '@/types'
import {
  fetchExpressCompanies,
  getExpressStatusText,
  getExpressStatusColor,
  getExpressBgColor,
  copyTrackingNumber,
  getTrackingUrl,
  getTrackingNumbers,
  getTrackingUrlFromItem,
  EXPRESS_COMPANY_CODES,
} from '@/api/express'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()

const loading = ref(false)
const order = ref<Order | null>(null)
const editDeliveryDialogVisible = ref(false)
const isAddDelivery = ref(false)
const submitting = ref(false)
const editingDeliveryId = ref('')
const expressCompanies = ref<ExpressCompany[]>([])

const deliveryForm = reactive({
  recipient_name: '',
  recipient_phone: '',
  address: '',
  quantity: 1,
  location: null as { lng: number; lat: number } | null,
  delivery_note: '',
  delivery_method: 'self' as DeliveryMethod,
  express_company: '' as string,
  weight: undefined as number | undefined,
})

const maxQuantity = computed(() => {
  if (!order.value) return 1
  if (isAddDelivery.value) {
    // 添加时，最大数量为当前总数
    return order.value.total_boxes
  }
  // 编辑时，最大数量为当前总数减去其他配送点的数量
  const otherQuantity = order.value.deliveries
    ?.filter(d => d.id !== editingDeliveryId.value)
    .reduce((sum, d) => sum + d.quantity, 0) || 0
  return order.value.total_boxes - otherQuantity + (deliveryForm.quantity || 0)
})

// 数量超出警告
const quantityWarning = computed(() => {
  if (!order.value || isAddDelivery.value) return ''

  // 计算编辑后的总配送数量
  const otherQuantity = order.value.deliveries
    ?.filter(d => d.id !== editingDeliveryId.value)
    .reduce((sum, d) => sum + d.quantity, 0) || 0
  const newTotalQuantity = otherQuantity + deliveryForm.quantity
  const originalTotal = order.value.total_boxes

  if (newTotalQuantity > originalTotal) {
    const extra = newTotalQuantity - originalTotal
    return `注意：保存后订单总箱数将从 ${originalTotal} 箱增加到 ${newTotalQuantity} 箱（+${extra} 箱）`
  }
  return ''
})
// Watch for delivery method changes to clear express fields when switching to self or pickup
watch(() => deliveryForm.delivery_method, (newMethod, oldMethod) => {
  if ((newMethod === 'self' || newMethod === 'pickup') && oldMethod === 'express') {
    // Clear express-related fields when switching from express
    deliveryForm.express_company = ''
    deliveryForm.weight = undefined
  }
})


onMounted(async () => {
  loading.value = true
  try {
    // Fetch express companies for display
    expressCompanies.value = await fetchExpressCompanies()
    order.value = await orderStore.fetchOrder(route.params.id as string)
    if (!order.value) {
      ElMessage.error('订单不存在')
      router.push('/orders')
    }
  } catch (error) {
    ElMessage.error('加载订单失败')
    router.push('/orders')
  } finally {
    loading.value = false
  }
})

function formatDateTime(date: string) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
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
    pending: '#D4A574',      // Gold - needs attention
    confirmed: '#C84B31',    // Tomato red - ready for action
    delivering: '#7D9D6C',   // Sage - in progress, active
    completed: '#5A7D4A',    // Dark sage - success, done
    cancelled: '#CF4B3F',    // Danger red - cancelled
  }
  return map[status] || ''
}

function getStatusBgColor(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: '#FDF6EC',      // Light gold bg
    confirmed: '#FDF0EC',    // Light tomato bg
    delivering: '#E8FAF8',   // Light teal bg
    completed: '#EEF5E9',    // Light sage bg
    cancelled: '#FEF0F0',    // Light red bg
  }
  return map[status] || ''
}

function getStatusText(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: '未确认',
    confirmed: '未完成',
    delivering: '配送中',
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

function getDeliveryStatusColor(status: DeliveryStatus) {
  const map: Record<DeliveryStatus, string> = {
    pending: '#6B5B50',     // Warm gray - waiting
    assigned: '#D4A574',    // Gold - assigned but not started
    delivering: '#7D9D6C',  // Sage - in progress
    delivered: '#5A7D4A',   // Dark sage - completed
  }
  return map[status] || ''
}

function getDeliveryBgColor(status: DeliveryStatus) {
  const map: Record<DeliveryStatus, string> = {
    pending: '#F4F4F5',     // Light gray bg
    assigned: '#FDF6EC',    // Light gold bg
    delivering: '#E8FAF8',  // Light teal bg
    delivered: '#EEF5E9',   // Light sage bg
  }
  return map[status] || ''
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

// Unified delivery display helpers - use express_status for express, pickup_status for pickup, status for self
function getDeliveryDisplayText(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'pickup') {
    return getPickupStatusText(delivery.pickup_status || 'pending')
  }
  if (delivery.delivery_method === 'express') {
    return getExpressStatusText(delivery.express_status || 'pending_pack')
  }
  return getDeliveryStatusText(delivery.status)
}

function getDeliveryDisplayColor(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'pickup') {
    return getPickupStatusColor(delivery.pickup_status || 'pending')
  }
  if (delivery.delivery_method === 'express') {
    return getExpressStatusColor(delivery.express_status || 'pending_pack')
  }
  return getDeliveryStatusColor(delivery.status)
}

function getDeliveryDisplayBgColor(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'pickup') {
    return getPickupBgColor(delivery.pickup_status || 'pending')
  }
  if (delivery.delivery_method === 'express') {
    return getExpressBgColor(delivery.express_status || 'pending_pack')
  }
  return getDeliveryBgColor(delivery.status)
}

function getDeliveryStatusClass(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'pickup') {
    return delivery.pickup_status === 'picked_up' ? 'status-tag--picked_up' : 'status-tag--pending'
  }
  if (delivery.delivery_method === 'express' && delivery.express_status) {
    return 'status-tag--' + delivery.express_status
  }
  return 'status-tag--' + delivery.status
}

function getDeliveryTimelineType(delivery: OrderDelivery): string {
  if (delivery.delivery_method === 'pickup') {
    const map: Record<string, string> = {
      pending: 'warning',
      picked_up: 'success',
    }
    return map[delivery.pickup_status || 'pending'] || 'info'
  }
  if (delivery.delivery_method === 'express' && delivery.express_status) {
    const map: Record<string, string> = {
      pending_pack: 'info',
      pending_label: 'warning',
      pending_dropoff: 'primary',
      in_transit: 'primary',
      delivered: 'success',
      exception: 'danger',
    }
    return map[delivery.express_status] || 'info'
  }
  return getDeliveryStatusType(delivery.status)
}

function isDeliveryCompleted(delivery: OrderDelivery): boolean {
  if (delivery.delivery_method === 'pickup') {
    return delivery.pickup_status === 'picked_up'
  }
  if (delivery.delivery_method === 'express') {
    return delivery.express_status === 'delivered'
  }
  return delivery.status === 'delivered'
}

// Pickup status helpers
function getPickupStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '未自提',
    picked_up: '已自提',
  }
  return map[status] || status
}

function getPickupStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#D4A574',
    picked_up: '#5A7D4A',
  }
  return map[status] || '#6B5B50'
}

function getPickupBgColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#FDF6EC',
    picked_up: '#EEF5E9',
  }
  return map[status] || '#F4F4F5'
}

function getExpressCompanyName(code?: string): string {
  if (!code) return '-'
  const company = expressCompanies.value.find(c => c.code === code)
  return company?.name || code
}

function getExpressCompanyNameByCode(code: string): string {
  if (!code) return '-'
  // First try to find in expressCompanies
  const company = expressCompanies.value.find(c => c.code === code)
  if (company) return company.name

  // If not found, try to map from EXPRESS_COMPANY_CODES
  const name = Object.keys(EXPRESS_COMPANY_CODES).find(key => EXPRESS_COMPANY_CODES[key] === code)
  return name || code
}

function formatShortDate(date: string): string {
  return dayjs(date).format('MM-DD HH:mm')
}

async function handleCopyTracking(trackingNumber: string) {
  const success = await copyTrackingNumber(trackingNumber)
  if (success) {
    ElMessage.success('运单号已复制')
  } else {
    ElMessage.error('复制失败')
  }
}

function goToExpressShipping(delivery: OrderDelivery) {
  router.push(`/deliveries?tab=express&highlight=${delivery.id}`)
}

function getPaymentMethod(method?: string) {
  const map: Record<string, string> = {
    wechat: '微信',
    cash: '现金',
    bank_transfer: '银行转账',
    other: '其他',
  }
  return method ? map[method] || method : '-'
}

async function confirmOrder() {
  try {
    await ElMessageBox.confirm(
      '确认订单后将自动扣减库存，确定继续？',
      '确认订单',
      { type: 'warning' }
    )
    const result = await orderStore.updateOrderStatus(order.value!.id, 'confirmed')
    if (result.success) {
      ElMessage.success('订单已确认')
      order.value = await orderStore.fetchOrder(order.value!.id)
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    // User cancelled - no error message needed
    if (e === 'cancel' || e === 'close') return
    // Actual error
    console.error('Confirm order error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function markPaid() {
  try {
    await ElMessageBox.confirm(
      `确认收款 ¥${order.value?.total_amount || 0}`,
      '确认收款',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
      }
    )
    const result = await orderStore.markAsPaid(order.value!.id, 'wechat')
    if (result.success) {
      ElMessage.success('已确认收款')
      order.value = await orderStore.fetchOrder(order.value!.id)
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Mark paid error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function cancelOrder() {
  try {
    // pending 状态直接删除
    if (order.value?.status === 'pending') {
      await ElMessageBox.confirm(
        '确定要删除此订单吗？删除后无法恢复。',
        '删除订单',
        { type: 'warning' }
      )
      const result = await orderStore.deleteOrder(order.value!.id)
      if (result.success) {
        ElMessage.success('订单已删除')
        router.push('/orders')
      } else {
        ElMessage.error(result.error || '删除失败')
      }
      return
    }

    // 已确认待配送或配送中的订单，取消并回补库存
    const confirmMsg = order.value?.status === 'confirmed'
      ? '订单已确认出库，取消后将自动回补库存，订单状态将恢复为"未确认"，确定继续？'
      : order.value?.status === 'delivering'
        ? '订单正在配送中，取消后将自动回补库存，订单状态将恢复为"未确认"，确定继续？'
        : '确定要取消此订单吗？'

    await ElMessageBox.confirm(confirmMsg, '取消订单', { type: 'warning' })

    const result = await orderStore.cancelOrder(order.value!.id)
    if (result.success) {
      if (result.stockReturned) {
        ElMessage.success('订单已取消，库存已回补，可重新确认')
      } else {
        ElMessage.success('订单已取消')
      }
      order.value = await orderStore.fetchOrder(order.value!.id)
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Cancel order error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function markDelivered(delivery: OrderDelivery) {
  try {
    await ElMessageBox.confirm('确认该配送点已送达？', '确认送达')
    const result = await orderStore.markDeliveryDelivered(delivery.id)
    if (result.success) {
      ElMessage.success('已标记为送达')
      order.value = await orderStore.fetchOrder(order.value!.id)
    } else {
      ElMessage.error('error' in result ? result.error : '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Mark delivered error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

async function markPickedUp(delivery: OrderDelivery) {
  try {
    await ElMessageBox.confirm('确认该自提订单已取走？', '确认自提')
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('order_deliveries')
      .update({
        pickup_status: 'picked_up',
        picked_up_at: now
      })
      .eq('id', delivery.id)

    if (error) throw error

    // Update local state
    delivery.pickup_status = 'picked_up'
    delivery.picked_up_at = now

    // Check if order should be completed via store
    const result = await orderStore.onPickupStatusChanged(delivery.id, 'picked_up')
    if (result.orderCompleted) {
      order.value!.status = 'completed'
      ElMessage.success('订单已完成')
    }

    ElMessage.success('已确认自提')
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Mark picked up error:', e)
    ElMessage.error(e.message || '操作失败')
  }
}

function showEditDeliveryDialog(delivery: OrderDelivery) {
  isAddDelivery.value = false
  editingDeliveryId.value = delivery.id
  Object.assign(deliveryForm, {
    recipient_name: delivery.recipient_name || '',
    recipient_phone: delivery.recipient_phone || '',
    address: delivery.address,
    quantity: delivery.quantity,
    location: delivery.location || null,
    delivery_note: delivery.delivery_note || '',
    delivery_method: delivery.delivery_method || 'self',
    express_company: delivery.express_company || '',
    weight: delivery.weight || undefined,
  })
  editDeliveryDialogVisible.value = true
}

function showAddDeliveryDialog() {
  isAddDelivery.value = true
  editingDeliveryId.value = ''
  Object.assign(deliveryForm, {
    recipient_name: '',
    recipient_phone: '',
    address: '',
    quantity: 1,
    location: null,
    delivery_note: '',
    delivery_method: 'self',
    express_company: '',
    weight: undefined,
  })
  editDeliveryDialogVisible.value = true
}

async function saveDelivery() {
  if (!deliveryForm.address) {
    ElMessage.error('请输入地址')
    return
  }

  // 验证快递配送必须选择快递公司
  if (deliveryForm.delivery_method === 'express' && !deliveryForm.express_company) {
    ElMessage.error('请选择快递公司')
    return
  }

  // 检查配送数量是否超过原订单总箱数
  const otherQuantity = order.value?.deliveries
    ?.filter(d => d.id !== editingDeliveryId.value)
    .reduce((sum, d) => sum + d.quantity, 0) || 0
  const newTotalQuantity = otherQuantity + deliveryForm.quantity
  const originalTotal = order.value?.total_boxes || 0
  const quantityDiff = newTotalQuantity - originalTotal

  // 如果数量超过原订单总箱数，需要确认
  if (quantityDiff > 0) {
    // 如果订单已确认待配送或配送中，需要检查库存
    if (order.value?.status === 'confirmed' || order.value?.status === 'delivering') {
      const { getCurrentStock } = await import('@/api/supabase')
      const currentStock = await getCurrentStock()
      if (currentStock < quantityDiff) {
        ElMessage.error(`库存不足！当前库存 ${currentStock} 箱，需要追加 ${quantityDiff} 箱`)
        return
      }
    }

    try {
      await ElMessageBox.confirm(
        `配送总数量将从 ${originalTotal} 箱增加到 ${newTotalQuantity} 箱。` +
        `\n\n这将同时更新订单总箱数${order.value?.status === 'confirmed' || order.value?.status === 'delivering' ? '，并追加出库 ' + quantityDiff + ' 箱' : ''}。` +
        `\n\n确定继续？`,
        '确认增加数量',
        { type: 'warning' }
      )
    } catch (e: any) {
      if (e === 'cancel' || e === 'close') return // 用户取消
      console.error('Quantity confirm error:', e)
      ElMessage.error(e.message || '操作失败')
      return
    }
  }

  submitting.value = true
  try {
    if (isAddDelivery.value) {
      // Add new delivery
      const result = await orderStore.addDelivery(order.value!.id, {
        recipient_name: deliveryForm.recipient_name || undefined,
        recipient_phone: deliveryForm.recipient_phone || undefined,
        address: deliveryForm.address,
        quantity: deliveryForm.quantity,
        location: deliveryForm.location || undefined,
        delivery_note: deliveryForm.delivery_note || undefined,
        delivery_method: deliveryForm.delivery_method,
        express_company: deliveryForm.express_company || undefined,
        weight: deliveryForm.weight || undefined,
      })
      if (result.success) {
        // 如果数量有变化，更新订单总箱数
        if (quantityDiff !== 0) {
          await orderStore.updateOrder(order.value!.id, {
            total_boxes: newTotalQuantity,
          })
        }
        ElMessage.success('配送地址已添加')
        editDeliveryDialogVisible.value = false
        order.value = await orderStore.fetchOrder(order.value!.id)
      } else {
        ElMessage.error(result.error || '操作失败')
      }
    } else {
      // Update existing delivery
      const result = await orderStore.updateDelivery(editingDeliveryId.value, {
        recipient_name: deliveryForm.recipient_name || undefined,
        recipient_phone: deliveryForm.recipient_phone || undefined,
        address: deliveryForm.address,
        quantity: deliveryForm.quantity,
        location: deliveryForm.location || undefined,
        delivery_note: deliveryForm.delivery_note || undefined,
        delivery_method: deliveryForm.delivery_method,
        express_company: deliveryForm.express_company || undefined,
        weight: deliveryForm.weight || undefined,
      })
      if (result.success) {
        // 如果数量有变化，更新订单总箱数和出库数
        if (quantityDiff !== 0) {
          await orderStore.updateOrder(order.value!.id, {
            total_boxes: newTotalQuantity,
          })

          // 如果订单已确认待配送或配送中，需要调整出库数量
          if ((order.value?.status === 'confirmed' || order.value?.status === 'delivering') && quantityDiff > 0) {
            const { supabase, getCurrentStock } = await import('@/api/supabase')
            const currentStock = await getCurrentStock()
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('stocks').insert({
              type: 'out',
              quantity: quantityDiff,
              balance_after: currentStock - quantityDiff,
              order_id: order.value!.id,
              note: `订单追加出库：+${quantityDiff}箱`,
              created_by: user?.id,
            })
          }
        }
        ElMessage.success('配送地址已更新')
        editDeliveryDialogVisible.value = false
        order.value = await orderStore.fetchOrder(order.value!.id)
      } else {
        ElMessage.error(result.error || '操作失败')
      }
    }
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function deleteDelivery(delivery: OrderDelivery) {
  try {
    await ElMessageBox.confirm(
      `确定要删除此配送地址吗？该地址的 ${delivery.quantity} 箱将从订单中移除。`,
      '删除配送地址',
      { type: 'warning' }
    )
    const result = await orderStore.deleteDelivery(delivery.id)
    if (result.success) {
      ElMessage.success('配送地址已删除')
      order.value = await orderStore.fetchOrder(order.value!.id)
    } else {
      ElMessage.error(result.error || '删除失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Delete delivery error:', e)
    ElMessage.error(e.message || '删除失败')
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.order-number-header {
  font-family: monospace;
  font-size: 18px;
  font-weight: 600;
  color: var(--tomato-red);
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Override global mobile styles - keep horizontal layout */
@media (max-width: 767px) {
  .page-header {
    flex-direction: row;
    align-items: center;
  }

  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}

.delivery-card {
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.delivery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.delivery-title {
  font-weight: 600;
  color: #303133;
}

.delivery-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.method-tag {
  margin-left: 4px;
}

.tracking-number-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tracking-link {
  color: var(--tomato-red);
  text-decoration: none;
}

.tracking-link:hover {
  text-decoration: underline;
}

.delivery-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delivery-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}

.delivery-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-card__header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tracking-numbers-section {
  margin: 8px 0;
}

.tracking-label {
  margin-bottom: 4px;
}

.tracking-numbers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.tracking-number-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tracking-index {
  color: #909399;
  font-size: 12px;
  min-width: 16px;
}

.company-tag {
  margin-left: 4px;
}
</style>
