<template>
  <div class="announcement-detail-page">
    <el-card v-if="announcement" shadow="never">
      <template #header>
        <div class="header">
          <el-tag v-if="announcement.priority === 'urgent'" type="danger" size="small">紧急</el-tag>
          <el-tag v-else-if="announcement.priority === 'important'" type="warning" size="small"
            >重要</el-tag
          >
          <el-tag v-else type="info" size="small">普通</el-tag>
          <span class="title">{{ announcement.title }}</span>
        </div>
      </template>
      <div class="meta">
        发布时间：{{ formatDate(announcement.publishAt || announcement.createdAt) }}
      </div>
      <div class="content" v-html="announcement.content" />
      <el-button type="primary" @click="$router.push('/announcement')">返回列表</el-button>
    </el-card>
    <el-empty v-else description="公告不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { announcementApi, type AnnouncementVO } from '@/api/announcement'
import { formatDate } from '@/utils/format'

const route = useRoute()
const announcement = ref<AnnouncementVO | null>(null)

async function load() {
  const id = Number(route.params.id)
  if (isNaN(id)) return
  try {
    const res = await announcementApi.get(id)
    if (res?.data) {
      announcement.value = res.data
      await announcementApi.markRead(id)
    }
  } catch {
    announcement.value = null
  }
}

onMounted(() => load())
</script>

<style scoped>
.announcement-detail-page {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.meta {
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
}

.content {
  line-height: 1.8;
  margin-bottom: 20px;
}
</style>
