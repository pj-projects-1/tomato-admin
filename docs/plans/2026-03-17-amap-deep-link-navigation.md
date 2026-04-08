# Amap Deep-Link Navigation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When clicking "开始导航" on mobile, directly open Amap app with the route. If app not installed, fallback to web version seamlessly.

**Architecture:** Create a smart deep-link utility that tries `amapuri://` scheme first, detects if app opened via visibility check, falls back to `uri.amap.com` if not.

**Tech Stack:** Vue 3, TypeScript

---

## Technical Design

### Deep Link Strategy

```
Mobile Flow:
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "开始导航"                                    │
│ 2. Generate amapuri://route/plan/ URL                       │
│ 3. Try opening via hidden iframe                            │
│ 4. Start 500ms timer                                        │
│ 5. Check: Did page lose visibility?                         │
│    ├─ Yes → app opened, done!                               │
│    └─ No → timer fires, open uri.amap.com web link          │
└─────────────────────────────────────────────────────────────┘

Desktop Flow:
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "开始导航"                                    │
│ 2. Open uri.amap.com in new tab (existing behavior)         │
└─────────────────────────────────────────────────────────────┘
```

### URL Formats

**Native App (amapuri://):**
```
amapuri://route/plan/
  ?slat=39.92848272          # start latitude
  &slon=116.39560823         # start longitude
  &sname=A                   # start name (encoded)
  &dlat=39.98848272          # end latitude
  &dlon=116.47560823         # end longitude
  &dname=B                   # end name (encoded)
  &t=0                       # 0=driving
  &dev=0                     # coordinates already GCJ-02
  &m=4                       # avoid traffic
  &vian=2                    # via point count
  &vialons=116.8|116.5       # pipe-separated
  &vialats=39.5|39.7         # pipe-separated
  &vianames=途经点1|途经点2    # pipe-separated
```

**Web Fallback (uri.amap.com):**
```
https://uri.amap.com/navigation
  ?from=116.39,39.92,起点
  &to=116.47,39.98,终点
  &via=lon1,lat1,name1;lon2,lat2,name2
  &mode=car
  &policy=1
  &coordinate=gaode
  &callnative=1
```

---

## Task 1: Create Deep Link Utility Function

**Files:**
- Modify: `src/api/export.ts`

**Step 1: Add generateAmapUriScheme function**

Add after the existing `generateAmapAutoNavLink` function:

```typescript
/**
 * Generate Amap native URI scheme for direct app launch
 * Format: amapuri://route/plan/?slat=...&slon=...&dlat=...&dlon=...
 *
 * @param departure - Starting point with coordinates
 * @param destination - End point with coordinates
 * @param deliveries - Via points (delivery stops)
 */
export function generateAmapUriScheme(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: any[]
): string | null {
  // Filter deliveries with valid coordinates
  const validDeliveries = deliveries.filter(d => d.location?.lng && d.location?.lat)
  if (validDeliveries.length === 0) return null

  const params = new URLSearchParams()

  // Start point
  params.set('slat', departure.lat.toString())
  params.set('slon', departure.lng.toString())
  params.set('sname', departure.address || '起点')

  // End point (last delivery or destination)
  const endPoint = validDeliveries.length > 0
    ? { lng: validDeliveries[validDeliveries.length - 1].location.lng, lat: validDeliveries[validDeliveries.length - 1].location.lat, address: validDeliveries[validDeliveries.length - 1].address }
    : destination
  params.set('dlat', endPoint.lat.toString())
  params.set('dlon', endPoint.lng.toString())
  params.set('dname', endPoint.address || '终点')

  // Route type: 0=driving
  params.set('t', '0')

  // Coordinates are GCJ-02 (Amap's native format)
  params.set('dev', '0')

  // Route preference: 4=avoid traffic
  params.set('m', '4')

  // Via points (exclude last one as it's the destination)
  const viaPoints = validDeliveries.slice(0, -1)
  if (viaPoints.length > 0) {
    params.set('vian', viaPoints.length.toString())
    params.set('vialons', viaPoints.map(d => d.location.lng).join('|'))
    params.set('vialats', viaPoints.map(d => d.location.lat).join('|'))
    params.set('vianames', viaPoints.map(d => d.address || '途经点').join('|'))
  }

  return `amapuri://route/plan/?${params.toString()}`
}
```

**Step 2: Add smart deep link launcher function**

Add after the above function:

```typescript
/**
 * Smart navigation launcher with app fallback
 * - On mobile: tries amapuri:// app first, falls back to web
 * - On desktop: opens web version directly
 *
 * @param departure - Starting point
 * @param destination - End point
 * @param deliveries - Via points
 * @param onFallback - Optional callback when falling back to web
 */
