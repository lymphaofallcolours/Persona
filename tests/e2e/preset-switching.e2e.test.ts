/**
 * E2E test scaffold for preset switching.
 *
 * These tests require a built Electron app (`npm run build` first).
 * They use Playwright to drive the actual app window.
 *
 * TODO: Implement once electron-playwright integration is configured.
 * See: https://playwright.dev/docs/api/class-electron
 */
import { test, expect, ElectronApplication, Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { resolve } from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/main.js')]
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app.close()
})

test.describe('Preset Switching', () => {
  test('app launches and shows factory presets', async () => {
    await expect(page.locator('text=Normal')).toBeVisible()
    await expect(page.locator('text=Techpriest')).toBeVisible()
    await expect(page.locator('text=Off')).toBeVisible()
  })

  test('clicking a preset updates the status bar', async () => {
    await page.click('text=Normal')
    await expect(page.locator('footer')).toContainText('Normal')
  })

  test('clicking Off updates status bar', async () => {
    await page.click('text=Off')
    await expect(page.locator('footer')).toContainText('Off')
  })

  test('new preset button is visible', async () => {
    await expect(page.locator('text=+ New Preset')).toBeVisible()
  })
})
