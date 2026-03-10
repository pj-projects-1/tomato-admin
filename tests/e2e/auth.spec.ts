// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)
    // The page shows the company name as heading
    await expect(page.getByRole('heading', { name: /四月红番天/ })).toBeVisible()
  })

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login')

    // Check for login form elements
    await expect(page.getByPlaceholder(/邮箱|用户名/)).toBeVisible()
    await expect(page.getByPlaceholder(/密码/)).toBeVisible()
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in invalid credentials
    await page.getByPlaceholder(/邮箱|用户名/).fill('invalid@example.com')
    await page.getByPlaceholder(/密码/).fill('wrongpassword')
    await page.getByRole('button', { name: /登录/ }).click()

    // Should show error message
    await expect(page.getByText(/登录失败|用户名或密码错误/)).toBeVisible({ timeout: 10000 })
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login')

    // Try to submit without filling fields
    await page.getByRole('button', { name: /登录/ }).click()

    // Form validation should prevent submission
    // The URL should still be /login
    await expect(page).toHaveURL(/\/login/)
  })
})
