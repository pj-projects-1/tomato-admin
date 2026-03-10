// src/__tests__/stores/stocks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStockStore } from '@/stores/stocks'
import { setActivePinia, createPinia } from 'pinia'

// Mock supabase
vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id', balance_after: 110 }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: 100, error: null })),
  },
  getCurrentStock: vi.fn(() => Promise.resolve(100)),
}))

describe('Stocks Store', () => {
  let store: ReturnType<typeof useStockStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store = useStockStore()
  })

  describe('initial state', () => {
    it('should initialize with empty stocks array', () => {
      expect(store.stocks).toEqual([])
    })

    it('should have loading set to false initially', () => {
      expect(store.loading).toBe(false)
    })

    it('should have currentBalance set to 0 initially', () => {
      expect(store.currentBalance).toBe(0)
    })
  })

  describe('fetchStocks', () => {
    it('should return stocks array', async () => {
      const result = await store.fetchStocks()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('fetchCurrentBalance', () => {
    it('should return current balance', async () => {
      const result = await store.fetchCurrentBalance()
      expect(typeof result).toBe('number')
    })
  })

  describe('stockIn', () => {
    it('should return success when stock in succeeds', async () => {
      const result = await store.stockIn(10, 40, 'Test stock in')
      expect(result.success).toBe(true)
    })
  })

  describe('stockOut', () => {
    it('should return success when stock out succeeds', async () => {
      const result = await store.stockOut(5)
      expect(result.success).toBe(true)
    })
  })

  describe('deleteStock', () => {
    it('should return success when delete succeeds', async () => {
      const result = await store.deleteStock('test-id')
      expect(result.success).toBe(true)
    })
  })
})
