// tests/e2e/auth.authenticated.spec.ts
// Authenticated navigation and access control tests
import { test, expect } from '@playwright/test'

test.describe('Authenticated Navigation', () => {
  test('should access dashboard after login', async ({ page }) => {
    await page.goto('/')

    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/login/)

    // Dashboard should show content
    await expect(page.locator('.page-title').or(page.locator('.el-menu'))).toBeVisible()
  })

  test('should access customers page', async ({ page }) => {
    await page.goto('/customers')

    // Should stay on customers page
    await expect(page).toHaveURL(/\/customers/)
    await expect(page.locator('.page-container')).toBeVisible()
  })

  test('should access orders page', async ({ page }) => {
    await page.goto('/orders')

    await expect(page).toHaveURL(/\/orders/)
    await expect(page.locator('.page-container')).toBeVisible()
  })

  test('should access stocks page', async ({ page }) => {
    await page.goto('/stocks')

    await expect(page).toHaveURL(/\/stocks/)
    await expect(page.locator('.page-container')).toBeVisible()
  })

  test('should access deliveries page', async ({ page }) => {
    await page.goto('/deliveries')

    await expect(page).toHaveURL(/\/deliveries/)
    await expect(page.locator('.page-container')).toBeVisible()
  })
})

test.describe('Sidebar Navigation', () => {
  test('should navigate between pages via sidebar', async ({ page }) => {
    await page.goto('/')

    // Click on customers menu item
    await page.getByRole('menuitem', { name: /客户/ }).click()
    await expect(page).toHaveURL(/\/customers/)

    // Click on orders menu item
    await page.getByRole('menuitem', { name: /订单/ }).click()
    await expect(page).toHaveURL(/\/orders/)

    // Click on stocks menu item
    await page.getByRole('menuitem', { name: /库存/ }).click()
    await expect(page).toHaveURL(/\/stocks/)

    // Click on deliveries menu item
    await page.getByRole('menuitem', { name: /配送/ }).click()
    await expect(page).toHaveURL(/\/deliveries/)
  })

  test('should highlight active menu item', async ({ page }) => {
    await page.goto('/customers')

    // Customers menu item should be active
    const customersMenuItem = page.getByRole('menuitem', { name: /客户/ })
    await expect(customersMenuItem).toHaveAttribute('class', /is-active/)
  })
})

test.describe('User Menu', () => {
  test('should show user dropdown', async ({ page }) => {
    await page.goto('/')

    // Click on user avatar/dropdown
    await page.locator('.user-info, .el-dropdown').click()

    // Dropdown menu should appear
    await expect(page.locator('.el-dropdown-menu').or(page.getByText(/退出/))).toBeVisible()
  })
})
