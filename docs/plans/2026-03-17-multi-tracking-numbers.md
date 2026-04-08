# Multi-Tracking Number Support for Express Deliveries - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support multiple tracking numbers per express delivery, with optional different companies per package. Elegant display with expand/collapse on Orders page, full display on OrderDetail.

**Architecture:** New `tracking_numbers` JSONB field with array of `{number, company}` objects. Dialog with add/remove inputs. Backward compatible with existing `tracking_number` field.

**Tech Stack:** Vue 3, Pinia, Element Plus, Supabase (PostgreSQL)

---

## Data Model

### New Field Structure

```typescript
// New field in order_deliveries table
tracking_numbers: {
  items: [
    { number: "SF1234567890", company: "shunfeng" },
    { number: "SF1234567891", company: "shunfeng" },
  ]
}
```

### Backward Compatibility

- Keep existing `tracking_number` and `express_company` fields
- When reading: prefer `tracking_numbers.items[0]`, fall back to legacy fields
- When writing: update both new array and legacy fields
- Migration script to convert existing data

---

## Task 1: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add new interface**

Add before `OrderDelivery` interface:

```typescript
/**
 * Single tracking number entry with optional company override
 */
export interface TrackingNumberItem {
  number: string
  company?: string  // If different from delivery's express_company
}

/**
 * Tracking numbers container for backward compatibility
 */
export interface TrackingNumbersData {
  items: TrackingNumberItem[]
}
```

**Step 2: Update OrderDelivery interface**

Add new field to `OrderDelivery` interface (around line 77):

```typescript
export interface OrderDelivery {
  // ... existing fields ...
  tracking_number?: string           // Keep for backward compatibility
  tracking_numbers?: TrackingNumbersData  // NEW: multiple tracking numbers
  // ... rest of fields ...
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 2: Database Migration

**Files:**
- Create: Supabase migration (run via MCP or manual)

**Step 1: Add new column**

Execute via Supabase:

```sql
-- Add new JSONB column for multiple tracking numbers
ALTER TABLE order_deliveries
ADD COLUMN IF NOT EXISTS tracking_numbers JSONB DEFAULT '{"items": []}'::jsonb;

-- Migrate existing data
UPDATE order_deliveries
SET tracking_numbers = jsonb_build_object(
  'items', jsonb_build_array(
    jsonb_build_object(
      'number', tracking_number,
      'company', express_company
    )
  )
)
WHERE tracking_number IS NOT NULL
  AND tracking_number != ''
  AND (tracking_numbers IS NULL OR tracking_numbers = '{"items": []}'::jsonb);

-- Add index for JSONB queries (optional, for future search)
CREATE INDEX IF NOT EXISTS idx_order_deliveries_tracking_numbers
ON order_deliveries USING GIN (tracking_numbers);
```

**Step 2: Verify migration**

Query to check:
```sql
SELECT id, tracking_number, tracking_numbers
FROM order_deliveries
WHERE tracking_number IS NOT NULL
LIMIT 5;
```

---

## Task 3: Update Express API Functions

**Files:**
- Modify: `src/api/express.ts`

**Step 1: Add helper functions**

Add after imports:

```typescript
import type { TrackingNumberItem, TrackingNumbersData, OrderDelivery } from '@/types'

/**
 * Get all tracking numbers from a delivery (handles both new and legacy formats)
 */
export function getTrackingNumbers(delivery: OrderDelivery): TrackingNumberItem[] {
  // Prefer new format
  if (delivery.tracking_numbers?.items?.length) {
    return delivery.tracking_numbers.items
  }

  // Fall back to legacy single tracking number
  if (delivery.tracking_number) {
    return [{
      number: delivery.tracking_number,
      company: delivery.express_company || undefined
    }]
  }

  return []
}

/**
 * Get primary (first) tracking number
 */
export function getPrimaryTrackingNumber(delivery: OrderDelivery): TrackingNumberItem | null {
  const items = getTrackingNumbers(delivery)
  return items.length > 0 ? items[0] : null
}

/**
 * Build TrackingNumbersData from items
 */
