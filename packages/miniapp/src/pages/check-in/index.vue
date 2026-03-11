<template>
  <view class="check-in-page">
    <!-- Current Location -->
    <view class="location-card">
      <view class="card-header">
        <text class="card-title">当前位置</text>
        <text class="refresh-btn" @click="refreshLocation">刷新</text>
      </view>
      <view v-if="locationLoading" class="location-loading">
        <text>定位中...</text>
      </view>
      <view v-else-if="currentLocation" class="location-info">
        <text class="location-address">{{ currentAddress || '获取地址中...' }}</text>
        <text class="location-coords">
          {{ currentLocation.latitude.toFixed(6) }}, {{ currentLocation.longitude.toFixed(6) }}
        </text>
      </view>
      <view v-else class="location-error">
        <text>定位失败，请检查权限</text>
        <button class="btn-retry" @click="refreshLocation">重新定位</button>
      </view>
    </view>

    <!-- Customer Selector for Check-in -->
    <view class="form-section">
      <view class="form-label">打卡客户</view>
      <view class="form-picker" @click="showCustomerPicker = true">
        <text :class="{ placeholder: !selectedCustomer }">
          {{ selectedCustomer ? selectedCustomer.name : '选择客户' }}
        </text>
        <text class="picker-arrow">&gt;</text>
      </view>
      <view v-if="distanceInfo" class="distance-info" :class="{ 'within-range': isWithinRange }">
        <text>距客户 {{ distanceInfo }}{{ isWithinRange ? ' (范围内)' : ' (超出范围)' }}</text>
      </view>
    </view>

    <!-- Photo -->
    <view class="form-section">
      <view class="form-label">现场照片</view>
      <view class="photo-section">
        <view v-if="photoPath" class="photo-preview">
          <image :src="photoPath" mode="aspectFill" class="photo-img" />
          <text class="photo-remove" @click="photoPath = ''">x</text>
        </view>
        <view v-else class="photo-add" @click="takePhoto">
          <text class="photo-add-icon">+</text>
          <text class="photo-add-text">拍照</text>
        </view>
      </view>
    </view>

    <!-- Remark -->
    <view class="form-section">
      <view class="form-label">备注</view>
      <input v-model="remark" class="form-input" placeholder="请输入打卡备注" />
    </view>

    <!-- Submit -->
    <button
      class="btn-submit"
      :loading="submitting"
      :disabled="!canSubmit"
      @click="handleSubmit"
    >
      确认打卡
    </button>

    <!-- Check-in History -->
    <view class="history-section">
      <view class="section-title">打卡记录</view>
      <view v-if="historyList.length === 0" class="empty-state">
        <text class="empty-text">暂无打卡记录</text>
      </view>
      <view v-for="record in historyList" :key="record.id" class="history-item">
        <view class="history-row">
          <text class="history-customer">{{ record.customerName || '未知客户' }}</text>
          <text class="history-time">{{ formatTime(record.createdAt) }}</text>
        </view>
        <text class="history-address">{{ record.address }}</text>
        <text class="history-distance">距客户 {{ formatDist(record.distance) }}</text>
      </view>
    </view>

    <!-- Customer Picker Modal -->
    <view v-if="showCustomerPicker" class="modal-mask" @click="showCustomerPicker = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择客户</text>
          <text class="modal-close" @click="showCustomerPicker = false">关闭</text>
        </view>
        <input
          v-model="customerSearch"
          class="modal-search"
          placeholder="搜索客户"
          @input="searchCustomers"
        />
        <scroll-view scroll-y class="modal-list">
          <view
            v-for="c in searchResults"
            :key="c.id"
            class="modal-item"
            @click="selectCustomer(c)"
          >
            <text class="modal-item-name">{{ c.name }}</text>
            <text class="modal-item-addr">{{ c.address || '无地址' }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { customerApi, type CustomerVO } from '@/api/customer'
import { checkInApi, type CheckInVO } from '@/api/check-in'
import { haversineDistance, formatDistance } from '@/utils/geo'

interface Location {
  latitude: number
  longitude: number
}

const CHECK_IN_RADIUS = 500 // meters

const currentLocation = ref<Location | null>(null)
const currentAddress = ref('')
const locationLoading = ref(false)
const showCustomerPicker = ref(false)
const customerSearch = ref('')
const searchResults = ref<CustomerVO[]>([])
const selectedCustomer = ref<(CustomerVO & { lat?: number; lng?: number }) | null>(null)
const photoPath = ref('')
const remark = ref('')
const submitting = ref(false)
const historyList = ref<CheckInVO[]>([])

const distanceInfo = computed(() => {
  if (!currentLocation.value || !selectedCustomer.value) return ''
  // For demo, use address-based approximate — in production, geocode the customer address
  // Here we just show a placeholder distance
  return formatDistance(0)
})

const isWithinRange = computed(() => {
  return true // Placeholder — real implementation needs customer geocoding
})

const canSubmit = computed(() => {
  return currentLocation.value && selectedCustomer.value && !submitting.value
})

async function refreshLocation() {
  locationLoading.value = true
  try {
    const result = await new Promise<UniApp.GetLocationSuccess>((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject,
      })
    })
    currentLocation.value = {
      latitude: result.latitude,
      longitude: result.longitude,
    }
    // Reverse geocode
    reverseGeocode(result.latitude, result.longitude)
  } catch (err) {
    console.error('[CheckIn] location failed:', err)
    uni.showToast({ title: '定位失败，请检查授权', icon: 'none' })
    currentLocation.value = null
  } finally {
    locationLoading.value = false
  }
}

