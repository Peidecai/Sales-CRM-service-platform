<template>
  <div class="training-videos-page" style="padding: 20px">
    <el-card shadow="never">
      <!-- Header -->
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        "
      >
        <h2 style="margin: 0">学习培训</h2>
        <div style="display: flex; gap: 12px; align-items: center">
          <el-input
            v-model="keyword"
            placeholder="搜索视频"
            clearable
            style="width: 240px"
            @clear="loadVideos"
            @keyup.enter="loadVideos"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="selectedCategory"
            placeholder="全部分类"
            clearable
            style="width: 160px"
            @change="loadVideos"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>
      </div>

      <!-- My Stats -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-statistic title="已完成课程" :value="myStats.completedCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="累计学习时长">
            <template #default>{{ formatDuration(myStats.totalWatchTime) }}</template>
          </el-statistic>
        </el-col>
      </el-row>

      <!-- Video Grid -->
      <el-row :gutter="16">
        <el-col
          v-for="video in videos"
          :key="video.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          style="margin-bottom: 16px"
        >
          <el-card
            shadow="hover"
            :body-style="{ padding: '0' }"
            class="video-card"
            @click="goToDetail(video.id)"
          >
            <div class="video-cover">
              <img
                v-if="video.coverUrl"
                :src="video.coverUrl"
                alt=""
                style="width: 100%; height: 160px; object-fit: cover"
              />
              <div v-else class="video-cover-placeholder">
                <el-icon :size="48"><VideoPlay /></el-icon>
              </div>
              <span class="video-duration">{{ formatDuration(video.duration) }}</span>
              <el-tag v-if="!video.isPublished" type="info" size="small" class="video-draft-tag">
                未发布
              </el-tag>
            </div>
            <div style="padding: 12px">
              <div class="video-title">{{ video.title }}</div>
              <div class="video-meta">
                <el-tag size="small" type="info">{{ video.category?.name || '未分类' }}</el-tag>
                <span class="video-format">{{ video.format.toUpperCase() }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <div v-if="videos.length === 0" style="text-align: center; padding: 60px 0">
        <el-empty description="暂无视频" />
      </div>

      <el-pagination
        v-if="total > pageSize"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, VideoPlay } from '@element-plus/icons-vue'
import {
  trainingApi,
  type TrainingVideoVO,
  type TrainingCategoryVO,
  type TrainingStatsVO,
} from '@/api/training'

const router = useRouter()
const videos = ref<TrainingVideoVO[]>([])
const categories = ref<TrainingCategoryVO[]>([])
const myStats = ref<TrainingStatsVO>({ totalWatchTime: 0, completedCount: 0 })
const keyword = ref('')
const selectedCategory = ref<number | undefined>(undefined)
const page = ref(1)
const pageSize = ref(12)
const total = ref(0)

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

async function loadVideos() {
  try {
    const res = (await trainingApi.getVideos({
      keyword: keyword.value || undefined,
      categoryId: selectedCategory.value,
      isPublished: true,
      page: page.value,
      pageSize: pageSize.value,
    })) as unknown as { list: TrainingVideoVO[]; total: number }
    videos.value = res.list
    total.value = res.total
  } catch {
    // handled by interceptor
  }
}

async function loadCategories() {
  try {
    const res = (await trainingApi.getCategories()) as unknown as TrainingCategoryVO[]
    categories.value = res
  } catch {
    // handled
  }
}

async function loadStats() {
  try {
    myStats.value = (await trainingApi.getMyStats()) as unknown as TrainingStatsVO
  } catch {
    // handled
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadVideos()
}

function goToDetail(id: number) {
  router.push(`/training/videos/${id}`)
}

onMounted(() => {
  loadCategories()
  loadVideos()
  loadStats()
})
</script>

<style scoped>
.video-card {
  cursor: pointer;
  transition: transform 0.2s;
}
.video-card:hover {
  transform: translateY(-4px);
}
.video-cover {
  position: relative;
  background: #f5f7fa;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.video-cover-placeholder {
  color: #c0c4cc;
}
.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.video-draft-tag {
  position: absolute;
  top: 8px;
  left: 8px;
}
.video-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.video-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
