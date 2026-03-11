<template>
  <div class="material-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>素材库</span>
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="grid">网格</el-radio-button>
            <el-radio-button value="list">列表</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div class="upload-area" @click="triggerUpload" @drop.prevent="onDrop" @dragover.prevent>
        拖拽文件到此处或点击上传（需配置 OSS 与 STS）
      </div>
      <el-tabs v-model="activeTab" class="filter-tabs">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="图片" name="image" />
        <el-tab-pane label="文档" name="document" />
        <el-tab-pane label="视频" name="video" />
        <el-tab-pane label="音频" name="audio" />
      </el-tabs>
      <div v-loading="loading" class="content">
        <template v-if="viewMode === 'grid'">
          <div class="grid-list">
            <el-card
              v-for="item in list"
              :key="item.id"
              shadow="hover"
              class="grid-item"
              @click="preview(item)"
            >
              <div class="thumb">
                {{ item.mimeType?.startsWith('image/') ? '🖼' : '📄' }}
              </div>
              <div class="name">{{ item.name }}</div>
              <div class="meta">
                {{ formatSize(item.fileSize) }} · {{ formatDate(item.createdAt) }}
              </div>
              <el-button type="danger" link size="small" @click.stop="handleRemove(item.id)"
                >删除</el-button
              >
            </el-card>
          </div>
        </template>
        <el-table v-else :data="list" stripe>
          <el-table-column label="名称" prop="name" min-width="180" />
          <el-table-column label="大小" width="100">
            <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="类型" prop="mimeType" width="120" />
          <el-table-column label="上传时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="preview(row)">预览</el-button>
              <el-button type="danger" link size="small" @click="handleRemove(row.id)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        class="pagination"
        @current-change="loadList"
        @size-change="loadList"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { materialApi, type MaterialVO } from '@/api/material'
import { formatDate } from '@/utils/format'
import { ElMessage, ElMessageBox } from 'element-plus'

const viewMode = ref<'grid' | 'list'>('grid')
const activeTab = ref('all')
const loading = ref(false)
const list = ref<MaterialVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getMimeFilter(): string | undefined {
  const map: Record<string, string> = {
    image: 'image',
    document: 'application',
    video: 'video',
    audio: 'audio',
  }
  return map[activeTab.value]
}

async function loadList() {
  loading.value = true
  try {
    const res = await materialApi.list({
      page: page.value,
      pageSize: pageSize.value,
      mimeType: getMimeFilter(),
    })
    if (res?.data) {
      list.value = res.data.list ?? []
      total.value = res.data.total ?? 0
    }
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function triggerUpload() {
  ElMessage.info('请配置 OSS 与 STS 后实现直传')
}

function onDrop() {
  ElMessage.info('请配置 OSS 与 STS 后实现拖拽上传')
}

function preview(item: MaterialVO) {
  window.open(`#/material/${item.id}`, '_blank')
}

async function handleRemove(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该素材？', '提示', { type: 'warning' })
    await materialApi.remove(id)
    ElMessage.success('已删除')
    loadList()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

watch(activeTab, () => {
  page.value = 1
  loadList()
})

onMounted(() => loadList())
</script>

<style scoped>
.material-page {
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  color: #909399;
  cursor: pointer;
  margin-bottom: 16px;
}

.upload-area:hover {
  border-color: #409eff;
  color: #409eff;
}

.filter-tabs {
  margin-bottom: 16px;
}

.content {
  min-height: 200px;
}

.grid-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.grid-item {
  cursor: pointer;
}

.grid-item .thumb {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.grid-item .name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-item .meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
