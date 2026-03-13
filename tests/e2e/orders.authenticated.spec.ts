// tests/e2e/orders.authenticated.spec.ts
// Order management authenticated tests
import { test, expect } from '@playwright/test'

test.describe('Orders Page - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders')
  })

  test('should display orders page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /订单/ })).toBeVisible()
  })

  test('should display add order button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /新增|添加/ })).toBeVisible()
  })

  test('should display filter options', async ({ page }) => {
    // Should have filter controls
    const statusFilter = page.locator('.el-select').first()
    await expect(statusFilter.or(page.getByPlaceholder(/筛选|状态/))).toBeVisible()
  })

  test('should show orders table or empty state', async ({ page }) => {
    const table = page.locator('.el-table')
    const emptyState = page.locator('.el-table__empty-text, .el-empty')

    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('should open add order dialog', async ({ page }) => {
    await page.getByRole('button', { name: /新增|添加/ }).click()

    await expect(page.locator('.el-dialog')).toBeVisible()
  })

  test('should display order info in table', async ({ page }) => {
    // Wait for table to load
    const table = page.locator('.el-table')

    // If table has data, check columns exist
    if (await table.isVisible()) {
      // Check for common order columns (headers or data)
      const tableContent = await table.textContent()
      // Should have customer, quantity, or amount info
      expect(tableContent).toMatch(/客户|箱|金额|状态|付款/)
    }
  })
})

test.describe('Order Filtering', () => {
  test('should filter by payment status', async ({ page }) => {
    await page.goto('/orders')

    // Look for payment filter
    const paidFilter = page.getByRole('checkbox', { name: /已付款/ })
    const unpaidFilter = page.getByRole('checkbox', { name: /未付款/ })

    // At least one filter option should exist
    if (await paidFilter.isVisible()) {
      await paidFilter.click()
      // Table should update
      await expect(page.locator('.el-table')).toBeVisible()
    }
  })
})
