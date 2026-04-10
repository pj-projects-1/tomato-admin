# Unified Export Design

**Date:** 2026-04-10
**Scope:** Deliveries page — all 3 tabs

---

## Problem

- Export button only exists in the 自送配送 tab
- 快递发货 and 自提管理 tabs have no export functionality
- 自送配送 tab has no filters (other tabs do)
- Inconsistent UX across tabs

## Solution

### 1. Tab-Aware Export Button

Move export button to shared header area above tabs. Button adapts to current `activeTab`:
- "导出 (N条自送)" / "导出 (N条快递)" / "导出 (N条自提)"
- Exports only filtered data from the current tab
- Count reflects filtered count, not total

### 2. Add Filters to 自送配送 Tab

Add status filter dropdown matching existing filter style:
- Options: 全部 / 待配送 / 配送中 / 已送达
- Filters `deliveryStore.pendingDeliveries` by delivery status

### 3. Export Columns Per Tab

**自送配送:**
客户, 订单号, 收件人, 电话, 地址, 数量, 状态, 配送任务, 创建时间

**快递发货:**
客户, 订单号, 快递公司, 运单号, 状态, 收件人, 电话, 地址, 数量, 创建时间

**自提管理:**
客户, 订单号, 数量, 状态, 联系电话, 下单时间, 自提时间

### 4. New Export Functions

Add to `src/api/export.ts`:
- `exportExpressDeliveries(deliveries)` — express tab data
- `exportPickupDeliveries(deliveries)` — pickup tab data
- Update `exportPendingDeliveries()` to accept pre-filtered data

### 5. Format

CSV with UTF-8 BOM for Chinese Excel compatibility (existing pattern).

## Files to Modify

1. `src/api/export.ts` — add 2 new export functions, update existing
2. `src/views/Deliveries.vue` — move export button, add 自送 filters, wire up tab-aware export
