# Tomato Admin Enhancement Plan

## Overview

This plan outlines improvements to enhance user experience and workflow efficiency without adding complexity to the app's architecture.

**Principle**: Small, targeted changes that work within existing patterns.

---

## Feature 1: Pull-to-Refresh

### Problem
Users currently need to manually refresh pages to see new data. This is especially tedious on mobile.

### Solution
Add native pull-to-refresh gesture to list views (Customers, Orders, Stocks, Deliveries).

### Technical Approach

**Option A: Native Overscroll (Recommended - Simplest)**
```typescript
// Create composable: src/composables/usePullRefresh.ts
export function usePullRefresh(refreshFn: () => Promise<void>) {
  const isRefreshing = ref(false)
  const startY = ref(0)
  const pullDistance = ref(0)
  const threshold = 80

  const onTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.value = e.touches[0].clientY
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (startY.value && window.scrollY === 0) {
      pullDistance.value = e.touches[0].clientY - startY.value
    }
  }

  const onTouchEnd = async () => {
    if (pullDistance.value > threshold && !isRefreshing.value) {
      isRefreshing.value = true
      await refreshFn()
      isRefreshing.value = false
    }
    startY.value = 0
    pullDistance.value = 0
  }

  return { isRefreshing, pullDistance, onTouchStart, onTouchMove, onTouchEnd }
}
```

**Option B: Element Plus Loading (Alternative)**
Add a small refresh button in page headers for mobile users.

### Files to Modify
1. `src/composables/usePullRefresh.ts` - New file
2. `src/views/Customers.vue` - Apply composable
3. `src/views/Orders.vue` - Apply composable
4. `src/views/Stocks.vue` - Apply composable
5. `src/views/Deliveries.vue` - Apply composable

### Visual Feedback
```
┌─────────────────────────────┐
│     ↓ Pull to refresh ↓     │  <- Shows when pulling
│                             │
│  ┌─────────────────────┐   │
│  │ Customer Card       │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### Estimated Effort
**0.5 day** - Create composable, apply to 4 views

---

## Feature 2: Order Templates / Repeat Last Order

### Problem
Regular customers often order the same quantities and delivery addresses. Recreating these manually is time-consuming.

### Solution
Add "Repeat last order" option when creating an order for a customer with previous orders.

### User Flow
```
1. User opens "New Order" dialog
2. User selects customer from dropdown
3. System detects: "This customer has 2 previous orders"
4. Show button: "📋 Fill from last order"
5. Clicking button pre-fills:
   - total_boxes (same as last order)
   - unit_price (same as last order)
   - deliveries (same addresses, same quantities)
6. User can adjust before submitting
```

### Technical Approach

**Add to Order Store:**
```typescript
// src/stores/orders.ts
async function getLastOrderForCustomer(customerId: string): Promise<Order | null> {
  const { data } = await supabase
    .from('orders')
    .select(`*, deliveries:order_deliveries(*)`)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}
```

**Add to Orders.vue:**
```typescript
// In the dialog, when customer is selected
watch(() => form.customer_id, async (newId) => {
  if (newId) {
    lastOrderInfo.value = await orderStore.getLastOrderForCustomer(newId)
  }
})

// Button to fill from last order
function fillFromLastOrder() {
  if (!lastOrderInfo.value) return
  form.total_boxes = lastOrderInfo.value.total_boxes
  form.unit_price = lastOrderInfo.value.unit_price
  form.deliveries = lastOrderInfo.value.deliveries.map(d => ({
    recipient_name: d.recipient_name,
    recipient_phone: d.recipient_phone,
    address: d.address,
    quantity: d.quantity,
    location: d.location,
  }))
}
```

### UI Design
```
┌─────────────────────────────────────────┐
│ 新增订单                                │
├─────────────────────────────────────────┤
│ 客户: [张三 ▼]                          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 💡 该客户有 2 个历史订单            │ │
│ │    最近: 3月10日 - 5箱              │ │
│ │    [📋 复制上次订单]  [清空]        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 总箱数: [5]                             │
│ 单价: [40]                              │
│ ...                                     │
└─────────────────────────────────────────┘
```

### Files to Modify
1. `src/stores/orders.ts` - Add `getLastOrderForCustomer()` function
2. `src/views/Orders.vue` - Add UI for "fill from last order"

### Estimated Effort
**1 day** - Store function + UI implementation + testing

---

## Feature 3: Offline Status Indicator

### Problem
Users can't tell if their data is synced or if they're working offline.

### Solution
Add a small status indicator in the header showing connection status.

### UI Design
```
┌────────────────────────────────────────────────────┐
│ ☰  四月红番天              [🟢 已同步]  [张三 ▼] │
└────────────────────────────────────────────────────┘

Offline state:
┌────────────────────────────────────────────────────┐
│ ☰  四月红番天              [🔴 离线]   [张三 ▼] │
└────────────────────────────────────────────────────┘
```

### Technical Approach
```typescript
// src/composables/useConnectionStatus.ts
export function useConnectionStatus() {
  const isOnline = ref(navigator.onLine)

  onMounted(() => {
    window.addEventListener('online', () => isOnline.value = true)
    window.addEventListener('offline', () => isOnline.value = false)
  })

  return { isOnline }
}
```

### Files to Modify
1. `src/composables/useConnectionStatus.ts` - New file
2. `src/views/Layout.vue` - Add indicator to header

### Estimated Effort
**0.5 day** - Very simple

---

## Feature 4: Low Stock Alert

### Problem
Users don't get notified when stock is running low.

### Solution
Add visual warning on dashboard and stocks page when stock falls below threshold.

### UI Design
```
Dashboard card:
┌─────────────────────────────┐
│  📦 当前库存                │
│  ⚠️ 8 箱 (库存偏低)         │  <- Yellow warning
│  点击查看详情               │
└─────────────────────────────┘

