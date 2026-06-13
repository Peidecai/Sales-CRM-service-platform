<template>
  <view class="performance-page">
    <TabBar :selected="3" />

    <!-- Period Selector -->
    <view class="period-selector">
      <text
        v-for="p in periodOptions"
        :key="p.value"
        class="period-tag"
        :class="{ active: activePeriod === p.value }"
        @click="switchPeriod(p.value)"
      >
        {{ p.label }}
      </text>
    </view>

    <!-- Personal Achievement -->
    <view class="card achievement-card">
      <view class="card-header">
        <text class="card-title">个人业绩</text>
        <text class="card-period">{{ currentPeriodLabel }}</text>
      </view>

      <view v-if="overviewItems.length === 0" class="empty-state">
        <text class="empty-text">暂无业绩数据</text>
      </view>

      <view v-for="item in overviewItems" :key="item.metricType" class="achievement-item">
        <view class="achievement-header">
          <text class="metric-label">{{ metricLabel(item.metricType) }}</text>
          <text class="achievement-rate">{{ item.achievementRate.toFixed(1) }}%</text>
        </view>
        <view class="progress-bar-container">
          <view
            class="progress-bar-fill"
            :style="{
              width: Math.min(item.achievementRate, 100) + '%',
              background: getProgressColor(item.achievementRate),
            }"
          />
        </view>
        <view class="achievement-detail">
          <text class="achieved-value">已完成 {{ formatValue(item.achievedValue) }}</text>
          <text class="target-value">目标 {{ formatValue(item.targetValue) }}</text>
        </view>
      </view>
    </view>

    <!-- Team Ranking -->
    <view class="card ranking-card">
      <view class="card-header">
        <text class="card-title">团队 TOP 10</text>
      </view>

      <view v-if="rankingList.length === 0" class="empty-state">
        <text class="empty-text">暂无排名数据</text>
      </view>

      <view
        v-for="(item, index) in rankingList"
        :key="item.userId"
        class="ranking-item"
      >
        <view class="rank-badge" :class="getRankClass(index)">
          <text class="rank-number">{{ index + 1 }}</text>
        </view>
        <view class="rank-info">
          <text class="rank-name">{{ item.userName }}</text>
          <text class="rank-value">{{ formatValue(item.metricValue) }}</text>
        </view>
        <view class="rank-bar-bg">
          <view
            class="rank-bar-fill"
            :style="{ width: getBarWidth(item.metricValue) + '%' }"
          />
        </view>
      </view>
    </view>

    <view style="height: 140rpx" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '@/components/TabBar.vue'
import {
  salesTargetApi,
  type OverviewItem,
  type RankingItem,
  TargetMetricType,
  TargetPeriod,
} from '@/api/sales-target'

const activePeriod = ref<'month' | 'quarter'>('month')
const overviewItems = ref<OverviewItem[]>([])
const rankingList = ref<RankingItem[]>([])

const periodOptions = [
  { value: 'month' as const, label: '本月' },
  { value: 'quarter' as const, label: '本季度' },
]

const currentPeriodLabel = computed(() => {
  const now = new Date()
  if (activePeriod.value === 'month') {
    return `${now.getFullYear()}年${now.getMonth() + 1}月`
  }
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}年 Q${q}`
})

function metricLabel(type: string): string {
  const map: Record<string, string> = {
    revenue: '收入金额',
    deal_count: '成交数',
    new_customer: '新客户数',
    call_count: '通话数',
  }
  return map[type] || type
}

function formatValue(value: number): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万'
  }
  return String(Math.round(value))
}

function getProgressColor(rate: number): string {
  if (rate >= 100) return '#67c23a'
  if (rate >= 60) return '#409eff'
  if (rate >= 30) return '#e6a23c'
  return '#f56c6c'
}

function getRankClass(index: number): string {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

function getBarWidth(value: number): number {
  if (rankingList.value.length === 0) return 0
  const max = rankingList.value[0]?.metricValue || 1
  return (value / max) * 100
}

async function loadData() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const quarter = Math.ceil(month / 3)

  try {
    const overviewRes = await salesTargetApi.getOverview(year)
    if (overviewRes.code === 0 && overviewRes.data) {
      overviewItems.value = overviewRes.data
    }
  } catch {
    // Silently fail
  }

  try {
    const rankingRes = await salesTargetApi.getSalesRanking({
      metricType: TargetMetricType.REVENUE,
      period: activePeriod.value === 'month' ? TargetPeriod.MONTH : TargetPeriod.QUARTER,
      year,
      quarter: activePeriod.value === 'quarter' ? quarter : undefined,
      month: activePeriod.value === 'month' ? month : undefined,
      limit: 10,
    })
    if (rankingRes.code === 0 && rankingRes.data) {
      rankingList.value = rankingRes.data
    }
  } catch {
    // Silently fail
  }
}

function switchPeriod(period: 'month' | 'quarter') {
  activePeriod.value = period
  loadData()
}

onMounted(() => {
  loadData()
})

onShow(() => {
  loadData()
})
</script>

<style scoped>
.performance-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.period-selector {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  background: #ffffff;
}

.period-tag {
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f7fa;
  border-radius: 32rpx;
}

.period-tag.active {
  color: #ffffff;
  background: #409eff;
  font-weight: 500;
}

.card {
  margin: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.card-period {
  font-size: 24rpx;
  color: #999;
}

.achievement-item {
  margin-bottom: 28rpx;
}

.achievement-item:last-child {
  margin-bottom: 0;
}

.achievement-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.metric-label {
  font-size: 26rpx;
  color: #666;
}

.achievement-rate {
  font-size: 28rpx;
  font-weight: bold;
  color: #409eff;
}

.progress-bar-container {
  height: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.5s ease;
}

.achievement-detail {
  display: flex;
  justify-content: space-between;
}

.achieved-value {
  font-size: 22rpx;
  color: #333;
}

.target-value {
  font-size: 22rpx;
  color: #999;
}

/* Ranking */
.ranking-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.rank-badge.rank-gold {
  background: linear-gradient(135deg, #ffd700, #ffb800);
}

.rank-badge.rank-silver {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
}

.rank-badge.rank-bronze {
  background: linear-gradient(135deg, #cd7f32, #b06000);
}

.rank-number {
  font-size: 24rpx;
  font-weight: bold;
  color: #666;
}

.rank-gold .rank-number,
.rank-silver .rank-number,
.rank-bronze .rank-number {
  color: #ffffff;
}

.rank-info {
  width: 200rpx;
  flex-shrink: 0;
}

.rank-name {
  font-size: 26rpx;
  color: #333;
  display: block;
}

.rank-value {
  font-size: 22rpx;
  color: #409eff;
}

.rank-bar-bg {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
  margin-left: 16rpx;
}

.rank-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 6rpx;
}

.empty-state { padding: 40rpx; text-align: center; }
.empty-text { font-size: 26rpx; color: #ccc; }
</style>
