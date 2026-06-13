<template>
  <view class="pk-ranking-page">
    <!-- Pull to refresh -->
    <scroll-view
      scroll-y
      class="scroll-container"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- Empty state: no active PK -->
      <view v-if="!loading && !currentPk" class="empty-wrapper">
        <view class="empty-state">
          <text class="empty-icon">&#127942;</text>
          <text class="empty-title">暂无进行中的PK赛事</text>
          <text class="empty-desc">赛事开启后将在此展示排行榜</text>
        </view>
      </view>

      <template v-else>
        <!-- Header: PK event name + remaining days -->
        <view class="pk-header">
          <text class="pk-name">{{ currentPk?.name || 'PK排行榜' }}</text>
          <view class="pk-countdown">
            <text class="countdown-label">剩余</text>
            <text class="countdown-days">{{ remainingDays }}</text>
            <text class="countdown-label">天</text>
          </view>
        </view>

        <!-- Personal Progress Card -->
        <view class="card my-progress-card">
          <view class="card-header">
            <text class="card-title">我的进度</text>
            <text class="my-rank-badge">第 {{ myRank }} 名</text>
          </view>

          <view class="progress-big-container">
            <view class="progress-big-bar">
              <view
                class="progress-big-fill"
                :style="{
                  width: Math.min(myRate, 100) + '%',
                  background: getProgressColor(myRate),
                }"
              />
            </view>
            <text class="progress-rate" :style="{ color: getProgressColor(myRate) }">
              {{ myRate.toFixed(1) }}%
            </text>
          </view>

          <view class="progress-detail">
            <view class="detail-item">
              <text class="detail-label">已完成</text>
              <text class="detail-value highlight">{{ formatValue(myAchieved) }}</text>
            </view>
            <view class="detail-divider" />
            <view class="detail-item">
              <text class="detail-label">目标</text>
              <text class="detail-value">{{ formatValue(myTarget) }}</text>
            </view>
          </view>
        </view>

        <!-- Ranking List -->
        <view class="card ranking-card">
          <view class="card-header">
            <text class="card-title">排行榜</text>
            <text class="card-sub">共 {{ rankingList.length }} 人</text>
          </view>

          <view v-if="rankingList.length === 0" class="empty-state">
            <text class="empty-text">暂无排名数据</text>
          </view>

          <view
            v-for="item in rankingList"
            :key="item.userId"
            class="ranking-item"
            :class="{ 'ranking-item-me': item.userId === userId }"
          >
            <!-- Rank badge -->
            <view class="rank-badge" :class="getRankClass(item.rank)">
              <text class="rank-number">{{ item.rank }}</text>
            </view>

            <!-- Avatar + info -->
            <view class="rank-user">
              <view class="rank-avatar">
                <text class="avatar-text">{{ item.userName.slice(0, 1) }}</text>
              </view>
              <view class="rank-user-info">
                <text class="rank-name">
                  {{ item.userName }}
                  <text v-if="item.userId === userId" class="me-tag">我</text>
                </text>
                <text class="rank-dept">{{ item.department || '' }}</text>
              </view>
            </view>

            <!-- Amount + progress -->
            <view class="rank-progress">
              <text class="rank-amount">{{ formatValue(item.metricValue) }}</text>
              <view class="rank-bar-bg">
                <view
                  class="rank-bar-fill"
                  :style="{ width: getBarWidth(item.metricValue) + '%' }"
                />
              </view>
            </view>
          </view>
        </view>

        <view style="height: 40rpx" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import {
  salesTargetApi,
  type RankingItem,
  type SalesTargetVO,
  TargetMetricType,
  TargetPeriod,
} from '@/api/sales-target'
import { useUserStore } from '@/stores/user'

interface RankingItemExt extends RankingItem {
  department?: string
}

const userStore = useUserStore()
const userId = computed(() => userStore.userId)

const loading = ref(true)
const refreshing = ref(false)
const currentPk = ref<SalesTargetVO | null>(null)
const rankingList = ref<RankingItemExt[]>([])

// Remaining days
const remainingDays = computed(() => {
  if (!currentPk.value) return 0
  const end = new Date(currentPk.value.endDate)
  const now = new Date()
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
})

// My progress
const myItem = computed(() =>
  rankingList.value.find((r) => r.userId === userId.value)
)
const myRank = computed(() => myItem.value?.rank ?? '-')
const myTarget = computed(() => currentPk.value?.targetValue ?? 0)
const myAchieved = computed(() => myItem.value?.metricValue ?? 0)
const myRate = computed(() => {
  if (myTarget.value <= 0) return 0
  return (myAchieved.value / myTarget.value) * 100
})

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

