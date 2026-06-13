<template>
  <view class="skeleton-screen">
    <!-- Stats skeleton -->
    <view v-if="type === 'dashboard'" class="skeleton-dashboard">
      <view class="skeleton-header">
        <view class="sk-line sk-w60 sk-h32" />
        <view class="sk-line sk-w30 sk-h24" />
      </view>
      <view class="skeleton-stats-grid">
        <view v-for="i in 4" :key="i" class="skeleton-stat-card">
          <view class="sk-line sk-w50 sk-h20" />
          <view class="sk-line sk-w70 sk-h32" />
        </view>
      </view>
      <view class="skeleton-card">
        <view class="sk-line sk-w40 sk-h28" />
        <view v-for="i in 3" :key="'todo-' + i" class="skeleton-todo-item">
          <view class="sk-circle sk-s16" />
          <view class="skeleton-todo-text">
            <view class="sk-line sk-w80 sk-h24" />
            <view class="sk-line sk-w50 sk-h20" />
          </view>
        </view>
      </view>
    </view>

    <!-- Customer list skeleton -->
    <view v-if="type === 'customer-list'" class="skeleton-customer-list">
      <view class="skeleton-search-bar">
        <view class="sk-line sk-w100 sk-h64 sk-radius" />
      </view>
      <view class="skeleton-tabs">
        <view v-for="i in 3" :key="i" class="sk-line sk-w80px sk-h32" />
      </view>
      <view v-for="i in 6" :key="'cust-' + i" class="skeleton-customer-item">
        <view class="sk-circle sk-s80" />
        <view class="skeleton-customer-info">
          <view class="sk-line sk-w60 sk-h28" />
          <view class="sk-line sk-w80 sk-h20" />
          <view class="sk-line sk-w40 sk-h20" />
        </view>
      </view>
    </view>

    <!-- Opportunity list skeleton -->
    <view v-if="type === 'opportunity-list'" class="skeleton-opportunity-list">
      <view class="skeleton-search-bar">
        <view class="sk-line sk-w100 sk-h64 sk-radius" />
      </view>
      <view class="skeleton-tabs">
        <view v-for="i in 5" :key="i" class="sk-line sk-w60px sk-h32" />
      </view>
      <view v-for="i in 5" :key="'opp-' + i" class="skeleton-opp-card">
        <view class="skeleton-opp-header">
          <view class="sk-line sk-w60 sk-h28" />
          <view class="sk-line sk-w20 sk-h24" />
        </view>
        <view class="skeleton-opp-meta">
          <view class="sk-line sk-w30 sk-h20" />
          <view class="sk-line sk-w20 sk-h20" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  type: 'dashboard' | 'customer-list' | 'opportunity-list'
}>()
</script>

<style scoped>
.skeleton-screen {
  padding: 24rpx;
}

/* Skeleton line base */
.sk-line {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.5s infinite;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.sk-circle {
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.5s infinite;
  flex-shrink: 0;
}

@keyframes sk-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* Width helpers */
.sk-w20 { width: 20%; }
.sk-w30 { width: 30%; }
.sk-w40 { width: 40%; }
.sk-w50 { width: 50%; }
.sk-w60 { width: 60%; }
.sk-w70 { width: 70%; }
.sk-w80 { width: 80%; }
.sk-w100 { width: 100%; }
.sk-w60px { width: 120rpx; }
.sk-w80px { width: 160rpx; }

/* Height helpers */
.sk-h20 { height: 20rpx; }
.sk-h24 { height: 24rpx; }
.sk-h28 { height: 28rpx; }
.sk-h32 { height: 32rpx; }
.sk-h64 { height: 64rpx; }

/* Size helpers for circles */
.sk-s16 { width: 16rpx; height: 16rpx; }
.sk-s80 { width: 80rpx; height: 80rpx; }

.sk-radius { border-radius: 32rpx; }

/* Dashboard skeleton */
.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 0 24rpx;
}

.skeleton-stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.skeleton-stat-card {
  flex: 1;
  min-width: calc(50% - 8rpx);
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  min-height: 120rpx;
}

.skeleton-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.skeleton-todo-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.skeleton-todo-text {
  flex: 1;
}

/* Customer list skeleton */
.skeleton-search-bar {
  margin-bottom: 16rpx;
}

.skeleton-tabs {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  margin-bottom: 16rpx;
}

.skeleton-customer-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #ffffff;
  margin-bottom: 2rpx;
}

.skeleton-customer-info {
  flex: 1;
}

/* Opportunity list skeleton */
.skeleton-opp-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.skeleton-opp-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.skeleton-opp-meta {
  display: flex;
  gap: 16rpx;
}
</style>
