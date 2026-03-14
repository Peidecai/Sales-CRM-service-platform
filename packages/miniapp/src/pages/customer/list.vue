<template>
  <view class="customer-list-page">
    <TabBar :selected="1" />

    <!-- Search Bar -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索客户名称/公司/手机号"
        confirm-type="search"
        @confirm="onSearch"
      />
      <view class="filter-btn" @click="showFilter = !showFilter">
        <text class="filter-text">筛选</text>
      </view>
    </view>

    <!-- Filter Panel -->
    <view v-if="showFilter" class="filter-panel">
      <view class="filter-row">
        <text class="filter-label">状态：</text>
        <view class="filter-tags">
          <text
            v-for="s in statusOptions"
            :key="s.value"
            class="filter-tag"
            :class="{ active: selectedStatus === s.value }"
            @click="selectStatus(s.value)"
          >
            {{ s.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- Customer List -->
    <scroll-view
      scroll-y
      class="customer-scroll"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <view v-if="customerList.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无客户数据</text>
      </view>

      <view
        v-for="customer in customerList"
        :key="customer.id"
        class="customer-item"
        @click="goDetail(customer.id)"
      >
        <view class="customer-avatar">
          <text class="avatar-char">{{ customer.name.charAt(0) }}</text>
        </view>
        <view class="customer-info">
          <view class="customer-row">
            <text class="customer-name">{{ customer.name }}</text>
            <text class="customer-status" :class="'status-' + customer.status">
              {{ statusLabel(customer.status) }}
            </text>
          </view>
          <text class="customer-company">{{ customer.company || '未填写公司' }}</text>
          <text class="customer-phone">{{ customer.phone || '未填写电话' }}</text>
        </view>
      </view>

      <!-- Loading indicator -->
      <view v-if="loading" class="loading-text">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && customerList.length > 0" class="loading-text">
        <text>没有更多了</text>
      </view>

      <view style="height: 140rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '@/components/TabBar.vue'
import { customerApi, type CustomerVO, type CustomerQueryParams, CustomerStatus } from '@/api/customer'
import { cacheStore, CACHE_PREFIX, CACHE_TTL } from '@/utils/cache-store'

const keyword = ref('')
const selectedStatus = ref<string>('')
const showFilter = ref(false)
const customerList = ref<CustomerVO[]>([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

const statusOptions = [
  { value: '', label: '全部' },
  { value: CustomerStatus.LEAD, label: '线索' },
  { value: CustomerStatus.POTENTIAL, label: '潜在' },
  { value: CustomerStatus.INTENTION, label: '有意向' },
  { value: CustomerStatus.OPPORTUNITY, label: '商机' },
  { value: CustomerStatus.DEAL, label: '成交' },
  { value: CustomerStatus.MAINTAIN, label: '维护' },
]

function statusLabel(status: string): string {
  const item = statusOptions.find((s) => s.value === status)
  return item?.label || status
}

function selectStatus(val: string) {
  selectedStatus.value = val
  resetAndLoad()
}

function onSearch() {
  resetAndLoad()
}

async function resetAndLoad() {
  page.value = 1
  noMore.value = false
  customerList.value = []
  await loadCustomers()
}

async function loadCustomers() {
  if (loading.value || noMore.value) return
  loading.value = true

  try {
    // Try cache for first page
    const cacheKey = `${CACHE_PREFIX.CUSTOMERS}list:${keyword.value}:${selectedStatus.value}:${page.value}`
    if (page.value === 1) {
      const cached = cacheStore.get<CustomerVO[]>(cacheKey)
      if (cached) {
        customerList.value = cached
        loading.value = false
        return
      }
    }

    const params: CustomerQueryParams = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      status: selectedStatus.value as CustomerStatus || undefined,
    }

    const res = await customerApi.getList(params)
    if (res.code === 0 && res.data) {
      const newItems = res.data.list
      if (page.value === 1) {
        customerList.value = newItems
        cacheStore.set(cacheKey, newItems, CACHE_TTL.CUSTOMERS)
      } else {
        customerList.value = [...customerList.value, ...newItems]
      }

      if (newItems.length < pageSize) {
        noMore.value = true
      }
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!noMore.value && !loading.value) {
    page.value++
    loadCustomers()
  }
}

async function onRefresh() {
  isRefreshing.value = true
  cacheStore.clear(CACHE_PREFIX.CUSTOMERS)
  await resetAndLoad()
  isRefreshing.value = false
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/customer/detail?id=${id}` })
}

onMounted(() => {
  loadCustomers()
})

onShow(() => {
  // Refresh list when coming back
  if (customerList.value.length > 0) {
    resetAndLoad()
  }
})
</script>

<style scoped>
.customer-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #ffffff;
  gap: 16rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
}

.filter-btn {
  padding: 16rpx 20rpx;
}

.filter-text {
  font-size: 26rpx;
  color: #409eff;
}

.filter-panel {
  background: #ffffff;
  padding: 20rpx 24rpx;
  border-top: 1rpx solid #f0f0f0;
}

.filter-row {
  display: flex;
  align-items: flex-start;
}

.filter-label {
  font-size: 26rpx;
  color: #666666;
  margin-right: 16rpx;
  line-height: 56rpx;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.filter-tag {
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: #666666;
  background: #f5f7fa;
  border-radius: 28rpx;
}

.filter-tag.active {
  color: #409eff;
  background: #ecf5ff;
}

.customer-scroll {
  height: calc(100vh - 100rpx);
}

.customer-item {
  display: flex;
  padding: 28rpx 24rpx;
  background: #ffffff;
  margin-bottom: 2rpx;
}

.customer-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #79bbff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.avatar-char {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.customer-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

.customer-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.status-lead { background: #f0f0f0; color: #999; }
.status-potential { background: #ecf5ff; color: #409eff; }
.status-intention { background: #fdf6ec; color: #e6a23c; }
.status-opportunity { background: #f0f9eb; color: #67c23a; }
.status-deal { background: #f0f9eb; color: #409eff; }
.status-maintain { background: #ecf5ff; color: #409eff; }
.status-invalid { background: #fef0f0; color: #f56c6c; }
.status-lost { background: #fef0f0; color: #f56c6c; }

.customer-company {
  font-size: 24rpx;
  color: #666666;
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-phone {
  font-size: 24rpx;
  color: #999999;
}

.empty-state {
  padding: 120rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #cccccc;
}

.loading-text {
  text-align: center;
  padding: 24rpx;
  font-size: 24rpx;
  color: #999999;
}
</style>
