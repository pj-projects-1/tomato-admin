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

  // 获取销售统计
  async function fetchSalesStats() {
    try {
      const { today, weekStart, monthStart } = getDateRanges()

      // 今日销售
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount, paid')
        .gte('created_at', today.toISOString())
        .neq('status', 'cancelled')

      // 本周销售
      const { data: weekOrders } = await supabase
        .from('orders')
        .select('total_amount, paid')
        .gte('created_at', weekStart.toISOString())
        .neq('status', 'cancelled')

      // 本月销售
      const { data: monthOrders } = await supabase
        .from('orders')
        .select('total_amount, paid')
        .gte('created_at', monthStart.toISOString())
        .neq('status', 'cancelled')

      const calcStats = (orders: any[] | null): SalesStats => {
        if (!orders) return { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 }
        return orders.reduce((acc, o) => ({
          totalAmount: acc.totalAmount + (o.total_amount || 0),
          paidAmount: acc.paidAmount + (o.paid ? (o.total_amount || 0) : 0),
          unpaidAmount: acc.unpaidAmount + (!o.paid ? (o.total_amount || 0) : 0),
        }), { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 })
      }

      periodStats.value = {
        today: calcStats(todayOrders),
        thisWeek: calcStats(weekOrders),
        thisMonth: calcStats(monthOrders),
      }
    } catch (error) {
      console.error('Fetch sales stats error:', error)
      // Keep existing values on error
    }
  }

  // 获取订单统计
  async function fetchOrderStats() {
    const { data, error } = await supabase
      .from('orders')
      .select('status')

    if (error) {
      console.error('Fetch order stats error:', error)
      return
    }

    const stats: OrderStats = {
      total: data?.length || 0,
      pending: 0,
      confirmed: 0,
      delivering: 0,
      completed: 0,
      cancelled: 0,
    }

    data?.forEach(o => {
      if (o.status in stats) {
        stats[o.status as OrderStatus]++
      }
    })

    orderStats.value = stats
  }

  // 获取待处理事项
  async function fetchPendingItems() {
    try {
      // 待配送数量
      const { count: deliveryCount } = await supabase
        .from('order_deliveries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'assigned'])

      // 未付款订单数
      const { count: unpaidCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('paid', false)
        .neq('status', 'cancelled')

      pendingDeliveries.value = deliveryCount || 0
      unpaidOrders.value = unpaidCount || 0
    } catch (error) {
      console.error('Fetch pending items error:', error)
      // Keep existing values on error
    }
  }

  // 获取近期订单
  async function fetchRecentOrders(limit = 5) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Fetch recent orders error:', error)
      return []
    }

    recentOrders.value = data || []
    return data
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
    loadingStats.value = true
    try {
      await Promise.all([
        fetchSalesStats(),
        fetchOrderStats(),
        fetchPendingItems(),
      ])
      currentStock.value = await getCurrentStock()
    } catch (error) {
      console.error('Fetch stats error:', error)
    } finally {
      loadingStats.value = false
    }

    // Fetch recent orders (independent)
    loadingOrders.value = true
    try {
      await fetchRecentOrders()
    } catch (error) {
      console.error('Fetch recent orders error:', error)
    } finally {
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
