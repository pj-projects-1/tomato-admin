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
    await expect(page.getByText(/登录失败|用户名或密码错误|Invalid/)).toBeVisible({ timeout: 10000 })
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login')

    // Try to submit without filling fields
    await page.getByRole('button', { name: /登录/ }).click()

    // Form validation should prevent submission
    // The URL should still be /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show error with non-existent username', async ({ page }) => {
    await page.goto('/login')

    // Fill in non-existent username
    await page.getByPlaceholder(/邮箱|用户名/).fill('nonexistentuser')
    await page.getByPlaceholder(/密码/).fill('anypassword')
    await page.getByRole('button', { name: /登录/ }).click()

    // Should show error for non-existent user
    await expect(page.getByText(/不存在|用户名或密码错误|Invalid/)).toBeVisible({ timeout: 10000 })
  })

  test('should clear form on page reload', async ({ page }) => {
    await page.goto('/login')

    // Fill the form
    await page.getByPlaceholder(/邮箱|用户名/).fill('test@example.com')
    await page.getByPlaceholder(/密码/).fill('testpassword')

    // Reload page
    await page.reload()

    // Form should be empty
    await expect(page.getByPlaceholder(/邮箱|用户名/)).toHaveValue('')
    await expect(page.getByPlaceholder(/密码/)).toHaveValue('')
  })
})

test.describe('Login Form - Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login')

    // Input fields should be accessible
    const usernameInput = page.getByPlaceholder(/邮箱|用户名/)
    const passwordInput = page.getByPlaceholder(/密码/)

    // Should be focusable
    await usernameInput.focus()
    await expect(usernameInput).toBeFocused()

    await passwordInput.focus()
    await expect(passwordInput).toBeFocused()
  })

  test('should be able to type in form fields', async ({ page }) => {
    await page.goto('/login')

    // Should be able to type in inputs
    const usernameInput = page.getByPlaceholder(/邮箱|用户名/)
    await usernameInput.fill('test@example.com')
    await expect(usernameInput).toHaveValue('test@example.com')

    const passwordInput = page.getByPlaceholder(/密码/)
    await passwordInput.fill('testpassword')
    await expect(passwordInput).toHaveValue('testpassword')
  })
})
