<template>
  <div class="article-detail-page">
    <el-skeleton v-if="loading" :rows="12" animated />
    <template v-else-if="article">
      <!-- Header -->
      <el-card shadow="never" class="article-header-card">
        <div class="article-header">
          <div class="article-title">
            {{ article.title }}
          </div>
          <div class="article-meta">
            <el-tag v-if="article.isPublished" type="success" size="small"> 已发布 </el-tag>
            <el-tag v-else type="info" size="small"> 草稿 </el-tag>
            <span v-if="categoryName" class="meta-item">
              <el-icon><Folder /></el-icon>
              {{ categoryName }}
            </span>
            <span class="meta-item">
              <el-icon><View /></el-icon>
              {{ article.viewCount }} 次浏览
            </span>
            <span class="meta-item">
              <el-icon><Star /></el-icon>
              {{ article.likeCount }} 点赞
            </span>
            <span class="meta-item"> 更新于 {{ formatDate(article.updatedAt) }} </span>
          </div>
          <div v-if="article.tags && article.tags.length > 0" class="article-tags">
            <el-tag
              v-for="tag in article.tags"
              :key="tag"
              size="small"
              type="info"
              effect="plain"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
        <div class="article-actions">
          <el-button type="primary" @click="handleEdit"> 编辑 </el-button>
          <el-button @click="$router.push('/knowledge')"> 返回列表 </el-button>
        </div>
      </el-card>

      <!-- Content -->
      <el-card shadow="never" class="article-content-card">
        <div class="article-content" v-html="renderedContent" />
      </el-card>

      <!-- Comments -->
      <el-card v-if="article" shadow="never" class="article-comments-card">
        <template #header>
          <span>评论 ({{ commentTotal }})</span>
        </template>
        <div class="comment-input">
          <el-input
            v-model="commentContent"
            type="textarea"
            :rows="3"
            placeholder="写下你的评论…"
            maxlength="2000"
            show-word-limit
          />
          <el-button
            type="primary"
            :loading="submitting"
            style="margin-top: 8px"
            @click="submitComment"
          >
            发表
          </el-button>
        </div>
        <div class="comment-list">
          <div v-for="c in comments" :key="c.id" class="comment-item">
            <div class="comment-body">
              <span class="comment-author">用户 #{{ c.userId }}</span>
              <span class="comment-time">{{ formatDate(c.createdAt) }}</span>
              <p class="comment-text">{{ c.content }}</p>
              <el-button
                v-if="canDeleteComment(c)"
                type="danger"
                link
                size="small"
                @click="deleteComment(c.id)"
              >
                删除
              </el-button>
            </div>
            <div v-if="c.children?.length" class="comment-children">
              <div v-for="child in c.children" :key="child.id" class="comment-item comment-reply">
                <span class="comment-author">用户 #{{ child.userId }}</span>
                <span class="comment-time">{{ formatDate(child.createdAt) }}</span>
                <p class="comment-text">{{ child.content }}</p>
                <el-button
                  v-if="canDeleteComment(child)"
                  type="danger"
                  link
                  size="small"
                  @click="deleteComment(child.id)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <el-empty
          v-if="!commentLoading && comments.length === 0"
          description="暂无评论"
          :image-size="60"
        />
      </el-card>
    </template>

    <!-- Not Found -->
    <el-empty v-else description="文章不存在或已被删除" :image-size="120">
      <el-button type="primary" @click="$router.push('/knowledge')"> 返回知识库 </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Folder, View, Star } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import { knowledgeApi, type ArticleVO, type CategoryVO, type CommentVO } from '@/api/knowledge'
import { formatDate } from '@/utils/format'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const article = ref<ArticleVO | null>(null)
const categories = ref<CategoryVO[]>([])
const comments = ref<CommentVO[]>([])
const commentTotal = ref(0)
const commentLoading = ref(false)
const commentContent = ref('')
const submitting = ref(false)
const userStore = useUserStore()

const categoryName = computed(() => {
  if (!article.value?.categoryId) return ''
  return categories.value.find((c) => c.id === article.value!.categoryId)?.name ?? ''
})

// ---- Markdown renderer ----
const md = new MarkdownIt({
  html: false, // Disable raw HTML for XSS protection
  linkify: true, // Auto-convert URLs to links
  typographer: true, // Smart quotes and dashes
  breaks: true, // Convert \n to <br>
})

