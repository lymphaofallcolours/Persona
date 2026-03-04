import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'electron/**/*.test.ts',
      'src/**/*.test.{ts,tsx}'
    ],
    environment: 'node',
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'jsdom']
    ]
  }
})
