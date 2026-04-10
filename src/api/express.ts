/**
 * Express shipping service
 * Handles express company management, tracking, and future API integrations
 */

import { supabase } from './supabase'
import type { ExpressCompany, ExpressStatus, ExpressTrackingEvent, TrackingNumberItem, TrackingNumbersData } from '@/types'

/**
 * App identifier for Kuaidi100 mobile API
 * Can be any English name, no approval needed
 */
const KUAIDI100_CONAME = 'hongfantian'

/**
 * Check if current device is mobile
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768
}

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
 * Express company codes for Kuaidi100 tracking URLs
 * Maps company names (as stored in database) to Kuaidi100 company codes
 */
export const EXPRESS_COMPANY_CODES: Record<string, string> = {
  '顺丰速运': 'shunfeng',
  '顺丰': 'shunfeng',
  '中通快递': 'zhongtong',
  '中通': 'zhongtong',
  '圆通速递': 'yuantong',
  '圆通': 'yuantong',
  '申通快递': 'shentong',
  '申通': 'shentong',
  '韵达快递': 'yunda',
  '韵达': 'yunda',
  '京东物流': 'jd',
  '京东': 'jd',
  '极兔速递': 'jtexpress',
  '极兔': 'jtexpress',
  '邮政EMS': 'ems',
  'EMS': 'ems',
  '百世快递': 'huitongkuaidi',
  '百世': 'huitongkuaidi',
  '天天快递': 'tiantian',
  '德邦快递': 'debangwuliu',
  '德邦': 'debangwuliu',
}

/**
 * Generate tracking URL for an express delivery
 * Uses Kuaidi100 as unified tracking service
 * Automatically detects mobile devices and returns mobile-optimized URL
 *
 * @param companyName - Express company name (e.g., "顺丰速运")
 * @param trackingNumber - Tracking number
 * @param returnUrl - Optional return URL for mobile users (defaults to current page)
 * @returns Kuaidi100 tracking URL
 */
export function getTrackingUrl(
  companyName: string | null | undefined,
  trackingNumber: string,
  returnUrl?: string
): string {
  if (!trackingNumber) return ''

  // Get company code, fallback to empty for auto-detect
  const companyCode = companyName ? EXPRESS_COMPANY_CODES[companyName] : ''

  if (isMobileDevice()) {
    // Mobile URL format with callback support
    const callbackUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '')
    const encodedCallback = callbackUrl ? encodeURIComponent(callbackUrl) : ''

    let url = `https://m.kuaidi100.com/app/query/?coname=${KUAIDI100_CONAME}`
    if (companyCode) {
      url += `&com=${companyCode}`
    }
    url += `&nu=${trackingNumber}`
    if (encodedCallback) {
      url += `&callbackurl=${encodedCallback}`
    }
    return url
  }

  // PC/Desktop URL format
  if (companyCode) {
    return `https://www.kuaidi100.com/chaxun?com=${companyCode}&nu=${trackingNumber}`
  }

  // Fallback: use Kuaidi100 auto-detect (no company parameter)
  return `https://www.kuaidi100.com/chaxun?nu=${trackingNumber}`
}

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
    tracking_numbers?: any
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

/**
 * Detect carrier from tracking number prefix/pattern
 * Returns carrier code for Kuaidi100, or null if not recognized
 */
export function detectCarrierFromTracking(trackingNumber: string): string | null {
  if (!trackingNumber) return null

  const num = trackingNumber.toUpperCase().trim()

  // SF Express: starts with SF
  if (num.startsWith('SF')) return 'shunfeng'

  // YTO (Yuantong): starts with YT
  if (num.startsWith('YT')) return 'yuantong'

  // ZTO (Zhongtong): starts with ZT or 73x/75x/76x/77x/78x
  if (num.startsWith('ZT')) return 'zhongtong'
  if (/^(73|75|76|77|78)\d/.test(num)) return 'zhongtong'

  // Yunda: starts with YD
  if (num.startsWith('YD')) return 'yunda'

  // JD Logistics: starts with JD
  if (num.startsWith('JD')) return 'jd'

  // J&T Express: starts with JT
  if (num.startsWith('JT')) return 'jtexpress'

  // EMS: format E...CN (letter E followed by digits/letters and ending with CN)
  if (/^E[A-Z0-9]+CN$/.test(num)) return 'ems'

  // STO (Shentong): starts with 268/368/468/568/668/768/868/968
  if (/^(2|3|4|5|6|7|8|9)68\d/.test(num)) return 'shentong'

  // Huitong (Best Express): starts with HT
  if (num.startsWith('HT')) return 'huitongkuaidi'

  // Deppon Express: starts with DP
  if (num.startsWith('DP')) return 'debangwuliu'

  return null
}

/**
 * Get tracking numbers from a delivery object
 * Supports both legacy single tracking_number and new tracking_numbers structure
 */
