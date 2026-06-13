<template>
  <div v-loading="loading" class="speech-detail">
    <div v-if="template" class="detail-content">
      <div class="detail-header">
        <div>
          <h2>{{ template.title }}</h2>
          <div class="meta">
            <el-tag :type="statusTagType(template.status)" size="small">
              {{ statusLabel(template.status) }}
            </el-tag>
            <span class="meta-item">分类：{{ template.category?.name ?? '-' }}</span>
            <span v-if="template.scene" class="meta-item">场景：{{ template.scene }}</span>
            <span class="meta-item">使用次数：{{ template.usageCount }}</span>
          </div>
        </div>
        <el-button @click="$router.back()">返回</el-button>
      </div>

      <el-divider />

      <div class="template-body">
        <h3>话术内容</h3>
        <div class="content-block" v-text="template.content" />
      </div>

      <div v-if="template.tags" class="tags-section">
        <h3>标签</h3>
        <el-tag
          v-for="tag in template.tags.split(',')"
          :key="tag"
          size="small"
          style="margin-right: 8px"
        >
          {{ tag.trim() }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getTemplate, type SpeechTemplate } from '@/api/speech'

const route = useRoute()
const loading = ref(false)
const template = ref<SpeechTemplate | null>(null)

function statusTagType(status: string) {
  if (status === 'published') return 'success'
  if (status === 'archived') return 'info'
  return 'warning'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已归档' }
  return map[status] ?? status
}

onMounted(async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    template.value = (await getTemplate(id)) as unknown as SpeechTemplate
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.speech-detail {
  padding: 20px;
}

.detail-content {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.detail-header h2 {
  margin: 0 0 8px 0;
}

.meta {
  display: flex;
  gap: 16px;
  align-items: center;
  color: #666;
  font-size: 13px;
}

.meta-item {
  color: #999;
}

.template-body {
  margin-top: 16px;
}

.content-block {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 6px;
  white-space: pre-wrap;
  line-height: 1.8;
}

.tags-section {
  margin-top: 24px;
}

.tags-section h3,
.template-body h3 {
  margin-bottom: 12px;
}
</style>
