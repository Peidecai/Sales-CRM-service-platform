<template>
  <div class="favorites-page">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">My Favorites</h2>
          <p class="page-subtitle">Saved knowledge articles for quick access.</p>
        </div>
        <div class="header-actions">
          <el-button @click="$router.push('/knowledge')">Back To Knowledge</el-button>
          <el-button type="primary" :loading="loading" @click="fetchFavorites">Refresh</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="list-card">
      <el-skeleton v-if="loading" :rows="6" animated />

      <el-empty
        v-else-if="favorites.length === 0"
        description="No favorited articles yet."
        :image-size="90"
      >
        <el-button type="primary" @click="$router.push('/knowledge')"
          >Go Favorite Articles</el-button
        >
      </el-empty>

      <div v-else class="favorite-list">
        <el-card v-for="item in favorites" :key="item.id" shadow="hover" class="favorite-item">
          <div class="item-main">
            <div class="item-title" @click="openDetail(item.id)">{{ item.title }}</div>
            <div class="item-meta">
              <el-tag size="small" effect="plain">{{
                item.isPublished ? 'Published' : 'Draft'
              }}</el-tag>
              <span>Category: {{ getCategoryName(item.categoryId) }}</span>
              <span>Likes: {{ item.likeCount }}</span>
              <span>Views: {{ item.viewCount }}</span>
              <span>Updated: {{ formatDate(item.updatedAt) }}</span>
            </div>
            <div v-if="item.tags && item.tags.length > 0" class="tag-list">
              <el-tag
                v-for="tag in item.tags"
                :key="`${item.id}-${tag}`"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          <div class="item-actions">
            <el-button type="primary" link @click="openDetail(item.id)">Detail</el-button>
            <el-popconfirm
              title="Remove this article from favorites?"
              confirm-button-text="Remove"
              cancel-button-text="Cancel"
              @confirm="handleRemoveFavorite(item.id)"
            >
              <template #reference>
                <el-button type="danger" link>Unfavorite</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { knowledgeApi, type ArticleVO, type CategoryVO } from '@/api/knowledge'
import { formatDate } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const favorites = ref<ArticleVO[]>([])
const categories = ref<CategoryVO[]>([])

function getCategoryName(categoryId: number | null): string {
  if (!categoryId) return '-'
  return categories.value.find((c) => c.id === categoryId)?.name ?? String(categoryId)
}

function openDetail(id: number) {
  router.push(`/knowledge/${id}`)
}

async function fetchFavorites() {
  loading.value = true
  try {
    const [favoritesRes, categoriesRes] = await Promise.all([
      knowledgeApi.getUserFavorites(),
      knowledgeApi.getCategories(),
    ])
    favorites.value = favoritesRes?.data ?? []
    categories.value = categoriesRes?.data ?? []
  } catch {
    // Request interceptor handles message
  } finally {
    loading.value = false
  }
}

async function handleRemoveFavorite(articleId: number) {
  try {
    await knowledgeApi.toggleArticleFavorite(articleId)
    favorites.value = favorites.value.filter((item) => item.id !== articleId)
    ElMessage.success('Removed from favorites')
  } catch {
    // Request interceptor handles message
  }
}

onMounted(() => {
  fetchFavorites()
})
</script>

<style scoped>
.favorites-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-card :deep(.el-card__body) {
  padding: 16px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.3;
  color: #303133;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #909399;
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-card :deep(.el-card__body) {
  padding: 16px;
}

.favorite-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.favorite-item :deep(.el-card__body) {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  cursor: pointer;
  margin-bottom: 8px;
}

.item-title:hover {
  color: var(--el-color-primary);
}

.item-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: #606266;
  font-size: 13px;
}

.tag-list {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .favorite-item :deep(.el-card__body) {
    flex-direction: column;
  }

  .item-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
