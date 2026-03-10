import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, getCurrentStock } from '@/api/supabase'
import type { Order, OrderDelivery, OrderStatus } from '@/types'

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const currentOrder = ref<Order | null>(null)

  async function fetchOrders(filters?: {
    status?: OrderStatus
    paid?: boolean
    customerId?: string
  }) {
    loading.value = true
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          deliveries:order_deliveries(*)
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.paid !== undefined) {
        query = query.eq('paid', filters.paid)
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }

      const { data, error } = await query
      if (error) throw error

      orders.value = data || []
      return data
    } catch (error) {
      console.error('Fetch orders error:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(id: string) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          deliveries:order_deliveries(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      currentOrder.value = data
      return data
    } catch (error) {
      console.error('Fetch order error:', error)
      return null
    } finally {
      loading.value = false
    }
  }

  async function createOrder(order: Partial<Order>, deliveries: Partial<OrderDelivery>[]) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: order.customer_id,
          total_boxes: order.total_boxes,
          total_amount: order.total_amount,
          note: order.note,
          created_by: user?.id,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create deliveries - format location for JSONB
      const deliveriesData = deliveries.map(d => ({
        order_id: newOrder.id,
        recipient_name: d.recipient_name || null,
        recipient_phone: d.recipient_phone || null,
        address: d.address,
        quantity: d.quantity,
        location: d.location || null,
      }))

      const { error: deliveriesError } = await supabase
        .from('order_deliveries')
        .insert(deliveriesData)

      if (deliveriesError) throw deliveriesError

      // Fetch complete order with relations
      const completeOrder = await fetchOrder(newOrder.id)
      orders.value.unshift(completeOrder!)

      return { success: true, data: completeOrder }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function updateOrder(id: string, updates: Partial<Order>) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = orders.value.findIndex(o => o.id === id)
      if (index !== -1) {
        orders.value[index] = { ...orders.value[index], ...data }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function updateOrderStatus(id: string, status: OrderStatus) {
    loading.value = true
    try {
      // 如果是确认订单，先检查库存是否充足（给用户友好提示）
      // 实际扣减由数据库触发器完成
      if (status === 'confirmed') {
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('total_boxes')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        const currentStock = await getCurrentStock()

        // 检查库存是否充足，提前给用户友好提示
        if (currentStock < order.total_boxes) {
          return {
            success: false,
            error: `库存不足！当前库存 ${currentStock} 箱，本订单需要 ${order.total_boxes} 箱`
          }
        }
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = orders.value.findIndex(o => o.id === id)
      if (index !== -1) {
        orders.value[index] = { ...orders.value[index], ...data }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function markAsPaid(id: string, paymentMethod?: string) {
    return updateOrder(id, {
      paid: true,
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod as any,
    })
  }

  async function cancelOrder(id: string) {
    loading.value = true
    try {
      // 获取订单详情
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // 如果订单已确认或配送中，需要回补库存
      if (order.status === 'confirmed' || order.status === 'delivering') {
        // 检查是否已经有该订单的回补记录（防止重复回补）
        const { data: existingReturn, error: checkError } = await supabase
          .from('stocks')
          .select('id')
          .eq('order_id', id)
          .eq('type', 'in')
          .ilike('note', '%取消回补%')

        if (checkError) throw checkError

        if (!existingReturn || existingReturn.length === 0) {
          const { data: { user } } = await supabase.auth.getUser()
          const currentStock = await getCurrentStock()

          // 添加入库记录（回补库存）
          const { error: stockError } = await supabase
            .from('stocks')
            .insert({
              type: 'in',
              quantity: order.total_boxes,
              balance_after: currentStock + order.total_boxes,
              order_id: id,
              note: `订单取消回补：${order.total_boxes}箱`,
              created_by: user?.id,
            })

          if (stockError) throw stockError
        }
      }

      // 重置订单状态为 pending，保留订单记录
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // 重置配送状态为 pending
      await supabase
        .from('order_deliveries')
        .update({ status: 'pending', delivery_task_id: null, sequence_in_route: null })
        .eq('order_id', id)

      const index = orders.value.findIndex(o => o.id === id)
      if (index !== -1) {
        orders.value[index] = { ...orders.value[index], ...data }
      }

      return { success: true, data, stockReturned: order.status === 'confirmed' || order.status === 'delivering' }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function deleteOrder(id: string) {
    loading.value = true
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)

      if (error) throw error

      orders.value = orders.value.filter(o => o.id !== id)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  // Delivery operations
  async function updateDelivery(deliveryId: string, updates: Partial<OrderDelivery>) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('order_deliveries')
        .update(updates)
        .eq('id', deliveryId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function markDeliveryDelivered(deliveryId: string) {
    return updateDelivery(deliveryId, {
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    })
  }

  async function addDelivery(orderId: string, delivery: Partial<OrderDelivery>) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('order_deliveries')
        .insert({
          order_id: orderId,
          recipient_name: delivery.recipient_name || undefined,
          recipient_phone: delivery.recipient_phone || undefined,
          address: delivery.address,
          quantity: delivery.quantity,
          location: delivery.location || undefined,
          delivery_note: delivery.delivery_note || undefined,
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function deleteDelivery(deliveryId: string) {
    loading.value = true
    try {
      const { error } = await supabase
        .from('order_deliveries')
        .delete()
        .eq('id', deliveryId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    loading,
    currentOrder,
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrder,
    updateOrderStatus,
    markAsPaid,
    cancelOrder,
    deleteOrder,
    updateDelivery,
    markDeliveryDelivered,
    addDelivery,
    deleteDelivery,
  }
})
