<template>
  <view class="opportunity-list-page">
    <!-- Search Bar -->
    <SearchBar
      v-model="keyword"
      placeholder="搜索商机名称/客户"
      :show-filter="false"
      @search="onSearch"
    />

    <!-- Stage Tabs -->
    <scroll-view scroll-x class="stage-tabs-scroll">
      <view class="stage-tabs">
        <view
          v-for="tab in stageTabs"
          :key="tab.value"
          class="stage-tab"
          :class="{ active: selectedStage === tab.value }"
          @click="selectStage(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Sort Bar -->
    <view class="sort-bar">
      <view
        class="sort-item"
        :class="{ active: sortBy === 'amount' }"
        @click="toggleSort('amount')"
      >
        <text>金额</text>
        <text class="sort-arrow">{{ sortBy === 'amount' ? (sortOrder === 'ASC' ? '↑' : '↓') : '↕' }}</text>
      </view>
      <view
        class="sort-item"
        :class="{ active: sortBy === 'createdAt' }"
        @click="toggleSort('createdAt')"
      >
        <text>日期</text>
        <text class="sort-arrow">{{ sortBy === 'createdAt' ? (sortOrder === 'ASC' ? '↑' : '↓') : '↕' }}</text>
      </view>
    </view>

    <!-- List -->
    <scroll-view
      scroll-y
      class="opportunity-scroll"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <EmptyState
        v-if="list.length === 0 && !loading"
        title="暂无商机"
        description="点击右上角添加新商机"
        action-text="新建商机"
        @action="goCreate"
      />

      <OpportunityCard
        v-for="item in list"
        :key="item.id"
        :id="item.id"
        :name="item.title"
        :stage="item.stage"
        :amount="item.amount"
        :customer-name="item.customerName ?? ''"
        :expected-close-date="item.expectedCloseDate ?? ''"
        :probability="item.probability"
        @click="goDetail"
      />

      <LoadMore v-if="loading" status="loading" />
      <LoadMore v-else-if="noMore && list.length > 0" status="noMore" />

      <view style="height: 140rpx" />
    </scroll-view>

    <!-- FAB + button -->
    <view class="fab-btn" @click="goCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SearchBar from '@/components/SearchBar.vue'
import OpportunityCard from '@/components/OpportunityCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadMore from '@/components/LoadMore.vue'
import { opportunityApi, OpportunityStage } from '@/api/opportunity'
import type { OpportunityVO, OpportunityQueryParams } from '@/api/opportunity'

interface OpportunityListItem extends OpportunityVO {
  customerName?: string
}

const stageTabs: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: OpportunityStage.LEAD, label: '线索' },
  { value: OpportunityStage.QUALIFIED, label: '已确认' },
  { value: OpportunityStage.PROPOSAL, label: '方案' },
  { value: OpportunityStage.NEGOTIATION, label: '谈判' },
  { value: OpportunityStage.CLOSED_WON, label: '成交' },
  { value: OpportunityStage.CLOSED_LOST, label: '丢单' },
]

// State
const keyword = ref('')
const selectedStage = ref<string>('')
const sortBy = ref<string>('createdAt')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')
const list = ref<OpportunityListItem[]>([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

function selectStage(val: string) {
  selectedStage.value = val
  resetAndLoad()
}

function toggleSort(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortBy.value = field
    sortOrder.value = 'DESC'
  }
  resetAndLoad()
}

function onSearch() {
  resetAndLoad()
}

async function resetAndLoad() {
  page.value = 1
  noMore.value = false
  list.value = []
  await loadList()
}

async function loadList() {
  if (loading.value || noMore.value) return
  loading.value = true

  try {
    const params: OpportunityQueryParams & Record<string, unknown> = {
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      stage: (selectedStage.value as OpportunityStage) || undefined,
    }
    // Add sort params
    if (sortBy.value) {
      params['sortBy'] = sortBy.value
      params['sortOrder'] = sortOrder.value
    }

    const res = await opportunityApi.getList(params)
    if (res.code === 0 && res.data) {
      const newItems = res.data.list as OpportunityListItem[]
      if (page.value === 1) {
        list.value = newItems
      } else {
        list.value = [...list.value, ...newItems]
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
    loadList()
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await resetAndLoad()
  isRefreshing.value = false
}

function goDetail(id: number | string) {
  uni.navigateTo({ url: `/pages-sub/opportunity/detail?id=${id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages-sub/opportunity/create' })
}

onShow(() => {
  if (list.value.length > 0) {
    resetAndLoad()
  } else {
    loadList()
  }
})
</script>

<style scoped>
.opportunity-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* Stage tabs */
.stage-tabs-scroll {
  white-space: nowrap;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.stage-tabs {
  display: inline-flex;
  padding: 0 24rpx;
}

.stage-tab {
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  color: #666666;
  border-bottom: 4rpx solid transparent;
  flex-shrink: 0;
}

.stage-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 500;
}

/* Sort bar */
.sort-bar {
  display: flex;
  background: #ffffff;
  padding: 12rpx 24rpx;
  gap: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: #909399;
}

.sort-item.active {
  color: #409eff;
}

.sort-arrow {
  font-size: 20rpx;
}

/* Scroll */
.opportunity-scroll {
  height: calc(100vh - 280rpx);
}

/* FAB */
.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: 120rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(64, 158, 255, 0.4);
  z-index: 100;
}

.fab-icon {
  font-size: 48rpx;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
}
</style>
