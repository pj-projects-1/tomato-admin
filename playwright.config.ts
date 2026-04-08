import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Reduced retries from 2 to 1 for faster CI
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Add global timeout for safety
  timeout: 30000,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Desktop tests - Chrome locally, Chromium in CI
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use installed Chrome locally, Playwright's Chromium in CI
        ...(process.env.CI ? {} : { channel: 'chrome' }),
      },
      dependencies: ['setup'],
    },
    // Mobile tests - only run locally, skip in CI to save time
    ...(process.env.CI ? [] : [{
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
    }]),
    // Authenticated desktop tests
    {
      name: 'authenticated-chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.CI ? {} : { channel: 'chrome' }),
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.authenticated\.spec\.ts/,
    },
    // Authenticated mobile tests - only run locally
    ...(process.env.CI ? [] : [{
      name: 'authenticated-mobile',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.authenticated\.spec\.ts/,
    }]),
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