export function buildTrackingNumbersData(items: TrackingNumberItem[]): TrackingNumbersData {
  return { items: items.filter(item => item.number?.trim()) }
}
```

**Step 2: Update updateExpressStatus function**

Find the `updateExpressStatus` function and update the `additionalData` parameter type and handling:

```typescript
export async function updateExpressStatus(
  deliveryId: string,
  status: ExpressStatus,
  additionalData?: {
    tracking_number?: string           // Legacy single
    tracking_numbers?: TrackingNumbersData  // New multiple
    express_company?: string
    express_data?: any
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // ... existing code ...

    const updates: any = { express_status: status }

    // Handle new tracking_numbers format
    if (additionalData?.tracking_numbers) {
      updates.tracking_numbers = additionalData.tracking_numbers
      // Also update legacy field for backward compatibility
      const firstItem = additionalData.tracking_numbers.items[0]
      if (firstItem) {
        updates.tracking_number = firstItem.number
        if (firstItem.company) {
          updates.express_company = firstItem.company
        }
      }
    } else if (additionalData?.tracking_number) {
      // Legacy single tracking number - update both
      updates.tracking_number = additionalData.tracking_number
      updates.tracking_numbers = {
        items: [{
          number: additionalData.tracking_number,
          company: additionalData.express_company
        }]
      }
    }

    // ... rest of existing code ...
  }
}
```

**Step 3: Update getTrackingUrl to handle TrackingNumberItem**

Add new function signature:

```typescript
/**
 * Get tracking URL for a single TrackingNumberItem
 */
