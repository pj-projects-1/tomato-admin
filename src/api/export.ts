/**
 * 数据导出工具类
 * 支持 CSV 和 Excel 格式导出
 */

/**
 * 将数据转换为 CSV 格式
 */
function toCSV(headers: string[], rows: any[][]): string {
  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return ''
    const str = String(cell)
    // 如果包含逗号、引号或换行，需要用引号包裹
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerLine = headers.map(escapeCell).join(',')
  const dataLines = rows.map(row => row.map(escapeCell).join(','))
  return [headerLine, ...dataLines].join('\n')
}

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 导出客户列表
 * Customer info appears once, additional addresses fill subsequent rows with empty customer columns
 */
export function exportCustomers(customers: any[], filenameSuffix = '') {
  const headers = ['客户名称', '微信号', '电话', '地址标签', '收货人', '收货电话', '地址', '备注', '创建时间']
  const rows: any[][] = []

  customers.forEach(c => {
    if (c.addresses && c.addresses.length > 0) {
      // First address: include all customer info
      const firstAddr = c.addresses[0]
      rows.push([
        c.name,
        c.wechat || '',
        c.phone || '',
        firstAddr.label || '',
        firstAddr.recipient_name || '',
        firstAddr.recipient_phone || '',
        firstAddr.address,
        c.note || '',
        formatDate(c.created_at),
      ])

      // Additional addresses: only fill address columns
      c.addresses.slice(1).forEach((addr: any) => {
        rows.push([
          '', '', '',  // Empty customer columns
          addr.label || '',
          addr.recipient_name || '',
          addr.recipient_phone || '',
          addr.address,
          '', '',  // Empty note and date
        ])
      })
    } else {
      // No addresses - just customer info
      rows.push([
        c.name,
        c.wechat || '',
        c.phone || '',
        '', '', '', '',
        c.note || '',
        formatDate(c.created_at),
      ])
    }
  })

  const csv = toCSV(headers, rows)
  downloadFile(csv, `客户列表${filenameSuffix}_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出订单列表
 */
export function exportOrders(orders: any[], filenameSuffix = '') {
  const headers = ['客户名称', '总箱数', '金额', '付款状态', '订单状态', '配送地址数', '创建时间', '付款时间']
  const rows = orders.map(o => [
    o.customer?.name || '',
    o.total_boxes,
    o.total_amount || 0,
    o.paid ? '已付款' : '未付款',
    getStatusText(o.status),
    o.deliveries?.length || 0,
    formatDateTime(o.created_at),
    o.paid_at ? formatDateTime(o.paid_at) : '',
  ])

  const csv = toCSV(headers, rows)
  downloadFile(csv, `订单列表${filenameSuffix}_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出库存流水
 */
export function exportStocks(stocks: any[], filenameSuffix = '') {
  const headers = ['类型', '数量', '库存余额', '单价', '采摘日期', '入库日期', '关联订单', '备注', '操作时间']
  const rows = stocks.map(s => [
    getTypeText(s.type),
    s.type === 'out' ? -s.quantity : s.quantity,
    s.balance_after,
    s.unit_price || '',
    s.harvest_date || '',
    s.storage_date || '',
    s.order ? '是' : '否',
    s.note || '',
    formatDateTime(s.created_at),
  ])

  const csv = toCSV(headers, rows)
  downloadFile(csv, `库存流水${filenameSuffix}_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出待配送列表
 */
export function exportPendingDeliveries(deliveries: any[], filenameSuffix = '') {
  const headers = ['客户', '收件人', '电话', '地址', '数量', '订单状态']
  const rows = deliveries.map(d => [
    d.order?.customer?.name || '',
    d.recipient_name || d.order?.customer?.name || '',
    d.recipient_phone || d.order?.customer?.phone || '',
    d.address,
    d.quantity,
    getDeliveryStatusText(d.status),
  ])

  const csv = toCSV(headers, rows)
  downloadFile(csv, `待配送列表${filenameSuffix}_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出配送清单
 */
export function exportDeliveryTask(task: any, deliveries: any[]) {
  const headers = ['序号', '客户名称', '收货人', '电话', '地址', '数量', '状态']
  const rows = deliveries.map((d, i) => [
    i + 1,
    d.order?.customer?.name || '',
    d.recipient_name || d.order?.customer?.name || '',
    d.recipient_phone || d.order?.customer?.phone || '',
    d.address,
    d.quantity,
    getDeliveryStatusText(d.status),
  ])

  const csv = toCSV(headers, rows)
  const taskName = task.name || '配送任务'
  downloadFile(csv, `${taskName}_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出配送任务列表
 */
export function exportDeliveryTasks(tasks: any[], filenameSuffix = '') {
  const headers = ['任务名称', '状态', '配送点数', '总距离(km)', '创建时间', '开始时间', '完成时间']
  const rows = tasks.map(t => [
    t.name || '未命名任务',
    getTaskStatusText(t.status),
    t.deliveries?.length || 0,
    t.total_distance || '',
    formatDateTime(t.created_at),
    t.started_at ? formatDateTime(t.started_at) : '',
    t.completed_at ? formatDateTime(t.completed_at) : '',
  ])

  const csv = toCSV(headers, rows)
  downloadFile(csv, `配送任务列表${filenameSuffix}_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 生成高德地图导航链接
 * 使用 uri.amap.com 格式，支持途经点
 *
 * @param departure 出发地
 * @param destination 目的地（结束地）
 * @param deliveries 配送点列表（作为途经点）
 */
export function generateAmapNavigationLink(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: any[]
): string | null {
  // 过滤有坐标的配送点
  const validDeliveries = deliveries.filter(d => d.location?.lng && d.location?.lat)
  if (validDeliveries.length === 0) return null

  // 使用 uri.amap.com/navigation 格式，支持途经点
  const baseUrl = 'https://uri.amap.com/navigation'

  // 构建参数
  const params = new URLSearchParams()
  // Note: URLSearchParams.set() already handles encoding, so we don't use encodeURIComponent here
  params.set('from', `${departure.lng},${departure.lat},${departure.address || '出发地'}`)
  params.set('to', `${destination.lng},${destination.lat},${destination.address || '目的地'}`)

  // 添加途经点（最多支持16个）
  // Note: URLSearchParams handles encoding, no need for encodeURIComponent
  const viaPoints = validDeliveries.slice(0, 16).map(d =>
    `${d.location.lng},${d.location.lat},${d.address}`
  )
  if (viaPoints.length > 0) {
    params.set('via', viaPoints.join(';'))
  }

  params.set('mode', 'car')
  params.set('policy', '1') // 推荐路线
  params.set('coordinate', 'gaode')
  params.set('callnative', '1') // 调起高德地图App

  return `${baseUrl}?${params.toString()}`
}

/**
 * 生成分段导航链接列表（每个配送点一个链接）
 * 推荐用于超过 16 个配送点的情况
 */
export function generateSegmentedNavigationLinks(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: any[]
): string[] {
  const validDeliveries = deliveries.filter(d => d.location?.lng && d.location?.lat)
  if (validDeliveries.length === 0) return []

  const links: string[] = []
  const baseUrl = 'https://uri.amap.com/navigation'

  const makeLink = (from: { lng: number; lat: number; address: string }, to: { lng: number; lat: number; address: string }) => {
    const params = new URLSearchParams()
    // Note: URLSearchParams handles encoding, no need for encodeURIComponent
    params.set('from', `${from.lng},${from.lat},${from.address}`)
    params.set('to', `${to.lng},${to.lat},${to.address}`)
    params.set('mode', 'car')
    params.set('policy', '1')
    params.set('coordinate', 'gaode')
    params.set('callnative', '1')
    return `${baseUrl}?${params.toString()}`
  }

  // 起点 → 第一个配送点
  links.push(makeLink(departure, {
    lng: validDeliveries[0].location.lng,
    lat: validDeliveries[0].location.lat,
    address: validDeliveries[0].address
  }))

  // 每个配送点之间的导航
  for (let i = 0; i < validDeliveries.length - 1; i++) {
    const fromDelivery = validDeliveries[i]
    const toDelivery = validDeliveries[i + 1]
    links.push(makeLink(
      { lng: fromDelivery.location.lng, lat: fromDelivery.location.lat, address: fromDelivery.address },
      { lng: toDelivery.location.lng, lat: toDelivery.location.lat, address: toDelivery.address }
    ))
  }

  // 最后一个配送点 → 目的地
  const lastDelivery = validDeliveries[validDeliveries.length - 1]
  links.push(makeLink(
    { lng: lastDelivery.location.lng, lat: lastDelivery.location.lat, address: lastDelivery.address },
    destination
  ))

  return links
}

/**
 * 生成高德驾车导航调起链接（App 直接调起，更可靠）
 * 使用 amapuri scheme，支持自定义途经点顺序
 * 别名函数，实际调用 generateAmapNavigationLink
 */
export function generateAmapAutoNavLink(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: any[]
): string | null {
  return generateAmapNavigationLink(departure, destination, deliveries)
}

/**
 * Delivery point with location information
 */
export interface DeliveryPoint {
  location?: { lng: number; lat: number } | null
  address: string
}

/**
 * Generate Amap native URI scheme for direct app launch
 * Format: amapuri://route/plan/?slat=...&slon=...
 *
 * IMPORTANT: We build parameters manually to avoid URLSearchParams encoding the pipe character.
 * According to Amap documentation, the '|' character must NOT be encoded.
 *
 * @param departure - Starting point with coordinates
 * @param destination - End point with coordinates
 * @param deliveries - Via points (delivery stops)
 */
export function generateAmapUriScheme(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: DeliveryPoint[]
): string | null {
  // Filter deliveries with valid coordinates
  const validDeliveries = deliveries.filter(d => d.location?.lng && d.location?.lat)
  if (validDeliveries.length === 0) return null

  // Build parameters manually to avoid encoding the pipe character
  const parts: string[] = []

  // Start point
  parts.push(`slat=${departure.lat}`)
  parts.push(`slon=${departure.lng}`)
  parts.push(`sname=${encodeURIComponent(departure.address || '起点')}`)

  // End point
  parts.push(`dlat=${destination.lat}`)
  parts.push(`dlon=${destination.lng}`)
  parts.push(`dname=${encodeURIComponent(destination.address || '终点')}`)

  // Route type and preferences
  parts.push('t=0') // 0=driving
  parts.push('dev=0') // GCJ-02 coordinates
  parts.push('m=4') // avoid traffic

  // Via points: all valid deliveries become waypoints (up to 16)
  const viaPoints = validDeliveries.slice(0, 16)
  if (viaPoints.length > 0) {
    parts.push(`vian=${viaPoints.length}`)
    // IMPORTANT: Do NOT encode the pipe character!
    parts.push(`vialons=${viaPoints.map(d => d.location!.lng).join('|')}`)
    parts.push(`vialats=${viaPoints.map(d => d.location!.lat).join('|')}`)
    parts.push(`vianames=${viaPoints.map(d => encodeURIComponent(d.address || '途经点')).join('|')}`)
  }

  return `amapuri://route/plan/?${parts.join('&')}`
}

/**
 * Smart navigation launcher with app fallback
 * - On mobile: tries amapuri:// app first, falls back to web
 * - On desktop: opens web version directly
 *
 * @param departure - Starting point
 * @param destination - End point
 * @param deliveries - Via points
 * @param onFallback - Optional callback when falling back to web
 * @param onAppOpened - Optional callback when app successfully opened
 */
export function launchAmapNavigation(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: DeliveryPoint[],
  onFallback?: () => void,
  onAppOpened?: () => void
): boolean {
  // Check if mobile device (includes iPad Pro detection)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  // Desktop: open web version directly
  if (!isMobile) {
    const webLink = generateAmapNavigationLink(departure, destination, deliveries)
    if (webLink) {
      window.open(webLink, '_blank')
      return true
    }
    return false
  }

  // Mobile: try app first with fallback
  const appLink = generateAmapUriScheme(departure, destination, deliveries)
  const webLink = generateAmapNavigationLink(departure, destination, deliveries)

  if (!appLink || !webLink) return false

  // Track state to prevent race conditions
  let hasResolved = false
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null

  // Resolve function to ensure we only execute one path
  const resolve = (opened: boolean) => {
    if (hasResolved) return
    hasResolved = true

    // Clear all timers
    if (fallbackTimer) clearTimeout(fallbackTimer)
    if (cleanupTimer) clearTimeout(cleanupTimer)

    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)

    // Execute appropriate callback
    if (opened) {
      onAppOpened?.()
    } else {
      onFallback?.()
      // Navigate to web version
      window.location.href = webLink
    }

    // Cleanup iframe if it exists
    if (iframe.parentNode) {
      document.body.removeChild(iframe)
    }
  }

  // Detect if app opened (page becomes hidden)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      resolve(true)
    }
  }

  // Also listen for pagehide (iOS Safari)
  const handlePageHide = () => {
    resolve(true)
  }

  // Add event listeners before attempting to open app
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)

  // Try opening app
  // Use iframe for Android, window.location for iOS (more reliable)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  if (isIOS) {
    // iOS: Use window.location.href for better compatibility
    window.location.href = appLink
  } else {
    // Android: Use iframe approach
    iframe.src = appLink
  }

  // Fallback timer - if app doesn't open in time, use web link
  // iOS may need more time for cold app start
  const fallbackDelay = isIOS ? 800 : 500
  fallbackTimer = setTimeout(() => {
    resolve(false)
  }, fallbackDelay)

  // Cleanup timer - force cleanup after maximum wait time
  cleanupTimer = setTimeout(() => {
    if (!hasResolved) {
      resolve(false)
    }
  }, 3000)

  return true
}

/**
 * 复制导航链接到剪贴板
 */
export async function copyNavigationLink(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: any[]
): Promise<boolean> {
  const link = generateAmapNavigationLink(departure, destination, deliveries)
  if (!link) return false

  return copyToClipboard(link)
}

/**
 * 通用复制到剪贴板函数（支持移动端）
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback for mobile/insecure context
    return copyToClipboardFallback(text)
  } catch (error) {
    // Log error for debugging clipboard permission issues
    console.warn('Clipboard API failed, using fallback:', error)
    // Fallback for mobile browsers
    return copyToClipboardFallback(text)
  }
}

/**
 * Fallback copy method for mobile browsers
 */
function copyToClipboardFallback(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  textarea.setAttribute('readonly', '')
  document.body.appendChild(textarea)

  try {
    // iOS Safari requires this
    const range = document.createRange()
    range.selectNodeContents(textarea)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
    textarea.select()
    textarea.setSelectionRange(0, 99999) // For mobile

    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch (error) {
    console.error('Clipboard fallback failed:', error)
    document.body.removeChild(textarea)
    return false
  }
}

// 辅助函数
function formatDate(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

function formatDateTime(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

function formatDateFile(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '未确认',
    confirmed: '未完成',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getTypeText(type: string): string {
  const map: Record<string, string> = {
    in: '入库',
    out: '出库',
    adjust: '调整',
  }
  return map[type] || type
}

function getDeliveryStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待配送',
    assigned: '已分配',
    delivering: '配送中',
    delivered: '已送达',
  }
  return map[status] || status
}

function getTaskStatusText(status: string): string {
  const map: Record<string, string> = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}
