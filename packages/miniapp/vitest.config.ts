/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@crm/shared': resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['src/__tests__/setup-uni-mock.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/stores/**', 'src/api/request.ts'],
    },
  },
})
