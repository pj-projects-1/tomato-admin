// tests/e2e/mobile.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X size

  test('should show mobile login form', async ({ page }) => {
    await page.goto('/login')

    // Login form should be visible and usable on mobile
    await expect(page.getByPlaceholder(/邮箱|用户名/)).toBeVisible()
    await expect(page.getByPlaceholder(/密码/)).toBeVisible()

    // Button should have adequate tap target size (min 44px)
    const loginButton = page.getByRole('button', { name: /登录/ })
    await expect(loginButton).toBeVisible()
    const box = await loginButton.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(40) // Allow slight tolerance
  })

  test('should have touch-friendly input fields', async ({ page }) => {
    await page.goto('/login')

    const usernameInput = page.getByPlaceholder(/邮箱|用户名/)
    const passwordInput = page.getByPlaceholder(/密码/)

    // Check input heights are touch-friendly
    const usernameBox = await usernameInput.boundingBox()
    const passwordBox = await passwordInput.boundingBox()

    expect(usernameBox?.height).toBeGreaterThanOrEqual(40)
    expect(passwordBox?.height).toBeGreaterThanOrEqual(40)
  })
})

test.describe('Navigation - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('should show login page correctly on desktop', async ({ page }) => {
    await page.goto('/login')

    // Check login form is centered and visible
    await expect(page.getByPlaceholder(/邮箱|用户名/)).toBeVisible()
    await expect(page.getByPlaceholder(/密码/)).toBeVisible()
    await expect(page.getByRole('heading', { name: /四月红番天/ })).toBeVisible()
  })

  test('should redirect orders to login on desktop', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('Navigation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('should have properly sized login form on mobile', async ({ page }) => {
    await page.goto('/login')

    // Form should be visible and not overflow viewport
    const form = page.locator('.el-form').first()
    if (await form.isVisible()) {
      const formBox = await form.boundingBox()
      expect(formBox?.width).toBeLessThanOrEqual(375)
    }

    // Inputs should be full width on mobile
    const usernameInput = page.getByPlaceholder(/邮箱|用户名/)
    const inputBox = await usernameInput.boundingBox()
    expect(inputBox?.width).toBeLessThanOrEqual(375)
  })
})
