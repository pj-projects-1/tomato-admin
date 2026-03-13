// tests/e2e/orders.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Orders Page - Unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login')

    // Check login page renders correctly
    await expect(page.getByPlaceholder(/邮箱|用户名/)).toBeVisible()
    await expect(page.getByPlaceholder(/密码/)).toBeVisible()
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible()
  })
})

test.describe('Page Navigation - Unauthenticated', () => {
  test('should redirect orders to login', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should redirect customers to login', async ({ page }) => {
    await page.goto('/customers')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should redirect stocks to login', async ({ page }) => {
    await page.goto('/stocks')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('App Layout - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('should show login form centered on desktop', async ({ page }) => {
    await page.goto('/login')

    // Form should be visible
    const form = page.locator('.el-card').first()
    await expect(form).toBeVisible()

    // Form should be reasonably sized (not full width)
    const box = await form.boundingBox()
    expect(box?.width).toBeGreaterThan(300)
    expect(box?.width).toBeLessThan(800)
  })
})

test.describe('App Layout - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('should show full width login form on mobile', async ({ page }) => {
    await page.goto('/login')

    // Form should be visible
    const form = page.locator('.el-card').first()
    await expect(form).toBeVisible()

    // Form should use most of the mobile width
    const box = await form.boundingBox()
    expect(box?.width).toBeGreaterThan(300)
    expect(box?.width).toBeLessThanOrEqual(375)
  })
})

// Note: For authenticated order tests, you would need to:
// 1. Create a test user in the database
// 2. Use Playwright's storageState to persist auth
// 3. Or log in programmatically in beforeEach
//
// Example authenticated test structure:
// test.describe('Orders - Authenticated', () => {
//   test.use({ storageState: 'tests/.auth/user.json' })
//
//   test.beforeEach(async ({ page }) => {
//     await page.goto('/orders')
//   })
//
//   test('should display orders list', async ({ page }) => {
//     await expect(page.getByRole('heading', { name: /订单/ })).toBeVisible()
//   })
//
//   test('should open create order dialog', async ({ page }) => {
//     await page.getByRole('button', { name: /新增/ }).click()
//     await expect(page.locator('.el-dialog')).toBeVisible()
//   })
// })
