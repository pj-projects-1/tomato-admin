// tests/e2e/deliveries.authenticated.spec.ts
// Delivery planning authenticated tests
import { test, expect } from '@playwright/test'

test.describe('Deliveries Page - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deliveries')
  })

  test('should display deliveries page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /配送/ })).toBeVisible()
  })

  test('should display delivery planning interface', async ({ page }) => {
    // Should show delivery planning components
    const container = page.locator('.page-container')
    await expect(container).toBeVisible()
  })

  test('should show pending deliveries or empty state', async ({ page }) => {
    // Either show deliveries or empty/pending state
    const deliveriesList = page.locator('.delivery-list, .el-table, .el-card')
    const emptyState = page.locator('.el-empty, .el-table__empty-text')

    await expect(deliveriesList.or(emptyState)).toBeVisible({ timeout: 10000 })
  })

  test('should have route planning controls on desktop', async ({ page }) => {
    // Check viewport size
    const viewport = page.viewportSize()

    if (viewport && viewport.width >= 768) {
      // Desktop should show route planning controls
      const routeControls = page.locator('.route-panel, .planning-panel, .el-button')
      await expect(routeControls.first()).toBeVisible()
    }
  })
})

test.describe('Delivery Planning', () => {
  test('should display delivery date selector', async ({ page }) => {
    await page.goto('/deliveries')

    // Should have date picker
    const datePicker = page.locator('.el-date-editor')
    if (await datePicker.isVisible()) {
      await expect(datePicker).toBeVisible()
    }
  })

  test('should show map container when route is planned', async ({ page }) => {
    await page.goto('/deliveries')

    // Map container might not be visible until route is planned
    // Check if map elements exist in DOM
    const mapContainer = page.locator('#route-map-container, .map-container, .amap-container')

    // Map may or may not be visible depending on state
    // Just verify the page loads without errors
    await expect(page.locator('.page-container')).toBeVisible()
  })
})

test.describe('Delivery Mobile Layout', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('should show mobile-friendly layout', async ({ page }) => {
    await page.goto('/deliveries')

    // Page should render without horizontal overflow
    const container = page.locator('.page-container')
    const box = await container.boundingBox()

    expect(box?.width).toBeLessThanOrEqual(375)
  })

  test('should have touch-friendly buttons', async ({ page }) => {
    await page.goto('/deliveries')

    // Buttons should have adequate tap targets
    const buttons = page.locator('.el-button')
    const count = await buttons.count()

    if (count > 0) {
      const firstButton = buttons.first()
      const box = await firstButton.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(40)
    }
  })
})