export function launchAmapNavigation(
  departure: { lng: number; lat: number; address: string },
  destination: { lng: number; lat: number; address: string },
  deliveries: any[],
  onFallback?: () => void
): boolean {
  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Desktop: open web version directly
  if (!isMobile) {
    const webLink = generateAmapNavigationLink(departure, destination, deliveries)
    if (webLink) {
      window.open(webLink, '_blank')
      return true
    }
    return false
  }

  // Mobile: try app first with fallback
  const appLink = generateAmapUriScheme(departure, destination, deliveries)
  const webLink = generateAmapNavigationLink(departure, destination, deliveries)

  if (!appLink || !webLink) return false

  // Try opening app via iframe (works better than window.location for detection)
  let appOpened = false
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = appLink
  document.body.appendChild(iframe)

  // Fallback timer - if app doesn't open in 500ms, use web link
  const fallbackTimer = setTimeout(() => {
    if (!appOpened) {
      if (onFallback) onFallback()
      window.location.href = webLink
    }
  }, 500)

  // Detect if app opened (page becomes hidden)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true
      clearTimeout(fallbackTimer)
    }
  }

  // Also listen for pagehide (iOS Safari)
  const handlePageHide = () => {
    appOpened = true
    clearTimeout(fallbackTimer)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)

  // Cleanup after a reasonable time
  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    document.body.removeChild(iframe)
  }, 2000)

  return true
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 2: Update DeliveryDetail Navigation

**Files:**
- Modify: `src/views/DeliveryDetail.vue`

**Step 1: Update imports**

Find the import statement for export functions and add the new function:

```typescript
import {
  // ... existing imports
  launchAmapNavigation,
} from '@/api/export'
```

**Step 2: Update startNavigation function**

Find the `startNavigation` function (around line 709) and replace it:

```typescript
/**
 * Start navigation - opens Amap with the route
 * On mobile: tries app first, falls back to web
 * On desktop: opens web version
 */
function startNavigation() {
  if (!task.value || !hasValidLocations.value) {
    ElMessage.warning('配送点缺少坐标信息')
    return
  }

  const success = launchAmapNavigation(
    departure.value,
    destination.value,
    sortedDeliveries.value,
    () => {
      // Fallback callback - could show a hint
      console.log('Amap app not found, using web version')
    }
  )

  if (!success) {
    ElMessage.warning('无法生成导航链接')
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 3: Update Deliveries Page Navigation (if applicable)

**Files:**
- Modify: `src/views/Deliveries.vue`

**Step 1: Search for navigation function**

Check if Deliveries.vue has a similar navigation function that needs updating:

```bash
grep -n "startNavigation\|开始导航" src/views/Deliveries.vue
```

**Step 2: If found, apply same pattern as Task 2**

Update any navigation functions to use `launchAmapNavigation`.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 4: Testing

**Step 1: Desktop test**
1. Open DeliveryDetail on desktop browser
2. Click "开始导航"
3. Verify: Opens uri.amap.com in new tab

**Step 2: Mobile test (with Amap installed)**
1. Open DeliveryDetail on mobile
2. Click "开始导航"
3. Verify: Amap app opens directly with route

**Step 3: Mobile test (without Amap)**
1. Temporarily uninstall Amap
2. Open DeliveryDetail on mobile
3. Click "开始导航"
4. Verify: Opens amap.com web version after ~500ms

**Step 4: Build and deploy**

Run: `npm run build && npx wrangler pages deploy dist --project-name=tomato-admin --branch=master`
Expected: Build succeeds, deployment complete

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Add generateAmapUriScheme | export.ts | Generate amapuri:// URL |
| Add launchAmapNavigation | export.ts | Smart launcher with fallback |
| Update startNavigation | DeliveryDetail.vue | Use new launcher |
| Check Deliveries.vue | Deliveries.vue | Update if needed |

---

## Notes

### Why iframe for app launching?
- `window.location.href = 'amapuri://...'` can fail silently
- Hidden iframe approach works more reliably across browsers
- Allows visibility detection for fallback logic

### Why 500ms timeout?
- Fast enough to not feel like a delay
- Long enough for app to launch on most devices
- User experience: "instant" app open, or quick fallback

### Coordinate Format
- Amap uses GCJ-02 coordinates (Chinese standard)
- Our `location` data from geocoding is already in GCJ-02
- Setting `dev=0` tells Amap no conversion needed
