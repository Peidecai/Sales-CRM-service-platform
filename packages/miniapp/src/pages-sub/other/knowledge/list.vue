<template>
  <view class="knowledge-list-page">
    <!-- Search Bar -->
    <SearchBar
      v-model="keyword"
      placeholder="搜索知识库文章"
      :show-filter="false"
      @search="onSearch"
    />

    <!-- Category Tabs -->
    <scroll-view scroll-x class="category-tabs">
      <view
        class="tab-item"
        :class="{ active: activeCategoryId === 0 }"
        @click="selectCategory(0)"
      >
        <text>全部</text>
      </view>
      <view
        v-for="cat in categories"
        :key="cat.id"
        class="tab-item"
        :class="{ active: activeCategoryId === cat.id }"
        @click="selectCategory(cat.id)"
      >
        <text>{{ cat.name }}</text>
      </view>
    </scroll-view>

    <!-- Article List -->
    <scroll-view
      scroll-y
      class="article-scroll"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <EmptyState
        v-if="articleList.length === 0 && !loading"
        title="暂无文章"
        description="换个分类或关键词试试"
      />

      <view
        v-for="article in articleList"
        :key="article.id"
        class="article-card"
        @click="goDetail(article.id)"
      >
        <view class="article-content">
          <view class="article-header">
            <text class="article-title">{{ article.title }}</text>
            <view v-if="article.isTop" class="top-badge">
              <text class="top-badge-text">置顶</text>
            </view>
          </view>
          <text class="article-summary">{{ article.summary || truncateContent(article.content) }}</text>
          <view class="article-meta">
            <view v-if="article.category" class="category-tag">
              <text class="category-tag-text">{{ article.category.name }}</text>
            </view>
            <view v-if="article.tags && article.tags.length > 0" class="tags-row">
              <text
                v-for="tag in article.tags.slice(0, 2)"
                :key="tag"
                class="tag-item"
              >{{ tag }}</text>
            </view>
            <view class="meta-right">
              <text class="meta-text">{{ article.viewCount }} 阅读</text>
              <text class="meta-dot">·</text>
              <text class="meta-text">{{ formatDate(article.publishedAt || article.createdAt) }}</text>
            </view>
          </view>
        </view>
        <image
          v-if="article.coverImage"
          class="article-cover"
          :src="article.coverImage"
          mode="aspectFill"
        />
      </view>

      <LoadMore v-if="loading" status="loading" />
      <LoadMore v-else-if="noMore && articleList.length > 0" status="noMore" />

      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import LoadMore from '@/components/LoadMore.vue'
import EmptyState from '@/components/EmptyState.vue'
import { knowledgeApi, type KnowledgeArticleVO, type KnowledgeCategoryVO } from '@/api/knowledge'

const keyword = ref('')
const activeCategoryId = ref(0)
const categories = ref<KnowledgeCategoryVO[]>([])
const articleList = ref<KnowledgeArticleVO[]>([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

function truncateContent(content: string): string {
  const plain = content.replace(/[#*`>\-\[\]()!]/g, '').trim()
  return plain.length > 80 ? plain.slice(0, 80) + '...' : plain
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function selectCategory(id: number) {
  activeCategoryId.value = id
  resetAndLoad()
}

function onSearch() {
  resetAndLoad()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages-sub/other/knowledge/detail?id=${id}` })
}

async function loadCategories() {
  try {
    const res = await knowledgeApi.getCategories()
    if (res.code === 0 && res.data) {
      categories.value = res.data as KnowledgeCategoryVO[]
    }
  } catch {
    // silent
  }
}

async function resetAndLoad() {
  page.value = 1
  noMore.value = false
  articleList.value = []
  await loadArticles()
}

async function loadArticles() {
  if (loading.value || noMore.value) return
  loading.value = true

  try {
    const res = await knowledgeApi.getArticles({
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
      categoryId: activeCategoryId.value || undefined,
    })
    if (res.code === 0 && res.data) {
      const newItems = res.data.list
      if (page.value === 1) {
        articleList.value = newItems
      } else {
        articleList.value = [...articleList.value, ...newItems]
      }
      if (newItems.length < pageSize) {
        noMore.value = true
      }
    }
  } catch {
    // handled by request
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!noMore.value && !loading.value) {
    page.value++
    loadArticles()
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await resetAndLoad()
  isRefreshing.value = false
}

onMounted(() => {
  loadCategories()
  loadArticles()
})
</script>

<style scoped>
.knowledge-list-page {
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

.article-scroll {
  height: calc(100vh - 200rpx);
}

.article-card {
  display: flex;
  background: #ffffff;
  padding: 28rpx 24rpx;
  margin-bottom: 2rpx;
}

.article-content {
  flex: 1;
  min-width: 0;
}

.article-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.article-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.top-badge {
  background: #f56c6c;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  flex-shrink: 0;
}

.top-badge-text {
  font-size: 20rpx;
  color: #ffffff;
}

.article-summary {
  font-size: 24rpx;
  color: #909399;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 16rpx;
  line-height: 1.5;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.category-tag {
  background: #ecf5ff;
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
}

.category-tag-text {
  font-size: 20rpx;
  color: #409eff;
}

.tags-row {
  display: flex;
  gap: 8rpx;
}

.tag-item {
  font-size: 20rpx;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.meta-right {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.meta-text {
  font-size: 22rpx;
  color: #c0c4cc;
}

.meta-dot {
  font-size: 22rpx;
  color: #c0c4cc;
  margin: 0 6rpx;
}

.article-cover {
  width: 180rpx;
  height: 120rpx;
  border-radius: 8rpx;
  margin-left: 20rpx;
  flex-shrink: 0;
}
</style>
