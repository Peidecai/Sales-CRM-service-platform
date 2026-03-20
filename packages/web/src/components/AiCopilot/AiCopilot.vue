<template>
  <div class="ai-copilot">
    <Transition name="copilot-panel">
      <ChatPanel v-if="isOpen" @close="isOpen = false" />
    </Transition>
    <div class="copilot-fab" @click="isOpen = !isOpen">
      <el-icon :size="24" color="#fff">
        <ChatDotRound v-if="!isOpen" />
        <Close v-else />
      </el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChatDotRound, Close } from '@element-plus/icons-vue'
import ChatPanel from './ChatPanel.vue'

const isOpen = ref(false)
</script>

<style scoped>
.ai-copilot {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.copilot-fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.copilot-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.5);
}

.copilot-panel-enter-active,
.copilot-panel-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.copilot-panel-enter-from,
.copilot-panel-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
}
</style>
