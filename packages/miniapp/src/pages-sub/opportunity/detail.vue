<template>
  <view class="opportunity-detail-page">
    <!-- Loading -->
    <view v-if="loading" class="loading-center">
      <LoadMore status="loading" />
    </view>

    <template v-else-if="detail">
      <!-- Header -->
      <view class="detail-header">
        <view class="header-top">
          <text class="opp-title">{{ detail.title }}</text>
          <StatusTag :status="detail.stage" type="opportunity" />
        </view>
        <text class="opp-amount">¥{{ formatAmount(detail.amount) }}</text>
      </view>

      <!-- Customer link -->
      <view v-if="detail.customerId" class="section-card" @click="goCustomer">
        <view class="section-header">
          <text class="section-title">关联客户</text>
          <text class="link-arrow">></text>
        </view>
        <text class="customer-name-link">{{ customerName || `客户 #${detail.customerId}` }}</text>
      </view>

      <!-- Basic info -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">基本信息</text>
        </view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">预计成交日期</text>
            <text class="info-value">{{ detail.expectedCloseDate || '未设置' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">成交概率</text>
            <text class="info-value">{{ detail.probability }}%</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDate(detail.createdAt) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">更新时间</text>
            <text class="info-value">{{ formatDate(detail.updatedAt) }}</text>
          </view>
        </view>
        <view v-if="detail.description" class="info-desc">
          <text class="info-label">备注</text>
          <text class="desc-text">{{ detail.description }}</text>
        </view>
      </view>

      <!-- Stage progress -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">阶段推进</text>
        </view>
        <view class="stage-pipeline">
          <view
            v-for="(s, idx) in stageFlow"
            :key="s.value"
            class="stage-step"
            :class="{
              current: detail.stage === s.value,
              passed: stageIndex(detail.stage) > idx,
              lost: detail.stage === 'CLOSED_LOST',
            }"
            @click="onStageClick(s.value, idx)"
          >
            <view class="stage-dot" />
            <text class="stage-label">{{ s.label }}</text>
          </view>
        </view>
      </view>

      <!-- Bottom action bar -->
      <view class="bottom-bar">
        <view class="bar-btn bar-btn-default" @click="goEdit">
          <text class="bar-btn-text">编辑</text>
        </view>
        <view
          v-if="canAdvance"
          class="bar-btn bar-btn-primary"
          @click="advanceStage"
        >
          <text class="bar-btn-text">推进阶段</text>
        </view>
        <view class="bar-btn bar-btn-default" @click="goFollowUp">
          <text class="bar-btn-text">关联跟进</text>
        </view>
      </view>
    </template>

    <!-- Error / Not found -->
    <EmptyState
      v-else-if="!loading"
      title="商机不存在"
      description="该商机可能已被删除"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import LoadMore from '@/components/LoadMore.vue'
import EmptyState from '@/components/EmptyState.vue'
import { opportunityApi, OpportunityStage } from '@/api/opportunity'
import type { OpportunityVO } from '@/api/opportunity'

const detail = ref<OpportunityVO | null>(null)
const loading = ref(true)
const customerName = ref('')
const oppId = ref(0)

const stageFlow: { value: string; label: string }[] = [
  { value: OpportunityStage.LEAD, label: '线索' },
  { value: OpportunityStage.QUALIFIED, label: '确认' },
  { value: OpportunityStage.PROPOSAL, label: '方案' },
  { value: OpportunityStage.NEGOTIATION, label: '谈判' },
  { value: OpportunityStage.CLOSED_WON, label: '成交' },
]

function stageIndex(stage: string): number {
  return stageFlow.findIndex((s) => s.value === stage)
}

const canAdvance = computed(() => {
  if (!detail.value) return false
  const s = detail.value.stage
  return s !== OpportunityStage.CLOSED_WON && s !== OpportunityStage.CLOSED_LOST
})

function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万'
  }
  return amount.toLocaleString()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

async function fetchDetail(id: number) {
  loading.value = true
  try {
    const res = await opportunityApi.getDetail(id)
    if (res.code === 0 && res.data) {
      detail.value = res.data
      // Try to fetch customer name
      if (res.data.customerId) {
        try {
          const { customerApi } = await import('@/api/customer')
          const cRes = await customerApi.getDetail(res.data.customerId)
          if (cRes.code === 0 && cRes.data) {
            customerName.value = cRes.data.name
          }
        } catch {
          // Not critical
        }
      }
    }
  } catch {
    // Error handled by interceptor
  } finally {
    loading.value = false
  }
}

