<template>
  <div class="material-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>素材库管理</span>
          <div>
            <el-radio-group v-model="viewMode" size="small" style="margin-right: 12px">
              <el-radio-button value="list">列表</el-radio-button>
              <el-radio-button value="card">卡片</el-radio-button>
            </el-radio-group>
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              :on-success="onUploadSuccess"
              :on-error="onUploadError"
              :show-file-list="false"
              style="display: inline-block"
            >
              <el-button type="primary">上传素材</el-button>
            </el-upload>
          </div>
        </div>
      </template>

      <!-- Category tabs -->
      <el-tabs v-model="activeCategory" @tab-change="loadData">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="产品知识" name="product" />
        <el-tab-pane label="竞品资料" name="competitor" />
        <el-tab-pane label="销售素材" name="sales" />
        <el-tab-pane label="培训资料" name="training" />
      </el-tabs>

      <!-- Search -->
      <el-input
        v-model="keyword"
        placeholder="搜索素材名称"
        clearable
        style="width: 300px; margin-bottom: 16px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #append><el-button @click="handleSearch">搜索</el-button></template>
      </el-input>

      <!-- List View -->
      <template v-if="viewMode === 'list'">
        <el-table v-loading="loading" :data="list" stripe>
          <el-table-column label="文件名" prop="fileName" min-width="200" show-overflow-tooltip />
          <el-table-column label="分类" prop="category" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ categoryLabels[row.category] || row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="文件大小" width="120" align="center">
            <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="上传人" prop="uploaderName" width="100" />
          <el-table-column label="上传时间" prop="createdAt" width="170" />
          <el-table-column label="操作" width="180" align="center">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="previewFile(row)">预览</el-button>
              <el-button type="primary" link size="small" @click="downloadFile(row)"
              >
                下载
              </el-button
              >
              <el-button type="warning" link size="small" @click="toggleFavorite(row)">
                {{ row.isFavorited ? '取消收藏' : '收藏' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- Card View -->
      <template v-else>
        <el-row v-loading="loading" :gutter="16">
          <el-col v-for="item in list" :key="item.id" :span="6" style="margin-bottom: 16px">
            <el-card shadow="hover" class="material-card" @click="previewFile(item)">
              <div class="card-icon">
                <el-icon :size="48"><Document /></el-icon>
              </div>
              <div class="card-info">
                <p class="file-name" :title="item.fileName">{{ item.fileName }}</p>
                <p class="file-meta">
                  <el-tag size="small" type="info">
                    {{
                      categoryLabels[item.category] || item.category
                    }}
                  </el-tag>
                  <span>{{ formatSize(item.fileSize) }}</span>
                </p>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <!-- Pagination -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[12, 24, 48]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { useUserStore } from '@/stores/user'

const categoryLabels: Record<string, string> = {
  product: '产品知识',
  competitor: '竞品资料',
  sales: '销售素材',
  training: '培训资料',
}

interface MaterialVO {
  id: number
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  category: string
  uploaderName: string
  isFavorited: boolean
  createdAt: string
}

const userStore = useUserStore()
const loading = ref(false)
const list = ref<MaterialVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const keyword = ref('')
const viewMode = ref<'list' | 'card'>('list')
const activeCategory = ref('all')

const uploadUrl = '/api/v1/materials/upload'
const uploadHeaders = { Authorization: `Bearer ${userStore.token}` }

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

async function loadData() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (activeCategory.value !== 'all') params.category = activeCategory.value
    const res = (await request.get('/materials', { params })) as unknown as {
      code: number
      data: { list: MaterialVO[]; total: number }
    }
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载素材列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function previewFile(item: MaterialVO) {
  window.open(item.fileUrl, '_blank')
}

function downloadFile(item: MaterialVO) {
  const a = document.createElement('a')
  a.href = item.fileUrl
  a.download = item.fileName
  a.click()
}

async function toggleFavorite(item: MaterialVO) {
  try {
    if (item.isFavorited) {
      await request.delete(`/materials/${item.id}/favorite`)
      item.isFavorited = false
      ElMessage.success('已取消收藏')
    } else {
      await request.post(`/materials/${item.id}/favorite`)
      item.isFavorited = true
      ElMessage.success('已收藏')
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

function onUploadSuccess() {
  ElMessage.success('上传成功')
  loadData()
}
function onUploadError() {
  ElMessage.error('上传失败')
}

onMounted(loadData)
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
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.material-card {
  cursor: pointer;
  text-align: center;
}
.card-icon {
  padding: 20px 0;
  color: #409eff;
}
.card-info {
  border-top: 1px solid #ebeef5;
  padding: 12px 8px 4px;
}
.file-name {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 0 8px;
}
.file-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}
</style>
