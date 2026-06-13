<template>
  <div class="chat-panel">
    <div class="chat-header">
      <span class="chat-title">AI 助手</span>
      <el-button text size="small" @click="emit('close')">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
    <el-scrollbar ref="scrollRef" class="chat-messages">
      <div v-if="messages.length === 0" class="chat-empty">
        <el-icon :size="32" color="#c0c4cc"><ChatDotRound /></el-icon>
        <p>有什么可以帮助你的？</p>
      </div>
      <MessageBubble
        v-for="(msg, idx) in messages"
        :key="idx"
        :role="msg.role"
        :content="msg.content"
      />
      <div v-if="loading" class="typing-indicator"><span /><span /><span /></div>
    </el-scrollbar>
    <div class="chat-input">
      <el-input
        v-model="inputText"
        placeholder="输入你的问题..."
        :disabled="loading"
        @keydown.enter.prevent="handleSend"
      />
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!inputText.trim()"
        @click="handleSend"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Close, ChatDotRound } from '@element-plus/icons-vue'
import { ElScrollbar } from 'element-plus'
import { copilotChat } from '@/api/ai'
import MessageBubble from './MessageBubble.vue'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const emit = defineEmits<{
  close: []
}>()

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const loading = ref(false)
const scrollRef = ref<InstanceType<typeof ElScrollbar>>()

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  loading.value = true

  await nextTick()
  scrollToBottom()

  try {
    const res = await copilotChat({ message: text })
    const reply = res.data?.reply ?? '抱歉，无法获取回复'
    messages.value.push({ role: 'assistant', content: reply })
  } catch {
    messages.value.push({ role: 'assistant', content: '请求失败，请稍后重试' })
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  scrollRef.value?.setScrollTop(99999)
}
</script>

<style scoped>
.chat-panel {
  width: 380px;
  height: 500px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
}

.chat-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.chat-header :deep(.el-button) {
  color: #fff;
}

.chat-messages {
  flex: 1;
  padding: 16px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
  gap: 8px;
}

.chat-empty p {
  font-size: 13px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 14px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #c0c4cc;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}
</style>
