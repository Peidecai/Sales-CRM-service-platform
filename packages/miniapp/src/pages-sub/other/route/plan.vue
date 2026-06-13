<template>
  <view class="route-plan-page">
    <!-- Customer Selection -->
    <view class="selection-section">
      <view class="section-header">
        <text class="section-title">选择要拜访的客户</text>
        <text class="selected-count">已选 {{ selectedIds.length }}</text>
      </view>

      <input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索客户"
        @input="searchCustomers"
      />

      <scroll-view scroll-y class="customer-select-list">
        <view
          v-for="customer in customerList"
          :key="customer.id"
          class="select-item"
          @click="toggleSelect(customer)"
        >
          <view
            class="checkbox"
            :class="{ checked: isSelected(customer.id) }"
          >
            <text v-if="isSelected(customer.id)" class="check-icon">&#x2713;</text>
          </view>
          <view class="select-info">
            <text class="select-name">{{ customer.name }}</text>
            <text class="select-addr">{{ customer.address || '无地址信息' }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Optimize Button -->
    <button
      class="btn-optimize"
      :loading="optimizing"
      :disabled="selectedIds.length < 2"
      @click="handleOptimize"
    >
      规划最优路线 ({{ selectedIds.length }} 个客户)
    </button>

    <!-- Optimized Route Result -->
    <view v-if="optimizedRoute" class="route-result">
      <view class="section-header">
        <text class="section-title">推荐拜访顺序</text>
        <text class="total-distance">总距离 {{ formatDist(optimizedRoute.totalDistance) }}</text>
      </view>

      <view
        v-for="(point, index) in optimizedRoute.points"
        :key="point.customerId"
        class="route-point"
      >
        <view class="point-order">
          <text class="order-number">{{ index + 1 }}</text>
          <view v-if="index < optimizedRoute.points.length - 1" class="order-line" />
        </view>
        <view class="point-info">
          <text class="point-name">{{ point.customerName }}</text>
          <text class="point-addr">{{ point.address }}</text>
          <text v-if="point.distanceFromPrev > 0" class="point-dist">
            距上一站 {{ formatDist(point.distanceFromPrev) }}
          </text>
        </view>
        <view class="point-action" @click="navigateToPoint(point)">
          <text class="nav-btn-text">导航</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { customerApi, type CustomerVO } from '@/api/customer'
import { routeApi, type OptimizedRoute } from '@/api/route'
import { formatDistance } from '@/utils/geo'

const searchKeyword = ref('')
const customerList = ref<CustomerVO[]>([])
const selectedIds = ref<number[]>([])
const optimizing = ref(false)
const optimizedRoute = ref<OptimizedRoute | null>(null)

function isSelected(id: number): boolean {
  return selectedIds.value.includes(id)
}

function toggleSelect(customer: CustomerVO) {
  const idx = selectedIds.value.indexOf(customer.id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(customer.id)
  }
  // Clear previous route when selection changes
  optimizedRoute.value = null
}

async function searchCustomers() {
  try {
    const res = await customerApi.getList({
      keyword: searchKeyword.value,
      page: 1,
      pageSize: 50,
    })
    if (res.code === 0 && res.data) {
      customerList.value = res.data.list
    }
  } catch {
    // Silently fail
  }
}

async function handleOptimize() {
  if (selectedIds.value.length < 2) {
    uni.showToast({ title: '请至少选择2个客户', icon: 'none' })
    return
  }
  optimizing.value = true

  try {
    // Get current location as starting point
    let startLat: number | undefined
    let startLng: number | undefined
    try {
      const location = await new Promise<UniApp.GetLocationSuccess>((resolve, reject) => {
        uni.getLocation({ type: 'gcj02', success: resolve, fail: reject })
      })
      startLat = location.latitude
      startLng = location.longitude
    } catch {
      // No location available, server will use first customer as start
    }

    const res = await routeApi.optimize({
      customerIds: selectedIds.value,
      startLatitude: startLat,
      startLongitude: startLng,
    })

    if (res.code === 0 && res.data) {
      optimizedRoute.value = res.data
    } else {
      uni.showToast({ title: res.message || '路线规划失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '路线规划失败', icon: 'none' })
  } finally {
    optimizing.value = false
  }
}

function formatDist(meters: number): string {
  return formatDistance(meters)
}

function navigateToPoint(point: { latitude: number; longitude: number; customerName: string; address: string }) {
  uni.openLocation({
    latitude: point.latitude,
    longitude: point.longitude,
    name: point.customerName,
    address: point.address,
  })
}

onMounted(() => {
  searchCustomers()
})
</script>

<style scoped>
.route-plan-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}

.selection-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.selected-count {
  font-size: 24rpx;
  color: #409eff;
}

.total-distance {
  font-size: 24rpx;
  color: #67c23a;
}

.search-input {
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  margin-bottom: 16rpx;
}

.customer-select-list {
  max-height: 500rpx;
}

.select-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.select-item:last-child {
  border-bottom: none;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid #dcdfe6;
  border-radius: 8rpx;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox.checked {
  background: #409eff;
  border-color: #409eff;
}

.check-icon {
  color: #ffffff;
  font-size: 24rpx;
}

.select-info {
  flex: 1;
  min-width: 0;
}

.select-name {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.select-addr {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-optimize {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 44rpx;
  border: none;
  margin-bottom: 24rpx;
}

.btn-optimize::after { border: none; }

.btn-optimize[disabled] {
  background: #c0c4cc;
}

.route-result {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.route-point {
  display: flex;
  align-items: flex-start;
  padding: 16rpx 0;
}

.point-order {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.order-number {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  background: #409eff;
  color: #ffffff;
  border-radius: 50%;
  font-size: 24rpx;
  font-weight: bold;
}

.order-line {
  width: 3rpx;
  height: 60rpx;
  background: #dcdfe6;
  margin-top: 8rpx;
}

.point-info {
  flex: 1;
  min-width: 0;
}

.point-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  display: block;
}

.point-addr {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.point-dist {
  font-size: 22rpx;
  color: #409eff;
  display: block;
  margin-top: 4rpx;
}

.point-action {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
}

.nav-btn-text {
  font-size: 24rpx;
  color: #409eff;
  border: 2rpx solid #409eff;
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
}
</style>
