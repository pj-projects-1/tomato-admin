import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, getCurrentStock } from '@/api/supabase'
import type { Order, OrderDelivery, OrderStatus, ExpressStatus } from '@/types'

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const currentOrder = ref<Order | null>(null)

  async function fetchOrders(filters?: {
    status?: OrderStatus
    paid?: boolean
    customerId?: string
    startDate?: string
    endDate?: string
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
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters?.endDate) {
        // Add one day to include the end date fully
        const endDate = new Date(filters.endDate)
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('created_at', endDate.toISOString().split('T')[0])
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
        delivery_method: d.delivery_method || 'self',
        express_company: d.express_company || null,
        weight: d.weight || null,
        express_status: d.delivery_method === 'express' ? 'pending_pack' : null,
        pickup_status: d.delivery_method === 'pickup' ? 'pending' : null,
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
        // Fetch stock and order data in parallel for better performance
        const [stockResult, orderResult] = await Promise.all([
          getCurrentStock(),
          supabase.from('orders').select('total_boxes').eq('id', id).single()
        ])

        if (orderResult.error) throw orderResult.error

        const currentStock = stockResult
        const order = orderResult.data

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

      // 如果订单已确认待配送或配送中，需要回补库存
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
      // Transform updates based on delivery_method
      const transformedUpdates: Partial<OrderDelivery> = { ...updates }

      if (updates.delivery_method !== undefined) {
        const deliveryMethod = updates.delivery_method

        if (deliveryMethod === 'express') {
          // Express: set express_status to pending_pack if not already set
          transformedUpdates.express_company = updates.express_company || undefined
          transformedUpdates.weight = updates.weight || undefined
          if (!updates.express_status) {
            transformedUpdates.express_status = 'pending_pack'
          }
        } else {
          // Self delivery: clear express-related fields
          transformedUpdates.express_company = undefined
          transformedUpdates.weight = undefined
          transformedUpdates.express_status = undefined
          transformedUpdates.status = 'pending'
        }
      }

      const { data, error } = await supabase
        .from('order_deliveries')
        .update(transformedUpdates)
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
    loading.value = true
    try {
      // Get delivery info first
      const { data: delivery, error: fetchError } = await supabase
        .from('order_deliveries')
        .select('order_id')
        .eq('id', deliveryId)
        .single()

      if (fetchError) throw fetchError

      // Update delivery status
      const result = await updateDelivery(deliveryId, {
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })

      if (!result.success) {
        return result
      }

      // Check if all deliveries for this order are delivered
      // Uses checkAndUpdateOrderCompletion which properly handles both self and express deliveries
      if (delivery?.order_id) {
        await checkAndUpdateOrderCompletion(delivery.order_id)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function addDelivery(orderId: string, delivery: Partial<OrderDelivery>) {
    loading.value = true
    try {
      const deliveryMethod = delivery.delivery_method || 'self'
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
          delivery_method: deliveryMethod,
          express_company: deliveryMethod === 'express' ? delivery.express_company || null : null,
          weight: deliveryMethod === 'express' ? delivery.weight || null : null,
          express_status: deliveryMethod === 'express' ? 'pending_pack' : null,
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

  /**
   * Check if all deliveries for an order are delivered and update order status
   * For self deliveries: check 'status' field
   * For express deliveries: check 'express_status' field
   * For pickup deliveries: check 'pickup_status' field
   */
  async function checkAndUpdateOrderCompletion(orderId: string): Promise<{ completed: boolean; error?: string }> {
    try {
      // Fetch all deliveries for this order
      const { data: deliveries, error: fetchError } = await supabase
        .from('order_deliveries')
        .select('id, delivery_method, status, express_status, pickup_status')
        .eq('order_id', orderId)

      if (fetchError) throw fetchError

      if (!deliveries || deliveries.length === 0) {
        return { completed: false }
      }

      // Check if all deliveries are delivered
      const allDelivered = deliveries.every(d => {
        if (d.delivery_method === 'pickup') {
          // Pickup: check pickup_status
          return d.pickup_status === 'picked_up'
        }
        if (d.delivery_method === 'express') {
          // Express: check express_status
          return d.express_status === 'delivered'
        }
        // Self delivery: check status
        return d.status === 'delivered'
      })

      if (allDelivered) {
        // Update order status to completed
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', orderId)

        if (updateError) throw updateError

        // Update local state
        const index = orders.value.findIndex(o => o.id === orderId)
        if (index !== -1 && orders.value[index]) {
          orders.value[index] = { ...orders.value[index], status: 'completed' } as Order
        }

        return { completed: true }
      }

      return { completed: false }
    } catch (error) {
      console.error('Check order completion error:', error)
      return { completed: false, error: (error as Error).message }
    }
  }

  /**
   * Called when express status changes in Deliveries.vue
   * If status is 'delivered', check if order should be marked complete
   */
  async function onExpressStatusChanged(
    deliveryId: string,
    newStatus: ExpressStatus
  ): Promise<{ success: boolean; orderCompleted?: boolean; error?: string }> {
    try {
      // If not delivered, nothing to do for order completion
      if (newStatus !== 'delivered') {
        return { success: true, orderCompleted: false }
      }

      // Get the order_id for this delivery
      const { data: delivery, error: fetchError } = await supabase
        .from('order_deliveries')
        .select('order_id')
        .eq('id', deliveryId)
        .single()

      if (fetchError) throw fetchError

      if (!delivery?.order_id) {
        return { success: false, error: 'Delivery not found' }
      }

      // Check if order should be marked complete
      const result = await checkAndUpdateOrderCompletion(delivery.order_id)

      return { success: true, orderCompleted: result.completed }
    } catch (error) {
      console.error('On express status changed error:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Called when pickup status changes in Deliveries.vue or OrderDetail.vue
   * If status is 'picked_up', check if order should be marked complete
   */
  async function onPickupStatusChanged(
    deliveryId: string,
    newStatus: string
  ): Promise<{ success: boolean; orderCompleted?: boolean; error?: string }> {
    try {
      // If not picked_up, nothing to do for order completion
      if (newStatus !== 'picked_up') {
        return { success: true, orderCompleted: false }
      }

      // Get the order_id for this delivery
      const { data: delivery, error: fetchError } = await supabase
        .from('order_deliveries')
        .select('order_id')
        .eq('id', deliveryId)
        .single()

      if (fetchError) throw fetchError

      if (!delivery?.order_id) {
        return { success: false, error: 'Delivery not found' }
      }

      // Check if order should be marked complete
      const result = await checkAndUpdateOrderCompletion(delivery.order_id)

      return { success: true, orderCompleted: result.completed }
    } catch (error) {
      console.error('On pickup status changed error:', error)
      return { success: false, error: (error as Error).message }
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
    checkAndUpdateOrderCompletion,
    onExpressStatusChanged,
    onPickupStatusChanged,
  }
})
