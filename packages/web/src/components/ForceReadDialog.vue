<template>
  <el-dialog
    v-model="visible"
    title="重要公告"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="600px"
  >
    <div v-if="announcement">
      <h3>{{ announcement.title }}</h3>
      <!-- eslint-disable-next-line vue/no-v-html -- trusted admin-authored announcement content -->
      <div style="margin: 16px 0; line-height: 1.8" v-html="announcement.content" />
    </div>
    <template #footer>
      <el-button type="primary" :loading="confirming" @click="handleConfirmRead">
        我已阅读
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { announcementApi, type AnnouncementVO } from '@/api/announcement'

const visible = ref(false)
const confirming = ref(false)
const announcement = ref<AnnouncementVO | null>(null)

async function checkForceRead() {
  try {
    const res = await announcementApi.getForceUnread()
    const list = res as unknown as AnnouncementVO[]
    if (Array.isArray(list) && list.length > 0) {
      announcement.value = list[0]
      visible.value = true
    }
  } catch {
    // silently ignore
  }
}

async function handleConfirmRead() {
  if (!announcement.value) return
  confirming.value = true
  try {
    await announcementApi.markRead(announcement.value.id)
    visible.value = false
    // Check if there are more
    await checkForceRead()
  } finally {
    confirming.value = false
  }
}

onMounted(checkForceRead)
</script>