export function getTrackingUrlFromItem(
  item: TrackingNumberItem,
  defaultCompany?: string | null
): string {
  const company = item.company || defaultCompany
  return getTrackingUrl(company || null, item.number)
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 4: Update Deliveries.vue - Tracking Dialog

**Files:**
- Modify: `src/views/Deliveries.vue`

**Step 1: Update imports**

Add to imports:

```typescript
import type { TrackingNumberItem } from '@/types'
import { getTrackingNumbers, buildTrackingNumbersData } from '@/api/express'
```

**Step 1.5: Add tracking number auto-detection function**

Add to `src/api/express.ts`:

```typescript
/**
 * Auto-detect express company from tracking number format
 * Returns company code (e.g., 'shunfeng', 'yuantong') or null if unknown
 */
export function detectCarrierFromTracking(trackingNumber: string): string | null {
  if (!trackingNumber || trackingNumber.length < 5) return null

  const num = trackingNumber.toUpperCase().trim()

  // 顺丰 (SF) - starts with SF + 12 digits, or 12-15 digit format
  if (num.startsWith('SF') || /^\d{12,15}$/.test(num)) {
    return 'shunfeng'
  }

  // 圆通 (YT) - starts with YT
  if (num.startsWith('YT')) {
    return 'yuantong'
  }

  // 中通 (ZT) - starts with ZT or 73x, 75x, 76x, 77x, 78x
  if (num.startsWith('ZT') || /^7[35678]\d{10,}/.test(num)) {
    return 'zhongtong'
  }

  // 韵达 (YD) - starts with YD or 10-13 digit format starting with specific prefixes
  if (num.startsWith('YD') || /^(10|11|12|13|14|15|16|17|18|19|31|32|33|36|39|46|50|58|59|61|66|68|70|71)\d{8,}$/.test(num)) {
    return 'yunda'
  }

  // 京东 (JD) - starts with JD
  if (num.startsWith('JD')) {
    return 'jd'
  }

  // 极兔 (JT) - starts with JT or JTX
  if (num.startsWith('JT')) {
    return 'jtexpress'
  }

  // EMS - 13 chars, starts with E, ends with CN
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(num) && num.endsWith('CN')) {
    return 'ems'
  }

  // 申通 (ST) - starts with 268, 368, 468, 668, 768, 868, 968
  if (/^[2346789]68\d{9,}/.test(num)) {
    return 'shentong'
  }

  // 百世/汇通 (HT) - starts with HT
  if (num.startsWith('HT')) {
    return 'huitongkuaidi'
  }

  // 德邦 (DP) - starts with DP or DPD
  if (num.startsWith('DP')) {
    return 'debangwuliu'
  }

  return null
}
```

**Step 2: Update tracking form reactive**

Find `trackingForm` and update:

```typescript
const trackingDialogVisible = ref(false)
const trackingForm = reactive({
  deliveryId: '',
  defaultCompany: '',  // The delivery's express_company
  items: [] as TrackingNumberItem[],
})
```

**Step 3: Update openTrackingDialog function**

Find and replace the function:

```typescript
function openTrackingDialog(delivery: any) {
  trackingForm.deliveryId = delivery.id
  trackingForm.defaultCompany = delivery.express_company || ''

  // Load existing tracking numbers
  const existing = getTrackingNumbers(delivery as OrderDelivery)
  trackingForm.items = existing.length > 0
    ? [...existing]
    : [{ number: '', company: undefined }]

  trackingDialogVisible.value = true
}
```

**Step 4: Add helper functions for dialog**

Add after the above function:

```typescript
function addTrackingItem() {
  trackingForm.items.push({
    number: '',
    company: trackingForm.defaultCompany || undefined
  })
}

function removeTrackingItem(index: number) {
  if (trackingForm.items.length > 1) {
    trackingForm.items.splice(index, 1)
  } else {
    // Keep at least one input
    trackingForm.items[0] = { number: '', company: undefined }
  }
}

/**
 * Auto-detect carrier from tracking number and set company if empty
 */
function onTrackingNumberInput(index: number) {
  const item = trackingForm.items[index]
  if (!item || !item.number || item.company) return

  // Only auto-detect if company not already set
  const detected = detectCarrierFromTracking(item.number)
  if (detected) {
    item.company = detected
  }
}

/**
 * Clear company if user wants to override auto-detection
 */
function clearTrackingCompany(index: number) {
  const item = trackingForm.items[index]
  if (item) {
    item.company = undefined
  }
}
```

**Step 4.5: Import detectCarrierFromTracking**

Add to imports:

```typescript
import { getTrackingNumbers, buildTrackingNumbersData, detectCarrierFromTracking } from '@/api/express'
```

**Step 5: Update saveTrackingNumber function**

Find and replace:

```typescript
async function saveTrackingNumber() {
  // Filter out empty items
  const validItems = trackingForm.items.filter(
    item => item.number?.trim()
  )

  if (validItems.length === 0) {
    ElMessage.warning('请至少输入一个运单号')
    return
  }

  // Set default company for items without company
  const itemsWithCompany = validItems.map(item => ({
    number: item.number.trim(),
    company: item.company || trackingForm.defaultCompany || undefined
  }))

  try {
    const result = await updateExpressStatus(
      trackingForm.deliveryId,
      'pending_dropoff',
      {
        tracking_numbers: buildTrackingNumbersData(itemsWithCompany),
        express_company: trackingForm.defaultCompany || undefined,
      }
    )

    if (result.success) {
      ElMessage.success(`已保存 ${itemsWithCompany.length} 个运单号`)
      trackingDialogVisible.value = false
      await refreshExpressList()
    } else {
      ElMessage.error(result.error || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  }
}
```

**Step 6: Update dialog template**

Find the tracking dialog template (around line 794) and replace:

```vue
<!-- Tracking Number Dialog -->
<el-dialog
  v-model="trackingDialogVisible"
  title="输入运单号"
  width="450px"
  :close-on-click-modal="false"
>
  <div class="tracking-dialog-content">
    <div class="tracking-tip">
      默认快递公司：{{ getExpressCompanyName(trackingForm.defaultCompany) || '未设置' }}
      <span class="tracking-tip-hint">（运单号自动识别，可手动修改）</span>
    </div>

    <div class="tracking-items">
      <div
        v-for="(item, index) in trackingForm.items"
        :key="index"
        class="tracking-item-row"
      >
        <el-input
          v-model="item.number"
          placeholder="请输入运单号"
          clearable
          class="tracking-number-input"
          @input="onTrackingNumberInput(index)"
          @keyup.enter="saveTrackingNumber"
        >
          <template #suffix v-if="item.company && item.company !== trackingForm.defaultCompany">
            <el-tag size="small" type="info">{{ getExpressCompanyName(item.company) }}</el-tag>
          </template>
        </el-input>
        <el-select
          v-model="item.company"
          :placeholder="getExpressCompanyName(trackingForm.defaultCompany) || '选择公司'"
          clearable
          class="tracking-company-select"
        >
          <el-option
            v-for="company in expressCompanies"
            :key="company.code"
            :label="company.name"
            :value="company.code"
          />
        </el-select>
        <el-button
          :icon="Delete"
          circle
          text
          @click="removeTrackingItem(index)"
          :disabled="trackingForm.items.length === 1 && !item.number"
        />
      </div>
    </div>

    <el-button
      type="primary"
      link
      @click="addTrackingItem"
      class="add-tracking-btn"
    >
      <el-icon><Plus /></el-icon>
      添加运单号
    </el-button>
  </div>

  <template #footer>
    <el-button @click="trackingDialogVisible = false">取消</el-button>
    <el-button type="primary" @click="saveTrackingNumber">保存</el-button>
  </template>
</el-dialog>
```

**Step 7: Add CSS for dialog**

Add to style section:

```css
/* Tracking dialog styles */
.tracking-dialog-content {
  padding: 0 4px;
}

.tracking-tip {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.tracking-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tracking-item-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tracking-number-input {
  flex: 1;
}

.tracking-company-select {
  width: 100px;
}

.add-tracking-btn {
  margin-top: 12px;
}

@media (max-width: 480px) {
  .tracking-item-row {
    flex-wrap: wrap;
  }

  .tracking-number-input {
    width: 100%;
  }

  .tracking-company-select {
    width: calc(100% - 40px);
  }
}
```

**Step 8: Update tracking number display in table**

Find the tracking_number column template (around line 437) and update:

```vue
<el-table-column prop="tracking_number" label="运单号" min-width="140">
  <template #default="{ row }">
    <div v-if="row.tracking_number || row.tracking_numbers?.items?.length" class="tracking-cell">
      <template v-for="(item, idx) in getTrackingNumbers(row)" :key="item.number">
        <div v-if="idx === 0" class="tracking-main">
          <a
            :href="getTrackingUrl(item.company || row.express_company, item.number)"
            target="_blank"
            rel="noopener noreferrer"
            class="tracking-link"
          >{{ item.number }}</a>
          <el-button
            v-if="getTrackingNumbers(row).length > 1"
            link
            size="small"
            @click="toggleTrackingExpand(row.id)"
            class="tracking-more-btn"
          >
            +{{ getTrackingNumbers(row).length - 1 }}
          </el-button>
        </div>
        <div
          v-else-if="expandedTrackingRows.has(row.id)"
          class="tracking-extra"
        >
          <a
            :href="getTrackingUrl(item.company || row.express_company, item.number)"
            target="_blank"
            rel="noopener noreferrer"
            class="tracking-link"
          >{{ item.number }}</a>
        </div>
      </template>
    </div>
    <span v-else style="color: #909399;">未填写</span>
  </template>
</el-table-column>
```

**Step 9: Add expand state**

Add to reactive state:

```typescript
const expandedTrackingRows = ref(new Set<string>())

function toggleTrackingExpand(deliveryId: string) {
  if (expandedTrackingRows.value.has(deliveryId)) {
    expandedTrackingRows.value.delete(deliveryId)
  } else {
    expandedTrackingRows.value.add(deliveryId)
  }
}
```

**Step 10: Add CSS for tracking cell**

```css
.tracking-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tracking-main {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tracking-more-btn {
  font-size: 11px;
  padding: 0 4px;
}

.tracking-extra {
  padding-left: 4px;
  font-size: 12px;
}
```

**Step 11: Update button text for existing tracking numbers**

Find the "输入运单号" button and update condition:

```vue
<el-button
  v-if="!row.tracking_number && !row.tracking_numbers?.items?.length"
  text
  type="primary"
  @click="openTrackingDialog(row)"
>
  输入运单号
</el-button>
<el-button
  v-else
  text
  type="primary"
  @click="openTrackingDialog(row)"
>
  编辑运单号
</el-button>
```

**Step 12: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 5: Update OrderDetail.vue - Full Display

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Add imports**

```typescript
import { getTrackingNumbers } from '@/api/express'
```

**Step 2: Update tracking number display template**

Find the tracking number display (around line 154) and replace:

```vue
<!-- Tracking Numbers -->
<div v-if="getTrackingNumbers(delivery).length > 0" class="tracking-numbers-section">
  <p class="tracking-label">
    <strong>运单号：</strong>
  </p>
  <div class="tracking-numbers-list">
    <div
      v-for="(item, index) in getTrackingNumbers(delivery)"
      :key="item.number"
      class="tracking-number-item"
    >
      <span class="tracking-index">{{ index + 1 }}.</span>
      <a
        :href="getTrackingUrl(item.company || delivery.express_company, item.number)"
        target="_blank"
        rel="noopener noreferrer"
        class="tracking-link"
      >{{ item.number }}</a>
      <el-tag
        v-if="item.company && item.company !== delivery.express_company"
        size="small"
        type="info"
        class="company-tag"
      >
        {{ getExpressCompanyName(item.company) }}
      </el-tag>
      <el-button
        link
        size="small"
        @click="handleCopyTracking(item.number)"
      >
        <el-icon><CopyDocument /></el-icon>
      </el-button>
    </div>
  </div>
</div>
```

**Step 3: Add helper function**

```typescript
function getExpressCompanyName(code: string): string {
  const company = expressCompanies.value.find(c => c.code === code)
  return company?.name || code
}
```

**Step 4: Add CSS**

```css
.tracking-numbers-section {
  margin: 8px 0;
}

.tracking-label {
  margin-bottom: 4px;
}

.tracking-numbers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.tracking-number-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tracking-index {
  color: #909399;
  font-size: 12px;
  min-width: 16px;
}

.company-tag {
  margin-left: 4px;
}
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 6: Update Orders.vue - Expandable Display

**Files:**
- Modify: `src/views/Orders.vue`

**Step 1: Add imports**

```typescript
import { getTrackingNumbers } from '@/api/express'
```

**Step 2: Update tracking number column in deliveries table**

Find the tracking number column in the expandable deliveries section (around line 157) and update:

```vue
<el-table-column label="运单号" width="160">
  <template #default="{ row: delivery }">
    <div v-if="delivery.delivery_method === 'express'" class="tracking-cell">
      <template v-if="getTrackingNumbers(delivery).length > 0">
        <div class="tracking-main-row">
          <a
            :href="getTrackingUrl(
              getTrackingNumbers(delivery)[0].company || delivery.express_company,
              getTrackingNumbers(delivery)[0].number
            )"
            target="_blank"
            rel="noopener noreferrer"
            class="tracking-link"
          >{{ getTrackingNumbers(delivery)[0].number }}</a>
          <el-button
            link
            size="small"
            @click="handleCopyTracking(getTrackingNumbers(delivery)[0].number)"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
          <el-button
            v-if="getTrackingNumbers(delivery).length > 1"
            link
            size="small"
            type="primary"
            @click="toggleOrdersTrackingExpand(delivery.id)"
          >
            +{{ getTrackingNumbers(delivery).length - 1 }}个
          </el-button>
        </div>
        <div
          v-if="expandedTrackingDeliveries.has(delivery.id) && getTrackingNumbers(delivery).length > 1"
          class="tracking-extra-list"
        >
          <div
            v-for="(item, idx) in getTrackingNumbers(delivery).slice(1)"
            :key="item.number"
            class="tracking-extra-item"
          >
            <a
              :href="getTrackingUrl(item.company || delivery.express_company, item.number)"
              target="_blank"
              rel="noopener noreferrer"
              class="tracking-link"
            >{{ item.number }}</a>
            <el-button
              link
              size="small"
              @click="handleCopyTracking(item.number)"
            >
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      <span v-else class="text-muted">-</span>
    </div>
    <span v-else class="text-muted">-</span>
  </template>
