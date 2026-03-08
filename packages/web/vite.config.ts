/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@crm/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('/node_modules/vue/') ||
            id.includes('/node_modules/vue-router/') ||
            id.includes('/node_modules/pinia/')
          ) {
            return 'vue-vendor'
          }

          if (id.includes('/node_modules/axios/')) {
            return 'axios-vendor'
          }

          if (id.includes('/node_modules/dayjs/')) {
            return 'dayjs-vendor'
          }

          if (id.includes('/node_modules/async-validator/')) {
            return 'async-validator-vendor'
          }

          if (id.includes('/node_modules/@element-plus/icons-vue/')) {
            return 'ep-icons'
          }

          if (id.includes('/node_modules/element-plus/')) {
            const epCompMatch = id.match(
              /\/node_modules\/element-plus\/(?:es|lib)\/components\/([^/]+)\//,
            )
            const comp = epCompMatch?.[1]

            if (comp) {
              if (['table', 'table-column', 'pagination'].includes(comp)) {
                return 'element-plus-table'
              }
            }

            return 'element-plus-core'
          }

          // Split ECharts runtime to avoid one oversized bundle.
          if (id.includes('/node_modules/vue-echarts/')) {
            return 'vue-echarts-vendor'
          }
          if (id.includes('/node_modules/zrender/')) {
            return 'zrender-vendor'
          }
          if (id.includes('/node_modules/echarts/')) {
            return 'echarts-vendor'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/composables/**', 'src/stores/**', 'src/directives/**'],
    },
  },
  css: {
    preprocessorOptions: {
      css: {
        additionalData: `@import "@/assets/styles/variables.css";`,
      },
    },
  },
})
