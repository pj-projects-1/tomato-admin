# Theme Unification Design

**Date:** 2026-04-10

---

## Current Problem

The app has **two competing visual identities**:
- **Deliveries.vue**: Rich organic palette (tomato-red, earth-brown, harvest-gold, cream, soft-sage) — warm, farm-appropriate
- **All other views + Layout sidebar**: Generic Element Plus defaults (#409EFF blue, #67C23A green, #E6A23C orange) — corporate, forgettable

This creates a jarring experience when navigating between views. The Deliveries page feels like a farm app; the rest feels like any admin template.

## Design Direction

**Extend the Deliveries.vue organic identity across the entire app.** The palette already exists and is well-chosen for an organic tomato business — it just needs to be global, not siloed.

### Unified Color System

**Brand palette** (elevated from Deliveries.vue → global):
- `--tomato-red: #C84B31` — primary action color (replaces #409EFF blue)
- `--tomato-red-light: #EC6B4F` — hover/active states
- `--tomato-red-dark: #A33D28` — pressed states
- `--harvest-gold: #D4A574` — warm accent, secondary actions
- `--earth-brown: #5C4033` — headings, primary text
- `--cream: #FDF6E3` — page background tint (replaces #f5f7fa)
- `--soft-sage: #7D9D6C` — success/delivered (replaces #67C23A generic green)
- `--soft-sage-light: #B8C9A8` — success backgrounds
- `--warm-gray: #6B5B50` — body text (replaces #606266)
- `--warm-gray-light: #A89888` — secondary text (replaces #909399)

**Status colors** (unified across all views):

| Status | Text Color | Background | CSS Class |
|--------|-----------|------------|-----------|
| Pending/待确认/待包装 | `--harvest-gold` | `#FDF6EC` | `.status-tag--pending` |
| Confirmed/已分配/待打印 | `--tomato-red` | `#FDF0EC` | `.status-tag--confirmed` |
| Delivering/配送中/运输中 | `--soft-sage` | `#E8FAF8` | `.status-tag--delivering` |
| Delivered/Completed/已送达 | `--soft-sage` | `#EEF5E9` | `.status-tag--delivered` |
| Cancelled/Exception | `#CF4B3F` | `#FEF0F0` | `.status-tag--danger` |
| Info/Assigned | `--warm-gray` | `#F4F4F5` | `.status-tag--info` |

**Sidebar** (Layout.vue):
- Background: `#3D2B1F` (warm dark brown, not generic #304156 blue-gray)
- Text: `#D4C4B0` (warm cream)
- Active: `--tomato-red`

### Typography
- Replace Inter with a warmer, more distinctive font (e.g., Noto Sans SC for Chinese clarity)
- Headings: `--earth-brown`
- Body: `--warm-gray`

### What Gets Removed/Replaced
- All inline `style="{ color, backgroundColor }"` on el-tags → CSS utility classes
- JS color helper functions (`getExpressStatusColor`, `getStatusColor`, etc.) → CSS classes
- Generic Element Plus blue (#409EFF) → `--tomato-red`
- Generic #304156 sidebar → warm brown
- Case inconsistencies (uppercase/lowercase hex) → eliminated entirely

### Files to Create/Modify

**Create:**
1. `src/styles/theme.css` — All CSS variables + utility classes

**Modify:**
2. `src/style.css` — Import theme.css, replace global colors
3. `src/main.ts` or `src/App.vue` — Ensure theme import
4. `src/views/Layout.vue` — Sidebar warm brown + tomato-red active
5. `src/views/Dashboard.vue` — Stat cards use brand palette, status classes
6. `src/views/Orders.vue` — Status classes, brand primary
7. `src/views/OrderDetail.vue` — Status classes
8. `src/views/Customers.vue` — Status classes
9. `src/views/Stocks.vue` — Type colors use sage/tomato
10. `src/views/Deliveries.vue` — Remove local variables (use global), status classes

### Migration Strategy
1. Create theme.css with all variables + utility classes
2. Import globally
3. Migrate views one at a time (each view should work before moving to next)
4. Remove JS color functions last (after all views migrated)