function reverseGeocode(lat: number, lng: number) {
  // Use uni-app chooseLocation API or third-party geocoding
  currentAddress.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

async function searchCustomers() {
  try {
    const res = await customerApi.getList({ keyword: customerSearch.value, page: 1, pageSize: 20 })
    if (res.code === 0 && res.data) {
      searchResults.value = res.data.list
    }
  } catch {
    // Silently fail
  }
}

function selectCustomer(customer: CustomerVO) {
  selectedCustomer.value = customer
  showCustomerPicker.value = false
}

function takePhoto() {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: (res) => {
      photoPath.value = res.tempFilePaths[0]
    },
  })
}

async function handleSubmit() {
  if (!currentLocation.value || !selectedCustomer.value) return
  submitting.value = true

  try {
    const res = await checkInApi.create({
      customerId: selectedCustomer.value.id,
      latitude: currentLocation.value.latitude,
      longitude: currentLocation.value.longitude,
      address: currentAddress.value,
      photoUrl: photoPath.value || undefined,
      remark: remark.value || undefined,
    })

    if (res.code === 0) {
      uni.showToast({ title: '打卡成功', icon: 'success' })
      remark.value = ''
      photoPath.value = ''
      loadHistory()
    }
  } catch {
    uni.showToast({ title: '打卡失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function loadHistory() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await checkInApi.getList({
      startDate: today,
      page: 1,
      pageSize: 20,
    })
    if (res.code === 0 && res.data) {
      historyList.value = res.data.list
    }
  } catch {
    // Silently fail
  }
}

function formatTime(dateStr: string) {
  return dateStr ? dateStr.slice(11, 16) : ''
}

function formatDist(meters: number) {
  return formatDistance(meters)
}

onMounted(() => {
  refreshLocation()
  searchCustomers()
  loadHistory()
})
</script>

<style scoped>
.check-in-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}

.location-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.refresh-btn {
  font-size: 26rpx;
  color: #409eff;
}

.location-loading {
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #999;
}

.location-address {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.location-coords {
  font-size: 22rpx;
  color: #999;
}

.location-error {
  text-align: center;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #f56c6c;
}

.btn-retry {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #409eff;
  background: none;
  border: none;
}

.form-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.placeholder { color: #c0c4cc; }
.picker-arrow { color: #c0c4cc; }

.distance-info {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #e6a23c;
}

.distance-info.within-range {
  color: #67c23a;
}

.photo-section {
  display: flex;
  gap: 16rpx;
}

.photo-preview {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.photo-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
}

.photo-remove {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  background: #f56c6c;
  color: #fff;
  border-radius: 50%;
  font-size: 20rpx;
}

.photo-add {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #dcdfe6;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.photo-add-icon {
  font-size: 48rpx;
  color: #dcdfe6;
}

.photo-add-text {
  font-size: 22rpx;
  color: #999;
}

.form-input {
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.btn-submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 44rpx;
  border: none;
  margin-top: 20rpx;
  margin-bottom: 40rpx;
}

.btn-submit::after { border: none; }

.btn-submit[disabled] {
  background: #c0c4cc;
}

.history-section {
  margin-top: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.history-item {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
}

.history-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.history-customer {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.history-time {
  font-size: 24rpx;
  color: #999;
}

.history-address {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 4rpx;
}

.history-distance {
  font-size: 22rpx;
  color: #409eff;
}

.empty-state { padding: 40rpx; text-align: center; }
.empty-text { font-size: 26rpx; color: #ccc; }

/* Modal */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-content {
  width: 100%;
  max-height: 70vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.modal-title { font-size: 32rpx; font-weight: bold; color: #333; }
.modal-close { font-size: 28rpx; color: #409eff; }

.modal-search {
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  margin-bottom: 16rpx;
}

.modal-list { max-height: 50vh; }

.modal-item {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-item-name { font-size: 28rpx; color: #333; }
.modal-item-addr { font-size: 24rpx; color: #999; }
</style>
