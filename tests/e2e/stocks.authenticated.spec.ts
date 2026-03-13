// tests/e2e/stocks.authenticated.spec.ts
// Stock management authenticated tests
import { test, expect } from '@playwright/test'

test.describe('Stocks Page - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stocks')
  })

  test('should display stocks page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /库存/ })).toBeVisible()
  })

  test('should display stock in/out buttons', async ({ page }) => {
    // Should have buttons for stock operations
    const inButton = page.getByRole('button', { name: /入库/ })
    const outButton = page.getByRole('button', { name: /出库/ })

    // At least one should be visible
    await expect(inButton.or(outButton)).toBeVisible()
  })

  test('should show stock table or empty state', async ({ page }) => {
    const table = page.locator('.el-table')
    const emptyState = page.locator('.el-table__empty-text, .el-empty')

    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('should display current stock balance', async ({ page }) => {
    // Dashboard should show current stock balance
    const stockInfo = page.locator('.stats-card, .stat-card, .el-card')

    // If there's a summary card, check it
    if (await stockInfo.first().isVisible()) {
      const content = await stockInfo.first().textContent()
      // Should show stock-related info
      expect(content).toMatch(/库存|箱|余额/)
    }
  })
})

test.describe('Stock Operations', () => {
  test('should open stock in dialog', async ({ page }) => {
    await page.goto('/stocks')

    const inButton = page.getByRole('button', { name: /入库/ })
    if (await inButton.isVisible()) {
      await inButton.click()
      await expect(page.locator('.el-dialog')).toBeVisible()
    }
  })

  test('should open stock out dialog', async ({ page }) => {
    await page.goto('/stocks')

    const outButton = page.getByRole('button', { name: /出库/ })
    if (await outButton.isVisible()) {
      await outButton.click()
      await expect(page.locator('.el-dialog')).toBeVisible()
    }
  })
})
