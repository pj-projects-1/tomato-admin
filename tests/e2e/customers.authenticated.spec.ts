// tests/e2e/customers.authenticated.spec.ts
// Customer management authenticated tests
import { test, expect } from '@playwright/test'

test.describe('Customers Page - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customers')
  })

  test('should display customers page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /客户/ })).toBeVisible()
  })

  test('should display add customer button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /新增|添加/ })).toBeVisible()
  })

  test('should display search input', async ({ page }) => {
    // Should have a search/filter input
    const searchInput = page.getByPlaceholder(/搜索|姓名|电话|微信/)
    await expect(searchInput).toBeVisible()
  })

  test('should open add customer dialog', async ({ page }) => {
    // Click add button
    await page.getByRole('button', { name: /新增|添加/ }).click()

    // Dialog should open
    await expect(page.locator('.el-dialog')).toBeVisible()

    // Should have form fields
    await expect(page.getByLabel(/姓名|名称/)).toBeVisible()
  })

  test('should show customers table or empty state', async ({ page }) => {
    // Either table or empty state should be visible
    const table = page.locator('.el-table')
    const emptyState = page.locator('.el-table__empty-text, .el-empty')

    // One of these should be visible
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('should be able to search customers', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索|姓名|电话|微信/)

    // Type in search
    await searchInput.fill('测试搜索')
    await searchInput.press('Enter')

    // Should show results or empty (not error)
    await expect(page.locator('.el-table').or(page.locator('.el-empty'))).toBeVisible()
  })
})

test.describe('Customer CRUD Operations', () => {
  test('should validate required fields in add dialog', async ({ page }) => {
    await page.goto('/customers')

    // Open add dialog
    await page.getByRole('button', { name: /新增|添加/ }).click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /确定|保存/ }).click()

    // Should show validation error
    await expect(page.locator('.el-form-item__error').or(page.locator('.el-message--error'))).toBeVisible()
  })
})
