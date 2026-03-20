<template>
  <view class="customer-list-page">
    <TabBar :selected="1" />

    <!-- Multi-select header -->
    <view v-if="multiSelectMode" class="multi-select-header">
      <view class="multi-select-left">
        <text class="multi-select-count">已选 {{ selectedIds.size }} 项</text>
      </view>
      <view class="multi-select-right">
        <text class="multi-select-action" @click="toggleSelectAll">
          {{ isAllSelected ? '取消全选' : '全选' }}
        </text>
        <text class="multi-select-cancel" @click="exitMultiSelect">取消</text>
      </view>
    </view>

    <!-- Search Bar -->
    <SearchBar
      v-if="!multiSelectMode"
      v-model="keyword"
      placeholder="搜索客户名称/公司/手机号"
      :show-filter="true"
      :filter-active="showFilter"
      @search="onSearch"
      @filter="showFilter = !showFilter"
    />

    <!-- Scope Tabs -->
    <view v-if="!multiSelectMode" class="scope-tabs">
      <view
        v-for="tab in visibleScopeTabs"
        :key="tab.value"
        class="scope-tab"
        :class="{ active: scopeFilter === tab.value }"
        @click="selectScope(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- Filter Panel -->
    <view v-if="showFilter && !multiSelectMode" class="filter-panel">
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
      :class="{ 'with-batch-bar': multiSelectMode && isManagerOrAdmin }"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <EmptyState
        v-if="customerList.length === 0 && !loading"
        title="暂无客户数据"
        description="下拉刷新或调整筛选条件"
      />

      <view
        v-for="customer in customerList"
        :key="customer.id"
        class="customer-item-wrap"
      >
        <!-- Multi-select checkbox -->
        <view
          v-if="multiSelectMode"
          class="checkbox-area"
          @click="toggleSelect(customer.id)"
        >
          <view class="checkbox" :class="{ checked: selectedIds.has(customer.id) }">
            <text v-if="selectedIds.has(customer.id)" class="check-mark">&#10003;</text>
          </view>
        </view>

        <!-- Swipeable card -->
        <view
          class="swipe-container"
          :class="{ 'no-swipe': multiSelectMode }"
          @touchstart="onSwipeTouchStart($event, customer.id)"
          @touchmove="onSwipeTouchMove($event, customer.id)"
          @touchend="onSwipeTouchEnd($event, customer.id)"
          @longpress="onLongPress(customer.id)"
        >
          <view
            class="card-slide"
            :style="{ transform: `translateX(${getSwipeOffset(customer.id)}rpx)` }"
          >
            <view class="customer-item" @click="onItemClick(customer)">
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
          </view>

          <!-- Swipe action buttons -->
          <view v-if="getSwipeOffset(customer.id) < -60" class="swipe-actions">
            <view class="action-btn action-edit" @click.stop="onEditCustomer(customer.id)">
              <text class="action-text">编辑</text>
            </view>
            <view
              v-if="customer.phone"
              class="action-btn action-call"
              @click.stop="onCallCustomer(customer.phone)"
            >
              <text class="action-text">拨号</text>
            </view>
            <view
              v-if="isManagerOrAdmin"
              class="action-btn action-delete"
              @click.stop="onDeleteCustomer(customer.id, customer.name)"
            >
              <text class="action-text">删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Loading / No More -->
      <LoadMore
        v-if="loading"
        status="loading"
      />
      <LoadMore
        v-else-if="noMore && customerList.length > 0"
        status="noMore"
      />

      <view style="height: 140rpx" />
    </scroll-view>

    <!-- Batch action bar (multi-select mode, Manager/Admin only) -->
    <view v-if="multiSelectMode && isManagerOrAdmin" class="batch-action-bar">
      <view class="batch-btn" @click="onBatchToPublicPool">
        <text class="batch-btn-text">转公海</text>
      </view>
      <view class="batch-btn" @click="onBatchTransfer">
        <text class="batch-btn-text">转让</text>
      </view>
      <view class="batch-btn batch-btn-danger" @click="onBatchDelete">
        <text class="batch-btn-text">删除</text>
      </view>
    </view>

    <!-- Delete confirm action sheet -->
    <ActionSheet
      v-model:visible="showDeleteSheet"
      title="确认删除该客户？"
      :actions="deleteActions"
      @select="onDeleteConfirm"
    />

    <!-- Batch delete confirm -->
    <ActionSheet
      v-model:visible="showBatchDeleteSheet"
      :title="`确认删除 ${selectedIds.size} 个客户？`"
      :actions="deleteActions"
      @select="onBatchDeleteConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '@/components/TabBar.vue'
import SearchBar from '@/components/SearchBar.vue'
import LoadMore from '@/components/LoadMore.vue'
import EmptyState from '@/components/EmptyState.vue'
import ActionSheet from '@/components/ActionSheet.vue'
import type { ActionItem } from '@/components/ActionSheet.vue'
import { customerApi, type CustomerVO, type CustomerQueryParams, CustomerStatus } from '@/api/customer'
import { useUserStore } from '@/stores/user'
import { cacheStore, CACHE_PREFIX, CACHE_TTL } from '@/utils/cache-store'

