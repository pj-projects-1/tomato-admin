import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, getCurrentStock } from '@/api/supabase'
import type { Order, Stock, OrderStatus } from '@/types'

export interface SalesStats {
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
}

export interface OrderStats {
  total: number
  pending: number
  confirmed: number
  delivering: number
  completed: number
  cancelled: number
}

export interface PeriodStats {
  today: SalesStats
  thisWeek: SalesStats
  thisMonth: SalesStats
}

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)
  const loadingStats = ref(false)
  const loadingOrders = ref(false)
  const loadingStocks = ref(false)

  const lastFetchTime = ref(0)
  const CACHE_TTL = 30000

  const periodStats = ref<PeriodStats>({
    today: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 },
    thisWeek: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 },
    thisMonth: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 },
  })

  const orderStats = ref<OrderStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    delivering: 0,
    completed: 0,
    cancelled: 0,
  })

  const currentStock = ref(0)
  const pendingDeliveries = ref(0)
  const unpaidOrders = ref(0)
  const recentOrders = ref<Order[]>([])
  const recentStocks = ref<Stock[]>([])

  // Actionable alerts - use inline types matching the query shapes
  // Note: Supabase returns single objects for many-to-one relations
  interface TodayDeliveryAlert {
    id: string
    recipient_name?: string
    quantity: number
    address: string
    status: string
    delivery_method: string
    order: {
      id: string
      order_number?: string
      customer: { name: string }
    }
  }

  interface PendingExpressAlert {
    id: string
    recipient_name?: string
    quantity: number
    express_company?: string
    express_status?: string
    order: {
      id: string
      order_number?: string
      customer: { name: string }
    }
  }

  interface PendingConfirmationAlert {
    id: string
    order_number?: string
    total_boxes?: number
    total_amount?: number
    created_at: string
    customer: Array<{ name: string }>
  }

  interface PendingPickupAlert {
    id: string
    quantity: number
    pickup_status?: string
    order: {
      id: string
      order_number?: string
      customer: { name: string }
    }
  }

  const todayDeliveries = ref<TodayDeliveryAlert[]>([])
  const pendingExpressDeliveries = ref<PendingExpressAlert[]>([])
  const pendingConfirmationOrders = ref<PendingConfirmationAlert[]>([])
  const pendingPickups = ref<PendingPickupAlert[]>([])
  const loadingAlerts = ref(false)

  let hiddenAt = 0

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenAt > 0) {
        if (Date.now() - hiddenAt > CACHE_TTL) {
          lastFetchTime.value = 0
        }
        hiddenAt = 0
      }
    })
  }

  function getDateRanges() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return { today, weekStart, monthStart }
  }

  type OrderForStats = {
    id: string
    created_at: string
    total_amount: number | null
    paid: boolean
    status: OrderStatus
  }

  function calculateStatsFromOrders(orders: OrderForStats[], startDate: Date): SalesStats {
    const filtered = orders.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= startDate && o.status !== 'cancelled'
    })

    return filtered.reduce((acc, o) => ({
      totalAmount: acc.totalAmount + (o.total_amount || 0),
      paidAmount: acc.paidAmount + (o.paid ? (o.total_amount || 0) : 0),
      unpaidAmount: acc.unpaidAmount + (!o.paid ? (o.total_amount || 0) : 0),
    }), { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 })
  }

  async function fetchAllOrderStats() {
    const { today, weekStart, monthStart } = getDateRanges()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, total_boxes, total_amount, paid, status, created_at, updated_at, customer:customers(name)')
      .gte('created_at', monthStart.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Fetch order stats error:', error)
      }
      return
    }

    const typedOrders = (orders || []) as OrderForStats[]

    periodStats.value = {
      today: calculateStatsFromOrders(typedOrders, today),
      thisWeek: calculateStatsFromOrders(typedOrders, weekStart),
      thisMonth: calculateStatsFromOrders(typedOrders, monthStart),
    }

    const stats: OrderStats = {
      total: orders?.length || 0,
      pending: 0,
      confirmed: 0,
      delivering: 0,
      completed: 0,
      cancelled: 0,
    }

    let unpaidCount = 0

    orders?.forEach(o => {
      if (o.status in stats) {
        stats[o.status as OrderStatus]++
      }
      if (!o.paid && o.status !== 'cancelled') {
        unpaidCount++
      }
    })

    orderStats.value = stats
    unpaidOrders.value = unpaidCount
    // Supabase returns single object for many-to-one relations at runtime, but types show arrays
    // Cast to unknown first, then to our expected type
    recentOrders.value = ((orders || []) as unknown as Array<{
      id: string
      order_number?: string
      customer_id: string
      total_boxes: number
      total_amount: number
      paid: boolean
      status: OrderStatus
      created_at: string
      updated_at: string
      customer: { name: string }
    }>).slice(0, 5).map(o => ({
      id: o.id,
      order_number: o.order_number,
      customer_id: o.customer_id,
      total_boxes: o.total_boxes,
      total_amount: o.total_amount,
      paid: o.paid,
      status: o.status,
      created_at: o.created_at,
      updated_at: o.updated_at,
      customer: o.customer,
    })) as Order[]
  }

  async function fetchPendingDeliveriesCount() {
    // Count pending deliveries separately for self and express
    // Self: status in ('pending', 'assigned') AND delivery_method = 'self'
    // Express: express_status not 'delivered' AND delivery_method = 'express'

    // First get self deliveries count
    const { count: selfCount, error: selfError } = await supabase
      .from('order_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_method', 'self')
      .in('status', ['pending', 'assigned'])

    if (selfError) {
      if (import.meta.env.DEV) {
        console.error('Fetch pending self deliveries error:', selfError)
      }
      return
    }

    // Then get express deliveries count (not delivered yet)
    const { count: expressCount, error: expressError } = await supabase
      .from('order_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_method', 'express')
      .not('express_status', 'eq', 'delivered')

    if (expressError) {
      if (import.meta.env.DEV) {
        console.error('Fetch pending express deliveries error:', expressError)
      }
      return
    }

    pendingDeliveries.value = (selfCount || 0) + (expressCount || 0)
  }

  async function fetchTodayDeliveries() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    // Get delivery tasks created today that are in progress or planning
    const { data: tasks, error: taskError } = await supabase
      .from('delivery_tasks')
      .select('id')
      .gte('created_at', todayStr)
      .in('status', ['planning', 'in_progress'])

    if (taskError) {
      if (import.meta.env.DEV) console.error('Fetch today tasks error:', taskError)
      todayDeliveries.value = []
      return
    }

    if (!tasks || tasks.length === 0) {
      todayDeliveries.value = []
      return
    }

    const taskIds = tasks.map(t => t.id)

    // Get deliveries assigned to today's tasks
    const { data: deliveries, error: deliveryError } = await supabase
      .from('order_deliveries')
      .select(`
        id,
        recipient_name,
        quantity,
        address,
        status,
        delivery_method,
        order:orders(
          id,
          order_number,
          customer:customers(name)
        )
      `)
      .in('delivery_task_id', taskIds)
      .order('sequence_in_route', { ascending: true })

    if (deliveryError) {
      if (import.meta.env.DEV) console.error('Fetch today deliveries error:', deliveryError)
      todayDeliveries.value = []
      return
    }

    // Cast to fix Supabase type mismatch - at runtime, many-to-one relations return single objects
    todayDeliveries.value = (deliveries as unknown as TodayDeliveryAlert[]) || []
  }

  async function fetchPendingExpressDeliveries() {
    // Get express deliveries that are packed but not yet shipped
    const { data: deliveries, error } = await supabase
      .from('order_deliveries')
      .select(`
        id,
        recipient_name,
        quantity,
        express_company,
        express_status,
        order:orders(
          id,
          order_number,
          customer:customers(name)
        )
      `)
      .eq('delivery_method', 'express')
      .in('express_status', ['pending_pack', 'pending_label', 'pending_dropoff'])
      .order('created_at', { ascending: true })

    if (error) {
      if (import.meta.env.DEV) console.error('Fetch pending express error:', error)
      pendingExpressDeliveries.value = []
      return
    }

    // Cast to fix Supabase type mismatch - at runtime, many-to-one relations return single objects
    pendingExpressDeliveries.value = (deliveries as unknown as PendingExpressAlert[]) || []
  }

  async function fetchPendingConfirmationOrders() {
    // Get orders pending confirmation for more than 24 hours
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_boxes,
        total_amount,
        created_at,
        customer:customers(name)
      `)
      .eq('status', 'pending')
      .lt('created_at', yesterday.toISOString())
      .order('created_at', { ascending: true })
      .limit(5)

    if (error) {
      if (import.meta.env.DEV) console.error('Fetch pending confirmation error:', error)
      pendingConfirmationOrders.value = []
      return
    }

    pendingConfirmationOrders.value = orders || []
  }

  async function fetchPendingPickups() {
    const { data: deliveries, error } = await supabase
      .from('order_deliveries')
      .select(`
        id,
        quantity,
        pickup_status,
        order:orders(
          id,
          order_number,
          customer:customers(name)
        )
      `)
      .eq('delivery_method', 'pickup')
      .eq('pickup_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (error) {
      if (import.meta.env.DEV) console.error('Fetch pending pickups error:', error)
      pendingPickups.value = []
      return
    }

    pendingPickups.value = (deliveries as unknown as PendingPickupAlert[]) || []
  }

  async function fetchAllAlerts() {
    loadingAlerts.value = true
    try {
      await Promise.all([
        fetchTodayDeliveries(),
        fetchPendingExpressDeliveries(),
        fetchPendingConfirmationOrders(),
        fetchPendingPickups(),
      ])
    } finally {
      loadingAlerts.value = false
    }
  }

  async function fetchRecentStocks(limit = 5) {
    const { data, error } = await supabase
      .from('stocks')
      .select(`
        *,
        order:orders(id, total_boxes)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Fetch recent stocks error:', error)
      }
      return []
    }

    recentStocks.value = data || []
    return data
  }

  async function refreshAll(force = false) {
    const now = Date.now()
    if (!force && now - lastFetchTime.value < CACHE_TTL) {
      return
    }

    loading.value = true
    loadingStats.value = true
    loadingOrders.value = true

    try {
      await Promise.all([
        fetchAllOrderStats(),
        fetchPendingDeliveriesCount(),
        fetchAllAlerts(),
      ])
      currentStock.value = await getCurrentStock()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Fetch stats error:', error)
      }
    } finally {
      loadingStats.value = false
      loadingOrders.value = false
    }

    loadingStocks.value = true
    try {
      await fetchRecentStocks()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Fetch recent stocks error:', error)
      }
    } finally {
      loadingStocks.value = false
    }

    lastFetchTime.value = now
    loading.value = false
  }

  return {
    loading,
    loadingStats,
    loadingOrders,
    loadingStocks,
    periodStats,
    orderStats,
    currentStock,
    pendingDeliveries,
    unpaidOrders,
    recentOrders,
    recentStocks,
    todayDeliveries,
    pendingExpressDeliveries,
    pendingConfirmationOrders,
    pendingPickups,
    loadingAlerts,
    refreshAll,
    fetchAllAlerts,
  }
})
