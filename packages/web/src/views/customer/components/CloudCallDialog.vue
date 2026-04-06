<template>
  <el-dialog
    :model-value="visible"
    title="云呼拨号"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="!isCallActive"
    :before-close="handleBeforeClose"
    @closed="handleClosed"
  >
    <!-- Confirming phase -->
    <div v-if="callPhase === 'confirming'" class="cloud-call-content">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="客户">{{ customerName }}</el-descriptions-item>
        <el-descriptions-item label="客户电话">{{ customerPhone }}</el-descriptions-item>
      </el-descriptions>

      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
        style="margin-top: 16px"
      >
        <el-form-item label="您的手机" prop="callerPhone">
          <el-input v-model="form.callerPhone" placeholder="请输入您的手机号" maxlength="11">
            <template v-if="profileLoading" #suffix>
              <el-icon class="is-loading"><Loading /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <el-alert type="info" :closable="false" show-icon style="margin-top: 12px">
        <template #title> 系统将先拨打您的手机，接通后自动拨打客户电话，全程录音 </template>
      </el-alert>
    </div>

    <!-- Active call phase -->
    <div v-else-if="isCallActive" class="cloud-call-content">
      <el-steps :active="activeStep" align-center style="margin-bottom: 24px">
        <el-step title="发起中" />
        <el-step title="振铃中" />
        <el-step title="通话中" />
        <el-step title="已结束" />
      </el-steps>

      <div class="call-status-display">
        <el-icon class="call-icon spinning" :size="48" color="var(--el-color-primary)">
          <Phone />
        </el-icon>
        <p class="call-status-text">{{ statusText }}</p>
        <p v-if="callPhase === 'connected'" class="call-timer">
          {{ formatDuration(elapsedSeconds) }}
        </p>
      </div>
    </div>

    <!-- Completed phase -->
    <div v-else-if="callPhase === 'completed'" class="cloud-call-content">
      <el-result icon="success" title="通话完成">
        <template #sub-title>
          <span v-if="callDuration !== null">通话时长：{{ formatDuration(callDuration) }}</span>
        </template>
      </el-result>

      <div v-if="recordingUrl" class="recording-section">
        <p class="recording-label">通话录音：</p>
        <audio controls :src="recordingUrl" style="width: 100%" />
      </div>
      <div v-else-if="recordingLoading" class="recording-section">
        <el-skeleton :rows="1" animated />
      </div>
    </div>

    <!-- Failed phase -->
    <div v-else-if="callPhase === 'failed'" class="cloud-call-content">
      <el-result icon="error" title="呼叫失败">
        <template #sub-title>{{ errorMessage || '云呼服务异常，请稍后重试' }}</template>
      </el-result>
    </div>

    <template #footer>
      <template v-if="callPhase === 'confirming'">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="initiating" @click="handleInitiate">
          <el-icon><Phone /></el-icon>
          发起呼叫
        </el-button>
      </template>

      <template v-else-if="isCallActive">
        <el-button disabled>通话进行中...</el-button>
      </template>

      <template v-else-if="callPhase === 'completed'">
        <el-button type="primary" @click="handleClose">关闭</el-button>
      </template>

      <template v-else-if="callPhase === 'failed'">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleRetry">重试</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Phone, Loading } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import {
  initiateCloudCall,
  getCloudCallRecording,
  pollCloudCallStatus,
  type CloudCallRecord,
  type CloudCallStatusResponse,
} from '@/api/cloud-call'

type CallPhase = 'confirming' | 'initiating' | 'ringing' | 'connected' | 'completed' | 'failed'

const CHINA_MOBILE_RE = /^1[3-9]\d{9}$/

const props = defineProps({
  visible: { type: Boolean, required: true },
  customerId: { type: Number, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'call-completed': []
}>()

const formRef = ref<FormInstance>()
const form = ref({ callerPhone: '' })
const formRules: FormRules = {
  callerPhone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: CHINA_MOBILE_RE, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
}

const callPhase = ref<CallPhase>('confirming')
const profileLoading = ref(false)
const initiating = ref(false)
const callRecordId = ref<number | null>(null)
const callDuration = ref<number | null>(null)
const recordingUrl = ref<string | null>(null)
const recordingLoading = ref(false)
const errorMessage = ref<string | null>(null)
const elapsedSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null
let pollController: AbortController | null = null

const isCallActive = computed(() =>
  ['initiating', 'ringing', 'connected'].includes(callPhase.value),
)

const activeStep = computed(() => {
  const map: Record<string, number> = {
    initiating: 0,
    ringing: 1,
    connected: 2,
    completed: 3,
  }
  return map[callPhase.value] ?? 0
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    initiating: '正在发起呼叫...',
    ringing: '振铃中，请接听您的手机...',
    connected: '通话中',
  }
  return map[callPhase.value] ?? ''
})

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      resetState()
      await loadCallerPhone()
    }
  },
)