Threshold config in Settings:
┌─────────────────────────────┐
│ 低库存提醒阈值: [10] 箱     │
└─────────────────────────────┘
```

### Technical Approach
```typescript
// In Dashboard.vue
const LOW_STOCK_THRESHOLD = 10 // Could be from settings

const isLowStock = computed(() =>
  dashboardStore.currentStock < LOW_STOCK_THRESHOLD
)
```

### Files to Modify
1. `src/views/Dashboard.vue` - Add warning style to stock card
2. `src/views/Stocks.vue` - Add warning indicator in header stats
3. (Optional) Add to localStorage settings

### Estimated Effort
**0.5 day** - Simple computed property + UI

---

## Feature 5: Customer Order History Quick View

### Problem
When viewing customer list, can't quickly see order history.

### Solution
Add last order date and order count to customer cards.

### UI Design
```
Mobile card:
┌─────────────────────────────────────┐
│ 张三                    [3地址]    │
│ 微信: zhang123  电话: 138xxxx      │
│ ─────────────────────────────────  │
│ 📋 最近下单: 3月10日 (共 12 单)     │
│                        [编辑] [订单]│
└─────────────────────────────────────┘
```

### Technical Approach
This requires a computed property or a join query. Two options:

**Option A: Computed from loaded orders (Simpler)**
```typescript
// In Customers.vue
function getCustomerOrderInfo(customerId: string) {
  const customerOrders = orderStore.orders.filter(o => o.customer_id === customerId)
  if (customerOrders.length === 0) return null
  return {
    count: customerOrders.length,
    lastOrder: customerOrders[0].created_at // Already sorted
  }
}
```

**Option B: Add to customer query (More efficient)**
Modify the customers store to include order stats via a database view or computed column.

### Estimated Effort
**1 day** - Depends on approach chosen

---

## Feature 6: Quick Copy Phone Number

### Problem
On mobile, copying phone numbers requires long-press which doesn't always work.

### Solution
Add explicit copy button/icon next to phone numbers.

### UI Design
```
┌─────────────────────────────────────┐
│ 电话: 13812345678 [📋]             │
│                     ↑ Tap to copy  │
└─────────────────────────────────────┘
```

### Technical Approach
```vue
<template>
  <span class="phone-field">
    {{ phone }}
    <el-icon class="copy-icon" @click.stop="copyPhone">
      <CopyDocument />
    </el-icon>
  </span>
</template>

<script setup>
import { copyToClipboard } from '@/api/export'

async function copyPhone() {
  await copyToClipboard(phone)
  ElMessage.success('已复制')
}
</script>
```

### Files to Modify
1. Multiple views where phone is displayed (Customers, Orders, Deliveries)
2. Create a reusable `PhoneField` component or just add inline

### Estimated Effort
**0.5 day** - Very simple

---

## Implementation Priority

| Priority | Feature | Effort | Impact | Dependencies |
|----------|---------|--------|--------|--------------|
| 1 | Quick Copy Phone | 0.5 day | High | None |
| 2 | Offline Status | 0.5 day | Medium | None |
| 3 | Pull-to-Refresh | 0.5 day | High | None |
| 4 | Low Stock Alert | 0.5 day | High | None |
| 5 | Order Templates | 1 day | High | None |
| 6 | Customer Order History | 1 day | Medium | Feature 5 |

**Total: ~4.5 days**

---

## Architecture Impact

### New Files
```
src/
├── composables/
│   ├── usePullRefresh.ts       (Feature 1)
│   └── useConnectionStatus.ts  (Feature 3)
```

### Modified Files
```
src/
├── stores/
│   └── orders.ts               (+1 function)
├── views/
│   ├── Layout.vue              (+offline indicator)
│   ├── Dashboard.vue           (+stock warning)
│   ├── Customers.vue           (+order info, copy phone)
│   ├── Orders.vue              (+repeat order, pull refresh)
│   ├── Stocks.vue              (+stock warning, pull refresh)
│   └── Deliveries.vue          (+pull refresh)
```

### No New Dependencies
All features use existing libraries (Vue 3, Element Plus).

---

## Testing Plan

### Manual Testing
1. Pull-to-refresh on each list page
2. Repeat order: Select customer → click fill → verify data
3. Offline indicator: Disable network → check indicator
4. Low stock: Set threshold → verify warning shows
5. Copy phone: Tap copy icon → paste elsewhere

### Automated Testing
Add unit tests for:
- `getLastOrderForCustomer()` function
- Pull-to-refresh composable
- Connection status composable

---

## Questions for User

Before implementing, please confirm:

1. **Order Templates**: Should "repeat last order" also copy the note?
2. **Low Stock Threshold**: Should this be configurable per user or fixed?
3. **Pull-to-Refresh**: Any preference on animation style?
4. **Customer Order History**: Is showing last order date + count sufficient?
