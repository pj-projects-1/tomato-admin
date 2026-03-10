import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, getCurrentStock } from '@/api/supabase'
import type { Stock, StockType } from '@/types'

export const useStockStore = defineStore('stocks', () => {
  const stocks = ref<Stock[]>([])
  const currentBalance = ref(0)
  const loading = ref(false)

  async function fetchStocks(limit = 50) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select(`
          *,
          order:orders(id, total_boxes)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      stocks.value = data || []
      return data
    } catch (error) {
      console.error('Fetch stocks error:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentBalance() {
    try {
      currentBalance.value = await getCurrentStock()
      return currentBalance.value
    } catch (error) {
      console.error('Fetch current balance error:', error)
      return 0
    }
  }

  async function stockIn(
    quantity: number,
    unitPrice?: number,
    note?: string,
    harvestDate?: string,
    storageDate?: string
  ) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentStock = await getCurrentStock()
      const totalPrice = unitPrice ? quantity * unitPrice : undefined

      const { data, error } = await supabase
        .from('stocks')
        .insert({
          type: 'in',
          quantity,
          balance_after: currentStock + quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          harvest_date: harvestDate || null,
          storage_date: storageDate || null,
          note: note || '入库',
          created_by: user?.id,
        })
        .select(`
          *,
          order:orders(id, total_boxes)
        `)
        .single()

      if (error) throw error

      stocks.value.unshift(data)
      currentBalance.value = data.balance_after

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function stockOut(quantity: number, orderId?: string, note?: string) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentStock = await getCurrentStock()

      if (currentStock < quantity) {
        return { success: false, error: '库存不足' }
      }

      const { data, error } = await supabase
        .from('stocks')
        .insert({
          type: 'out',
          quantity,
          balance_after: currentStock - quantity,
          order_id: orderId,
          note: note || '出库',
          created_by: user?.id,
        })
        .select(`
          *,
          order:orders(id, total_boxes)
        `)
        .single()

      if (error) throw error

      stocks.value.unshift(data)
      currentBalance.value = data.balance_after

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function stockAdjust(quantity: number, note?: string) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentStock = await getCurrentStock()

      const { data, error } = await supabase
        .from('stocks')
        .insert({
          type: 'adjust',
          quantity: Math.abs(quantity),
          balance_after: currentStock + quantity, // quantity can be negative for reduction
          note: note || '库存调整',
          created_by: user?.id,
        })
        .select(`
          *,
          order:orders(id, total_boxes)
        `)
        .single()

      if (error) throw error

      stocks.value.unshift(data)
      currentBalance.value = data.balance_after

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function deleteStock(id: string) {
    loading.value = true
    try {
      const { error } = await supabase
        .from('stocks')
        .delete()
        .eq('id', id)

      if (error) throw error

      stocks.value = stocks.value.filter(s => s.id !== id)
      await fetchCurrentBalance()

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function updateRecord(id: string, updates: {
    unit_price?: number | null
    harvest_date?: string | null
    storage_date?: string | null
    note?: string | null
  }) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('stocks')
        .update({
          unit_price: updates.unit_price,
          harvest_date: updates.harvest_date,
          storage_date: updates.storage_date,
          note: updates.note,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = stocks.value.findIndex(s => s.id === id)
      if (index !== -1) {
        stocks.value[index] = { ...stocks.value[index], ...data }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  return {
    stocks,
    currentBalance,
    loading,
    fetchStocks,
    fetchCurrentBalance,
    stockIn,
    stockOut,
    stockAdjust,
    deleteStock,
    updateRecord,
  }
})
