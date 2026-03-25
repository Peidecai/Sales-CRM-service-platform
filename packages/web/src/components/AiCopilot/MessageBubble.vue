<template>
  <div class="message-bubble" :class="[props.role]">
    <div class="bubble-content">
      <!-- eslint-disable-next-line vue/no-v-html -- content sanitized via markdown-it with html:false -->
      <div v-if="props.role === 'assistant'" class="markdown-body" v-html="renderedContent" />
      <div v-else class="plain-text">{{ props.content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const renderedContent = computed(() => md.render(props.content))
</script>

<style scoped>
.message-bubble {
  display: flex;
  margin-bottom: 12px;
}

.message-bubble.user {
  justify-content: flex-end;
}

.message-bubble.assistant {
  justify-content: flex-start;
}

.bubble-content {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.user .bubble-content {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.assistant .bubble-content {
  background: #f5f7fa;
  color: #333;
  border-bottom-left-radius: 4px;
}

.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(code) {
  background: #e8eaed;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.markdown-body :deep(pre) {
  background: #282c34;
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 6px 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  color: #abb2bf;
}
</style>
