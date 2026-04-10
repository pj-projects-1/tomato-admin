# Deliveries Page Redesign Plan

## Problem
The tabs were accidentally removed in commit `0db4f87`. The page needs:
1. Tab structure restored (自送配送, 快递发货)
2. New 自提管理 tab added
3. Header buttons moved inside the self-delivery tab (not global)
4. URL query parameter handling for deep links from TodayTasks

## Solution Architecture

### Page Structure
```
配送规划 (Page Title)
├── el-tabs
│   ├── 自送配送 tab
│   │   ├── Header buttons (出发地, 结束地, 环形, 创建任务, 导出)
│   │   ├── Left: 待配送订单
│   │   └── Right: 配送任务
│   ├── 快递发货 tab
│   │   └── 快递订单 list with filters
│   └── 自提管理 tab
│       ├── 待自提 orders
│       └── 已自提 orders
└── Dialogs (unchanged)
```

### Data Sources
| Tab | Data Source | Status Field |
|-----|-------------|--------------|
| 自送配送 | `deliveryStore.pendingDeliveries` (delivery_method = null/self) | `status: pending/assigned/delivering/delivered` |
| 快递发货 | Express API (delivery_method = 'express') | `express_status: pending_pack/...` |
| 自提管理 | New API (delivery_method = 'pickup') | `pickup_status: pending/picked_up` |

### URL Parameters
- `?tab=self` → 自送配送
- `?tab=express` → 快递发货
- `?tab=pickup` → 自提管理
- `?highlight=<id>` → Scroll to and highlight specific delivery

## Implementation Steps

### Step 1: Add pickup API functions
- `fetchPickupDeliveries()` - fetch pickups
- `updatePickupStatus()` - mark as picked up

### Step 2: Rewrite Deliveries.vue with tabs
- Restore from commit 3dcc0ec
- Move header buttons inside 自送配送 tab
- Add pickup tab
- Add URL parameter handling in onMounted

### Step 3: Verify deep links work
- TodayTasks → `/deliveries?tab=pickup`
- TodayTasks → `/deliveries?tab=express`
- OrderDetail → `/deliveries?tab=express&highlight=<id>`
