<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <el-button @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
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
            <el-tag :type="getStatusType(order.status)" style="margin-left: 8px;">
              {{ getStatusText(order.status) }}
            </el-tag>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单编号">{{ order.id.slice(0, 8) }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(order.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ order.customer?.name }}</el-descriptions-item>
            <el-descriptions-item label="微信">{{ order.customer?.wechat || '-' }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ order.customer?.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="总箱数">{{ order.total_boxes }} 箱</el-descriptions-item>
            <el-descriptions-item label="金额">
              <span style="font-size: 18px; color: #f56c6c;">¥{{ order.total_amount || 0 }}</span>
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
              :type="getDeliveryStatusType(delivery.status)"
              :hollow="delivery.status !== 'delivered'"
            >
              <div class="delivery-card">
                <div class="delivery-header">
                  <span class="delivery-title">配送点 {{ index + 1 }}</span>
                  <div class="delivery-header-actions">
                    <el-tag :type="getDeliveryStatusType(delivery.status)" size="small">
                      {{ getDeliveryStatusText(delivery.status) }}
                    </el-tag>
                    <el-button
                      v-if="delivery.status !== 'delivered'"
                      text
                      type="primary"
                      size="small"
                      @click="showEditDeliveryDialog(delivery)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="delivery.status !== 'delivered' && order.deliveries && order.deliveries.length > 1"
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
                  <p><strong>收货人：</strong>{{ delivery.recipient_name || order.customer?.name }}</p>
                  <p><strong>电话：</strong>{{ delivery.recipient_phone || order.customer?.phone || '-' }}</p>
                  <p><strong>地址：</strong>{{ delivery.address }}</p>
                  <p><strong>数量：</strong>{{ delivery.quantity }} 箱</p>
                  <p v-if="delivery.delivery_note"><strong>备注：</strong>{{ delivery.delivery_note }}</p>
                </div>
                <div v-if="delivery.status !== 'delivered'" class="delivery-actions">
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
        <el-form-item label="数量" required>
          <el-input-number
            v-model="deliveryForm.quantity"
            :min="1"
            style="width: 100%"
          />
          <div v-if="quantityWarning" style="color: #e6a23c; font-size: 12px; margin-top: 4px;">
            {{ quantityWarning }}
          </div>
        </el-form-item>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useOrderStore } from '@/stores/orders'
import AddressInput from '@/components/AddressInput.vue'
import type { Order, OrderStatus, OrderDelivery, DeliveryStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()

const loading = ref(false)
const order = ref<Order | null>(null)
const editDeliveryDialogVisible = ref(false)
const isAddDelivery = ref(false)
const submitting = ref(false)
const editingDeliveryId = ref('')

const deliveryForm = reactive({
  recipient_name: '',
  recipient_phone: '',
  address: '',
  quantity: 1,
  location: null as { lng: number; lat: number } | null,
  delivery_note: '',
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

onMounted(async () => {
  loading.value = true
  try {
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

function getStatusText(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: '待确认',
    confirmed: '已确认',
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

function getDeliveryStatusText(status: DeliveryStatus) {
  const map: Record<DeliveryStatus, string> = {
    pending: '待配送',
    assigned: '已分配',
    delivering: '配送中',
    delivered: '已送达',
  }
  return map[status] || status
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

    // 已确认或配送中的订单，取消并回补库存
    const confirmMsg = order.value?.status === 'confirmed'
      ? '订单已确认出库，取消后将自动回补库存，订单状态将恢复为"待确认"，确定继续？'
      : order.value?.status === 'delivering'
        ? '订单正在配送中，取消后将自动回补库存，订单状态将恢复为"待确认"，确定继续？'
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
      ElMessage.error(result.error || '操作失败')
    }
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    console.error('Mark delivered error:', e)
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
  })
  editDeliveryDialogVisible.value = true
}

async function saveDelivery() {
  if (!deliveryForm.address) {
    ElMessage.error('请输入地址')
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
    // 如果订单已确认或配送中，需要检查库存
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
      })
      if (result.success) {
        // 如果数量有变化，更新订单总箱数和出库数
        if (quantityDiff !== 0) {
          await orderStore.updateOrder(order.value!.id, {
            total_boxes: newTotalQuantity,
          })

          // 如果订单已确认或配送中，需要调整出库数量
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
}

.header-actions {
  display: flex;
  gap: 8px;
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
</style>
