# Enhance Delivery Form to Support Express Shipping - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the "添加地址" / "编辑配送地址" form in OrderDetail.vue to support express delivery option, including company selection and weight input.

**Architecture:** Add delivery_method field to form, conditionally show express fields (company, weight), update save logic to pass these fields to the API.

**Tech Stack:** Vue 3, TypeScript, Element Plus

---

## Current State Analysis

### Form Fields (Missing Express Support)
```
┌─────────────────────────────────────┐
│ 添加配送地址                         │
├─────────────────────────────────────┤
│ 收货人: [____________]              │
│ 电话:   [____________]              │
│ 地址:   [____________]              │
│ 数量:   [1]                         │
│ 备注:   [____________]              │
├─────────────────────────────────────┤
│              [取消] [保存]           │
└─────────────────────────────────────┘
```

### Required Fields (Enhanced)
```
┌─────────────────────────────────────┐
│ 添加配送地址                         │
├─────────────────────────────────────┤
│ 收货人: [____________]              │
│ 电话:   [____________]              │
│ 地址:   [____________]              │
│ 数量:   [1]                         │
│ 配送方式: ○ 自送  ● 快递            │  ← NEW
│ ┌─────────────────────────────────┐ │
│ │ 快递公司: [顺丰速运 ▼]          │ │  ← NEW (when express)
│ │ 预估重量: [0.5] kg              │ │  ← NEW (when express)
│ └─────────────────────────────────┘ │
│ 备注:   [____________]              │
├─────────────────────────────────────┤
│              [取消] [保存]           │
└─────────────────────────────────────┘
```

---

## Task 1: Update deliveryForm Reactive State

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Find deliveryForm reactive**

Find the current `deliveryForm` reactive (search for `reactive({` near the top of script):

Current structure:
```typescript
const deliveryForm = reactive({
  recipient_name: '',
  recipient_phone: '',
  address: '',
  quantity: 1,
  location: null as { lng: number; lat: number } | null,
  delivery_note: '',
})
```

**Step 2: Add new fields**

Update to:
```typescript
const deliveryForm = reactive({
  recipient_name: '',
  recipient_phone: '',
  address: '',
  quantity: 1,
  location: null as { lng: number; lat: number } | null,
  delivery_note: '',
  // Express delivery fields
  delivery_method: 'self' as DeliveryMethod,
  express_company: '' as string,
  weight: undefined as number | undefined,
})
```

**Step 3: Add DeliveryMethod import**

Check if `DeliveryMethod` is imported from `@/types`. If not, add it:
```typescript
import type { Order, OrderStatus, OrderDelivery, DeliveryStatus, ExpressCompany, DeliveryMethod } from '@/types'
```

---

## Task 2: Update showAddDeliveryDialog Function

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Find the function**

Find `showAddDeliveryDialog` function (around line 667):

**Step 2: Update to include new fields**

```typescript
function showAddDeliveryDialog() {
  isAddDelivery.value = true
  editingDeliveryId.value = ''
  Object.assign(deliveryForm, {
    recipient_name: '',
    recipient_phone: '',
    address: '',
    quantity: 1,
    location: null,
    delivery_note: '',
    // Express delivery - default to self
    delivery_method: 'self' as DeliveryMethod,
    express_company: '',
    weight: undefined,
  })
  editDeliveryDialogVisible.value = true
}
```

---

## Task 3: Update showEditDeliveryDialog Function

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Find the function**

Find `showEditDeliveryDialog` function:

**Step 2: Update to include express fields**

```typescript
function showEditDeliveryDialog(delivery: OrderDelivery) {
  isAddDelivery.value = false
  editingDeliveryId.value = delivery.id
  Object.assign(deliveryForm, {
    recipient_name: delivery.recipient_name || '',
    recipient_phone: delivery.recipient_phone || '',
    address: delivery.address,
    quantity: delivery.quantity,
    location: delivery.location || null,
    delivery_note: delivery.delivery_note || '',
    // Express delivery fields
    delivery_method: delivery.delivery_method || 'self',
    express_company: delivery.express_company || '',
    weight: delivery.weight || undefined,
  })
  editDeliveryDialogVisible.value = true
}
```

---

## Task 4: Update saveDelivery Function

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Find saveDelivery function**

Find the function that saves the delivery (around line 681).

**Step 2: Update the addDelivery call**

Find the `orderStore.addDelivery` call and add express fields:

```typescript
// Add new delivery
const result = await orderStore.addDelivery(order.value!.id, {
  recipient_name: deliveryForm.recipient_name || undefined,
  recipient_phone: deliveryForm.recipient_phone || undefined,
  address: deliveryForm.address,
  quantity: deliveryForm.quantity,
  location: deliveryForm.location || undefined,
  delivery_note: deliveryForm.delivery_note || undefined,
  // Express delivery fields
  delivery_method: deliveryForm.delivery_method,
  express_company: deliveryForm.delivery_method === 'express' ? deliveryForm.express_company : undefined,
  weight: deliveryForm.delivery_method === 'express' ? deliveryForm.weight : undefined,
})
```

**Step 3: Update the updateDelivery call**

Find the `orderStore.updateDelivery` call and add express fields:

```typescript
// Update existing delivery
const result = await orderStore.updateDelivery(editingDeliveryId.value, {
  recipient_name: deliveryForm.recipient_name || undefined,
  recipient_phone: deliveryForm.recipient_phone || undefined,
  address: deliveryForm.address,
  quantity: deliveryForm.quantity,
  location: deliveryForm.location || undefined,
  delivery_note: deliveryForm.delivery_note || undefined,
  // Express delivery fields
  delivery_method: deliveryForm.delivery_method,
  express_company: deliveryForm.delivery_method === 'express' ? deliveryForm.express_company : undefined,
  weight: deliveryForm.delivery_method === 'express' ? deliveryForm.weight : undefined,
})
```

