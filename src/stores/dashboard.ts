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
      .select('id, customer_id, total_boxes, total_amount, paid, status, created_at, updated_at, customer:customers(name)')
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
    recentOrders.value = (orders || []).slice(0, 5) as unknown as Order[]
  }

  async function fetchPendingDeliveriesCount() {
    const { count, error } = await supabase
      .from('order_deliveries')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'assigned'])

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Fetch pending deliveries error:', error)
      }
      return
    }

    pendingDeliveries.value = count || 0
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
    refreshAll,
  }
})
