// src/__tests__/stores/customers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCustomerStore } from '@/stores/customers'
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
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', name: 'Test Customer' }, error: null })),
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id', name: 'New Customer' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', name: 'Updated' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}))

describe('Customers Store', () => {
  let store: ReturnType<typeof useCustomerStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store = useCustomerStore()
  })

  describe('initial state', () => {
    it('should initialize with empty customers array', () => {
      expect(store.customers).toEqual([])
    })

    it('should have loading set to false initially', () => {
      expect(store.loading).toBe(false)
    })

    it('should have currentCustomer set to null initially', () => {
      expect(store.currentCustomer).toBeNull()
    })
  })

  describe('fetchCustomers', () => {
    it('should set loading to true during fetch', async () => {
      const promise = store.fetchCustomers()
      expect(store.loading).toBe(true)
      await promise
      expect(store.loading).toBe(false)
    })

    it('should return customers array', async () => {
      const result = await store.fetchCustomers()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('createCustomer', () => {
    it('should return success when create succeeds', async () => {
      const result = await store.createCustomer({ name: 'Test Customer' })
      expect(result.success).toBe(true)
    })
  })

  describe('updateCustomer', () => {
    it('should return success when update succeeds', async () => {
      const result = await store.updateCustomer('test-id', { name: 'Updated' })
      expect(result.success).toBe(true)
    })
  })

  describe('deleteCustomer', () => {
    it('should return success when delete succeeds', async () => {
      const result = await store.deleteCustomer('test-id')
      expect(result.success).toBe(true)
    })
  })

  describe('addAddress', () => {
    it('should add address to customer', () => {
      // Setup a customer with addresses
      store.customers = [{ id: 'cust-1', name: 'Test', addresses: [] } as any]

      store.addAddress('cust-1', { address: 'Test Address', is_default: true } as any)

      expect(store.customers[0]?.addresses.length).toBe(1)
    })

    it('should set only one default address', () => {
      store.customers = [{
        id: 'cust-1',
        name: 'Test',
        addresses: [{ address: 'Address 1', is_default: true }] as any[]
      } as any]

      store.addAddress('cust-1', { address: 'Address 2', is_default: true } as any)

      const defaultCount = store.customers[0]?.addresses.filter(a => a.is_default).length ?? 0
      expect(defaultCount).toBe(1)
    })
  })
})
