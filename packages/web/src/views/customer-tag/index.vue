<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getTags, createTag, updateTag, deleteTag } from '@/api/tag'
import { usePermission } from '@/composables/usePermission'

const { isAdminOrManager } = usePermission()

const tags = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const activeGroup = ref('all')
const dialogVisible = ref(false)
const editingTag = ref<Record<string, unknown> | null>(null)

const tagForm = ref({
  name: '',
  color: '#409EFF',
  group: '',
})

const groups = computed(() => {
  const set = new Set<string>()
  tags.value.forEach((t) => {
    if (t.group) set.add(t.group as string)
  })
  return Array.from(set)
})

const filteredTags = computed(() => {
  if (activeGroup.value === 'all') return tags.value
  return tags.value.filter((t) => t.group === activeGroup.value)
})

const fetchTags = async () => {
  loading.value = true
  try {
    const res = (await getTags()) as unknown as Record<string, unknown>
    tags.value = (res.data as Record<string, unknown>[]) || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchTags)

const handleAdd = () => {
  editingTag.value = null
  tagForm.value = { name: '', color: '#409EFF', group: '' }
  dialogVisible.value = true
}

const handleEdit = (tag: Record<string, unknown>) => {
  editingTag.value = tag
  tagForm.value = {
    name: tag.name as string,
    color: tag.color as string,
    group: (tag.group as string) || '',
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!tagForm.value.name) {
    ElMessage.warning('请输入标签名称')
    return
  }
  try {
    if (editingTag.value) {
      await updateTag(editingTag.value.id as number, tagForm.value)
      ElMessage.success('标签更新成功')
    } else {
      await createTag(tagForm.value)
      ElMessage.success('标签创建成功')
    }
    dialogVisible.value = false
    fetchTags()
  } catch {
    /* handled */
  }
}

const handleDelete = async (id: number) => {
  await ElMessageBox.confirm('确定删除该标签？', '提示', { type: 'warning' })
  await deleteTag(id)
  ElMessage.success('标签已删除')
  fetchTags()
}
</script>

<template>
  <div style="display: flex; gap: 16px">
    <!-- Left: Groups -->
    <el-card shadow="never" style="width: 200px; flex-shrink: 0">
      <el-menu :default-active="activeGroup" @select="(idx: string) => (activeGroup = idx)">
        <el-menu-item index="all">全部标签</el-menu-item>
        <el-menu-item v-for="g in groups" :key="g" :index="g">{{ g }}</el-menu-item>
      </el-menu>
    </el-card>

    <!-- Right: Tag Grid -->
    <el-card v-loading="loading" shadow="never" style="flex: 1">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>标签管理</span>
          <el-button
            v-if="isAdminOrManager"
            type="primary"
            :icon="Plus"
            size="small"
            @click="handleAdd"
          >
            新增标签
          </el-button>
        </div>
      </template>

      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <div
          v-for="tag in filteredTags"
          :key="tag.id as number"
          style="
            padding: 8px 16px;
            border: 1px solid #ebeef5;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          "
        >
          <el-tag :color="tag.color as string" effect="dark" size="small">
            {{ tag.name }}
          </el-tag>
          <span style="color: #909399; font-size: 12px">{{ tag.group || '未分组' }}</span>
          <template v-if="isAdminOrManager">
            <el-button size="small" text @click="handleEdit(tag)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(tag.id as number)"
            >
              删除
            </el-button
            >
          </template>
        </div>
      </div>

      <el-empty v-if="filteredTags.length === 0" description="暂无标签" />
    </el-card>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingTag ? '编辑标签' : '新增标签'" width="400px">
      <el-form :model="tagForm" label-width="80px">
        <el-form-item label="标签名称" required>
          <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="标签颜色">
          <el-color-picker v-model="tagForm.color" />
        </el-form-item>
        <el-form-item label="标签分组">
          <el-input v-model="tagForm.group" placeholder="请输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
