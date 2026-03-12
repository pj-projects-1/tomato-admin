import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, getCurrentStock } from '@/api/supabase'
import type { Order, Stock, OrderStatus } from '@/types'

export interface SalesStats {
  totalAmount: number      // 总销售额
  paidAmount: number       // 已付款金额（实际收益）
  unpaidAmount: number     // 未付款金额
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

  // Individual loading states for granular UX
  const loadingStats = ref(false)
  const loadingOrders = ref(false)
  const loadingStocks = ref(false)

  // Cache timestamp to avoid redundant API calls
  const lastFetchTime = ref(0)
  const CACHE_TTL = 30000 // 30 seconds cache

  // 销售数据
  const periodStats = ref<PeriodStats>({
    today: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 },
    thisWeek: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 },
    thisMonth: { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 },
  })

  // 订单统计
  const orderStats = ref<OrderStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    delivering: 0,
    completed: 0,
    cancelled: 0,
  })

  // 库存
  const currentStock = ref(0)

  // 待处理事项
  const pendingDeliveries = ref(0)
  const unpaidOrders = ref(0)

  // 近期数据
  const recentOrders = ref<Order[]>([])
  const recentStocks = ref<Stock[]>([])

  // Track when app was hidden for mobile cache invalidation
  let hiddenAt = 0

  // Set up visibility listener for mobile app resume
  // This ensures fresh data when user returns after backgrounding the app
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenAt > 0) {
        // If app was hidden longer than cache TTL, invalidate cache
        if (Date.now() - hiddenAt > CACHE_TTL) {
          lastFetchTime.value = 0
        }
        hiddenAt = 0
      }
    })
  }

  // 获取时间范围
  function getDateRanges() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 本周开始（周一）
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

    // 本月开始
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return { today, weekStart, monthStart }
  }

  // Calculate stats from a single dataset (client-side aggregation)
  function calculateStatsFromOrders(orders: any[], startDate: Date): SalesStats {
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

  // Consolidated fetch: Get all orders with needed fields, calculate stats locally
  // This reduces 3 sales queries + 1 status query + 1 unpaid query = 5 queries down to 1
  async function fetchAllOrderStats() {
    const { today, weekStart, monthStart } = getDateRanges()

    // Single query: fetch orders from this month with essential fields
    // We need month's worth of data for all period calculations
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, customer_id, total_boxes, total_amount, paid, status, created_at, updated_at, customer:customers(name)')
      .gte('created_at', monthStart.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch order stats error:', error)
      return
    }

    // Calculate sales stats for each period (client-side)
    periodStats.value = {
      today: calculateStatsFromOrders(orders || [], today),
      thisWeek: calculateStatsFromOrders(orders || [], weekStart),
      thisMonth: calculateStatsFromOrders(orders || [], monthStart),
    }

    // Calculate order status stats
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
      // Count unpaid (excluding cancelled)
      if (!o.paid && o.status !== 'cancelled') {
        unpaidCount++
      }
    })

    orderStats.value = stats
    unpaidOrders.value = unpaidCount

    // Use the same data for recent orders (already sorted by created_at desc)
    // Cast via unknown since Supabase returns partial nested objects
    recentOrders.value = (orders || []).slice(0, 5) as unknown as Order[]
  }

  // 获取待处理事项 (separate table, needs own query)
  async function fetchPendingDeliveries() {
    const { count, error } = await supabase
      .from('order_deliveries')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'assigned'])

    if (error) {
      console.error('Fetch pending deliveries error:', error)
      return
    }

    pendingDeliveries.value = count || 0
  }

  // 获取近期库存流水
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
      console.error('Fetch recent stocks error:', error)
      return []
    }

    recentStocks.value = data || []
    return data
  }

  // 刷新所有数据
  async function refreshAll(force = false) {
    // Check cache to avoid redundant API calls
    const now = Date.now()
    if (!force && now - lastFetchTime.value < CACHE_TTL) {
      return // Cache is still fresh, skip refresh
    }

    loading.value = true

    // Fetch stats section (top cards + charts)
    // Reduced from 5 queries to 2 queries:
    // - fetchAllOrderStats: 1 query (replaces 3 sales + 1 status + 1 unpaid + recent orders)
    // - fetchPendingDeliveries: 1 query (separate table)
    loadingStats.value = true
    loadingOrders.value = true // Combined with stats now
    try {
      await Promise.all([
        fetchAllOrderStats(),
        fetchPendingDeliveries(),
      ])
      currentStock.value = await getCurrentStock()
    } catch (error) {
      console.error('Fetch stats error:', error)
    } finally {
      loadingStats.value = false
      loadingOrders.value = false
    }

    // Fetch recent stocks (independent)
    loadingStocks.value = true
    try {
      await fetchRecentStocks()
    } catch (error) {
      console.error('Fetch recent stocks error:', error)
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
