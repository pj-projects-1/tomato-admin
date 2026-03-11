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
 */
export function exportCustomers(customers: any[]) {
  const headers = ['客户名称', '微信号', '电话', '地址数量', '备注', '创建时间']
  const rows = customers.map(c => [
    c.name,
    c.wechat || '',
    c.phone || '',
    c.addresses?.length || 0,
    c.note || '',
    formatDate(c.created_at),
  ])

  const csv = toCSV(headers, rows)
  downloadFile(csv, `客户列表_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出订单列表
 */
export function exportOrders(orders: any[]) {
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
  downloadFile(csv, `订单列表_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出库存流水
 */
export function exportStocks(stocks: any[]) {
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
  downloadFile(csv, `库存流水_${formatDateFile()}.csv`, 'text/csv;charset=utf-8')
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
 * 生成高德地图导航链接
 * 使用 uri.amap.com 格式，更可靠
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

  // 使用 uri.amap.com 格式（官方 URI API，最可靠）
  const baseUrl = 'https://uri.amap.com/navigation'

  // 构建参数
  const params = new URLSearchParams()
  params.set('from', `${departure.lng},${departure.lat},${encodeURIComponent(departure.address || '出发地')}`)
  params.set('to', `${destination.lng},${destination.lat},${encodeURIComponent(destination.address || '目的地')}`)
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

  // 起点 → 第一个配送点
  const firstParams = new URLSearchParams()
  firstParams.set('from', `${departure.lng},${departure.lat},${encodeURIComponent(departure.address || '出发地')}`)
  firstParams.set('to', `${validDeliveries[0].location.lng},${validDeliveries[0].location.lat},${encodeURIComponent(validDeliveries[0].address)}`)
  firstParams.set('mode', 'car')
  firstParams.set('policy', '1')
  firstParams.set('coordinate', 'gaode')
  firstParams.set('callnative', '1')
  links.push(`${baseUrl}?${firstParams.toString()}`)

  // 每个配送点之间的导航
  for (let i = 0; i < validDeliveries.length - 1; i++) {
    const fromDelivery = validDeliveries[i]
    const toDelivery = validDeliveries[i + 1]
    const params = new URLSearchParams()
    params.set('from', `${fromDelivery.location.lng},${fromDelivery.location.lat},${encodeURIComponent(fromDelivery.address)}`)
    params.set('to', `${toDelivery.location.lng},${toDelivery.location.lat},${encodeURIComponent(toDelivery.address)}`)
    params.set('mode', 'car')
    params.set('policy', '1')
    params.set('coordinate', 'gaode')
    params.set('callnative', '1')
    links.push(`${baseUrl}?${params.toString()}`)
  }

  // 最后一个配送点 → 目的地
  const lastDelivery = validDeliveries[validDeliveries.length - 1]
  const lastParams = new URLSearchParams()
  lastParams.set('from', `${lastDelivery.location.lng},${lastDelivery.location.lat},${encodeURIComponent(lastDelivery.address)}`)
  lastParams.set('to', `${destination.lng},${destination.lat},${encodeURIComponent(destination.address || '目的地')}`)
  lastParams.set('mode', 'car')
  lastParams.set('policy', '1')
  lastParams.set('coordinate', 'gaode')
  lastParams.set('callnative', '1')
  links.push(`${baseUrl}?${lastParams.toString()}`)

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
  } catch {
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
  } catch {
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
    pending: '待确认',
    confirmed: '已确认',
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
