<template>
  <view class="login-page">
    <!-- Logo & Title -->
    <view class="login-header">
      <view class="logo">
        <text class="logo-icon">CRM</text>
      </view>
      <text class="app-title">AI 智能 CRM</text>
      <text class="app-subtitle">销售管理系统</text>
    </view>

    <!-- Login Form (Dev Mode) -->
    <view class="login-form" v-if="showDevLogin">
      <view class="form-item">
        <input
          v-model="username"
          class="form-input"
          placeholder="用户名"
          type="text"
        />
      </view>
      <view class="form-item">
        <input
          v-model="password"
          class="form-input"
          placeholder="密码"
          type="password"
        />
      </view>
      <button class="btn-login" :loading="loading" @click="handlePasswordLogin">
        登 录
      </button>
    </view>

    <!-- WeChat Login Button -->
    <view class="wx-login-section">
      <button
        class="btn-wx-login"
        open-type=""
        :loading="loading"
        @click="handleWxLogin"
      >
        <text class="wx-icon">&#xe600;</text>
        微信一键登录
      </button>
    </view>

    <!-- Dev Mode Toggle -->
    <view class="dev-toggle" @click="showDevLogin = !showDevLogin">
      <text class="dev-toggle-text">
        {{ showDevLogin ? '使用微信登录' : '开发者账号登录' }}
      </text>
    </view>

    <!-- Footer -->
    <view class="login-footer">
      <text class="footer-text">登录即表示同意</text>
      <text class="footer-link">《用户协议》</text>
      <text class="footer-text">和</text>
      <text class="footer-link">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const showDevLogin = ref(false)
const username = ref('')
const password = ref('')

/**
 * WeChat login
 */
async function handleWxLogin() {
  if (loading.value) return
  loading.value = true
  try {
    const success = await userStore.wxLogin()
    if (success) {
      uni.switchTab({ url: '/pages/index/index' })
    }
  } finally {
    loading.value = false
  }
}

/**
 * Password login (dev mode)
 */
async function handlePasswordLogin() {
  if (loading.value) return
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const success = await userStore.passwordLogin(username.value, password.value)
    if (success) {
      uni.switchTab({ url: '/pages/index/index' })
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 60rpx 40rpx;
  background: linear-gradient(180deg, #e8f4ff 0%, #ffffff 50%);
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.3);
}

.logo-icon {
  color: #ffffff;
  font-size: 44rpx;
  font-weight: bold;
}

.app-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 12rpx;
}

.app-subtitle {
  font-size: 28rpx;
  color: #999999;
}

.login-form {
  width: 100%;
  margin-bottom: 40rpx;
}

.form-item {
  margin-bottom: 28rpx;
}

.form-input {
  width: 100%;
  height: 96rpx;
  background: #f5f7fa;
  border-radius: 16rpx;
  padding: 0 32rpx;
  font-size: 30rpx;
  color: #333333;
  box-sizing: border-box;
}

.btn-login {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 16rpx;
  border: none;
  margin-top: 12rpx;
}

.btn-login::after {
  border: none;
}

.wx-login-section {
  width: 100%;
  margin-bottom: 32rpx;
}

.btn-wx-login {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #07c160;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 16rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-wx-login::after {
  border: none;
}

.wx-icon {
  margin-right: 12rpx;
  font-size: 36rpx;
}

.dev-toggle {
  margin-bottom: 60rpx;
  padding: 16rpx;
}

.dev-toggle-text {
  font-size: 26rpx;
  color: #409eff;
}

.login-footer {
  position: fixed;
  bottom: 60rpx;
  display: flex;
  align-items: center;
}

.footer-text {
  font-size: 22rpx;
  color: #cccccc;
}

.footer-link {
  font-size: 22rpx;
  color: #409eff;
}
</style>
