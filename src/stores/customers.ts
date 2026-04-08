import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/api/supabase'
import { getErrorMessage, translateDbError } from '@/utils/errorHandling'
import type { Customer, CustomerAddress } from '@/types'

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const currentCustomer = ref<Customer | null>(null)

  async function fetchCustomers(search?: string) {
    loading.value = true
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,wechat.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      customers.value = data || []
      return data
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Fetch customers error:', error)
      }
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchCustomer(id: string) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      currentCustomer.value = data
      return data
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Fetch customer error:', error)
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function createCustomer(customer: Partial<Customer>) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      customers.value.unshift(data)
      return { success: true, data }
    } catch (error) {
      const message = translateDbError(getErrorMessage(error))
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  async function updateCustomer(id: string, updates: Partial<Customer>) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = customers.value.findIndex(c => c.id === id)
      if (index !== -1) {
        customers.value[index] = data
      }

      return { success: true, data }
    } catch (error) {
      const message = translateDbError(getErrorMessage(error))
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  async function deleteCustomer(id: string) {
    loading.value = true
    try {
      // First check if customer has orders
      const { data: orders, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', id)
        .limit(1)

      if (checkError) throw checkError

      if (orders && orders.length > 0) {
        return { success: false, error: '无法删除：该客户有关联的订单' }
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error

      customers.value = customers.value.filter(c => c.id !== id)
      return { success: true }
    } catch (error) {
      const message = translateDbError(getErrorMessage(error))
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  function addAddress(customerId: string, address: CustomerAddress) {
    const customer = customers.value.find(c => c.id === customerId)
    if (customer) {
      // If this is default, remove default from others
      if (address.is_default) {
        customer.addresses.forEach(a => a.is_default = false)
      }
      customer.addresses.push(address)
    }
  }

  function removeAddress(customerId: string, index: number) {
    const customer = customers.value.find(c => c.id === customerId)
    if (customer && customer.addresses[index]) {
      customer.addresses.splice(index, 1)
    }
  }

  return {
    customers,
    loading,
    currentCustomer,
    fetchCustomers,
    fetchCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addAddress,
    removeAddress,
  }
})
