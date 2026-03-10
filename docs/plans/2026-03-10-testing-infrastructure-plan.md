# Testing Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Vitest (unit) and Playwright (E2E) testing infrastructure with tests for critical flows.

**Architecture:** Layered testing - unit tests mock external services, E2E tests use real browser with test database.

**Tech Stack:** Vitest, @vue/test-utils, @pinia/testing, Playwright

---

## Task 1: Install Testing Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Vitest and unit testing dependencies**

```bash
cd C:/Users/paulj/tomato-admin
npm install -D vitest @vue/test-utils @pinia/testing jsdom @vitest/coverage-v8 happy-dom
```

**Step 2: Install Playwright**

```bash
npm install -D @playwright/test
```

**Step 3: Install Playwright browsers**

```bash
npx playwright install chromium
```

**Step 4: Verify installation**

Run: `npm list vitest @playwright/test`
Expected: Shows installed versions

---

## Task 2: Create Vitest Configuration

**Files:**
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`

**Step 1: Create vitest.config.ts**

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
      exclude: ['src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

**Step 2: Create test setup file**

```typescript
// src/__tests__/setup.ts
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, vi } from 'vitest'

// Setup Pinia for each test
beforeEach(() => {
  setActivePinia(createPinia())
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_AMAP_KEY: 'test-amap-key',
    VITE_AMAP_JS_KEY: 'test-amap-js-key',
    VITE_AMAP_JS_SECURITY_KEY: 'test-security-key',
  },
})
```

**Step 3: Add npm scripts**

Add to package.json scripts:

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

**Step 4: Run vitest to verify setup**

Run: `npm test`
Expected: Shows "No test files found" (that's OK for now)

**Step 5: Commit**

```bash
git add vitest.config.ts src/__tests__/setup.ts package.json package-lock.json
git commit -m "test: setup vitest testing infrastructure"
```

---

## Task 3: Create Playwright Configuration

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/.gitkeep`

**Step 1: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

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
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
```

**Step 2: Create e2e test directory**

```bash
mkdir -p tests/e2e
touch tests/e2e/.gitkeep
```

**Step 3: Verify playwright installation**

Run: `npx playwright --version`
Expected: Shows playwright version

**Step 4: Commit**

```bash
git add playwright.config.ts tests/
git commit -m "test: setup playwright e2e testing"
```

---

## Task 4: Write First Unit Test (Auth Store)

**Files:**
- Create: `src/__tests__/stores/auth.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/stores/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/auth'

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with null user', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('should have isAuthenticated computed as false when no user', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })
})
```

**Step 2: Run test to verify setup works**

Run: `npm test`
Expected: Tests pass (green)

**Step 3: Commit**

```bash
git add src/__tests__/
git commit -m "test: add auth store unit tests"
```

---

## Task 5: Write Orders Store Unit Tests

**Files:**
- Create: `src/__tests__/stores/orders.test.ts`

**Step 1: Write the tests**

```typescript
// src/__tests__/stores/orders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrdersStore } from '@/stores/orders'

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null,
        })),
      })),
    })),
  },
}))

describe('Orders Store', () => {
  let store: ReturnType<typeof useOrdersStore>

  beforeEach(() => {
    vi.clearAllMocks()
    store = useOrdersStore()
  })

  it('should initialize with empty orders', () => {
    expect(store.orders).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('should have totalOrders computed', () => {
    expect(store.totalOrders).toBe(0)
  })
})
```

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/__tests__/stores/orders.test.ts
git commit -m "test: add orders store unit tests"
```

---

## Task 6: Write E2E Test - Login Flow

**Files:**
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/fixtures/test-data.ts`

**Step 1: Create test fixtures**

```typescript
// tests/fixtures/test-data.ts
export const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
}

export const testCustomer = {
  name: '测试客户',
  phone: '13800138000',
  address: '江苏省苏州市吴江区测试路1号',
}
```

**Step 2: Write login E2E test**

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'
import { testUser } from '../fixtures/test-data'

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /登录/i })).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.getByPlaceholder(/邮箱|用户名/).fill(testUser.email)
    await page.getByPlaceholder(/密码/).fill(testUser.password)
    await page.getByRole('button', { name: /登录/ }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /仪表盘|Dashboard/i })).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder(/邮箱|用户名/).fill('wrong@example.com')
    await page.getByPlaceholder(/密码/).fill('wrongpassword')
    await page.getByRole('button', { name: /登录/ }).click()

    // Should show error message
    await expect(page.getByText(/登录失败|密码错误/)).toBeVisible()
  })
})
```

**Step 3: Run E2E tests**

Run: `npm run test:e2e -- --project=chromium`
Expected: Tests execute (may need real test user in database)

**Step 4: Commit**

```bash
git add tests/
git commit -m "test: add authentication e2e tests"
```

---

## Task 7: Write E2E Test - Order Creation

**Files:**
- Create: `tests/e2e/orders.spec.ts`

**Step 1: Write order creation test**

```typescript
// tests/e2e/orders.spec.ts
import { test, expect } from '@playwright/test'
import { testCustomer, testUser } from '../fixtures/test-data'

test.describe('Orders', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByPlaceholder(/邮箱|用户名/).fill(testUser.email)
    await page.getByPlaceholder(/密码/).fill(testUser.password)
    await page.getByRole('button', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /订单/ }).click()

    await expect(page).toHaveURL(/\/orders/)
    await expect(page.getByRole('heading', { name: /订单/i })).toBeVisible()
  })

  test('should create new order', async ({ page }) => {
    await page.goto('/orders')

    // Click new order button
    await page.getByRole('button', { name: /新增/ }).click()

    // Should open dialog
    await expect(page.getByRole('dialog')).toBeVisible()

    // Fill customer
    await page.getByLabel(/客户/).click()
    await page.getByText(testCustomer.name).click()

    // Fill quantity
    await page.getByLabel(/数量/).fill('10')

    // Submit
    await page.getByRole('button', { name: /确定|保存/ }).click()

    // Should close dialog and show success
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(/成功/)).toBeVisible()
  })
})
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e -- --project=chromium`
Expected: Tests run

**Step 3: Commit**

```bash
git add tests/e2e/orders.spec.ts
git commit -m "test: add order creation e2e tests"
```

---

## Task 8: Add Test Coverage Script

**Files:**
- Modify: `package.json`

**Step 1: Add coverage script**

Add to package.json scripts:

```json
{
  "test:coverage": "vitest run --coverage"
}
```

**Step 2: Run coverage**

Run: `npm run test:coverage`
Expected: Shows coverage report

**Step 3: Commit**

```bash
git add package.json
git commit -m "test: add coverage script"
```

---

## Verification

1. Run all unit tests: `npm test`
2. Run all E2E tests: `npm run test:e2e`
3. Run coverage report: `npm run test:coverage`
4. Verify CI can run: `npm run test:run && npm run test:e2e`
