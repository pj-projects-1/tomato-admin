# Express Status Dropdown Design

**Date:** 2026-04-11

## Problem

The 快递发货 tab's status operations are a one-way conveyor belt:
- Single button advances to next status, no visibility of full pipeline
- No way to correct a wrong status click
- No way to flag exception/abnormal state
- No indication of what comes next

## Solution

Replace the status-advance button with a **dropdown triggered by the status tag**.

### Trigger
Current status tag is clickable → opens dropdown menu.

### Menu structure (normal state)
```
✓ 待包装          (current, highlighted)
  待打印面单      (next — styled as primary suggestion)
  待寄件
  运输中
  已签收
  ─────────
  ⚠ 标记异常
```

### Menu structure (exception state)
```
  待包装
  待打印面单
  待寄件
  运输中
  已签收
  ─────────
  ⚠ 异常          (current)
  恢复为待包装
  恢复为待打印
  恢复为待寄件
  恢复为运输中
```

### Confirmation behavior
- **Next status**: ElMessage.success (no dialog)
- **Non-adjacent status**: ElMessageBox.confirm
- **Mark exception**: ElMessageBox.confirm
- **Reset from exception**: ElMessageBox.confirm

### Layout changes
- Desktop: Status column becomes dropdown, remove advance-status button from action column
- Mobile: Status tag becomes dropdown, remove advance-status button from card footer
- Keep tracking number button as-is

## Files to modify

1. `src/views/Deliveries.vue` — template, script, styles
