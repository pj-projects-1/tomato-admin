// scripts/capture-screenshots.ts
// Captures screenshots from the running app for the user guide

import { chromium, Page, Browser } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots')
const BASE_URL = 'http://localhost:3000'

// Test credentials - use test account
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'admin@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Admin123!'

async function captureScreenshots() {
  console.log('📸 Starting screenshot capture...\n')

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome', // Use installed Chrome instead of bundled browser
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
  })

  const page = await context.newPage()

  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    // ========================================
    // LOGIN PAGE
    // ========================================
    console.log('📄 Capturing login page...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01-login.png'),
      fullPage: false,
    })
    console.log('   ✅ 01-login.png')

    // ========================================
    // LOGIN (for authenticated screenshots)
    // ========================================
    console.log('\n🔐 Logging in...')
    await page.fill('input[placeholder*="邮箱"], input[placeholder*="用户名"]', TEST_EMAIL)
    await page.fill('input[placeholder*="密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')

    // Wait for redirect
    await page.waitForURL(/^(?!.*login)/, { timeout: 150000 }).catch(() => {
      console.log('   ⚠️ Login may have failed, continuing anyway...')
    })
    await page.waitForTimeout(2000)

    // ========================================
    // DASHBOARD
    // ========================================
    console.log('\n📊 Capturing dashboard...')
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02-dashboard.png'),
      fullPage: true,
    })
    console.log('   ✅ 02-dashboard.png')

    // ========================================
    // CUSTOMERS PAGE
    // ========================================
    console.log('\n👥 Capturing customers page...')
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03-customers.png'),
      fullPage: true,
    })
    console.log('   ✅ 03-customers.png')

    // Add customer dialog
    try {
      await page.click('button:has-text("新增")')
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '04-customer-dialog.png'),
        fullPage: false,
      })
      console.log('   ✅ 04-customer-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch (e) {
      console.log('   ⚠️ Could not open customer dialog')
    }

    // ========================================
    // ORDERS PAGE
    // ========================================
    console.log('\n📋 Capturing orders page...')
    await page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05-orders.png'),
      fullPage: true,
    })
    console.log('   ✅ 05-orders.png')

    // Add order dialog
    try {
      await page.click('button:has-text("新增")')
      await page.waitForTimeout(800)
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '06-order-dialog.png'),
        fullPage: false,
      })
      console.log('   ✅ 06-order-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch (e) {
      console.log('   ⚠️ Could not open order dialog')
    }

    // ========================================
    // STOCKS PAGE
    // ========================================
    console.log('\n📦 Capturing stocks page...')
    await page.goto(`${BASE_URL}/stocks`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '07-stocks.png'),
      fullPage: true,
    })
    console.log('   ✅ 07-stocks.png')

    // Stock in dialog
    try {
      await page.click('button:has-text("入库")')
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '08-stock-in-dialog.png'),
        fullPage: false,
      })
      console.log('   ✅ 08-stock-in-dialog.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch (e) {
      console.log('   ⚠️ Could not open stock in dialog')
    }

    // ========================================
    // DELIVERIES PAGE
    // ========================================
    console.log('\n🚚 Capturing deliveries page...')
    await page.goto(`${BASE_URL}/deliveries`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '09-deliveries.png'),
      fullPage: true,
    })
    console.log('   ✅ 09-deliveries.png')

    // ========================================
    // MOBILE VIEW
    // ========================================
    console.log('\n📱 Capturing mobile views...')

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 })

    // Mobile login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '10-mobile-login.png'),
      fullPage: false,
    })
    console.log('   ✅ 10-mobile-login.png')

    // Re-login for mobile
    await page.fill('input[placeholder*="邮箱"], input[placeholder*="用户名"]', TEST_EMAIL)
    await page.fill('input[placeholder*="密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')
    await page.waitForURL(/^(?!.*login)/, { timeout: 150000 }).catch(() => {})
    await page.waitForTimeout(1500)

    // Mobile dashboard
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '11-mobile-dashboard.png'),
      fullPage: true,
    })
    console.log('   ✅ 11-mobile-dashboard.png')

    // Mobile sidebar menu
    try {
      await page.click('.hamburger-btn, .el-icon:has(.expand), .el-icon:has(svg)')
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '12-mobile-menu.png'),
        fullPage: false,
      })
      console.log('   ✅ 12-mobile-menu.png')
      // Close menu
      await page.click('.el-drawer__wrapper, .el-overlay')
      await page.waitForTimeout(300)
    } catch (e) {
      console.log('   ⚠️ Could not open mobile menu')
    }

    console.log('\n✨ Screenshot capture complete!')
    console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}`)

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error)
    throw error
  } finally {
    await browser.close()
  }
}

// Run if called directly
captureScreenshots().catch(console.error)
