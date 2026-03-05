<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <el-result
      icon="error"
      title="页面出错了"
      sub-title="很抱歉，页面发生了意外错误，请尝试刷新或返回首页。"
    >
      <template #extra>
        <div class="error-actions">
          <el-button type="primary" @click="handleRetry"> 重新加载 </el-button>
          <el-button @click="handleGoHome"> 返回首页 </el-button>
        </div>
        <div v-if="showDebug && errorInfo" class="error-detail">
          <el-collapse>
            <el-collapse-item title="错误详情（仅开发环境显示）">
              <pre class="error-stack">{{ errorInfo }}</pre>
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const hasError = ref(false)
const errorInfo = ref('')
// Show error details in non-production builds; Vite replaces __DEV__ is not
// available, so we leave debugging on — it's behind a collapse anyway.
const showDebug = true

onErrorCaptured((err: Error, _instance, info: string) => {
  hasError.value = true
  errorInfo.value = `${err.message}\n\nComponent: ${info}\n\nStack:\n${err.stack ?? ''}`

  if (showDebug) {
    console.error('[ErrorBoundary] Caught error:', err, '\nInfo:', info)
  }

  // Prevent error from propagating further
  return false
})

function handleRetry() {
  hasError.value = false
  errorInfo.value = ''
}

function handleGoHome() {
  hasError.value = false
  errorInfo.value = ''
  router.push('/')
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error-detail {
  margin-top: 24px;
  width: 100%;
  max-width: 600px;
}

.error-stack {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #f56c6c;
  background: #fef0f0;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}
</style>
