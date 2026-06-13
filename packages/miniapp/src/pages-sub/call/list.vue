<template>
  <view class="call-list-page">
    <SearchBar
      v-model="keyword"
      placeholder="搜索客户名/电话"
      :show-filter="true"
      :filter-active="!!filterType"
      @search="onSearch"
      @filter="showFilterSheet = true"
    />

    <!-- Filter Tabs -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: filterType === tab.value }"
        @click="onFilterTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="list-scroll"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view v-if="records.length > 0" class="record-list">
        <view
          v-for="record in records"
          :key="record.id"
          class="record-item"
          @click="goDetail(record.id)"
        >
          <view class="record-header">
            <text class="record-customer">{{ record.customer?.name || '未知客户' }}</text>
            <view class="record-tags">
              <view class="call-type-tag" :class="getCallTypeClass(record)">
                <text>{{ getCallTypeLabel(record) }}</text>
              </view>
              <view v-if="record.callResult" class="result-tag" :class="getResultClass(record.callResult)">
                <text>{{ getResultLabel(record.callResult) }}</text>
              </view>
            </view>
          </view>
          <view class="record-info">
            <text class="record-phone">{{ record.customer?.name ? formatPhone(record) : '' }}</text>
            <text class="record-dot">{{ record.customer?.name ? '·' : '' }}</text>
            <text class="record-duration">{{ formatDuration(record) }}</text>
          </view>
          <view class="record-footer">
            <text class="record-time">{{ formatTime(record.callAt) }}</text>
            <view v-if="record.aiSummary" class="ai-badge">
              <text>AI</text>
            </view>
          </view>
        </view>
      </view>

      <EmptyState
        v-if="!loading && records.length === 0"
        title="暂无通话记录"
        description="拨打客户电话后会自动记录"
      />

      <LoadMore
        v-if="records.length > 0"
        :status="loadMoreStatus"
        @retry="onLoadMore"
      />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadMore from '@/components/LoadMore.vue'
import { callRecordApi, type CallRecordVO } from '@/api/call-record'

const keyword = ref('')
const filterType = ref('')
const showFilterSheet = ref(false)
const records = ref<CallRecordVO[]>([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loadMoreStatus = ref<'loading' | 'noMore' | 'error'>('noMore')

const filterTabs = [
  { value: '', label: '全部' },
  { value: 'native', label: '直接拨号' },
]

const resultLabels: Record<string, string> = {
  connected: '已接通',
  no_answer: '未接',
  busy: '忙线',
  power_off: '关机',
}

function getCallTypeLabel(record: CallRecordVO): string {
  if (record.recordingUrl) return '录音'
  return '原生'
}

function getCallTypeClass(record: CallRecordVO): string {
  if (record.recordingUrl) return 'type-recorded'
  return 'type-native'
}

function getResultLabel(result: string): string {
  return resultLabels[result] || result
}

function getResultClass(result: string): string {
  return result === 'connected' ? 'result-connected' : 'result-other'
}

function formatPhone(record: CallRecordVO): string {
  // We don't have phone directly on CallRecordVO, show customer name is enough
  return ''
}

function formatDuration(record: CallRecordVO): string {
  const dur = record.duration || record.estimatedDuration || 0
  if (dur < 60) return `${dur}秒`
  const min = Math.floor(dur / 60)
  const sec = dur % 60
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return `今天 ${time}`
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}/${day} ${time}`
}

async function fetchRecords(isRefresh = false) {
  if (loading.value) return
  loading.value = true
  if (isRefresh) {
    page.value = 1
    loadMoreStatus.value = 'loading'
  }

  try {
    const params: Record<string, unknown> = {
      page: page.value,
      pageSize,
    }
    if (keyword.value) params['keyword'] = keyword.value
    if (filterType.value === 'native') params['callType'] = 'manual'

    const res = await callRecordApi.getList(params as Parameters<typeof callRecordApi.getList>[0])
    if (res.code === 0 && res.data) {
      if (isRefresh) {
        records.value = res.data.list
      } else {
        records.value.push(...res.data.list)
      }
      total.value = res.data.total
      loadMoreStatus.value = records.value.length >= total.value ? 'noMore' : 'loading'
    }
  } catch {
    loadMoreStatus.value = 'error'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onSearch() {
  fetchRecords(true)
}

function onFilterTab(value: string) {
  filterType.value = value
  showFilterSheet.value = false
  fetchRecords(true)
}

function onRefresh() {
  refreshing.value = true
  fetchRecords(true)
}

function onLoadMore() {
  if (records.value.length >= total.value) return
  page.value++
  fetchRecords()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages-sub/call/detail?id=${id}` })
}

onMounted(() => {
  fetchRecords(true)
})
</script>

<style scoped>
.call-list-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.filter-tabs {
  display: flex;
  padding: 0 24rpx 16rpx;
  background: #ffffff;
  gap: 16rpx;
}

.filter-tab {
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: #606266;
  background: #f5f7fa;
  border-radius: 24rpx;
}

.filter-tab.active {
  background: #ecf5ff;
  color: #409eff;
}

.list-scroll {
  flex: 1;
  height: 0;
}

.record-list {
  padding: 16rpx 24rpx;
}

.record-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.record-customer {
  font-size: 30rpx;
  font-weight: 500;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-tags {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}

.call-type-tag,
.result-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.type-recorded {
  background: #ecf5ff;
  color: #409eff;
}

.type-native {
  background: #f0f9eb;
  color: #67c23a;
}

.result-connected {
  background: #f0f9eb;
  color: #67c23a;
}

.result-other {
  background: #fef0f0;
  color: #f56c6c;
}

.record-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.record-phone,
.record-dot,
.record-duration {
  font-size: 24rpx;
  color: #909399;
}

.record-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-time {
  font-size: 24rpx;
  color: #c0c4cc;
}

.ai-badge {
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
</style>
