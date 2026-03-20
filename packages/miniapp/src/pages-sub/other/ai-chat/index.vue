<template>
  <view class="ai-chat-page">
    <!-- Messages -->
    <scroll-view
      scroll-y
      class="chat-messages"
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <!-- Welcome -->
      <view class="welcome-bubble">
        <text class="welcome-title">AI 销售助理</text>
        <text class="welcome-desc">我可以帮你分析客户、生成跟进建议、查询业绩数据等。试试问我：</text>
        <view class="suggestion-list">
          <view
            v-for="(s, i) in suggestions"
            :key="i"
            class="suggestion-item"
            @click="sendSuggestion(s)"
          >
            <text class="suggestion-text">{{ s }}</text>
          </view>
        </view>
      </view>

      <!-- Chat history -->
      <view
        v-for="(msg, idx) in messages"
        :key="idx"
        class="message-row"
        :class="msg.role === 'user' ? 'user-row' : 'assistant-row'"
      >
        <view class="message-bubble" :class="msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'">
          <text class="message-text">{{ msg.content }}</text>
        </view>
      </view>

      <!-- Typing indicator -->
      <view v-if="sending" class="message-row assistant-row">
        <view class="message-bubble assistant-bubble typing">
          <text class="typing-dot">.</text>
          <text class="typing-dot">.</text>
          <text class="typing-dot">.</text>
        </view>
      </view>

      <view style="height: 20rpx" />
    </scroll-view>

    <!-- Input bar -->
    <view class="input-bar">
      <input
        v-model="inputText"
        class="chat-input"
        placeholder="输入你的问题..."
        confirm-type="send"
        :disabled="sending"
        @confirm="sendMessage"
      />
      <view
        class="send-btn"
        :class="{ disabled: !inputText.trim() || sending }"
        @click="sendMessage"
      >
        <text class="send-icon">&#x27A4;</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { aiApi, type AiChatMessage } from '@/api/ai'

const messages = ref<AiChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const scrollTop = ref(0)

const suggestions = [
  '今天有哪些客户需要跟进？',
  '帮我分析本月业绩完成情况',
  '张总上次沟通的要点是什么？',
]

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = scrollTop.value + 1
    nextTick(() => {
      scrollTop.value = 99999
    })
  })
}

function sendSuggestion(text: string) {
  inputText.value = text
  sendMessage()
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || sending.value) return

  const userMsg: AiChatMessage = { role: 'user', content: text }
  messages.value.push(userMsg)
  inputText.value = ''
  sending.value = true
  scrollToBottom()

  try {
    const res = await aiApi.chat(text, messages.value.slice(0, -1))
    if (res.code === 0 && res.data) {
      messages.value.push({ role: 'assistant', content: res.data.reply })
    } else {
      messages.value.push({ role: 'assistant', content: res.message || '抱歉，请稍后再试。' })
    }
  } catch {
    messages.value.push({ role: 'assistant', content: '网络异常，请检查网络后重试。' })
  }

  sending.value = false
  scrollToBottom()
}
</script>

<style scoped>
.ai-chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.chat-messages {
  flex: 1;
  padding: 24rpx;
}

/* Welcome */
.welcome-bubble {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.welcome-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 12rpx;
}

.welcome-desc {
  font-size: 26rpx;
  color: #666666;
  display: block;
  margin-bottom: 20rpx;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.suggestion-item {
  background: #f0f7ff;
  border: 1rpx solid #d4e8ff;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.suggestion-text {
  font-size: 26rpx;
  color: #409eff;
}

/* Messages */
.message-row {
  display: flex;
  margin-bottom: 20rpx;
}

.user-row {
  justify-content: flex-end;
}

.assistant-row {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 75%;
  padding: 20rpx 28rpx;
  border-radius: 16rpx;
  word-break: break-all;
}

.user-bubble {
  background: #409eff;
  border-bottom-right-radius: 4rpx;
}

.user-bubble .message-text {
  color: #ffffff;
}

.assistant-bubble {
  background: #ffffff;
  border-bottom-left-radius: 4rpx;
}

.assistant-bubble .message-text {
  color: #333333;
}

.message-text {
  font-size: 28rpx;
  line-height: 1.6;
}

/* Typing */
.typing {
  display: flex;
  gap: 8rpx;
  padding: 20rpx 32rpx;
}

.typing-dot {
  font-size: 36rpx;
  color: #999999;
  animation: blink 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0.2; }
  30% { opacity: 1; }
}

/* Input bar */
.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #e8e8e8;
  gap: 16rpx;
}

.chat-input {
  flex: 1;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
}

.send-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-btn.disabled {
  background: #c0c4cc;
}

.send-icon {
  font-size: 32rpx;
  color: #ffffff;
}
</style>
