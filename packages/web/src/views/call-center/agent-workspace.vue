<template>
  <div class="agent-workspace">
    <el-page-header title="坐席工作台" @back="$router.push('/')" />
    <el-container class="workspace-layout">
      <el-aside width="280px" class="soft-phone-panel">
        <el-card header="软电话" shadow="never">
          <el-input v-model="dialNumber" placeholder="输入号码" clearable class="mb-2" />
          <el-button type="primary" block @click="handleDial">拨出</el-button>
          <el-button block @click="handleAnswer">接听</el-button>
          <el-button block @click="handleHangup">挂断</el-button>
          <el-divider />
          <div class="call-status">当前状态: {{ callStatus }}</div>
        </el-card>
      </el-aside>
      <el-main class="customer-panel">
        <el-card header="客户信息" shadow="never">
          <template v-if="incomingCallPopup">
            <p><strong>来电:</strong> {{ incomingCallPopup.phone }}</p>
            <p v-if="incomingCallPopup.customerId">客户ID: {{ incomingCallPopup.customerId }}</p>
            <pre class="popup-data">{{ JSON.stringify(incomingCallPopup.popupData, null, 2) }}</pre>
          </template>
          <el-empty v-else description="来电时将在此展示弹屏数据" />
        </el-card>
      </el-main>
      <el-aside width="280px" class="ai-panel">
        <el-card header="AI 建议" shadow="never">
          <el-empty description="根据当前客户展示话术与意向预测" />
        </el-card>
      </el-aside>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useNotification } from '@/composables/useNotification'

const { incomingCallPopup } = useNotification()
const dialNumber = ref('')
const callStatus = ref('空闲')

function handleDial() {
  callStatus.value = '拨号中'
}
function handleAnswer() {
  callStatus.value = '通话中'
}
function handleHangup() {
  callStatus.value = '空闲'
}
</script>

<style scoped>
.agent-workspace {
  padding: 16px;
}
.workspace-layout {
  margin-top: 16px;
  gap: 16px;
}
.soft-phone-panel .el-button {
  margin-bottom: 8px;
}
.call-status {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}
.customer-panel {
  min-height: 400px;
}
.popup-data {
  font-size: 12px;
  max-height: 300px;
  overflow: auto;
}
.mb-2 {
  margin-bottom: 8px;
}
</style>
