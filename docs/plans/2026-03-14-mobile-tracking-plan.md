# Mobile Tracking URL Enhancement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support both PC and mobile tracking URLs for kuaidi100, ensuring mobile users get an optimized tracking experience with return navigation.

**Architecture:** Device detection determines which kuaidi100 URL format to use. PC users get the standard desktop page, mobile users get the mobile-optimized page with callback support.

**Tech Stack:** Vue 3, TypeScript, existing express.ts module

---

## Task 1: Update Express API Module

**Files:**
- Modify: `src/api/express.ts:110-130`

**Step 1: Add constants and mobile detection**

Add at the top of the file (after imports):

```typescript
/**
 * App identifier for Kuaidi100 mobile API
 * Can be any English name, no approval needed
 */
const KUAIDI100_CONAME = 'hongfantian'

/**
 * Check if current device is mobile
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768
}
```

**Step 2: Update getTrackingUrl function**

Replace the existing `getTrackingUrl` function (lines 118-130):

```typescript
/**
 * Generate tracking URL for an express delivery
 * Uses Kuaidi100 as unified tracking service
 * Automatically detects mobile devices and returns mobile-optimized URL
 *
 * @param companyName - Express company name (e.g., "顺丰速运")
 * @param trackingNumber - Tracking number
 * @param returnUrl - Optional return URL for mobile users (defaults to current page)
 * @returns Kuaidi100 tracking URL
 */
export function getTrackingUrl(
  companyName: string | null | undefined,
  trackingNumber: string,
  returnUrl?: string
): string {
  if (!trackingNumber) return ''

  // Get company code, fallback to empty for auto-detect
  const companyCode = companyName ? EXPRESS_COMPANY_CODES[companyName] : ''

  if (isMobileDevice()) {
    // Mobile URL format with callback support
    const callbackUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '')
    const encodedCallback = callbackUrl ? encodeURIComponent(callbackUrl) : ''

    let url = `https://m.kuaidi100.com/app/query/?coname=${KUAIDI100_CONAME}`
    if (companyCode) {
      url += `&com=${companyCode}`
    }
    url += `&nu=${trackingNumber}`
    if (encodedCallback) {
      url += `&callbackurl=${encodedCallback}`
    }
    return url
  }

  // PC/Desktop URL format
  if (companyCode) {
    return `https://www.kuaidi100.com/chaxun?com=${companyCode}&nu=${trackingNumber}`
  }

  // Fallback: use Kuaidi100 auto-detect (no company parameter)
  return `https://www.kuaidi100.com/chaxun?nu=${trackingNumber}`
}
```

**Step 3: Verify the changes compile**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 2: Verify All Call Sites Are Compatible

**Files:**
- Read: `src/views/Orders.vue`
- Read: `src/views/Deliveries.vue`
- Read: `src/views/OrderDetail.vue`

**Step 1: Check current usage**

Find all calls to `getTrackingUrl`:

```bash
grep -n "getTrackingUrl" src/views/*.vue
```

The function signature is now:
- `getTrackingUrl(companyName, trackingNumber, returnUrl?)`

The `returnUrl` parameter is optional, so existing calls will continue to work without changes.

**Step 2: Verify no breaking changes needed**

Current usage patterns:
- `:href="getTrackingUrl(delivery.express_company, delivery.tracking_number)"` ✅ Compatible (returnUrl is optional)

No changes needed to Vue files.

---

## Task 3: Test the Implementation

**Step 1: Build the project**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 2: Manual testing checklist**

- [ ] Desktop browser: Click tracking link → Opens www.kuaidi100.com
- [ ] Mobile browser: Click tracking link → Opens m.kuaidi100.com
- [ ] Mobile: After tracking, click "返回" → Returns to app
- [ ] Unknown company: Auto-detect still works (no com parameter)

**Step 3: Deploy**

Run: `npm run build && npx wrangler pages deploy dist`
Expected: Deployment succeeds

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Add mobile detection | `src/api/express.ts` | `isMobileDevice()` function |
| Add coname constant | `src/api/express.ts` | `KUAIDI100_CONAME = 'hongfantian'` |
| Update getTrackingUrl | `src/api/express.ts` | Support both PC and mobile URLs |
| No changes needed | Vue files | Optional parameter is backward compatible |
