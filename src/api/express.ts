/**
 * Express shipping service
 * Handles express company management, tracking, and future API integrations
 */

import { supabase } from './supabase'
import type { ExpressCompany, ExpressStatus, ExpressTrackingEvent } from '@/types'

/**
 * Fetch all active express companies
 */
export async function fetchExpressCompanies(): Promise<ExpressCompany[]> {
  const { data, error } = await supabase
    .from('express_companies')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Fetch express companies error:', error)
    return []
  }
  return data || []
}

/**
 * Get express status display text
 */
export function getExpressStatusText(status: ExpressStatus): string {
  const map: Record<ExpressStatus, string> = {
    pending_pack: '待包装',
    pending_label: '待打印面单',
    pending_dropoff: '待寄件',
    in_transit: '运输中',
    delivered: '已签收',
    exception: '异常',
  }
  return map[status] || status
}

/**
 * Get express status color (text color)
 */
export function getExpressStatusColor(status: ExpressStatus): string {
  const map: Record<ExpressStatus, string> = {
    pending_pack: '#909399',     // Gray
    pending_label: '#E6A23C',    // Orange
    pending_dropoff: '#409EFF',  // Blue
    in_transit: '#00C9B7',       // Teal
    delivered: '#67C23A',        // Green
    exception: '#F56C6C',        // Red
  }
  return map[status] || '#909399'
}

/**
 * Get express status background color
 */
export function getExpressBgColor(status: ExpressStatus): string {
  const map: Record<ExpressStatus, string> = {
    pending_pack: '#F4F4F5',     // Light gray
    pending_label: '#FDF6EC',    // Light orange
    pending_dropoff: '#ECF5FF',  // Light blue
    in_transit: '#E8FAF8',       // Light teal
    delivered: '#F0F9EB',        // Light green
    exception: '#FEF0F0',        // Light red
  }
  return map[status] || '#F4F4F5'
}

/**
 * Express status progression
 */
export const EXPRESS_STATUS_FLOW: ExpressStatus[] = [
  'pending_pack',
  'pending_label',
  'pending_dropoff',
  'in_transit',
  'delivered'
]

/**
 * Get next express status
 */
export function getNextExpressStatus(currentStatus: ExpressStatus): ExpressStatus | null {
  const currentIndex = EXPRESS_STATUS_FLOW.indexOf(currentStatus)
  if (currentIndex === -1 || currentIndex >= EXPRESS_STATUS_FLOW.length - 1) {
    return null
  }
  return EXPRESS_STATUS_FLOW[currentIndex + 1] as ExpressStatus
}

/**
 * Update express delivery status
 */
export async function updateExpressStatus(
  deliveryId: string,
  status: ExpressStatus,
  additionalData?: {
    tracking_number?: string
    express_company?: string
    express_data?: any
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = { express_status: status }

    if (additionalData?.tracking_number) {
      updates.tracking_number = additionalData.tracking_number
    }
    if (additionalData?.express_company) {
      updates.express_company = additionalData.express_company
    }
    if (additionalData?.express_data) {
      updates.express_data = additionalData.express_data
    }

    // Set timestamps based on status
    if (status === 'pending_label') {
      updates.packed_at = new Date().toISOString()
    } else if (status === 'in_transit') {
      updates.shipped_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('order_deliveries')
      .update(updates)
      .eq('id', deliveryId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Update express status error:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Fetch express deliveries (delivery_method = 'express')
 */
export async function fetchExpressDeliveries(filters?: {
  status?: ExpressStatus
  company?: string
}): Promise<any[]> {
  try {
    let query = supabase
      .from('order_deliveries')
      .select(`
        *,
        order:orders(
          *,
          customer:customers(*)
        )
      `)
      .eq('delivery_method', 'express')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('express_status', filters.status)
    }
    if (filters?.company) {
      query = query.eq('express_company', filters.company)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Fetch express deliveries error:', error)
    return []
  }
}

/**
 * Sync tracking info from Kuaidi100 API (placeholder for future implementation)
 * TODO: Implement actual API call when ready
 */
export async function syncTrackingInfo(
  trackingNumber: string,
  companyCode: string
): Promise<{ success: boolean; data?: ExpressTrackingEvent[]; error?: string }> {
  // Placeholder for Kuaidi100 API integration
  // For now, return mock data
  console.log('Sync tracking info for:', trackingNumber, companyCode)

  // TODO: Replace with actual API call
  // const response = await fetch('/api/tracking/sync', {
  //   method: 'POST',
  //   body: JSON.stringify({ trackingNumber, companyCode })
  // })

  return {
    success: false,
    error: '快递API尚未配置，请手动更新状态'
  }
}

/**
 * Create electronic waybill via SF Express API (placeholder for future implementation)
 * TODO: Implement actual API call when ready
 */
export async function createElectronicWaybill(delivery: any): Promise<{
  success: boolean
  data?: {
    waybillNo: string
    printUrl: string
  }
  error?: string
}> {
  // Placeholder for SF Express electronic waybill API
  console.log('Create electronic waybill for delivery:', delivery.id)

  return {
    success: false,
    error: '电子面单API尚未配置，请手动输入运单号'
  }
}

/**
 * Copy tracking number to clipboard
 */
export async function copyTrackingNumber(trackingNumber: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(trackingNumber)
    return true
  } catch {
    // Fallback for mobile
    const textarea = document.createElement('textarea')
    textarea.value = trackingNumber
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}
