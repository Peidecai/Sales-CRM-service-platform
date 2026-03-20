<template>
  <div class="version-history">
    <el-skeleton v-if="loading" :rows="4" animated />
    <template v-else>
      <el-empty v-if="versions.length === 0" description="暂无版本记录" :image-size="60" />
      <div v-else>
        <!-- Version diff selector -->
        <div class="diff-selector">
          <el-select v-model="diffV1" placeholder="选择版本 A" size="small">
            <el-option
              v-for="v in versions"
              :key="v.id"
              :label="`v${v.version} - ${formatDate(v.createdAt)}`"
              :value="v.id"
            />
          </el-select>
          <span class="vs-label">VS</span>
          <el-select v-model="diffV2" placeholder="选择版本 B" size="small">
            <el-option
              v-for="v in versions"
              :key="v.id"
              :label="`v${v.version} - ${formatDate(v.createdAt)}`"
              :value="v.id"
            />
          </el-select>
          <el-button
            type="primary"
            size="small"
            :disabled="!diffV1 || !diffV2 || diffV1 === diffV2"
            @click="loadDiff"
          >
            对比
          </el-button>
        </div>

        <!-- Diff viewer -->
        <el-card v-if="diffResult" shadow="never" class="diff-card">
          <template #header>
            <span>版本对比: v{{ diffResult.v1.version }} vs v{{ diffResult.v2.version }}</span>
          </template>
          <div class="diff-grid">
            <div class="diff-col">
              <div class="diff-col-header">
                v{{ diffResult.v1.version }} — {{ diffResult.v1.title }}
              </div>
              <div class="diff-content">{{ diffResult.v1.content }}</div>
            </div>
            <div class="diff-col">
              <div class="diff-col-header">
                v{{ diffResult.v2.version }} — {{ diffResult.v2.title }}
              </div>
              <div class="diff-content">{{ diffResult.v2.content }}</div>
            </div>
          </div>
        </el-card>

        <!-- Version list -->
        <el-timeline>
          <el-timeline-item
            v-for="v in versions"
            :key="v.id"
            :timestamp="formatDate(v.createdAt)"
            placement="top"
          >
            <el-card shadow="hover" class="version-card" @click="selectedVersion = v">
              <div class="version-header">
                <el-tag size="small" type="info">v{{ v.version }}</el-tag>
                <span class="version-title">{{ v.title }}</span>
                <span class="version-editor">编辑者 #{{ v.editedById }}</span>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <!-- Version detail drawer -->
        <el-drawer v-model="drawerVisible" title="版本详情" size="50%" direction="rtl">
          <template v-if="selectedVersion">
            <h3>{{ selectedVersion.title }}</h3>
            <el-tag size="small">v{{ selectedVersion.version }}</el-tag>
            <el-divider />
            <div class="version-content-preview">{{ selectedVersion.content }}</div>
          </template>
        </el-drawer>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { getArticleVersions, diffArticleVersions, type ArticleVersionVO } from '@/api/ai'
import { formatDate } from '@/utils/format'

const props = defineProps<{
  articleId: number
}>()

const loading = ref(false)
const versions = ref<ArticleVersionVO[]>([])
const diffV1 = ref<number | null>(null)
const diffV2 = ref<number | null>(null)
const diffResult = ref<{ v1: ArticleVersionVO; v2: ArticleVersionVO } | null>(null)
const selectedVersion = ref<ArticleVersionVO | null>(null)
const drawerVisible = computed({
  get: () => selectedVersion.value !== null,
  set: (val: boolean) => {
    if (!val) selectedVersion.value = null
  },
})

async function loadVersions() {
  loading.value = true
  try {
    const res = await getArticleVersions(props.articleId)
    versions.value = ((res as { data?: ArticleVersionVO[] })?.data ?? []) as ArticleVersionVO[]
  } catch {
    // handled
  } finally {
    loading.value = false
  }
}

async function loadDiff() {
  if (!diffV1.value || !diffV2.value) return
  try {
    const res = await diffArticleVersions(diffV1.value, diffV2.value)
    diffResult.value =
      (res as { data?: { v1: ArticleVersionVO; v2: ArticleVersionVO } })?.data ?? null
  } catch {
    // handled
  }
}

watch(
  () => props.articleId,
  () => {
    if (props.articleId) loadVersions()
  },
  { immediate: true },
)
</script>

<style scoped>
.version-history {
  padding: 8px 0;
}

.diff-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.vs-label {
  font-weight: 600;
  color: #909399;
  font-size: 12px;
}

.diff-card {
  margin-bottom: 20px;
}

.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.diff-col-header {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.diff-content {
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
}

.version-card {
  cursor: pointer;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-title {
  font-weight: 500;
  color: #303133;
}

.version-editor {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.version-content-preview {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
}
</style>
