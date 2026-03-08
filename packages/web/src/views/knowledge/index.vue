<template>
  <div class="knowledge-page">
    <div class="knowledge-layout">
      <!-- Left: Category Panel -->
      <div class="category-panel">
        <div class="category-header">
          <span class="category-title">分类</span>
        </div>
        <div class="category-list">
          <div
            class="category-item"
            :class="{ active: selectedCategoryId === null }"
            @click="handleCategorySelect(null)"
          >
            <el-icon><Files /></el-icon>
            <span>全部文章</span>
          </div>
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            :class="{ active: selectedCategoryId === cat.id }"
            @click="handleCategorySelect(cat.id)"
          >
            <el-icon><Folder /></el-icon>
            <span>{{ cat.name }}</span>
            <el-popconfirm
              title="确定要删除该分类吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm.stop="handleDeleteCategory(cat.id)"
            >
              <template #reference>
                <el-icon class="delete-icon" @click.stop>
                  <Delete />
                </el-icon>
              </template>
            </el-popconfirm>
          </div>
        </div>
        <div class="category-footer">
          <el-button
            type="primary"
            plain
            size="small"
            style="width: 100%"
            @click="handleOpenCategoryDialog"
          >
            <el-icon><Plus /></el-icon>
            新建分类
          </el-button>
        </div>
      </div>

      <!-- Right: Article Panel -->
      <div class="article-panel">
        <!-- Search Bar -->
        <el-card class="search-card" shadow="never">
          <el-form :inline="true" :model="searchForm" class="search-form">
            <el-form-item label="关键词">
              <el-input
                v-model="searchForm.keyword"
                placeholder="搜索文章标题"
                clearable
                style="width: 200px"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item label="发布状态">
              <el-select
                v-model="searchForm.isPublished"
                placeholder="全部"
                clearable
                style="width: 120px"
              >
                <el-option label="已发布" :value="true" />
                <el-option label="草稿" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch"> 搜索 </el-button>
              <el-button @click="handleReset"> 重置 </el-button>
            </el-form-item>
          </el-form>
          <div class="toolbar-right">
            <el-button type="success" @click="handleOpenAskDrawer">
              <el-icon><ChatDotSquare /></el-icon>
              AI 问答
            </el-button>
            <el-button type="primary" @click="handleCreateArticle">
              <el-icon><Plus /></el-icon>
              新建文章
            </el-button>
          </div>
        </el-card>

        <!-- Article Table -->
        <el-card shadow="never" class="table-card">
          <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="$router.push(`/knowledge/${row.id}`)"
                >
                  {{ row.title }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="categoryId" label="分类" min-width="100">
              <template #default="{ row }">
                {{ getCategoryName(row.categoryId) }}
              </template>
            </el-table-column>
            <el-table-column prop="isPublished" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.isPublished ? 'success' : 'info'" size="small">
                  {{ row.isPublished ? '已发布' : '草稿' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="viewCount" label="浏览数" width="80" />
            <el-table-column prop="likeCount" label="点赞数" width="80" />
            <el-table-column prop="authorId" label="作者ID" width="80" />
            <el-table-column prop="updatedAt" label="更新时间" min-width="160">
              <template #default="{ row }">
                {{ formatDate(row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleEditArticle(row)">
                  编辑
                </el-button>
                <el-popconfirm
                  title="确定要删除该文章吗？"
                  confirm-button-text="确定"
                  cancel-button-text="取消"
                  @confirm="handleDeleteArticle(row.id)"
                >
                  <template #reference>
                    <el-button type="danger" link size="small"> 删除 </el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无文章" :image-size="80">
                <el-button type="primary" size="small" @click="handleCreateArticle">
                  新建文章
                </el-button>
              </el-empty>
            </template>
          </el-table>

          <!-- Pagination -->
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </div>
    </div>

    <!-- Article Dialog -->
    <el-dialog
      v-model="articleDialogVisible"
      :title="isEditArticle ? '编辑文章' : '新建文章'"
      width="1100px"
      :close-on-click-modal="false"
      @closed="handleArticleDialogClosed"
    >
      <el-form
        ref="articleFormRef"
        :model="articleForm"
        :rules="articleFormRules"
        label-width="80px"
        label-position="right"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="articleForm.title"
            placeholder="请输入文章标题"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select
            v-model="articleForm.categoryId"
            placeholder="请选择分类"
            clearable
            style="width: 100%"
          >
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签" prop="tagsInput">
          <el-input
            v-model="articleForm.tagsInput"
            placeholder="多个标签用逗号分隔，例如：NestJS,TypeORM"
          />
        </el-form-item>
        <el-form-item label="发布" prop="isPublished">
          <el-switch v-model="articleForm.isPublished" active-text="已发布" inactive-text="草稿" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <MarkdownEditor
            v-model="articleForm.content"
            :height="380"
            placeholder="请输入文章内容（支持 Markdown）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="article-dialog-footer">
          <div class="article-dialog-actions">
            <el-button
              v-if="isEditArticle && editArticleId !== null"
              :type="articleStatus.liked ? 'primary' : 'default'"
              :icon="articleStatus.liked ? StarFilled : Star"
              :loading="likeLoading"
              @click="handleToggleLike"
            >
              {{ articleStatus.liked ? '已点赞' : '点赞' }} ({{ articleStatus.likeCount }})
            </el-button>
            <el-button
              v-if="isEditArticle && editArticleId !== null"
              :type="articleStatus.favorited ? 'warning' : 'default'"
              :icon="articleStatus.favorited ? CollectionTag : Collection"
              :loading="favoriteLoading"
              @click="handleToggleFavorite"
            >
              {{ articleStatus.favorited ? '已收藏' : '收藏' }}
            </el-button>
          </div>
          <div class="article-dialog-submit">
            <el-button @click="articleDialogVisible = false"> 取消 </el-button>
            <el-button type="primary" :loading="submitLoading" @click="handleSubmitArticle">
              {{ isEditArticle ? '保存' : '创建' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- Category Dialog -->
    <el-dialog
      v-model="categoryDialogVisible"
      title="新建分类"
      width="480px"
      :close-on-click-modal="false"
      @closed="handleCategoryDialogClosed"
    >
      <el-form
        ref="categoryFormRef"
        :model="categoryForm"
        :rules="categoryFormRules"
        label-width="90px"
        label-position="right"
      >
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="categoryForm.name"
            placeholder="请输入分类名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="上级分类" prop="parentId">
          <el-select
            v-model="categoryForm.parentId"
            placeholder="无（顶级分类）"
            clearable
            style="width: 100%"
          >
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="categoryForm.sort" :min="0" :max="9999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="categoryForm.description"
            placeholder="请输入分类描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="categorySubmitLoading" @click="handleSubmitCategory">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- AI Q&A Drawer -->
    <el-drawer v-model="askDrawerVisible" title="AI 知识库问答" direction="rtl" size="520px">
      <div class="ask-drawer-content">
        <!-- Conversation History -->
        <div ref="chatContainerRef" class="chat-container">
          <div v-if="chatHistory.length === 0" class="chat-empty">
            <el-empty description="暂无对话记录，试着提问吧" :image-size="60" />
          </div>
          <div v-for="(msg, idx) in chatHistory" :key="idx" class="chat-message" :class="msg.role">
            <div class="chat-bubble">
              <div v-if="msg.role === 'user'" class="chat-text">
                {{ msg.content }}
              </div>
              <template v-else>
                <div class="chat-text">
                  {{ msg.content }}
                </div>
                <div v-if="msg.sources && msg.sources.length > 0" class="chat-sources">
                  <div class="chat-sources-label">参考来源：</div>
                  <div
                    v-for="(source, sIdx) in msg.sources"
                    :key="source.articleId"
                    class="source-chip"
                    @click="handleViewSourceArticle(source.articleId)"
                  >
                    [{{ sIdx + 1 }}] {{ source.title }}
                    <span class="source-similarity"
                      >{{ Math.round(source.similarity * 100) }}%</span
                    >
                  </div>
                </div>
              </template>
            </div>
          </div>
          <!-- Loading indicator -->
          <div v-if="askLoading" class="chat-message assistant">
            <div class="chat-bubble">
              <el-skeleton :rows="2" animated />
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <el-input
            v-model="askQuestion"
            type="textarea"
            :rows="3"
            placeholder="输入你的问题..."
            resize="none"
            @keydown.ctrl.enter="handleAskSubmit"
          />
          <div class="chat-input-actions">
            <el-button text type="danger" size="small" @click="handleClearHistory">
              清空记录
            </el-button>
            <div class="chat-input-right">
              <span class="ask-hint">Ctrl+Enter 发送</span>
              <el-button
                type="primary"
                :loading="askLoading"
                :disabled="!askQuestion.trim()"
                @click="handleAskSubmit"
              >
                提问
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus,
  Files,
  Folder,
  Delete,
  ChatDotSquare,
  Star,
  StarFilled,
  Collection,
  CollectionTag,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import {
  knowledgeApi,
  type ArticleVO,
  type ArticleActionResponse,
  type CategoryVO,
  type CreateArticleParams,
  type UpdateArticleParams,
} from '@/api/knowledge'

const userStore = useUserStore()
const router = useRouter()

// ---- Helpers ----

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getCategoryName(categoryId: number | null): string {
  if (!categoryId) return '-'
  return categories.value.find((c) => c.id === categoryId)?.name ?? String(categoryId)
}

// ---- Category State ----

const categories = ref<CategoryVO[]>([])
const selectedCategoryId = ref<number | null>(null)

async function fetchCategories() {
  try {
    const res = await knowledgeApi.getCategories()
    if (res && res.data) {
      categories.value = res.data
    }
  } catch {
    // Error handled by request interceptor
  }
}

function handleCategorySelect(id: number | null) {
  selectedCategoryId.value = id
  searchForm.categoryId = id ?? undefined
  pagination.page = 1
  fetchArticles()
}

async function handleDeleteCategory(id: number) {
  try {
    await knowledgeApi.removeCategory(id)
    ElMessage.success('分类删除成功')
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = null
      searchForm.categoryId = undefined
    }
    await fetchCategories()
    fetchArticles()
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Search & Pagination ----

const searchForm = reactive<{
  keyword: string
  isPublished: boolean | undefined
  categoryId: number | undefined
}>({
  keyword: '',
  isPublished: undefined,
  categoryId: undefined,
})

const loading = ref(false)
const tableData = ref<ArticleVO[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

async function fetchArticles() {
  loading.value = true
  try {
    const res = await knowledgeApi.getArticles({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      isPublished: searchForm.isPublished,
      categoryId: searchForm.categoryId,
    })
    if (res && res.data) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchArticles()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.isPublished = undefined
  searchForm.categoryId = selectedCategoryId.value ?? undefined
  pagination.page = 1
  fetchArticles()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchArticles()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchArticles()
}

// ---- Article Dialog ----

const articleDialogVisible = ref(false)
const isEditArticle = ref(false)
const editArticleId = ref<number | null>(null)
const submitLoading = ref(false)
const articleFormRef = ref<FormInstance>()

interface ArticleForm {
  title: string
  content: string
  categoryId: number | undefined
  tagsInput: string
  isPublished: boolean
}

const defaultArticleForm = (): ArticleForm => ({
  title: '',
  content: '',
  categoryId: undefined,
  tagsInput: '',
  isPublished: false,
})

const articleForm = reactive<ArticleForm>(defaultArticleForm())

const articleFormRules: FormRules = {
  title: [{ required: true, message: '请输入文章标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入文章内容', trigger: 'blur' }],
}

const articleStatus = ref<ArticleActionResponse>({
  liked: false,
  favorited: false,
  likeCount: 0,
})
const likeLoading = ref(false)
const favoriteLoading = ref(false)

function resetArticleActionStatus() {
  articleStatus.value = {
    liked: false,
    favorited: false,
    likeCount: 0,
  }
}

async function loadArticleStatus(id: number) {
  try {
    const res = await knowledgeApi.getArticleStatus(id)
    if (res?.data) {
      articleStatus.value = res.data
    }
  } catch {
    resetArticleActionStatus()
  }
}

function syncArticleLikeCount(articleId: number, likeCount: number) {
  const target = tableData.value.find((article) => article.id === articleId)
  if (target) {
    target.likeCount = likeCount
  }
}

async function handleToggleLike() {
  if (editArticleId.value === null) return

  likeLoading.value = true
  try {
    const res = await knowledgeApi.toggleArticleLike(editArticleId.value)
    if (res?.data) {
      articleStatus.value = res.data
      syncArticleLikeCount(editArticleId.value, res.data.likeCount)
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    likeLoading.value = false
  }
}

async function handleToggleFavorite() {
  if (editArticleId.value === null) return

  favoriteLoading.value = true
  try {
    const res = await knowledgeApi.toggleArticleFavorite(editArticleId.value)
    if (res?.data) {
      articleStatus.value = res.data
      syncArticleLikeCount(editArticleId.value, res.data.likeCount)
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    favoriteLoading.value = false
  }
}

function handleCreateArticle() {
  isEditArticle.value = false
  editArticleId.value = null
  resetArticleActionStatus()
  Object.assign(articleForm, defaultArticleForm())
  articleDialogVisible.value = true
}

function handleEditArticle(row: ArticleVO) {
  isEditArticle.value = true
  editArticleId.value = row.id
  Object.assign(articleForm, {
    title: row.title ?? '',
    content: row.content ?? '',
    categoryId: row.categoryId ?? undefined,
    tagsInput: Array.isArray(row.tags) ? row.tags.join(',') : '',
    isPublished: row.isPublished ?? false,
  })
  articleDialogVisible.value = true
  loadArticleStatus(row.id)
}

function handleArticleDialogClosed() {
  likeLoading.value = false
  favoriteLoading.value = false
  resetArticleActionStatus()
  articleFormRef.value?.clearValidate()
}

function parseTags(tagsInput: string): string[] {
  return tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

async function handleSubmitArticle() {
  if (!articleFormRef.value) return
  const valid = await articleFormRef.value.validate().catch(() => false)
  if (!valid) return

  const tags = parseTags(articleForm.tagsInput)

  submitLoading.value = true
  try {
    if (isEditArticle.value && editArticleId.value !== null) {
      const params: UpdateArticleParams = {
        title: articleForm.title,
        content: articleForm.content,
        categoryId: articleForm.categoryId,
        tags: tags.length > 0 ? tags : undefined,
        isPublished: articleForm.isPublished,
      }
      await knowledgeApi.updateArticle(editArticleId.value, params)
      ElMessage.success('文章更新成功')
    } else {
      const params: CreateArticleParams = {
        title: articleForm.title,
        content: articleForm.content,
        categoryId: articleForm.categoryId,
        authorId: userStore.userInfo?.id ?? 1,
        tags: tags.length > 0 ? tags : undefined,
        isPublished: articleForm.isPublished,
      }
      await knowledgeApi.createArticle(params)
      ElMessage.success('文章创建成功')
    }
    articleDialogVisible.value = false
    fetchArticles()
  } catch {
    // Error handled by request interceptor
  } finally {
    submitLoading.value = false
  }
}

async function handleDeleteArticle(id: number) {
  try {
    await knowledgeApi.removeArticle(id)
    ElMessage.success('删除成功')
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1
    }
    fetchArticles()
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Category Dialog ----

const categoryDialogVisible = ref(false)
const categorySubmitLoading = ref(false)
const categoryFormRef = ref<FormInstance>()

interface CategoryForm {
  name: string
  parentId: number | undefined
  sort: number
  description: string
}

const defaultCategoryForm = (): CategoryForm => ({
  name: '',
  parentId: undefined,
  sort: 0,
  description: '',
})

const categoryForm = reactive<CategoryForm>(defaultCategoryForm())

const categoryFormRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

function handleOpenCategoryDialog() {
  Object.assign(categoryForm, defaultCategoryForm())
  categoryDialogVisible.value = true
}

function handleCategoryDialogClosed() {
  categoryFormRef.value?.clearValidate()
}

async function handleSubmitCategory() {
  if (!categoryFormRef.value) return
  const valid = await categoryFormRef.value.validate().catch(() => false)
  if (!valid) return

  categorySubmitLoading.value = true
  try {
    await knowledgeApi.createCategory({
      name: categoryForm.name,
      parentId: categoryForm.parentId,
      sort: categoryForm.sort,
      description: categoryForm.description || undefined,
    })
    ElMessage.success('分类创建成功')
    categoryDialogVisible.value = false
    await fetchCategories()
  } catch {
    // Error handled by request interceptor
  } finally {
    categorySubmitLoading.value = false
  }
}

// ---- AI Q&A Drawer with Conversation History ----

const CHAT_STORAGE_KEY = 'crm-knowledge-chat-history'

interface ChatSource {
  articleId: number
  title: string
  similarity: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  timestamp: number
}

const askDrawerVisible = ref(false)
const askQuestion = ref('')
const askLoading = ref(false)
const chatContainerRef = ref<HTMLDivElement>()

// Load chat history from localStorage
function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ChatMessage[]
      // Keep only last 50 messages to prevent storage bloat
      return parsed.slice(-50)
    }
  } catch {
    // Corrupted data — reset
  }
  return []
}

function saveChatHistory() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.value.slice(-50)))
  } catch {
    // Storage full — silently fail
  }
}

const chatHistory = ref<ChatMessage[]>(loadChatHistory())

function scrollToBottom() {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

function handleOpenAskDrawer() {
  askQuestion.value = ''
  askDrawerVisible.value = true
  scrollToBottom()
}

async function handleAskSubmit() {
  const question = askQuestion.value.trim()
  if (!question) return

  // Add user message
  chatHistory.value.push({
    role: 'user',
    content: question,
    timestamp: Date.now(),
  })
  askQuestion.value = ''
  saveChatHistory()
  scrollToBottom()

  askLoading.value = true
  try {
    const res = await knowledgeApi.askQuestion({ question })
    if (res?.data) {
      chatHistory.value.push({
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources,
        timestamp: Date.now(),
      })
      saveChatHistory()
    }
  } catch {
    chatHistory.value.push({
      role: 'assistant',
      content: '抱歉，获取回答时出现错误，请稍后重试。',
      timestamp: Date.now(),
    })
    saveChatHistory()
  } finally {
    askLoading.value = false
    scrollToBottom()
  }
}

function handleClearHistory() {
  chatHistory.value = []
  localStorage.removeItem(CHAT_STORAGE_KEY)
}

async function handleViewSourceArticle(articleId: number) {
  // Navigate to the article detail page
  askDrawerVisible.value = false
  router.push(`/knowledge/${articleId}`)
}

// ---- Init ----

onMounted(async () => {
  await fetchCategories()
  fetchArticles()
})
</script>

<style scoped>
.knowledge-page {
  padding: 16px;
  height: 100%;
}

.knowledge-layout {
  display: flex;
  gap: 12px;
  height: 100%;
}

/* Left: Category Panel */
.category-panel {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.category-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.category-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: background 0.15s;
  position: relative;
}

.category-item:hover {
  background: #f5f7fa;
}

.category-item.active {
  background: #ecf5ff;
  color: var(--el-color-primary);
}

.category-item .delete-icon {
  margin-left: auto;
  color: #c0c4cc;
  display: none;
}

.category-item:hover .delete-icon {
  display: inline-flex;
  color: #f56c6c;
}

.category-footer {
  padding: 12px;
  border-top: 1px solid #f0f0f0;
}

/* Right: Article Panel */
.article-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.search-card :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
}

.search-form {
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.table-card :deep(.el-table) {
  border-radius: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
}

.article-dialog-footer {
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.article-dialog-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.article-dialog-submit {
  align-items: center;
  display: flex;
  gap: 8px;
}

/* AI Q&A Drawer — Chat Style */
.ask-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  opacity: 0.6;
}

.chat-message {
  display: flex;
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-message.assistant {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.chat-message.user .chat-bubble {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-message.assistant .chat-bubble {
  background: #f5f7fa;
  color: #303133;
  border-bottom-left-radius: 4px;
}

.chat-text {
  white-space: pre-wrap;
}

.chat-sources {
  margin-top: 8px;
  border-top: 1px solid #e4e7ed;
  padding-top: 8px;
}

.chat-sources-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.source-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  margin: 2px 4px 2px 0;
  background: #ecf5ff;
  border-radius: 10px;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
  transition: background 0.15s;
}

.source-chip:hover {
  background: #d9ecff;
}

.source-chip .source-similarity {
  color: #909399;
  font-size: 11px;
}

.chat-input-area {
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
  flex-shrink: 0;
}

.chat-input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.chat-input-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ask-hint {
  font-size: 12px;
  color: #909399;
}
</style>