const userStore = useUserStore()

// Role checks
const isManagerOrAdmin = computed(() => {
  const r = userStore.role
  return r === 'admin' || r === 'manager'
})

// Search & filter state
const keyword = ref('')
const selectedStatus = ref<string>('')
const scopeFilter = ref<string>('mine')
const showFilter = ref(false)

// List state
const customerList = ref<CustomerVO[]>([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

// Multi-select state
const multiSelectMode = ref(false)
const selectedIds = ref<Set<number>>(new Set())

// Swipe state
const swipeOffsets = ref<Record<number, number>>({})
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeCurrentId = ref<number | null>(null)

// Delete state
const showDeleteSheet = ref(false)
const showBatchDeleteSheet = ref(false)
const pendingDeleteId = ref<number>(0)

const deleteActions: ActionItem[] = [
  { label: '确认删除', destructive: true },
]

const statusOptions = [
  { value: '', label: '全部' },
  { value: CustomerStatus.LEAD, label: '线索' },
  { value: CustomerStatus.POTENTIAL, label: '潜在' },
  { value: CustomerStatus.INTENTION, label: '有意向' },
  { value: CustomerStatus.OPPORTUNITY, label: '商机' },
  { value: CustomerStatus.DEAL, label: '成交' },
  { value: CustomerStatus.MAINTAIN, label: '维护' },
]

const allScopeTabs = [
  { value: 'mine', label: '我的客户' },
  { value: 'all', label: '全部客户', requireRole: true },
  { value: 'recent', label: '近期跟进' },
]

const visibleScopeTabs = computed(() =>
  allScopeTabs.filter((tab) => !tab.requireRole || isManagerOrAdmin.value),
)

// --- Multi-select ---

function onLongPress(_id: number) {
  if (multiSelectMode.value) return
  if (!isManagerOrAdmin.value) return
  multiSelectMode.value = true
  selectedIds.value = new Set([_id])
  // Reset any swipe offsets
  swipeOffsets.value = {}
}

function toggleSelect(id: number) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) {
    s.delete(id)
  } else {
    s.add(id)
  }
  selectedIds.value = s
}

const isAllSelected = computed(() =>
  customerList.value.length > 0 && selectedIds.value.size === customerList.value.length,
)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(customerList.value.map((c) => c.id))
  }
}

function exitMultiSelect() {
  multiSelectMode.value = false
  selectedIds.value = new Set()
}

// --- Swipe ---

function getSwipeOffset(id: number): number {
  return swipeOffsets.value[id] ?? 0
}

function onSwipeTouchStart(e: TouchEvent, id: number) {
  if (multiSelectMode.value) return
  swipeStartX.value = e.touches[0].clientX
  swipeStartY.value = e.touches[0].clientY
  swipeCurrentId.value = id
}

function onSwipeTouchMove(e: TouchEvent, id: number) {
  if (multiSelectMode.value) return
  if (swipeCurrentId.value !== id) return
  const dx = e.touches[0].clientX - swipeStartX.value
  const dy = e.touches[0].clientY - swipeStartY.value
  // Only horizontal swipe
  if (Math.abs(dy) > Math.abs(dx)) return
  if (dx < 0) {
    // Determine max width based on number of visible buttons
    const hasPhone = customerList.value.find((c) => c.id === id)?.phone
    let btnCount = 1 // edit always
    if (hasPhone) btnCount++
    if (isManagerOrAdmin.value) btnCount++
    const maxOffset = btnCount * -150
    swipeOffsets.value = {
      ...swipeOffsets.value,
      [id]: Math.max(dx * 1.5, maxOffset),
    }
  }
}

function onSwipeTouchEnd(e: TouchEvent, id: number) {
  if (multiSelectMode.value) return
  if (swipeCurrentId.value !== id) return
  const dx = e.changedTouches[0].clientX - swipeStartX.value
  if (dx < -50) {
    const hasPhone = customerList.value.find((c) => c.id === id)?.phone
    let btnCount = 1
    if (hasPhone) btnCount++
    if (isManagerOrAdmin.value) btnCount++
    swipeOffsets.value = { ...swipeOffsets.value, [id]: btnCount * -150 }
  } else {
    swipeOffsets.value = { ...swipeOffsets.value, [id]: 0 }
  }
  swipeCurrentId.value = null
}

// --- Item actions ---

function onItemClick(customer: CustomerVO) {
  if (multiSelectMode.value) {
    toggleSelect(customer.id)
    return
  }
  // Close any open swipe
  if (getSwipeOffset(customer.id) < 0) {
    swipeOffsets.value = { ...swipeOffsets.value, [customer.id]: 0 }
    return
  }
  uni.navigateTo({ url: `/pages-sub/customer/detail?id=${customer.id}` })
}

function onEditCustomer(id: number) {
  swipeOffsets.value = {}
  uni.navigateTo({ url: `/pages-sub/customer/create?id=${id}` })
}