async function loadCallerPhone() {
  profileLoading.value = true
  try {
    const res = await authApi.getProfile()
    const profile = res?.data ?? res
    const phone = (profile as { phone?: string })?.phone
    if (phone && CHINA_MOBILE_RE.test(phone)) {
      form.value.callerPhone = phone
    }
  } catch {
    // Ignore — user can type manually
  } finally {
    profileLoading.value = false
  }
}

function resetState() {
  callPhase.value = 'confirming'
  form.value.callerPhone = ''
  initiating.value = false
  callRecordId.value = null
  callDuration.value = null
  recordingUrl.value = null
  recordingLoading.value = false
  errorMessage.value = null
  elapsedSeconds.value = 0
  abortPolling()
  stopTimer()
}

function abortPolling() {
  pollController?.abort()
  pollController = null
}

async function handleInitiate() {
  if (initiating.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  initiating.value = true
  callPhase.value = 'initiating'

  try {
    const res = await initiateCloudCall({
      customerId: props.customerId,
      callerPhone: form.value.callerPhone,
      calleePhone: props.customerPhone,
    })
    const record = res?.data ?? res
    callRecordId.value = (record as CloudCallRecord).id

    callPhase.value = 'ringing'
    startPolling(callRecordId.value)
  } catch (err: unknown) {
    callPhase.value = 'failed'
    errorMessage.value = err instanceof Error ? err.message : '发起呼叫失败'
  } finally {
    initiating.value = false
  }
}

async function startPolling(id: number) {
  pollController = new AbortController()
  try {
    const finalRes = await pollCloudCallStatus(id, {
      signal: pollController.signal,
      onStatusChange: (res: CloudCallStatusResponse) => {
        if (res.liveStatus === 'ringing') {
          callPhase.value = 'ringing'
        } else if (res.liveStatus === 'connected') {
          callPhase.value = 'connected'
          startTimer()
        }
      },
    })

    if (finalRes.liveStatus === 'completed') {
      callPhase.value = 'completed'
      callDuration.value = finalRes.record.duration
      stopTimer()
      await loadRecording(id)
      emit('call-completed')
    } else {
      callPhase.value = 'failed'
      errorMessage.value = '通话未接通'
      stopTimer()
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    callPhase.value = 'failed'
    errorMessage.value = err instanceof Error ? err.message : '获取通话状态失败'
    stopTimer()
  }
}

async function loadRecording(id: number) {
  recordingLoading.value = true
  try {
    const res = await getCloudCallRecording(id)
    const data = res?.data ?? res
    recordingUrl.value = (data as { url: string }).url || null
  } catch {
    // Recording may not be ready yet
  } finally {
    recordingLoading.value = false
  }
}

function startTimer() {
  stopTimer()
  elapsedSeconds.value = 0
  timerInterval = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function handleBeforeClose(done: () => void) {
  if (isCallActive.value) {
    ElMessage.warning('通话进行中，无法关闭')
    return
  }
  done()
}

function handleCancel() {
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}

function handleRetry() {
  callPhase.value = 'confirming'
  callRecordId.value = null
  callDuration.value = null
  recordingUrl.value = null
  errorMessage.value = null
  elapsedSeconds.value = 0
  // Keep callerPhone so user doesn't need to re-enter
}

function handleClosed() {
  abortPolling()
  stopTimer()
}

onBeforeUnmount(() => {
  abortPolling()
  stopTimer()
})
</script>

<style scoped>
.cloud-call-content {
  min-height: 120px;
}

.call-status-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.call-icon.spinning {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.call-status-text {
  margin-top: 12px;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.call-timer {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--el-color-primary);
}

.recording-section {
  margin-top: 16px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.recording-label {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>
