<template>
  <view class="notification-settings-page">
    <view class="settings-group">
      <view class="group-title">
        <text class="group-title-text">通知开关</text>
      </view>
      <view class="setting-item" v-for="item in settings" :key="item.key">
        <view class="setting-info">
          <text class="setting-label">{{ item.label }}</text>
          <text class="setting-desc">{{ item.desc }}</text>
        </view>
        <switch
          :checked="item.value"
          color="#409EFF"
          @change="(e: SwitchChangeEvent) => onToggle(item.key, e)"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'

interface SwitchChangeEvent {
  detail: { value: boolean }
}

const STORAGE_KEY = 'crm_notification_settings'

interface SettingItem {
  key: string
  label: string
  desc: string
  value: boolean
}

const settings = reactive<SettingItem[]>([
  { key: 'push', label: '推送通知', desc: '接收系统推送通知', value: true },
  { key: 'followUp', label: '跟进提醒', desc: '客户跟进到期提醒', value: true },
  { key: 'opportunity', label: '商机更新', desc: '商机状态变更通知', value: true },
  { key: 'system', label: '系统消息', desc: '系统公告和维护通知', value: true },
])

function loadSettings(): void {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY) as string
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, boolean>
      for (const item of settings) {
        if (typeof saved[item.key] === 'boolean') {
          item.value = saved[item.key]
        }
      }
    }
  } catch {
    // Use defaults
  }
}

function saveSettings(): void {
  const data: Record<string, boolean> = {}
  for (const item of settings) {
    data[item.key] = item.value
  }
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage error
  }
}

function onToggle(key: string, e: SwitchChangeEvent): void {
  const item = settings.find((s) => s.key === key)
  if (item) {
    item.value = e.detail.value
    saveSettings()
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.notification-settings-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}

.settings-group {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.group-title {
  padding: 24rpx 32rpx 12rpx;
}

.group-title-text {
  font-size: 28rpx;
  color: #909399;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.setting-label {
  font-size: 30rpx;
  color: #303133;
}

.setting-desc {
  font-size: 24rpx;
  color: #909399;
}
</style>
