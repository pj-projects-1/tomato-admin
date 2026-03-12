// tests/auth.setup.ts
// Global setup for authenticated E2E tests
// This logs in once and saves the auth state to a file

import { test as setup, expect } from '@playwright/test'

const authFile = 'tests/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Check if test credentials are available
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    // Skip this test if credentials aren't configured
    // This allows CI to pass when E2E secrets aren't set up yet
    setup.skip(true, 'TEST_USER_EMAIL and TEST_USER_PASSWORD must be set for authenticated tests')
    return
  }

  // Navigate to login page
  await page.goto('/login')

  // Fill in credentials
  await page.getByPlaceholder(/邮箱|用户名/).fill(email)
  await page.getByPlaceholder(/密码/).fill(password)

  // Submit login
  await page.getByRole('button', { name: /登录/ }).click()

  // Wait for redirect to dashboard or app
  // This confirms authentication succeeded
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })

  // Wait for the app to load (dashboard or main content)
  await expect(page.locator('.el-menu').or(page.locator('.page-container'))).toBeVisible({ timeout: 10000 })

  // Save authentication state
  // This includes cookies, localStorage (Supabase session), etc.
  await page.context().storageState({ path: authFile })
})
