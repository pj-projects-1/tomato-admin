# Stock Indicator in Order Creation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show current stock level during order creation with real-time validation, helping users avoid creating orders that exceed available stock.

**Architecture:** Fetch stock on dialog open, display in a subtle info banner, update validation state as user changes quantity. Keep UI minimal - no extra rows, integrate into existing layout.

**Tech Stack:** Vue 3, Pinia, Element Plus

---

## Task 1: Add Stock Fetch on Dialog Open

**Files:**
- Modify: `src/views/Orders.vue`

**Step 1: Import stock store and add reactive state**

In the script section, add import and state:

```typescript
import { useStockStore } from '@/stores/stocks'

const stockStore = useStockStore()
```

**Step 2: Fetch stock when dialog opens**

Find the `showAddDialog` function and add stock fetch:

```typescript
function showAddDialog() {
  editingId.value = ''
  Object.assign(form, {
    customer_id: '',
    total_boxes: 1,
    unit_price: undefined,
    total_amount: undefined,
    payment_method: undefined,
    note: '',
    deliveries: [createEmptyDelivery()],
  })
  // Fetch current stock when opening dialog
  stockStore.fetchCurrentBalance()
  dialogVisible.value = true
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 2: Add Stock Info Banner in Dialog

**Files:**
- Modify: `src/views/Orders.vue`

**Step 1: Add computed property for stock status**

Add after the form reactive:

```typescript
const stockStatus = computed(() => {
  const stock = stockStore.currentBalance
  const needed = form.total_boxes || 0
  const sufficient = stock >= needed
  return { stock, needed, sufficient }
})
```

**Step 2: Add stock banner in dialog template**

Add right after `<el-form>` opening tag, before the first `<el-row>`:

```html
<!-- Stock Info Banner -->
<div class="stock-banner" :class="{ 'is-warning': !stockStatus.sufficient }">
  <span class="stock-label">当前库存</span>
  <span class="stock-value">{{ stockStatus.stock }}箱</span>
  <span class="stock-divider">|</span>
  <span class="stock-label">本单需求</span>
  <span class="stock-value" :class="{ 'text-danger': !stockStatus.sufficient }">
    {{ stockStatus.needed }}箱
  </span>
  <el-icon v-if="!stockStatus.sufficient" class="stock-warning-icon">
    <WarningFilled />
  </el-icon>
</div>
```

**Step 3: Add CSS for stock banner**

Add to the `<style scoped>` section:

```css
/* Stock banner in order dialog */
.stock-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  background: #f0f9eb;
  border-radius: 4px;
  font-size: 14px;
}

.stock-banner.is-warning {
  background: #fef0f0;
}

.stock-label {
  color: #909399;
}

.stock-value {
  font-weight: 600;
  color: #303133;
}

.stock-value.text-danger {
  color: #f56c6c;
}

.stock-divider {
  color: #dcdfe6;
  margin: 0 4px;
}

.stock-warning-icon {
  color: #f56c6c;
  margin-left: auto;
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 3: Add Submit Validation

**Files:**
- Modify: `src/views/Orders.vue`

**Step 1: Add validation in handleSubmit**

Find the `handleSubmit` function and add stock check at the beginning:

```typescript
async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  // Check stock before submit
  if (!stockStatus.value.sufficient) {
    ElMessage.warning(`库存不足！当前 ${stockStatus.value.stock} 箱，需要 ${stockStatus.value.needed} 箱`)
    return
  }

  // ... rest of existing code
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 4: Testing and Verification

**Step 1: Manual test - Normal case**
1. Open order dialog
2. Verify stock banner shows current stock
3. Enter quantity less than stock
4. Verify no warning shown
5. Submit order - should succeed

**Step 2: Manual test - Insufficient stock**
1. Open order dialog
2. Enter quantity greater than stock
3. Verify banner turns red with warning icon
4. Submit order - should show warning message and prevent submission

**Step 3: Build and deploy**

Run: `npm run build`
Expected: Build succeeds

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Import stock store | Orders.vue | Use stockStore for current balance |
| Fetch on dialog open | Orders.vue | Get current stock when creating order |
| Add computed | Orders.vue | stockStatus for real-time validation |
| Add banner UI | Orders.vue | Clean inline stock display |
| Add CSS | Orders.vue | Subtle green/red theming |
| Add submit validation | Orders.vue | Prevent insufficient stock orders |
