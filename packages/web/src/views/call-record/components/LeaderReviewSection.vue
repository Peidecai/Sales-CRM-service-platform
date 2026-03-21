<template>
  <div class="leader-review-section">
    <div class="section-header">
      <span class="section-title">领导点评</span>
      <el-button v-if="isAdminOrManager" type="primary" size="small" @click="showAddDialog = true">
        添加点评
      </el-button>
    </div>

    <div v-if="reviews.length > 0" class="review-list">
      <div v-for="review in reviews" :key="review.id" class="review-item">
        <div class="review-header">
          <el-avatar :size="28" class="review-avatar">
            {{ review.reviewerId }}
          </el-avatar>
          <span class="review-time">{{ formatDate(review.createdAt) }}</span>
        </div>
        <div class="review-content">{{ review.content }}</div>
      </div>
    </div>
    <el-empty v-else description="暂无领导点评" :image-size="40" />

    <!-- Add Review Dialog -->
    <el-dialog
      v-model="showAddDialog"
      title="添加领导点评"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="newContent"
        type="textarea"
        :rows="4"
        placeholder="请输入点评内容"
        maxlength="2000"
        show-word-limit
      />
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { leaderReviewApi, type LeaderReviewVO } from '@/api/leader-review'
import { formatDate } from '@/utils/format'
import { usePermission } from '@/composables/usePermission'

const props = defineProps<{
  callRecordId: number
  customerId?: number
}>()

const { isAdminOrManager } = usePermission()
const reviews = ref<LeaderReviewVO[]>([])
const showAddDialog = ref(false)
const newContent = ref('')
const submitting = ref(false)

async function loadReviews() {
  try {
    const res = await leaderReviewApi.getByCallRecord(props.callRecordId)
    if (res?.data) {
      reviews.value = Array.isArray(res.data) ? res.data : []
    }
  } catch {
    // handled
  }
}

async function handleSubmit() {
  if (!newContent.value.trim()) {
    ElMessage.warning('请输入点评内容')
    return
  }
  submitting.value = true
  try {
    await leaderReviewApi.create(props.callRecordId, {
      content: newContent.value,
      customerId: props.customerId,
    })
    ElMessage.success('点评已添加')
    showAddDialog.value = false
    newContent.value = ''
    loadReviews()
  } catch {
    // handled
  } finally {
    submitting.value = false
  }
}

onMounted(loadReviews)
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-item {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.review-avatar {
  background: #409eff;
  color: #fff;
  font-size: 12px;
}

.review-time {
  font-size: 12px;
  color: #909399;
}

.review-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
