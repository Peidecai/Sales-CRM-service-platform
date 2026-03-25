<template>
  <div class="forum-page">
    <div class="page-header">
      <h2>企业论坛</h2>
      <el-button type="primary" @click="router.push('/forum/create-post')">
        <el-icon><Edit /></el-icon>发帖
      </el-button>
    </div>

    <!-- Category Tabs -->
    <el-tabs v-model="activeCategory" @tab-change="handleCategoryChange">
      <el-tab-pane label="全部" :name="0" />
      <el-tab-pane
        v-for="cat in categories"
        :key="cat.id"
        :label="`${cat.name} (${cat.postCount})`"
        :name="cat.id"
      />
    </el-tabs>

    <!-- Search & Sort -->
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索帖子..."
        clearable
        style="width: 300px"
        @keyup.enter="loadPosts"
        @clear="loadPosts"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-radio-group v-model="sortBy" @change="loadPosts">
        <el-radio-button value="latest">最新</el-radio-button>
        <el-radio-button value="popular">最热</el-radio-button>
        <el-radio-button value="commented">最多评论</el-radio-button>
      </el-radio-group>
    </div>

    <!-- Posts List -->
    <div v-loading="loading" class="posts-list">
      <el-empty v-if="!loading && posts.length === 0" description="暂无帖子" />
      <div
        v-for="post in posts"
        :key="post.id"
        class="post-card"
        @click="router.push(`/forum/post/${post.id}`)"
      >
        <div class="post-tags">
          <el-tag v-if="post.isPinned" type="danger" size="small">置顶</el-tag>
          <el-tag v-if="post.isFeatured" type="warning" size="small">精华</el-tag>
          <el-tag v-if="post.isLocked" type="info" size="small">已锁定</el-tag>
        </div>
        <h3 class="post-title">{{ post.title }}</h3>
        <p class="post-excerpt">{{ getExcerpt(post.content) }}</p>
        <div class="post-meta">
          <span>用户 #{{ post.authorId }}</span>
          <span>{{ formatDate(post.createdAt) }}</span>
          <span
            ><el-icon><View /></el-icon> {{ post.viewCount }}</span
          >
          <span
            ><el-icon><Star /></el-icon> {{ post.likeCount }}</span
          >
          <span
            ><el-icon><ChatRound /></el-icon> {{ post.commentCount }}</span
          >
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadPosts"
        @current-change="loadPosts"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Edit, Search, View, Star, ChatRound } from '@element-plus/icons-vue'
import { forumApi, type ForumPostVO, type ForumCategoryVO } from '@/api/forum'

const router = useRouter()

const categories = ref<ForumCategoryVO[]>([])
const posts = ref<ForumPostVO[]>([])
const loading = ref(false)
const activeCategory = ref(0)
const keyword = ref('')
const sortBy = ref<'latest' | 'popular' | 'commented'>('latest')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

function getExcerpt(content: string): string {
  const plain = content.replace(/[#*`>\-[\]()!]/g, '').trim()
  return plain.length > 150 ? plain.slice(0, 150) + '...' : plain
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadCategories() {
  try {
    const res = (await forumApi.getCategories()) as unknown as ForumCategoryVO[]
    categories.value = res
  } catch {
    // ignore
  }
}

async function loadPosts() {
  loading.value = true
  try {
    const res = (await forumApi.getPosts({
      categoryId: activeCategory.value || undefined,
      keyword: keyword.value || undefined,
      sortBy: sortBy.value,
      page: page.value,
      pageSize: pageSize.value,
    })) as unknown as { list: ForumPostVO[]; total: number }
    posts.value = res.list
    total.value = res.total
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function handleCategoryChange() {
  page.value = 1
  loadPosts()
}

onMounted(() => {
  loadCategories()
  loadPosts()
})
</script>

<style scoped>
.forum-page {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0;
}
.posts-list {
  min-height: 200px;
}
.post-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 12px;
  cursor: pointer;
  border: 1px solid #ebeef5;
  transition: box-shadow 0.2s;
}
.post-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.post-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.post-title {
  margin: 0 0 8px;
  font-size: 16px;
  color: #303133;
}
.post-excerpt {
  margin: 0 0 12px;
  color: #909399;
  font-size: 14px;
  line-height: 1.5;
}
.post-meta {
  display: flex;
  gap: 16px;
  color: #909399;
  font-size: 13px;
  align-items: center;
}
.post-meta .el-icon {
  vertical-align: middle;
  margin-right: 2px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
