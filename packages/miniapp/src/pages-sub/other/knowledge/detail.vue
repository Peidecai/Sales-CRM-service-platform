<template>
  <view class="knowledge-detail-page">
    <!-- Loading -->
    <view v-if="loading" class="loading-center">
      <LoadMore status="loading" />
    </view>

    <template v-else-if="article">
      <!-- Header -->
      <view class="detail-header">
        <text class="detail-title">{{ article.title }}</text>
        <view class="detail-meta">
          <text class="meta-author">作者ID: {{ article.authorId }}</text>
          <text class="meta-dot">·</text>
          <text class="meta-date">{{ formatDate(article.publishedAt || article.createdAt) }}</text>
          <text class="meta-dot">·</text>
          <text class="meta-views">{{ article.viewCount }} 阅读</text>
        </view>
        <view v-if="article.tags && article.tags.length > 0" class="detail-tags">
          <text
            v-for="tag in article.tags"
            :key="tag"
            class="detail-tag"
          >{{ tag }}</text>
        </view>
      </view>

      <!-- Content (rich-text) -->
      <view class="detail-body">
        <rich-text :nodes="renderedContent" />
      </view>

      <!-- Related Recommendations -->
      <view v-if="relatedArticles.length > 0" class="related-section">
        <text class="related-title">相关推荐</text>
        <view
          v-for="item in relatedArticles"
          :key="item.id"
          class="related-item"
          @click="goDetail(item.id)"
        >
          <text class="related-item-title">{{ item.title }}</text>
          <text class="related-item-meta">{{ item.viewCount }} 阅读</text>
        </view>
      </view>

      <view style="height: 140rpx" />

      <!-- Bottom Action Bar -->
      <view class="action-bar">
        <view class="action-item" @click="onToggleLike">
          <text class="action-icon" :class="{ liked: actionStatus.liked }">
            {{ actionStatus.liked ? '&#xe631;' : '&#xe630;' }}
          </text>
          <text class="action-label" :class="{ liked: actionStatus.liked }">
            {{ actionStatus.likeCount || '点赞' }}
          </text>
        </view>
        <view class="action-item" @click="onToggleFavorite">
          <text class="action-icon" :class="{ favorited: actionStatus.favorited }">
            {{ actionStatus.favorited ? '&#xe669;' : '&#xe668;' }}
          </text>
          <text class="action-label" :class="{ favorited: actionStatus.favorited }">
            {{ actionStatus.collectCount || '收藏' }}
          </text>
        </view>
        <view class="action-item" @click="onShare">
          <text class="action-icon">&#xe632;</text>
          <text class="action-label">分享</text>
        </view>
      </view>
    </template>

    <EmptyState v-else title="文章不存在" description="该文章可能已被删除" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import LoadMore from '@/components/LoadMore.vue'
import EmptyState from '@/components/EmptyState.vue'
import { knowledgeApi, type KnowledgeArticleVO, type ArticleActionStatus } from '@/api/knowledge'

const article = ref<KnowledgeArticleVO | null>(null)
const loading = ref(true)
const renderedContent = ref('')
const relatedArticles = ref<KnowledgeArticleVO[]>([])
const articleId = ref(0)

const actionStatus = ref<ArticleActionStatus>({
  liked: false,
  favorited: false,
  likeCount: 0,
  collectCount: 0,
})

/**
 * Simple markdown to HTML converter for rich-text component.
 * Handles: headings, bold, italic, links, code blocks, paragraphs.
 */
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, '').replace(/```$/, '')
      return `<pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;"><code>${code}</code></pre>`
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px;">$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;margin:20px 0 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;margin:24px 0 12px;">$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a style="color:#409eff;" href="$2">$1</a>')
    // Line breaks → paragraphs
    .replace(/\n\n/g, '</p><p style="margin:8px 0;line-height:1.8;font-size:14px;">')
    .replace(/\n/g, '<br/>')

  return `<div style="font-size:14px;line-height:1.8;color:#303133;"><p style="margin:8px 0;line-height:1.8;font-size:14px;">${html}</p></div>`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function goDetail(id: number) {
  uni.redirectTo({ url: `/pages-sub/other/knowledge/detail?id=${id}` })
}

async function loadArticle(id: number) {
  loading.value = true
  try {
    const res = await knowledgeApi.getArticle(id)
    if (res.code === 0 && res.data) {
      article.value = res.data
      renderedContent.value = markdownToHtml(res.data.content)
    }
  } catch {
    // handled
  } finally {
    loading.value = false
  }
}

async function loadActionStatus(id: number) {
  try {
    const res = await knowledgeApi.getArticleStatus(id)
    if (res.code === 0 && res.data) {
      actionStatus.value = res.data
    }
  } catch {
    // silent
  }
}

async function loadRelated() {
  try {
    const res = await knowledgeApi.getArticles({
      page: 1,
      pageSize: 5,
      categoryId: article.value?.categoryId ?? undefined,
    })
    if (res.code === 0 && res.data) {
      relatedArticles.value = res.data.list.filter((a) => a.id !== articleId.value).slice(0, 3)
    }
  } catch {
    // silent
  }
}

async function onToggleLike() {
  try {
    const res = await knowledgeApi.toggleLike(articleId.value)
    if (res.code === 0 && res.data) {
      actionStatus.value = res.data
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function onToggleFavorite() {
  try {
    const res = await knowledgeApi.toggleFavorite(articleId.value)
    if (res.code === 0 && res.data) {
      actionStatus.value = res.data
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function onShare() {
  if (!article.value) return
  uni.setClipboardData({
    data: article.value.title,
    success: () => {
      uni.showToast({ title: '标题已复制', icon: 'success' })
    },
  })
}

onLoad((query) => {
  const id = Number(query?.id)
  if (id) {
    articleId.value = id
  }
})

onMounted(() => {
  if (articleId.value) {
    loadArticle(articleId.value)
    loadActionStatus(articleId.value)
    // Load related after a short delay to let article load first
    setTimeout(() => loadRelated(), 500)
  }
})
</script>

<style scoped>
.knowledge-detail-page {
  min-height: 100vh;
  background: #ffffff;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}

.detail-header {
  padding: 32rpx 24rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.detail-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  display: block;
  margin-bottom: 16rpx;
}

.detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
  margin-bottom: 12rpx;
}

.meta-author,
.meta-date,
.meta-views {
  font-size: 24rpx;
  color: #909399;
}

.meta-dot {
  font-size: 24rpx;
  color: #c0c4cc;
  margin: 0 8rpx;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.detail-tag {
  font-size: 22rpx;
  color: #409eff;
  background: #ecf5ff;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.detail-body {
  padding: 24rpx;
}

/* Related */
.related-section {
  padding: 24rpx;
  border-top: 16rpx solid #f5f5f5;
}

.related-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
  display: block;
  margin-bottom: 20rpx;
}

.related-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.related-item:last-child {
  border-bottom: none;
}

.related-item-title {
  font-size: 28rpx;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.related-item-meta {
  font-size: 22rpx;
  color: #c0c4cc;
  flex-shrink: 0;
}

/* Action Bar */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #ffffff;
  padding: 16rpx 0;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.action-icon {
  font-family: "uni-icons";
  font-size: 40rpx;
  color: #909399;
}

.action-icon.liked {
  color: #f56c6c;
}

.action-icon.favorited {
  color: #e6a23c;
}

.action-label {
  font-size: 20rpx;
  color: #909399;
}

.action-label.liked {
  color: #f56c6c;
}

.action-label.favorited {
  color: #e6a23c;
}
</style>
