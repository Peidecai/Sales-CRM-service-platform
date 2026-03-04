<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">404</div>
      <div class="error-title">页面不见了</div>
      <div class="error-desc">抱歉，您访问的页面不存在或已被删除</div>
      <el-button type="primary" size="large" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.error-content {
  text-align: center;
}

.error-code {
  font-size: 120px;
  font-weight: 700;
  color: var(--el-color-primary);
  line-height: 1;
  margin-bottom: 16px;
}

.error-title {
  font-size: 24px;
  color: #333;
  margin-bottom: 12px;
}

.error-desc {
  font-size: 14px;
  color: #999;
  margin-bottom: 32px;
}
</style>