function onStageClick(stageValue: string, idx: number) {
  if (!detail.value) return
  const currentIdx = stageIndex(detail.value.stage)
  if (idx === currentIdx + 1) {
    confirmAdvanceTo(stageValue)
  }
}

function advanceStage() {
  if (!detail.value) return
  const currentIdx = stageIndex(detail.value.stage)
  if (currentIdx < 0 || currentIdx >= stageFlow.length - 1) return
  const nextStage = stageFlow[currentIdx + 1].value
  confirmAdvanceTo(nextStage)
}

function confirmAdvanceTo(stageValue: string) {
  const stageLabel = stageFlow.find((s) => s.value === stageValue)?.label ?? stageValue
  uni.showModal({
    title: '推进阶段',
    content: `确认推进到「${stageLabel}」阶段？`,
    success: async (res) => {
      if (!res.confirm || !detail.value) return
      try {
        const updateRes = await import('@/api/request').then((m) =>
          m.http.put(`/opportunities/${detail.value!.id}`, { stage: stageValue }),
        )
        if ((updateRes as { code: number }).code === 0) {
          uni.showToast({ title: '推进成功', icon: 'success' })
          await fetchDetail(oppId.value)
        }
      } catch {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
  })
}

function goCustomer() {
  if (!detail.value) return
  uni.navigateTo({ url: `/pages-sub/customer/detail?id=${detail.value.customerId}` })
}

function goEdit() {
  if (!detail.value) return
  uni.navigateTo({ url: `/pages-sub/opportunity/create?id=${detail.value.id}` })
}

function goFollowUp() {
  if (!detail.value) return
  uni.navigateTo({
    url: `/pages-sub/follow-up/create?opportunityId=${detail.value.id}&customerId=${detail.value.customerId}`,
  })
}

onLoad((query) => {
  const id = Number(query?.id)
  if (id) {
    oppId.value = id
    fetchDetail(id)
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
.opportunity-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.loading-center {
  padding-top: 200rpx;
}

/* Header */
.detail-header {
  background: #ffffff;
  padding: 32rpx 24rpx;
  margin-bottom: 16rpx;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.opp-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #303133;
  flex: 1;
  margin-right: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opp-amount {
  font-size: 44rpx;
  font-weight: 700;
  color: #303133;
}

/* Section card */
.section-card {
  background: #ffffff;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.link-arrow {
  font-size: 28rpx;
  color: #909399;
}

.customer-name-link {
  font-size: 28rpx;
  color: #409eff;
}

/* Info grid */
.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-item {
  width: 50%;
  margin-bottom: 20rpx;
}

.info-label {
  font-size: 24rpx;
  color: #909399;
  display: block;
  margin-bottom: 4rpx;
}

.info-value {
  font-size: 28rpx;
  color: #303133;
}

.info-desc {
  padding-top: 12rpx;
  border-top: 1rpx solid #f0f0f0;
}

.desc-text {
  font-size: 28rpx;
  color: #303133;
  line-height: 1.6;
  margin-top: 8rpx;
  display: block;
}

/* Stage pipeline */
.stage-pipeline {
  display: flex;
  justify-content: space-between;
  position: relative;
  padding: 16rpx 0;
}

.stage-pipeline::before {
  content: '';
  position: absolute;
  top: 30rpx;
  left: 24rpx;
  right: 24rpx;
  height: 4rpx;
  background: #ebeef5;
}

.stage-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  flex: 1;
}

.stage-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #ebeef5;
  border: 4rpx solid #ffffff;
  margin-bottom: 8rpx;
}

.stage-step.passed .stage-dot {
  background: #67c23a;
}

.stage-step.current .stage-dot {
  background: #409eff;
  width: 32rpx;
  height: 32rpx;
  box-shadow: 0 0 0 8rpx rgba(64, 158, 255, 0.2);
}

.stage-step.lost .stage-dot {
  background: #f56c6c;
}

.stage-label {
  font-size: 22rpx;
  color: #909399;
}

.stage-step.current .stage-label {
  color: #409eff;
  font-weight: 600;
}

.stage-step.passed .stage-label {
  color: #67c23a;
}

/* Bottom bar */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #ffffff;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);
  z-index: 100;
  gap: 16rpx;
}

.bar-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.bar-btn-primary {
  background: #409eff;
}

.bar-btn-primary .bar-btn-text {
  color: #ffffff;
}

.bar-btn-default {
  background: #f5f7fa;
  border: 1rpx solid #dcdfe6;
}

.bar-btn-default .bar-btn-text {
  color: #303133;
}

.bar-btn-text {
  font-size: 28rpx;
  font-weight: 500;
}
</style>