export function getTrackingNumbers(delivery: {
  tracking_number?: string | null
  tracking_numbers?: TrackingNumbersData | null
  express_company?: string | null
}): TrackingNumberItem[] {
  // EDGE CASE: Handle malformed tracking_numbers data from DB
  if (delivery.tracking_numbers && typeof delivery.tracking_numbers === 'object') {
    // Validate items is an array
    const items = delivery.tracking_numbers.items
    if (Array.isArray(items) && items.length > 0) {
      // Filter out invalid items (must have a non-empty number string)
      const validItems = items.filter((item): item is TrackingNumberItem =>
        item && typeof item === 'object' && typeof item.number === 'string' && item.number.trim() !== ''
      )
      if (validItems.length > 0) {
        return validItems.map((item, idx) => ({
          number: item.number.trim(),
          carrier: item.carrier || '',
          index: typeof item.index === 'number' ? item.index : idx
        }))
      }
    }
  }

  // Fall back to legacy single tracking number
  if (delivery.tracking_number && typeof delivery.tracking_number === 'string') {
    const trimmedNumber = delivery.tracking_number.trim()
    if (trimmedNumber) {
      const carrier = detectCarrierFromTracking(trimmedNumber)
        || (delivery.express_company ? EXPRESS_COMPANY_CODES[delivery.express_company] : null)
        || ''

      return [{
        number: trimmedNumber,
        carrier,
        index: 0
      }]
    }
  }

  return []
}

/**
 * Get the primary (first) tracking number from a delivery
 */
export function getPrimaryTrackingNumber(delivery: {
  tracking_number?: string | null
  tracking_numbers?: TrackingNumbersData
  express_company?: string | null
}): TrackingNumberItem | null {
  const items = getTrackingNumbers(delivery)
  if (!items.length) return null

  const primaryIndex = delivery.tracking_numbers?.primary_index ?? 0
  return items[primaryIndex] ?? items[0] ?? null
}

/**
 * Build tracking_numbers data structure from items
 */
export function buildTrackingNumbersData(
  items: Array<{ number: string; carrier?: string }>
): TrackingNumbersData {
  return {
    items: items.map((item, idx) => ({
      number: item.number,
      carrier: item.carrier || detectCarrierFromTracking(item.number) || '',
      index: idx
    })),
    primary_index: 0
  }
}

/**
 * Get tracking URL for a TrackingNumberItem
 */
export function getTrackingUrlFromItem(
  item: TrackingNumberItem,
  defaultCompany?: string | null
): string {
  // Use item's carrier if available, otherwise try to detect or use default
  const companyCode = item.carrier || detectCarrierFromTracking(item.number) ||
    (defaultCompany ? EXPRESS_COMPANY_CODES[defaultCompany] : '')

  if (isMobileDevice()) {
    let url = `https://m.kuaidi100.com/app/query/?coname=${KUAIDI100_CONAME}&nu=${item.number}`
    if (companyCode) {
      url += `&com=${companyCode}`
    }
    return url
  }

  // Desktop URL
  if (companyCode) {
    return `https://www.kuaidi100.com/chaxun?com=${companyCode}&nu=${item.number}`
  }
  return `https://www.kuaidi100.com/chaxun?nu=${item.number}`
}

// ============ Pickup Delivery Functions ============

import type { PickupStatus } from '@/types'

/**
 * Get pickup status display text
 */
export function getPickupStatusText(status: PickupStatus): string {
  const map: Record<PickupStatus, string> = {
    pending: '待自提',
    picked_up: '已自提',
  }
  return map[status] || status
}

/**
 * Get pickup status color (text color)
 */
export function getPickupStatusColor(status: PickupStatus): string {
  const map: Record<PickupStatus, string> = {
    pending: '#E6A23C',   // Orange
    picked_up: '#67C23A', // Green
  }
  return map[status] || '#909399'
}

/**
 * Get pickup status background color
 */
export function getPickupBgColor(status: PickupStatus): string {
  const map: Record<PickupStatus, string> = {
    pending: '#FDF6EC',    // Light orange
    picked_up: '#F0F9EB',  // Light green
  }
  return map[status] || '#F4F4F5'
}

/**
 * Fetch pickup deliveries (delivery_method = 'pickup')
 */
export async function fetchPickupDeliveries(filters?: {
  status?: PickupStatus
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
      .eq('delivery_method', 'pickup')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('pickup_status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Fetch pickup deliveries error:', error)
    return []
  }
}

/**
 * Update pickup status
 */
export async function updatePickupStatus(
  deliveryId: string,
  status: PickupStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = {
      pickup_status: status,
    }

    if (status === 'picked_up') {
      updates.picked_up_at = new Date().toISOString()
      updates.status = 'delivered'
      updates.delivered_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('order_deliveries')
      .update(updates)
      .eq('id', deliveryId)

    if (error) throw error

    // Check if all deliveries for this order are delivered
    const { data: delivery } = await supabase
      .from('order_deliveries')
      .select('order_id')
      .eq('id', deliveryId)
      .single()

    if (delivery?.order_id) {
      const { data: allDeliveries } = await supabase
        .from('order_deliveries')
        .select('status')
        .eq('order_id', delivery.order_id)

      const allDelivered = allDeliveries?.every(d => d.status === 'delivered')
      if (allDelivered) {
        await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', delivery.order_id)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Update pickup status error:', error)
    return { success: false, error: (error as Error).message }
  }
}
