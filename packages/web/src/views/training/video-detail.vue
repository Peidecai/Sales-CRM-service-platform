<template>
  <div class="video-detail-page" style="padding: 20px">
    <el-page-header style="margin-bottom: 20px" @back="router.back()">
      <template #content>{{ video?.title || '视频详情' }}</template>
    </el-page-header>

    <el-row v-if="video" :gutter="20">
      <!-- Video Player -->
      <el-col :span="17">
        <el-card shadow="never">
          <video
            ref="playerRef"
            :src="video.fileUrl"
            controls
            style="width: 100%; max-height: 500px; background: #000"
            @timeupdate="onTimeUpdate"
          />
          <div style="margin-top: 12px">
            <h3>{{ video.title }}</h3>
            <div style="color: #909399; font-size: 13px; margin-bottom: 8px">
              {{ video.category?.name || '未分类' }} | {{ video.format.toUpperCase() }} |
              {{ formatDuration(video.duration) }}
            </div>
            <p v-if="video.description" style="color: #606266; line-height: 1.6">
              {{ video.description }}
            </p>
          </div>

          <!-- Progress bar -->
          <div v-if="progress" style="margin-top: 16px">
            <div
              style="
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                color: #909399;
                margin-bottom: 4px;
              "
            >
              <span>学习进度</span>
              <span>{{ progress.completionRate }}%</span>
            </div>
            <el-progress :percentage="Number(progress.completionRate)" :show-text="false" />
          </div>
        </el-card>

        <!-- Bookmarks -->
        <el-card shadow="never" style="margin-top: 16px">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>书签</span>
              <el-button type="primary" size="small" @click="addBookmark"
                >添加当前位置书签</el-button
              >
            </div>
          </template>
          <div
            v-if="bookmarks.length === 0"
            style="text-align: center; padding: 20px; color: #909399"
          >
            暂无书签
          </div>
          <div
            v-for="bm in bookmarks"
            :key="bm.id"
            class="bookmark-item"
            @click="seekTo(bm.timestamp)"
          >
            <div>
              <el-tag size="small">{{ formatDuration(bm.timestamp) }}</el-tag>
              <span style="margin-left: 8px">{{ bm.note || '(无备注)' }}</span>
            </div>
            <el-button text type="danger" size="small" @click.stop="removeBookmark(bm.id)"
              >删除</el-button
            >
          </div>
        </el-card>
      </el-col>

      <!-- Sidebar: Chapters -->
      <el-col :span="7">
        <el-card shadow="never">
          <template #header><span>章节目录</span></template>
          <div
            v-if="!video.chapters || video.chapters.length === 0"
            style="text-align: center; padding: 20px; color: #909399"
          >
            暂无章节
          </div>
          <div
            v-for="ch in (video.chapters || []).slice().sort((a, b) => a.sortOrder - b.sortOrder)"
            :key="ch.id"
            class="chapter-item"
            @click="seekTo(ch.startTime)"
          >
            <span>{{ ch.title }}</span>
            <span style="color: #909399; font-size: 12px">{{ formatDuration(ch.startTime) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div v-if="!video && !loading" style="text-align: center; padding: 60px">
      <el-empty description="视频不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  trainingApi,
  type TrainingVideoVO,
  type VideoProgressVO,
  type VideoBookmarkVO,
} from '@/api/training'

const route = useRoute()
const router = useRouter()
const videoId = Number(route.params.id)

const video = ref<TrainingVideoVO | null>(null)
const progress = ref<VideoProgressVO | null>(null)
const bookmarks = ref<VideoBookmarkVO[]>([])
const playerRef = ref<HTMLVideoElement | null>(null)
const loading = ref(true)
let progressTimer: ReturnType<typeof setInterval> | null = null

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function onTimeUpdate() {
  // Progress is saved periodically, not on every frame
}

async function saveProgress() {
  if (!playerRef.value || !video.value) return
  const currentTime = Math.floor(playerRef.value.currentTime)
  try {
    const res = (await trainingApi.updateProgress(videoId, {
      watchedSeconds: currentTime,
      lastPosition: currentTime,
    })) as unknown as VideoProgressVO
    progress.value = res
  } catch {
    // silent
  }
}

function seekTo(seconds: number) {
  if (playerRef.value) {
    playerRef.value.currentTime = seconds
    playerRef.value.play()
  }
}

async function addBookmark() {
  if (!playerRef.value) return
  const ts = Math.floor(playerRef.value.currentTime)
  try {
    const note = await ElMessageBox.prompt('输入书签备注（可选）', '添加书签', {
      confirmButtonText: '添加',
      cancelButtonText: '取消',
      inputPlaceholder: '备注',
    })
      .then((r) => r.value)
      .catch(() => null)
    if (note === null) return
    await trainingApi.createBookmark(videoId, { timestamp: ts, note: note || undefined })
    ElMessage.success('书签已添加')
    await loadBookmarks()
  } catch {
    // cancelled
  }
}

async function removeBookmark(id: number) {
  await trainingApi.deleteBookmark(id)
  ElMessage.success('书签已删除')
  await loadBookmarks()
}

async function loadBookmarks() {
  try {
    bookmarks.value = (await trainingApi.getBookmarks(videoId)) as unknown as VideoBookmarkVO[]
  } catch {
    // handled
  }
}

onMounted(async () => {
  try {
    video.value = (await trainingApi.getVideo(videoId)) as unknown as TrainingVideoVO
    progress.value = (await trainingApi.getProgress(videoId)) as unknown as VideoProgressVO | null
    await loadBookmarks()

    // Resume from last position
    if (progress.value?.lastPosition && playerRef.value) {
      playerRef.value.currentTime = progress.value.lastPosition
    }

    // Save progress every 10 seconds
    progressTimer = setInterval(saveProgress, 10000)
  } catch {
    // handled
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (progressTimer) clearInterval(progressTimer)
  saveProgress() // save on leave
})
</script>

<style scoped>
.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}
.chapter-item:hover {
  background: #f5f7fa;
}
.chapter-item:last-child {
  border-bottom: none;
}
.bookmark-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}
.bookmark-item:hover {
  background: #f5f7fa;
}
.bookmark-item:last-child {
  border-bottom: none;
}
</style>
