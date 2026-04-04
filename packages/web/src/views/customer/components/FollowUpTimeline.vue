<script setup lang="ts">
import { ref, onMounted, type Component, markRaw } from 'vue'
import { Phone, LocationFilled, Message, ChatDotRound, MoreFilled } from '@element-plus/icons-vue'
import { followUpApi } from '@/api/follow-up'

const props = defineProps<{ customerId: number }>()
const followUps = ref<Record<string, unknown>[]>([])
const loading = ref(false)

const typeIconMap: Record<string, Component> = {
  call: markRaw(Phone),
  visit: markRaw(LocationFilled),
  email: markRaw(Message),
  wechat: markRaw(ChatDotRound),
  other: markRaw(MoreFilled),
}

const typeColorMap: Record<string, string> = {
  call: '#409EFF',
  visit: '#67C23A',
  email: '#E6A23C',
  wechat: '#67C23A',
  other: '#909399',
}

const typeLabel: Record<string, string> = {
  call: '电话',
  visit: '拜访',
  email: '邮件',
  wechat: '微信',
  other: '其他',
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await followUpApi.getList({ customerId: props.customerId, pageSize: 100 })
    const data = (res as unknown as Record<string, unknown>).data as
      | Record<string, unknown>
      | undefined
    followUps.value = data ? (data.list as Record<string, unknown>[]) : []
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <el-timeline>
      <el-timeline-item
        v-for="item in followUps"
        :key="item.id as number"
        :timestamp="String(item.createdAt)"
        :icon="typeIconMap[item.type as string]"
        :color="typeColorMap[item.type as string]"
        placement="top"
      >
        <el-card shadow="hover">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>
                <el-tag size="small" :type="item.type === 'call' ? 'primary' : 'success'">
                  {{ typeLabel[item.type as string] }}
                </el-tag>
              </span>
              <span v-if="item.intentionLevel" style="color: #e6a23c">
                意向: {{ '★'.repeat(item.intentionLevel as number)
                }}{{ '☆'.repeat(5 - (item.intentionLevel as number)) }}
              </span>
            </div>
          </template>

          <p>{{ item.content }}</p>
          <p v-if="item.result" style="color: #67c23a">结果: {{ item.result }}</p>
          <p v-if="item.nextPlan" style="color: #409eff">下步计划: {{ item.nextPlan }}</p>
          <p v-if="item.location">
            <el-icon><LocationFilled /></el-icon> {{ item.location }}
          </p>
          <p v-if="item.duration">时长: {{ item.duration }} 分钟</p>

          <div v-if="item.callRecordingUrl" style="margin-top: 8px">
            <audio
              controls
              :src="item.callRecordingUrl as string"
              style="width: 100%; height: 32px"
            />
          </div>

          <div v-if="(item.attachments as unknown[])?.length" style="margin-top: 8px">
            <el-tag
              v-for="att in item.attachments as Array<{ name: string; url: string }>"
              :key="att.url"
              size="small"
              style="margin-right: 4px; cursor: pointer"
            >
              {{ att.name }}
            </el-tag>
          </div>
        </el-card>
      </el-timeline-item>
    </el-timeline>

    <el-empty v-if="!loading && followUps.length === 0" description="暂无跟进记录" />
  </div>
</template>
