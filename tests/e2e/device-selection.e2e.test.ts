/**
 * E2E test scaffold for device selection.
 *
 * Tests that device dropdowns populate and persist selections.
 * Requires built app and actual PipeWire devices (or mocked pw-link).
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

test.describe('Device Selection', () => {
  test('device dropdowns are visible', async () => {
    await expect(page.locator('text=Input')).toBeVisible()
    await expect(page.locator('text=Output')).toBeVisible()
  })

  test('dropdowns have Auto option', async () => {
    const selects = page.locator('select')
    await expect(selects.first()).toContainText('Auto (system default)')
    await expect(selects.last()).toContainText('Auto (system default)')
  })
})
