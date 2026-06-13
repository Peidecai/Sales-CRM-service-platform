<template>
  <el-dialog
    :model-value="visible"
    title="选择话术模板"
    width="600px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-input
      v-model="searchKeyword"
      placeholder="搜索话术"
      prefix-icon="Search"
      clearable
      style="margin-bottom: 16px"
      @keyup.enter="loadData"
      @clear="loadData"
    />

    <div v-loading="loading" class="template-list">
      <div v-for="cat in groupedTemplates" :key="cat.categoryName" class="group">
        <div class="group-title">{{ cat.categoryName }}</div>
        <div v-for="t in cat.items" :key="t.id" class="template-item" @click="$emit('select', t)">
          <div class="t-title">{{ t.title }}</div>
          <div class="t-preview">
            {{ t.content.slice(0, 80) }}{{ t.content.length > 80 ? '...' : '' }}
          </div>
        </div>
      </div>
      <el-empty
        v-if="groupedTemplates.length === 0 && !loading"
        description="无结果"
        :image-size="60"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getTemplates, type SpeechTemplate } from '@/api/speech'

defineProps<{ visible: boolean }>()
defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'select', t: SpeechTemplate): void
}>()

const loading = ref(false)
const searchKeyword = ref('')
const templates = ref<SpeechTemplate[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = (await getTemplates({
      pageSize: 100,
      keyword: searchKeyword.value || undefined,
      status: 'published',
    })) as unknown as { list: SpeechTemplate[] }
    templates.value = res.list
  } finally {
    loading.value = false
  }
}

const groupedTemplates = computed(() => {
  const map = new Map<string, SpeechTemplate[]>()
  for (const t of templates.value) {
    const name = t.category?.name ?? '未分类'
    if (!map.has(name)) map.set(name, [])
    map.get(name)!.push(t)
  }
  return Array.from(map.entries()).map(([categoryName, items]) => ({ categoryName, items }))
})

watch(
  () => searchKeyword.value,
  () => {
    // debounce not needed for small lists
  },
)

onMounted(loadData)
</script>

<style scoped>
.template-list {
  max-height: 400px;
  overflow-y: auto;
}

.group-title {
  font-weight: 600;
  color: #333;
  padding: 8px 0 4px;
  border-bottom: 1px solid #eee;
  margin-bottom: 4px;
}

.template-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.template-item:hover {
  background: #f5f7fa;
}

.t-title {
  font-weight: 500;
}

.t-preview {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
</style>