---

## Task 5: Update Dialog Template

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Find the delivery dialog template**

Find the `el-dialog` with `v-model="editDeliveryDialogVisible"` (around line 228).

**Step 2: Add delivery method and express fields**

After the "数量" form-item and before "备注", add:

```vue
<!-- Delivery Method -->
<el-form-item label="配送方式">
  <el-radio-group v-model="deliveryForm.delivery_method">
    <el-radio value="self">自送</el-radio>
    <el-radio value="express">快递</el-radio>
  </el-radio-group>
</el-form-item>

<!-- Express-specific fields -->
<template v-if="deliveryForm.delivery_method === 'express'">
  <el-form-item label="快递公司" required>
    <el-select
      v-model="deliveryForm.express_company"
      placeholder="选择快递公司"
      style="width: 100%"
    >
      <el-option
        v-for="company in expressCompanies"
        :key="company.id"
        :label="company.name"
        :value="company.code"
      />
    </el-select>
  </el-form-item>
  <el-form-item label="预估重量">
    <el-input-number
      v-model="deliveryForm.weight"
      :min="0.1"
      :max="999"
      :precision="1"
      :step="0.5"
      style="width: 100%"
      placeholder="kg"
    />
  </el-form-item>
</template>
```

**Step 3: Verify expressCompanies is available**

Check that `expressCompanies` is already defined in the component. If not, add:

```typescript
const expressCompanies = ref<ExpressCompany[]>([])

onMounted(async () => {
  // ... existing code ...
  expressCompanies.value = await fetchExpressCompanies()
})
```

---

## Task 6: Add Validation for Express

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Update saveDelivery validation**

Add validation at the start of `saveDelivery`:

```typescript
async function saveDelivery() {
  if (!deliveryForm.address) {
    ElMessage.error('请输入地址')
    return
  }

  // Validate express fields
  if (deliveryForm.delivery_method === 'express' && !deliveryForm.express_company) {
    ElMessage.error('请选择快递公司')
    return
  }

  // ... rest of function
}
```

---

## Task 7: Update Orders Store

**Files:**
- Modify: `src/stores/orders.ts`

**Step 1: Check addDelivery function**

Find the `addDelivery` function and verify it accepts the new fields:

```typescript
async function addDelivery(orderId: string, delivery: Partial<OrderDelivery>) {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('order_deliveries')
      .insert({
        order_id: orderId,
        recipient_name: delivery.recipient_name || undefined,
        recipient_phone: delivery.recipient_phone || undefined,
        address: delivery.address,
        quantity: delivery.quantity,
        location: delivery.location || undefined,
        delivery_note: delivery.delivery_note || undefined,
        // Express fields
        delivery_method: delivery.delivery_method || 'self',
        express_company: delivery.express_company || null,
        weight: delivery.weight || null,
        // Set express_status for express deliveries
        express_status: delivery.delivery_method === 'express' ? 'pending_pack' : null,
      })
      .select()
      .single()
    // ... rest
  }
}
```

**Step 2: Check updateDelivery function**

Find the `updateDelivery` function and add express fields:

```typescript
async function updateDelivery(deliveryId: string, updates: Partial<OrderDelivery>) {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('order_deliveries')
      .update({
        recipient_name: updates.recipient_name,
        recipient_phone: updates.recipient_phone,
        address: updates.address,
        quantity: updates.quantity,
        location: updates.location,
        delivery_note: updates.delivery_note,
        // Express fields
        delivery_method: updates.delivery_method,
        express_company: updates.express_company || null,
        weight: updates.weight || null,
        // Update express_status if switching to/from express
        express_status: updates.delivery_method === 'express' ? 'pending_pack' : null,
      })
      .eq('id', deliveryId)
      .select()
      .single()
    // ... rest
  }
}
```

---

## Task 6: Add CSS for Express Fields Section

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Add CSS for express fields**

Add to style section:

```css
/* Express fields section in delivery dialog */
.express-fields-section {
  background: #fafafa;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.express-fields-section .el-form-item {
  margin-bottom: 12px;
}

.express-fields-section .el-form-item:last-child {
  margin-bottom: 0;
}
```

---

## Task 7: Code Review

**Step 1: Review all changes**

Check for:
- TypeScript type safety
- Edge cases (switching between self/express)
- Proper null handling
- Mobile responsiveness

---

## Task 8: Testing and Deployment

**Step 1: Test add delivery**
1. Open OrderDetail
2. Click "添加地址"
3. Select "快递"
4. Choose company and enter weight
5. Save and verify data persists

**Step 2: Test edit delivery**
1. Edit an existing delivery
2. Switch from 自送 to 快递
3. Enter company and weight
4. Save and verify

**Step 3: Test validation**
1. Select 快递 without choosing company
2. Verify appropriate error message

**Step 4: Build and deploy**

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Update deliveryForm | OrderDetail.vue | Add delivery_method, express_company, weight |
| Update showAddDeliveryDialog | OrderDetail.vue | Initialize new fields |
| Update showEditDeliveryDialog | OrderDetail.vue | Load express fields from delivery |
| Update saveDelivery | OrderDetail.vue | Pass express fields to API |
| Update dialog template | OrderDetail.vue | Add radio + conditional express fields |
| Update addDelivery | orders.ts | Handle express fields + set express_status |
| Update updateDelivery | orders.ts | Handle express fields + update express_status |
| Add CSS | OrderDetail.vue | Style express fields section |
