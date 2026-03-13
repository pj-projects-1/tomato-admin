// tests/fixtures/test-data.ts
// Test data fixtures for E2E tests
// Use these when setting up authenticated tests or mocking API responses

export const testCustomer = {
  id: 'test-customer-1',
  name: '测试客户',
  wechat: 'test_wechat',
  phone: '13800138000',
  addresses: [
    {
      label: '家',
      address: '江苏省苏州市吴江区测试地址',
      is_default: true,
    },
  ],
  note: '测试备注',
  created_at: new Date().toISOString(),
}

export const testOrder = {
  id: 'test-order-1',
  customer_id: testCustomer.id,
  total_boxes: 10,
  total_amount: 500,
  paid: false,
  status: 'pending' as const,
  created_at: new Date().toISOString(),
}

export const testStock = {
  id: 'test-stock-1',
  type: 'in' as const,
  quantity: 100,
  balance_after: 100,
  unit_price: 50,
  harvest_date: new Date().toISOString().split('T')[0],
  storage_date: new Date().toISOString().split('T')[0],
  note: '测试入库',
  created_at: new Date().toISOString(),
}

export const testDelivery = {
  id: 'test-delivery-1',
  order_id: testOrder.id,
  address: '江苏省苏州市吴江区测试配送地址',
  recipient_name: '测试收件人',
  recipient_phone: '13900139000',
  quantity: 5,
  status: 'pending' as const,
  location: {
    lng: 120.6457,
    lat: 31.1386,
  },
}

// Test user credentials (for local development only)
// In CI, create test users dynamically or use seeded test accounts
export const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: '测试用户',
}

// Helper to generate unique test identifiers
export function generateTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
