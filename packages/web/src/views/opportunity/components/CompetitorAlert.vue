<template>
  <el-card shadow="never" class="competitor-alert-panel">
    <template #header>
      <div class="card-header">
        <span class="card-header-title">
          竞品提及
          <el-tag v-if="mentions.length > 0" size="small" type="info" class="count-tag">
            {{ mentions.length }}
          </el-tag>
        </span>
      </div>
    </template>

    <el-skeleton v-if="loading" :rows="3" animated />

    <template v-else-if="groupedMentions.length > 0">
      <div v-for="group in groupedMentions" :key="group.name" class="competitor-group">
        <div class="group-header">
          <span class="competitor-name">{{ group.name }}</span>
          <el-tag size="small" type="info">{{ group.items.length }} 次提及</el-tag>
        </div>
        <div v-for="item in group.items" :key="item.id" class="mention-item">
          <el-tag :type="sentimentTagType(item.sentiment)" size="small" class="sentiment-tag">
            {{ sentimentLabel(item.sentiment) }}
          </el-tag>
          <span v-if="item.context" class="mention-context">{{ item.context }}</span>
          <span class="mention-time">{{ formatDate(item.createdAt) }}</span>
        </div>
      </div>
    </template>

    <el-empty v-else description="暂无竞品提及记录" :image-size="60" />
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getCompetitorMentions, type CompetitorMentionItem } from '@/api/ai-reminder'

type TagType = 'success' | 'warning' | 'danger' | 'info' | 'primary'

const props = defineProps<{
  opportunityId: number
}>()

const loading = ref(false)
const mentions = ref<CompetitorMentionItem[]>([])

interface MentionGroup {
  name: string
  items: CompetitorMentionItem[]
}

const groupedMentions = computed<MentionGroup[]>(() => {
  const map = new Map<string, CompetitorMentionItem[]>()
  for (const m of mentions.value) {
    const list = map.get(m.competitorName) ?? []
    list.push(m)
    map.set(m.competitorName, list)
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
})

function sentimentTagType(sentiment: string): TagType {
  const map: Record<string, TagType> = {
    positive: 'success',
    neutral: 'info',
    negative: 'danger',
  }
  return map[sentiment] ?? 'info'
}

function sentimentLabel(sentiment: string): string {
  const map: Record<string, string> = {
    positive: '正面',
    neutral: '中性',
    negative: '负面',
  }
  return map[sentiment] ?? sentiment
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

async function fetchMentions() {
  loading.value = true
  try {
    const res = (await getCompetitorMentions({
      opportunityId: props.opportunityId,
      page: 1,
      pageSize: 100,
    })) as unknown as { list: CompetitorMentionItem[]; total: number }
    mentions.value = res.list
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

watch(() => props.opportunityId, fetchMentions)

onMounted(fetchMentions)
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-tag {
  border-radius: 10px;
}

.competitor-group {
  margin-bottom: 16px;
}

.competitor-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.competitor-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.mention-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0 6px 12px;
  border-left: 2px solid #e4e7ed;
}

.sentiment-tag {
  flex-shrink: 0;
}

.mention-context {
  font-size: 13px;
  color: #606266;
  flex: 1;
  line-height: 1.5;
}

.mention-time {
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
}
</style>