/**
 * Render article content using markdown-it.
 * Raw HTML is disabled to prevent XSS.
 * If the content doesn't use Markdown syntax, it will still render
 * nicely — plain text will be wrapped in <p> tags with line breaks.
 */
const renderedContent = computed(() => {
  if (!article.value?.content) return ''
  return md.render(article.value.content)
})

async function loadArticle() {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const [articleRes, categoryRes] = await Promise.all([
      knowledgeApi.getArticle(id),
      knowledgeApi.getCategories(),
    ])
    if (articleRes?.data) {
      article.value = articleRes.data
    }
    if (categoryRes?.data) {
      categories.value = categoryRes.data
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
  await loadComments()
}

async function loadComments() {
  const id = Number(route.params.id)
  if (isNaN(id)) return
  commentLoading.value = true
  try {
    const res = await knowledgeApi.getComments(id, 1, 50)
    if (res?.data) {
      comments.value = res.data.list ?? []
      commentTotal.value = res.data.total ?? 0
    }
  } catch {
    // ignore
  } finally {
    commentLoading.value = false
  }
}

function canDeleteComment(c: CommentVO): boolean {
  return userStore.user?.id === c.userId
}

async function submitComment() {
  const id = Number(route.params.id)
  const content = commentContent.value.trim()
  if (!content || isNaN(id)) return
  submitting.value = true
  try {
    await knowledgeApi.createComment(id, { content })
    commentContent.value = ''
    await loadComments()
  } catch {
    // error handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function deleteComment(commentId: number) {
  try {
    await knowledgeApi.removeComment(commentId)
    await loadComments()
  } catch {
    // error handled by interceptor
  }
}

function handleEdit() {
  if (article.value) {
    router.push({ path: '/knowledge', query: { editArticleId: String(article.value.id) } })
  }
}

onMounted(() => {
  loadArticle()
})
</script>

<style scoped>
.article-detail-page {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-header-card :deep(.el-card__body) {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.article-header {
  flex: 1;
}

.article-title {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
  margin-bottom: 12px;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #909399;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.article-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  border-radius: 10px;
}

.article-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.article-content-card :deep(.el-card__body) {
  padding: 24px 32px;
}

.article-content {
  font-size: 15px;
  line-height: 1.9;
  color: #333;
}

.article-content :deep(p) {
  margin-bottom: 16px;
}

.article-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* Markdown-specific styles */
.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3),
.article-content :deep(h4),
.article-content :deep(h5),
.article-content :deep(h6) {
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #1d2129;
}

.article-content :deep(h1) {
  font-size: 26px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e6eb;
}

.article-content :deep(h2) {
  font-size: 22px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e6eb;
}

.article-content :deep(h3) {
  font-size: 18px;
}

.article-content :deep(h4) {
  font-size: 16px;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.article-content :deep(li) {
  margin-bottom: 4px;
}

.article-content :deep(blockquote) {
  margin: 16px 0;
  padding: 8px 16px;
  border-left: 4px solid #409eff;
  background: #f5f7fa;
  color: #606266;
}

.article-content :deep(blockquote p) {
  margin-bottom: 0;
}

.article-content :deep(code) {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  color: #c7254e;
}

.article-content :deep(pre) {
  margin: 16px 0;
  padding: 16px;
  background: #282c34;
  border-radius: 6px;
  overflow-x: auto;
}

.article-content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #abb2bf;
  font-size: 13px;
  line-height: 1.6;
}

.article-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

.article-content :deep(th),
.article-content :deep(td) {
  border: 1px solid #e5e6eb;
  padding: 8px 12px;
  text-align: left;
}

.article-content :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.article-content :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.article-content :deep(a:hover) {
  text-decoration: underline;
}

.article-content :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}

.article-content :deep(hr) {
  border: none;
  border-top: 1px solid #e5e6eb;
  margin: 24px 0;
}

.article-comments-card {
  margin-top: 16px;
}

.comment-input {
  margin-bottom: 20px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-reply {
  margin-left: 24px;
  padding-left: 12px;
  border-left: 2px solid #dcdfe6;
}

.comment-author {
  font-weight: 500;
  color: #303133;
  margin-right: 8px;
}

.comment-time {
  font-size: 12px;
  color: #909399;
}

.comment-text {
  margin: 6px 0 4px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}
</style>