</el-table-column>
```

**Step 3: Add expand state**

```typescript
const expandedTrackingDeliveries = ref(new Set<string>())

function toggleOrdersTrackingExpand(deliveryId: string) {
  if (expandedTrackingDeliveries.value.has(deliveryId)) {
    expandedTrackingDeliveries.value.delete(deliveryId)
  } else {
    expandedTrackingDeliveries.value.add(deliveryId)
  }
}
```

**Step 4: Add CSS**

```css
.tracking-cell {
  display: flex;
  flex-direction: column;
}

.tracking-main-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tracking-extra-list {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #e4e7ed;
}

.tracking-extra-item {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
  padding-left: 8px;
}
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 7: Code Review

**Step 1: Review all changes with Opus**

Launch code-reviewer agent to check:
- Type safety
- Edge cases (empty arrays, undefined values)
- CSS consistency
- Mobile responsiveness
- Backward compatibility

**Step 2: Fix any issues found**

---

## Task 8: Testing and Deployment

**Step 1: Test dialog**
1. Open Deliveries → 快递发货 tab
2. Click "输入运单号" on a delivery
3. Add multiple tracking numbers
4. Set different company on second item
5. Save and verify data persists

**Step 2: Test display**
1. Check OrderDetail shows all tracking numbers
2. Check Orders expandable row shows expand/collapse
3. Check Deliveries table shows expand/collapse

**Step 3: Test backward compatibility**
1. View delivery with only legacy `tracking_number`
2. Verify it displays correctly
3. Update it and verify both fields update

**Step 4: Deploy**

Run: `npm run build && npx wrangler pages deploy dist --project-name=tomato-admin --branch=master`

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Add types | types/index.ts | TrackingNumberItem, TrackingNumbersData |
| Add migration | SQL | tracking_numbers JSONB column |
| Add helpers | api/express.ts | getTrackingNumbers, buildTrackingNumbersData |
| Update dialog | Deliveries.vue | Multi-input with add/remove |
| Update display | Deliveries.vue | Expand/collapse in table |
| Update display | OrderDetail.vue | Full list of all tracking numbers |
| Update display | Orders.vue | Expand/collapse in expandable rows |
