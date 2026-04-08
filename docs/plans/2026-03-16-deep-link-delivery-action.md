# Deep-link from OrderDetail to Delivery Action - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When clicking "前往快递发货" in OrderDetail, navigate to Deliveries page with the correct tab and highlight the specific delivery for easy identification.

**Architecture:** Pass deliveryId via query parameter, read it on Deliveries page mount, switch to correct tab, and apply highlight animation to the specific delivery row/card.

**Tech Stack:** Vue 3, Vue Router, Element Plus, CSS animations

---

## Task 1: Update OrderDetail to Pass Delivery ID

**Files:**
- Modify: `src/views/OrderDetail.vue`

**Step 1: Update goToExpressShipping function**

Find the existing function and update it to pass the delivery ID:

```typescript
function goToExpressShipping(delivery: OrderDelivery) {
  router.push(`/deliveries?tab=express&highlight=${delivery.id}`)
}
```

**Step 2: Update the button click handler in template**

Change from:
```html
@click="goToExpressShipping()"
```

To:
```html
@click="goToExpressShipping(delivery)"
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 2: Update Deliveries Page to Read Query Params

**Files:**
- Modify: `src/views/Deliveries.vue`

**Step 1: Import useRoute**

Verify `useRoute` is imported (should already be, but check):
```typescript
import { useRouter, useRoute } from 'vue-router'
```

**Step 2: Add route and highlight state**

After the router constant, add:
```typescript
const route = useRoute()
const highlightedDeliveryId = ref<string | null>(null)
```

**Step 3: Update onMounted to read query params**

Update the onMounted to handle query params:
```typescript
onMounted(() => {
  loadRecentLocations()
  deliveryStore.fetchPendingDeliveries()
  deliveryStore.fetchDeliveryTasks()
  loadExpressDeliveries()

  // Handle deep-link from OrderDetail
  if (route.query.tab === 'express') {
    activeTab.value = 'express'
  }
  if (route.query.highlight) {
    highlightedDeliveryId.value = route.query.highlight as string
    // Clear the highlight after animation completes
    setTimeout(() => {
      highlightedDeliveryId.value = null
    }, 3000)
  }

  // Setup pull-to-refresh listeners
  if (pageContainerRef.value) {
    setupListeners(pageContainerRef.value)
  }
})
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 3: Add Highlight Styling to Desktop Table

**Files:**
- Modify: `src/views/Deliveries.vue`

**Step 1: Add row-class-name to express deliveries table**

Find the el-table for express deliveries and add `:row-class-name`:

```html
<el-table
  :data="filteredExpressDeliveries"
  v-loading="expressLoading"
  class="desktop-table"
  style="width: 100%; margin-top: 16px;"
  :row-class-name="({ row }) => row.id === highlightedDeliveryId ? 'highlighted-delivery-row' : ''"
>
```

**Step 2: Add CSS for highlight animation**

Add to the `<style scoped>` section:

```css
/* Highlighted delivery row animation */
:deep(.highlighted-delivery-row) {
  animation: highlight-pulse 2s ease-out;
  background-color: #fdf6ec !important;
}

:deep(.highlighted-delivery-row td) {
  background-color: transparent !important;
}

@keyframes highlight-pulse {
  0% {
    background-color: #fef0e6;
    box-shadow: inset 0 0 0 2px #e6a23c;
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 4: Add Highlight Styling to Mobile Cards

**Files:**
- Modify: `src/views/Deliveries.vue`

**Step 1: Add conditional class to mobile cards**

Find the mobile card for express deliveries and add the conditional class:

```html
<div
  v-for="row in filteredExpressDeliveries"
  :key="row.id"
  class="express-mobile-card"
  :class="{ 'highlighted-delivery-card': row.id === highlightedDeliveryId }"
>
```

**Step 2: Add CSS for mobile highlight**

Add to the `<style scoped>` section:

```css
/* Highlighted mobile card animation */
.highlighted-delivery-card {
  animation: highlight-card 2s ease-out;
  border-color: #e6a23c !important;
  box-shadow: 0 0 0 2px #e6a23c;
}

@keyframes highlight-card {
  0% {
    background-color: #fef0e6;
    border-color: #e6a23c;
    box-shadow: 0 0 0 3px #e6a23c;
  }
  100% {
    background-color: #fff;
    border-color: #e4e7ed;
    box-shadow: none;
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 5: Add Scroll-to-Highlighted Delivery

**Files:**
- Modify: `src/views/Deliveries.vue`

**Step 1: Add nextTick import**

Verify nextTick is imported:
```typescript
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
```

**Step 2: Add scroll logic in onMounted**

Update the highlight handling to scroll to the element:

```typescript
if (route.query.highlight) {
  highlightedDeliveryId.value = route.query.highlight as string

  // Scroll to highlighted element after DOM updates
  nextTick(() => {
    const highlightedEl = document.querySelector('.highlighted-delivery-row, .highlighted-delivery-card')
    if (highlightedEl) {
      highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })

  // Clear the highlight after animation completes
  setTimeout(() => {
    highlightedDeliveryId.value = null
  }, 3000)
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 6: Testing and Verification

**Step 1: Manual test - Express delivery deep-link**
1. Go to an order with an express delivery
2. Click "前往快递发货" button
3. Verify: Lands on快递发货 tab
4. Verify: The specific delivery row/card is highlighted
5. Verify: Page scrolls to show the highlighted delivery
6. Verify: Highlight fades after 3 seconds

**Step 2: Build and deploy**

Run: `npm run build`
Expected: Build succeeds

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Update goToExpressShipping | OrderDetail.vue | Pass delivery ID in query |
| Update button handler | OrderDetail.vue | Pass delivery object |
| Add route and highlight state | Deliveries.vue | Track highlighted delivery |
| Read query params on mount | Deliveries.vue | Switch tab and set highlight |
| Add row-class-name | Deliveries.vue | Desktop table highlighting |
| Add mobile card class | Deliveries.vue | Mobile card highlighting |
| Add scroll logic | Deliveries.vue | Scroll to highlighted delivery |
| Add CSS animations | Deliveries.vue | Highlight pulse effect |
