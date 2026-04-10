# Pickup Table Layout Fix Design

**Date:** 2026-04-11

## Problem

The 自提管理 tab's el-table uses fixed `width` on all columns (totaling ~770px). On wider screens, the table doesn't stretch to fill the viewport, leaving a visible gap on the right. The 自送配送 and 快递发货 tabs use `min-width` on key columns, so they naturally expand.

## Solution

Change expandable columns from `width` to `min-width`:
- 客户: `width="100"` → `min-width="100"`
- 联系电话: `width="115"` → `min-width="115"`

Keep fixed-width columns as-is (数量, 状态, 时间, 操作).

## Files to Modify

1. `src/views/Deliveries.vue` — two-column width change in pickup table
