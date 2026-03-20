<template>
  <view class="material-list-page">
    <!-- Search Bar -->
    <SearchBar
      v-model="keyword"
      placeholder="搜索素材"
      :show-filter="false"
      @search="onSearch"
    />

    <!-- Category Tabs -->
    <scroll-view scroll-x class="category-tabs">
      <view
        v-for="tab in categoryTabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeCategory === tab.value }"
        @click="selectCategory(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </scroll-view>

    <!-- Material Grid -->
    <scroll-view
      scroll-y
      class="material-scroll"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <EmptyState
        v-if="materialList.length === 0 && !loading"
        title="暂无素材"
        description="换个分类试试"
      />

      <view class="material-grid">
        <view
          v-for="item in materialList"
          :key="item.id"
          class="material-card"
          @click="onViewMaterial(item)"
        >
          <!-- Cover / Thumbnail -->
          <view class="material-cover">
            <image
              v-if="item.thumbnailKey || isImageType(item.mimeType)"
              :src="getFileUrl(item)"
              mode="aspectFill"
              class="cover-image"
            />
            <view v-else class="cover-placeholder">
              <text class="cover-icon">{{ getFileIcon(item.mimeType) }}</text>
            </view>
            <!-- Type badge -->
            <view class="type-badge" :class="'type-' + getCategoryKey(item.category)">
              <text class="type-badge-text">{{ getCategoryLabel(item.category) }}</text>
            </view>
          </view>

          <!-- Info -->
          <view class="material-info">
            <text class="material-name">{{ item.name }}</text>
            <view class="material-actions">
              <view class="action-btn" @click.stop="onCopyText(item)">
                <text class="action-btn-text">复制</text>
              </view>
              <view class="action-btn" @click.stop="onShare(item)">
                <text class="action-btn-text">分享</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <LoadMore v-if="loading" status="loading" />
      <LoadMore v-else-if="noMore && materialList.length > 0" status="noMore" />

      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import LoadMore from '@/components/LoadMore.vue'
import EmptyState from '@/components/EmptyState.vue'
import { materialApi, type MaterialVO } from '@/api/material'

const keyword = ref('')
const activeCategory = ref('')
const materialList = ref<MaterialVO[]>([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

const categoryTabs = [
  { value: '', label: '全部' },
  { value: 'poster', label: '海报' },
  { value: 'script', label: '话术' },
  { value: 'case', label: '案例' },
  { value: 'document', label: '文档' },
]

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const OSS_URL = import.meta.env.VITE_OSS_PUBLIC_URL ?? ''

function getFileUrl(item: MaterialVO): string {
  if (item.thumbnailKey && OSS_URL) return `${OSS_URL}/${item.thumbnailKey}`
  if (OSS_URL) return `${OSS_URL}/${item.ossKey}`
  return `${BASE_URL}/materials/${item.id}/url`
}

function isImageType(mimeType: string | null): boolean {
  return !!mimeType && mimeType.startsWith('image/')
}

function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return '\ue6ab'
  if (mimeType.startsWith('video/')) return '\ue637'
  if (mimeType.includes('pdf')) return '\ue66c'
  if (mimeType.includes('word') || mimeType.includes('document')) return '\ue66b'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '\ue66a'
  return '\ue6ab'
}

function getCategoryKey(category: string | null): string {
  return category ?? 'default'
}

function getCategoryLabel(category: string | null): string {
  const found = categoryTabs.find((t) => t.value === category)
  return found?.label ?? category ?? '其他'
}

function selectCategory(val: string) {
  activeCategory.value = val
  resetAndLoad()
}

function onSearch() {
  resetAndLoad()
}

async function resetAndLoad() {
  page.value = 1
  noMore.value = false
  materialList.value = []
  await loadMaterials()
}

async function loadMaterials() {
  if (loading.value || noMore.value) return
  loading.value = true

  try {
    const res = await materialApi.getMaterials({
      page: page.value,
      pageSize,
      category: activeCategory.value || undefined,
      keyword: keyword.value || undefined,
    })
    if (res.code === 0 && res.data) {
      const newItems = res.data.list
      if (page.value === 1) {
        materialList.value = newItems
      } else {
        materialList.value = [...materialList.value, ...newItems]
      }
      if (newItems.length < pageSize) {
        noMore.value = true
      }
    }
  } catch {
    // handled
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!noMore.value && !loading.value) {
    page.value++
    loadMaterials()
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await resetAndLoad()
  isRefreshing.value = false
}

function onViewMaterial(item: MaterialVO) {
  if (isImageType(item.mimeType)) {
    uni.previewImage({
      urls: [getFileUrl(item)],
    })
  } else {
    // Open document
    uni.showToast({ title: `查看: ${item.name}`, icon: 'none' })
  }
}

function onCopyText(item: MaterialVO) {
  uni.setClipboardData({
    data: item.name,
    success: () => {
      uni.showToast({ title: '已复制', icon: 'success' })
    },
  })
}

function onShare(item: MaterialVO) {
  const url = getFileUrl(item)
  uni.setClipboardData({
    data: `${item.name}\n${url}`,
    success: () => {
      uni.showToast({ title: '链接已复制，可分享给好友', icon: 'none' })
    },
  })
}

onMounted(() => {
  loadMaterials()
})
</script>

<style scoped>
.material-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.category-tabs {
  white-space: nowrap;
  background: #ffffff;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  display: inline-block;
  padding: 20rpx 28rpx;
  font-size: 26rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}

.tab-item.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 500;
}

.material-scroll {
  height: calc(100vh - 200rpx);
}

.material-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx 12rpx;
  gap: 12rpx;
}

.material-card {
  width: calc(50% - 18rpx);
  background: #ffffff;
  border-radius: 12rpx;
  overflow: hidden;
}

.material-cover {
  position: relative;
  width: 100%;
  height: 240rpx;
  background: #f5f5f5;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8eaf0, #d3d7e0);
}

.cover-icon {
  font-family: "uni-icons";
  font-size: 80rpx;
  color: #909399;
}

.type-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: rgba(64, 158, 255, 0.85);
}

.type-badge-text {
  font-size: 20rpx;
  color: #ffffff;
}

.type-poster { background: rgba(245, 108, 108, 0.85); }
.type-script { background: rgba(230, 162, 60, 0.85); }
.type-case { background: rgba(103, 194, 58, 0.85); }
.type-document { background: rgba(64, 158, 255, 0.85); }

.material-info {
  padding: 16rpx;
}

.material-name {
  font-size: 26rpx;
  color: #303133;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 12rpx;
}

.material-actions {
  display: flex;
  gap: 12rpx;
}

.action-btn {
  flex: 1;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #dcdfe6;
  border-radius: 8rpx;
}

.action-btn-text {
  font-size: 22rpx;
  color: #606266;
}
</style>
