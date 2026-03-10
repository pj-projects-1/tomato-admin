// Database types generated from Supabase schema

export interface Profile {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  wechat?: string
  phone?: string
  addresses: CustomerAddress[]
  note?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CustomerAddress {
  label: string
  address: string
  is_default: boolean
  location?: {
    lat: number
    lng: number
  }
  recipient_name?: string
  recipient_phone?: string
}

export interface Order {
  id: string
  customer_id: string
  customer?: Customer
  total_boxes: number
  total_amount?: number
  paid: boolean
  paid_at?: string
  payment_method?: 'wechat' | 'cash' | 'bank_transfer' | 'other'
  status: OrderStatus
  note?: string
  created_at: string
  updated_at: string
  created_by?: string
  deliveries?: OrderDelivery[]
}

export type OrderStatus = 'pending' | 'confirmed' | 'delivering' | 'completed' | 'cancelled'

export interface OrderDelivery {
  id: string
  order_id: string
  order?: Order
  recipient_name?: string
  recipient_phone?: string
  address: string
  quantity: number
  location?: {
    lng: number
    lat: number
  }
  status: DeliveryStatus
  delivery_task_id?: string
  delivery_task?: DeliveryTask
  sequence_in_route?: number
  delivered_at?: string
  delivery_note?: string
  created_at: string
  updated_at: string
}

export type DeliveryStatus = 'pending' | 'assigned' | 'delivering' | 'delivered'

export interface DeliveryTask {
  id: string
  name?: string
  route_order: number[]
  optimized_route?: OptimizedRoute
  total_distance?: number
  estimated_duration?: number
  departure_location?: {
    lng: number
    lat: number
    address: string
  }
  destination_location?: {
    lng: number
    lat: number
    address: string
  }
  status: DeliveryTaskStatus
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  created_by?: string
  deliveries?: OrderDelivery[]
}

export type DeliveryTaskStatus = 'planning' | 'in_progress' | 'completed' | 'cancelled'

export interface OptimizedRoute {
  distance: number
  duration: number
  polyline: string
  steps: RouteStep[]
}

export interface RouteStep {
  instruction: string
  road?: string
  distance: number
  duration: number
  polyline: string
}

export interface Stock {
  id: string
  type: StockType
  quantity: number
  balance_after: number
  order_id?: string
  order?: Order
  unit_price?: number
  total_price?: number
  harvest_date?: string
  storage_date?: string
  note?: string
  created_at: string
  created_by?: string
}

export type StockType = 'in' | 'out' | 'adjust'

// Dashboard statistics
export interface DashboardStats {
  currentStock: number
  todayOrders: number
  todayAmount: number
  pendingDeliveries: number
  recentOrders: Order[]
  recentStocks: Stock[]
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Pagination
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
