import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/api/supabase'
import type { DeliveryTask, OrderDelivery, OptimizedRoute } from '@/types'

export const useDeliveryStore = defineStore('deliveries', () => {
  const deliveryTasks = ref<DeliveryTask[]>([])
  const pendingDeliveries = ref<OrderDelivery[]>([])
  const currentTask = ref<DeliveryTask | null>(null)
  const loading = ref(false)

  async function fetchDeliveryTasks() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('delivery_tasks')
        .select(`
          *,
          deliveries:order_deliveries(
            *,
            order:orders(
              *,
              customer:customers(*)
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      deliveryTasks.value = data || []
      return data
    } catch (error) {
      console.error('Fetch delivery tasks error:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchPendingDeliveries() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('order_deliveries')
        .select(`
          *,
          order:orders(
            *,
            customer:customers(*)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error

      pendingDeliveries.value = data || []
      return data
    } catch (error) {
      console.error('Fetch pending deliveries error:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchDeliveryTask(id: string) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('delivery_tasks')
        .select(`
          *,
          deliveries:order_deliveries(
            *,
            order:orders(
              *,
              customer:customers(*)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      currentTask.value = data
      return data
    } catch (error) {
      console.error('Fetch delivery task error:', error)
      return null
    } finally {
      loading.value = false
    }
  }

  async function startDeliveryTask(id: string) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('delivery_tasks')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = deliveryTasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        deliveryTasks.value[index] = data
      }

      // Update related orders to 'delivering'
      await supabase
        .from('order_deliveries')
        .update({ status: 'delivering' })
        .eq('delivery_task_id', id)

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function completeDeliveryTask(id: string) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('delivery_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = deliveryTasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        deliveryTasks.value[index] = data
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function cancelDeliveryTask(id: string) {
    loading.value = true
    try {
      // Get all deliveries in this task
      const { data: deliveries, error: fetchError } = await supabase
        .from('order_deliveries')
        .select('order_id')
        .eq('delivery_task_id', id)

      if (fetchError) throw fetchError

      // Get unique order IDs
      const orderIds = [...new Set(deliveries?.map(d => d.order_id) || [])]

      // Update deliveries back to pending
      const { error: updateDeliveriesError } = await supabase
        .from('order_deliveries')
        .update({
          delivery_task_id: null,
          status: 'pending',
          sequence_in_route: null,
        })
        .eq('delivery_task_id', id)

      if (updateDeliveriesError) throw updateDeliveriesError

      // Update orders back to confirmed status
      for (const orderId of orderIds) {
        await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', orderId)
      }

      // Cancel the task
      const { data, error } = await supabase
        .from('delivery_tasks')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = deliveryTasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        deliveryTasks.value[index] = data
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function updateTaskRoute(id: string, routeOrder: number[], optimizedRoute: OptimizedRoute) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('delivery_tasks')
        .update({
          route_order: routeOrder,
          optimized_route: optimizedRoute,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = deliveryTasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        deliveryTasks.value[index] = data
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function deleteDeliveryTask(id: string) {
    loading.value = true
    try {
      // Unassign deliveries first
      await supabase
        .from('order_deliveries')
        .update({
          delivery_task_id: null,
          status: 'pending',
          sequence_in_route: null,
        })
        .eq('delivery_task_id', id)

      const { error } = await supabase
        .from('delivery_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      deliveryTasks.value = deliveryTasks.value.filter(t => t.id !== id)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function markDeliveryDelivered(deliveryId: string) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('order_deliveries')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
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

  type LocationData = { lng: number; lat: number; address: string }

  async function createDeliveryTask(
    name: string | undefined,
    deliveryIds: string[],
    optimizedRoute?: OptimizedRoute,
    departure?: LocationData,
    destination?: LocationData
  ) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const totalDistance = optimizedRoute?.distance ? optimizedRoute.distance / 1000 : null
      const estimatedDuration = optimizedRoute?.duration ? Math.round(optimizedRoute.duration / 60) : null

      const { data, error } = await supabase
        .from('delivery_tasks')
        .insert({
          name,
          route_order: deliveryIds.map((_, i) => i),
          optimized_route: optimizedRoute,
          total_distance: totalDistance,
          estimated_duration: estimatedDuration,
          departure_location: departure,
          destination_location: destination,
          status: 'planning',
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Assign deliveries to this task with sequence
      for (let i = 0; i < deliveryIds.length; i++) {
        await supabase
          .from('order_deliveries')
          .update({
            delivery_task_id: data.id,
            status: 'assigned',
            sequence_in_route: i,
          })
          .eq('id', deliveryIds[i])
      }

      deliveryTasks.value.unshift(data)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  return {
    deliveryTasks,
    pendingDeliveries,
    currentTask,
    loading,
    fetchDeliveryTasks,
    fetchPendingDeliveries,
    fetchDeliveryTask,
    createDeliveryTask,
    startDeliveryTask,
    completeDeliveryTask,
    cancelDeliveryTask,
    updateTaskRoute,
    deleteDeliveryTask,
    markDeliveryDelivered,
  }
})
