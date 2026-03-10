# Testing Infrastructure Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up comprehensive testing infrastructure with Vitest (unit) and Playwright (E2E) to ensure production reliability.

**Architecture:** Layered testing approach - unit tests for business logic in stores/API, E2E tests for critical user flows. Uses mocking for Supabase/external services in unit tests, real browser automation for E2E.

**Tech Stack:** Vitest, Playwright, @vue/test-utils, @pinia/testing

---

## Testing Stack

### Unit Testing: Vitest
- Native Vite integration (fast HMR during tests)
- Jest-compatible API
- Built-in coverage with c8
- Vue Test Utils for component testing
- @pinia/testing for store mocking

### E2E Testing: Playwright
- Cross-browser support (Chromium, Firefox, WebKit)
- Auto-wait for elements
- Screenshot/video on failure
- Trace viewer for debugging
- Parallel test execution

---

## Test Structure

```
src/
  __tests__/
    setup.ts              # Global test setup
    stores/
      auth.test.ts        # Auth store: login, logout, session
      orders.test.ts      # Orders store: CRUD, status changes
      deliveries.test.ts  # Deliveries store: tasks, status
      customers.test.ts   # Customers store: CRUD
      stocks.test.ts      # Stocks store: adjustments
    api/
      supabase.test.ts    # Supabase client, retry logic
      amap.test.ts        # Amap geocoding, routing
    utils/
      export.test.ts      # Export functions
tests/
  e2e/
    auth.spec.ts          # Login/logout flow
    orders.spec.ts        # Order creation flow
    deliveries.spec.ts    # Delivery task flow
  fixtures/
    test-data.ts          # Mock data for tests
  auth.setup.ts           # Auth state for E2E
```

---

## Configuration Files

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/stores/**', 'src/api/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Test Priority

### Phase 1: Critical Path
1. **Auth flow** - Login with email/username, session persistence, logout
2. **Order creation** - Create order, add delivery points, calculate totals
3. **Delivery workflow** - Create task, start, complete, cancel

### Phase 2: Data Integrity
4. Customer management
5. Stock adjustments
6. Payment processing

### Phase 3: Edge Cases
7. Network failure handling
8. Concurrent update conflicts
9. Permission validation

---

## Dependencies to Install

```bash
# Unit testing
npm install -D vitest @vue/test-utils @pinia/testing jsdom @vitest/coverage-v8

# E2E testing
npm install -D @playwright/test
npx playwright install
```

---

## Scripts to Add

```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```
