import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.test.ts',
  timeout: 30000,
  retries: 0,
  use: {
    trace: 'on-first-retry'
  }
})