function onCallCustomer(phone: string) {
  swipeOffsets.value = {}
  uni.makePhoneCall({ phoneNumber: phone })
}

function onDeleteCustomer(id: number, _name: string) {
  swipeOffsets.value = {}
  pendingDeleteId.value = id
  showDeleteSheet.value = true
}

async function onDeleteConfirm(index: number) {
  if (index !== 0) return
  try {
    const res = await customerApi.remove(pendingDeleteId.value)
    if (res.code === 0) {
      uni.showToast({ title: '删除成功', icon: 'success' })
      customerList.value = customerList.value.filter((c) => c.id !== pendingDeleteId.value)
    }
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

// --- Batch actions ---

function getSelectedIds(): number[] {
  return Array.from(selectedIds.value)
}

function onBatchToPublicPool() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: '请先选择客户', icon: 'none' })
    return
  }
  const ids = getSelectedIds()
  uni.showModal({
    title: '转公海',
    content: `确认将 ${ids.length} 个客户转入公海？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        // Update each customer's assignedUserId to 0 (public pool)
        await Promise.all(ids.map((id) => customerApi.update(id, { assignedUserId: 0 })))
        uni.showToast({ title: '操作成功', icon: 'success' })
        exitMultiSelect()
        resetAndLoad()
      } catch {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
  })
}

function onBatchTransfer() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: '请先选择客户', icon: 'none' })
    return
  }
  // Navigate to transfer page with selected IDs
  const ids = getSelectedIds().join(',')
  uni.navigateTo({ url: `/pages-sub/customer/transfer?ids=${ids}` })
}

function onBatchDelete() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: '请先选择客户', icon: 'none' })
    return
  }
  showBatchDeleteSheet.value = true
}

async function onBatchDeleteConfirm(index: number) {
  if (index !== 0) return
  const ids = getSelectedIds()
  try {
    await Promise.all(ids.map((id) => customerApi.remove(id)))
    uni.showToast({ title: '批量删除成功', icon: 'success' })
    customerList.value = customerList.value.filter((c) => !selectedIds.value.has(c.id))
    exitMultiSelect()
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

// --- Scope & filter ---

function selectScope(val: string) {
  scopeFilter.value = val
  resetAndLoad()
}

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

// --- Data loading ---

async function resetAndLoad() {
  page.value = 1
  noMore.value = false
  customerList.value = []
  swipeOffsets.value = {}
  await loadCustomers()
}

async function loadCustomers() {
  if (loading.value || noMore.value) return
  loading.value = true

  try {
    const cacheKey = `${CACHE_PREFIX.CUSTOMERS}list:${keyword.value}:${selectedStatus.value}:${scopeFilter.value}:${page.value}`
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
      assignedUserId: scopeFilter.value === 'mine' ? userStore.userId : undefined,
      sortBy: scopeFilter.value === 'recent' ? 'lastFollowUpAt' : undefined,
      sortOrder: scopeFilter.value === 'recent' ? 'DESC' : undefined,
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

onShow(() => {
  if (customerList.value.length > 0) {
    resetAndLoad()
  } else {
    loadCustomers()
  }
})
</script>

<style scoped>
.customer-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* Multi-select header */
.multi-select-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #409eff;
}

.multi-select-count {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}

.multi-select-right {
  display: flex;
  gap: 24rpx;
}

.multi-select-action,
.multi-select-cancel {
  font-size: 28rpx;
  color: #ffffff;
  padding: 8rpx 16rpx;
}

.multi-select-cancel {
  opacity: 0.8;
}

/* Scope tabs */
.scope-tabs {
  display: flex;
  background: #ffffff;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.scope-tab {
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
  margin-right: 8rpx;
}

.scope-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 500;
}

/* Filter panel */
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

/* Scroll area */
.customer-scroll {
  height: calc(100vh - 100rpx);
}

.customer-scroll.with-batch-bar {
  height: calc(100vh - 200rpx);
}

/* Customer item wrap (with checkbox + swipe) */
.customer-item-wrap {
  display: flex;
  align-items: stretch;
  background: #ffffff;
  margin-bottom: 2rpx;
}

.checkbox-area {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  flex-shrink: 0;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background: #409eff;
  border-color: #409eff;
}

.check-mark {
  color: #ffffff;
  font-size: 24rpx;
}

/* Swipe container */
.swipe-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.swipe-container.no-swipe {
  overflow: visible;
}

.card-slide {
  position: relative;
  z-index: 1;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
}

.action-btn {
  width: 150rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-edit {
  background: #e6a23c;
}

.action-call {
  background: #409eff;
}

.action-delete {
  background: #f56c6c;
}

.action-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

/* Customer item (card content) */
.customer-item {
  display: flex;
  padding: 28rpx 24rpx;
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

/* Batch action bar */
.batch-action-bar {
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

.batch-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #409eff;
}

.batch-btn-danger {
  background: #f56c6c;
}

.batch-btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}
</style>
