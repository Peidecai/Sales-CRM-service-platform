<template>
  <div class="notification-settings-page" style="padding: 20px">
    <el-card>
      <template #header>
        <span>通知偏好设置</span>
      </template>

      <el-form v-loading="loading" :model="settings" label-width="120px" style="max-width: 600px">
        <el-form-item label="邮件通知">
          <el-switch v-model="settings.emailEnabled" />
        </el-form-item>
        <el-form-item label="WebSocket通知">
          <el-switch v-model="settings.wsEnabled" />
        </el-form-item>
        <el-form-item label="短信通知">
          <el-switch v-model="settings.smsEnabled" />
        </el-form-item>
        <el-form-item label="免打扰开始">
          <el-time-picker v-model="quietStart" format="HH:mm" placeholder="开始时间" />
        </el-form-item>
        <el-form-item label="免打扰结束">
          <el-time-picker v-model="quietEnd" format="HH:mm" placeholder="结束时间" />
        </el-form-item>
        <el-form-item label="屏蔽通知类型">
          <el-select v-model="settings.mutedTypes" multiple placeholder="选择要屏蔽的通知类型">
            <el-option label="客户创建" value="customer:created" />
            <el-option label="客户更新" value="customer:updated" />
            <el-option label="客户删除" value="customer:deleted" />
            <el-option label="商机创建" value="opportunity:created" />
            <el-option label="商机阶段变更" value="opportunity:stage_changed" />
            <el-option label="通话记录" value="call_record:created" />
            <el-option label="文章发布" value="article:created" />
            <el-option label="公告" value="announcement:published" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getNotificationSettings, updateNotificationSettings } from '@/api/notification'

const loading = ref(false)
const saving = ref(false)
const quietStart = ref<Date | null>(null)
const quietEnd = ref<Date | null>(null)

const settings = ref({
  emailEnabled: true,
  wsEnabled: true,
  smsEnabled: false,
  mutedTypes: [] as string[],
  quietHoursStart: null as string | null,
  quietHoursEnd: null as string | null,
})

function formatTime(date: Date | null): string | null {
  if (!date) return null
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function parseTime(timeStr: string | null): Date | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':')
  const d = new Date()
  d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0)
  return d
}

async function loadSettings() {
  loading.value = true
  try {
    const res = await getNotificationSettings()
    const data = res as unknown as Record<string, unknown>
    settings.value.emailEnabled = (data.emailEnabled as boolean) ?? true
    settings.value.wsEnabled = (data.wsEnabled as boolean) ?? true
    settings.value.smsEnabled = (data.smsEnabled as boolean) ?? false
    settings.value.mutedTypes = (data.mutedTypes as string[]) ?? []
    settings.value.quietHoursStart = (data.quietHoursStart as string) ?? null
    settings.value.quietHoursEnd = (data.quietHoursEnd as string) ?? null
    quietStart.value = parseTime(settings.value.quietHoursStart)
    quietEnd.value = parseTime(settings.value.quietHoursEnd)
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await updateNotificationSettings({
      emailEnabled: settings.value.emailEnabled,
      wsEnabled: settings.value.wsEnabled,
      smsEnabled: settings.value.smsEnabled,
      mutedTypes: settings.value.mutedTypes,
      quietHoursStart: formatTime(quietStart.value),
      quietHoursEnd: formatTime(quietEnd.value),
    })
    ElMessage.success('保存成功')
  } catch {
    // handled by interceptor
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>
