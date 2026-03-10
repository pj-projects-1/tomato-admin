// src/__tests__/stores/deliveries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDeliveryStore } from '@/stores/deliveries'
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
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', name: 'Test Task' }, error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
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
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}))

// Mock amap service
vi.mock('@/api/amap', () => ({
  getAmapService: vi.fn(() => null),
  DEFAULT_DEPARTURE: { lng: 120.63, lat: 31.16 },
  DEFAULT_DEPARTURE_ADDRESS: 'Test Address',
}))

describe('Deliveries Store', () => {
  let store: ReturnType<typeof useDeliveryStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store = useDeliveryStore()
  })

  describe('initial state', () => {
    it('should initialize with empty deliveryTasks array', () => {
      expect(store.deliveryTasks).toEqual([])
    })

    it('should have loading set to false initially', () => {
      expect(store.loading).toBe(false)
    })

    it('should have currentTask set to null initially', () => {
      expect(store.currentTask).toBeNull()
    })
  })

  describe('fetchDeliveryTasks', () => {
    it('should set loading to true during fetch', async () => {
      const promise = store.fetchDeliveryTasks()
      expect(store.loading).toBe(true)
      await promise
      expect(store.loading).toBe(false)
    })

    it('should return tasks array', async () => {
      const result = await store.fetchDeliveryTasks()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
