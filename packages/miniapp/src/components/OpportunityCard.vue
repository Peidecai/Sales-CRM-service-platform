<template>
  <view class="opportunity-card" @click="onTap">
    <view class="card-header">
      <text class="opp-name">{{ name }}</text>
      <StatusTag :status="stage" type="opportunity" />
    </view>
    <view class="card-body">
      <view class="opp-amount">
        <text class="amount-label">金额</text>
        <text class="amount-value">¥{{ formattedAmount }}</text>
      </view>
      <view v-if="customerName" class="opp-customer">
        <text class="customer-label">客户</text>
        <text class="customer-value">{{ customerName }}</text>
      </view>
      <view v-if="expectedCloseDate" class="opp-date">
        <text class="date-label">预计成交</text>
        <text class="date-value">{{ expectedCloseDate }}</text>
      </view>
    </view>
    <view v-if="probability !== undefined" class="card-footer">
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: probability + '%' }" />
      </view>
      <text class="progress-text">{{ probability }}%</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OpportunityStage } from '@crm/shared'
import StatusTag from './StatusTag.vue'

const props = withDefaults(defineProps<{
  id: number | string
  name: string
  stage: OpportunityStage | string
  amount: number
  customerName?: string
  expectedCloseDate?: string
  probability?: number
}>(), {
  customerName: '',
  expectedCloseDate: '',
})

const emit = defineEmits<{
  click: [id: number | string]
}>()

const formattedAmount = computed(() => {
  if (props.amount >= 10000) {
    return (props.amount / 10000).toFixed(2) + '万'
  }
  return props.amount.toLocaleString()
})

function onTap() {
  emit('click', props.id)
}
</script>

<style scoped>
.opportunity-card {
  margin: 0 24rpx 16rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 8rpx;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.opp-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.opp-amount,
.opp-customer,
.opp-date {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.amount-label,
.customer-label,
.date-label {
  font-size: 24rpx;
  color: #909399;
  width: 100rpx;
}

.amount-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.customer-value,
.date-value {
  font-size: 24rpx;
  color: #303133;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #ebeef5;
}

.progress-bar {
  flex: 1;
  height: 12rpx;
  background: #ebeef5;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 22rpx;
  color: #909399;
  width: 60rpx;
  text-align: right;
}
</style>
