// src/__tests__/stores/orders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrderStore } from '@/stores/orders'
import { setActivePinia, createPinia } from 'pinia'

// Mock supabase
vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', total_boxes: 10 }, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-order-id' }, error: null })),
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
  },
  getCurrentStock: vi.fn(() => Promise.resolve(100)),
}))

describe('Orders Store', () => {
  let store: ReturnType<typeof useOrderStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store = useOrderStore()
  })

  describe('initial state', () => {
    it('should initialize with empty orders array', () => {
      expect(store.orders).toEqual([])
    })

    it('should have loading set to false initially', () => {
      expect(store.loading).toBe(false)
    })

    it('should have currentOrder set to null initially', () => {
      expect(store.currentOrder).toBeNull()
    })
  })

  describe('fetchOrders', () => {
    it('should set loading to true during fetch', async () => {
      const promise = store.fetchOrders()
      // Loading should be true during the async operation
      expect(store.loading).toBe(true)
      await promise
      expect(store.loading).toBe(false)
    })
  })

  describe('updateOrder', () => {
    it('should return success when update succeeds', async () => {
      const result = await store.updateOrder('test-id', { note: 'Updated' })
      expect(result.success).toBe(true)
    })
  })

  describe('deleteOrder', () => {
    it('should return success when delete succeeds', async () => {
      const result = await store.deleteOrder('test-id')
      expect(result.success).toBe(true)
    })
  })
})