function getRankClass(rank: number): string {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

function getBarWidth(value: number): number {
  if (rankingList.value.length === 0) return 0
  const max = rankingList.value[0]?.metricValue || 1
  return (value / max) * 100
}

async function loadData(): Promise<void> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const quarter = Math.ceil(month / 3)

  try {
    // Load current PK target (use overview to detect active target)
    const overviewRes = await salesTargetApi.getOverview(year)
    if (overviewRes.code === 0 && overviewRes.data && overviewRes.data.length > 0) {
      // Build a synthetic PK target from overview
      const revenue = overviewRes.data.find(
        (o) => o.metricType === TargetMetricType.REVENUE
      )
      if (revenue) {
        currentPk.value = {
          id: 0,
          name: `${year}年${month}月销售PK`,
          scope: 'individual' as SalesTargetVO['scope'],
          period: 'month' as SalesTargetVO['period'],
          metricType: TargetMetricType.REVENUE,
          targetValue: revenue.targetValue,
          achievedValue: revenue.achievedValue,
          year,
          quarter: null,
          month,
          startDate: `${year}-${String(month).padStart(2, '0')}-01`,
          endDate: getMonthEnd(year, month),
          assignedUserId: null,
          teamId: null,
          parentTargetId: null,
          createdAt: '',
          updatedAt: '',
          deleted: false,
        }
      }
    }

    // Load ranking
    const rankingRes = await salesTargetApi.getSalesRanking({
      metricType: TargetMetricType.REVENUE,
      period: TargetPeriod.MONTH,
      year,
      month,
      quarter,
      limit: 50,
    })
    if (rankingRes.code === 0 && rankingRes.data) {
      rankingList.value = rankingRes.data as RankingItemExt[]
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getMonthEnd(year: number, month: number): string {
  const d = new Date(year, month, 0)
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function onRefresh(): Promise<void> {
  refreshing.value = true
  await loadData()
  refreshing.value = false
}

onMounted(() => {
  loadData()
})

onShow(() => {
  loadData()
})
</script>

<style scoped>
.pk-ranking-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.scroll-container {
  height: 100vh;
}

/* Empty State */
.empty-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 30rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: #ccc;
}

.empty-text {
  font-size: 26rpx;
  color: #ccc;
  padding: 40rpx;
  text-align: center;
}

/* PK Header */
.pk-header {
  background: linear-gradient(135deg, #409eff, #337ecc);
  padding: 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pk-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}

.pk-countdown {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.countdown-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.countdown-days {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffd700;
}

/* Card */
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

.card-sub {
  font-size: 24rpx;
  color: #999;
}

/* My rank badge */
.my-rank-badge {
  font-size: 26rpx;
  font-weight: bold;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
}

/* Big progress bar */
.progress-big-container {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.progress-big-bar {
  flex: 1;
  height: 28rpx;
  background: #f0f0f0;
  border-radius: 14rpx;
  overflow: hidden;
}

.progress-big-fill {
  height: 100%;
  border-radius: 14rpx;
  transition: width 0.5s ease;
}

.progress-rate {
  font-size: 36rpx;
  font-weight: bold;
  min-width: 120rpx;
  text-align: right;
}

/* Progress detail */
.progress-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.detail-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.detail-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.detail-value.highlight {
  color: #409eff;
}

.detail-divider {
  width: 1rpx;
  height: 60rpx;
  background: #eee;
}

/* Ranking List */
.ranking-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-item-me {
  background: rgba(64, 158, 255, 0.05);
  margin: 0 -28rpx;
  padding: 20rpx 28rpx;
  border-radius: 12rpx;
}

/* Rank badge */
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

/* Avatar */
.rank-user {
  display: flex;
  align-items: center;
  width: 240rpx;
  flex-shrink: 0;
}

.rank-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #79bbff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: bold;
}

.rank-user-info {
  flex: 1;
  overflow: hidden;
}

.rank-name {
  font-size: 26rpx;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.me-tag {
  font-size: 20rpx;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.rank-dept {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Amount + bar */
.rank-progress {
  flex: 1;
  margin-left: 16rpx;
}

.rank-amount {
  font-size: 24rpx;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8rpx;
  display: block;
  text-align: right;
}

.rank-bar-bg {
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.rank-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 6rpx;
}
</style>
