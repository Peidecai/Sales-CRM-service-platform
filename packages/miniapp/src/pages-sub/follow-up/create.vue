<template>
  <view class="follow-up-create-page">
    <!-- Customer Selector -->
    <view class="form-section">
      <view class="form-label">客户 <text class="required">*</text></view>
      <view class="form-picker" @click="showCustomerPicker = true">
        <text :class="{ placeholder: !selectedCustomer }">
          {{ selectedCustomer ? selectedCustomer.name : '选择客户' }}
        </text>
        <text class="picker-arrow">&gt;</text>
      </view>
    </view>

    <!-- Follow-up Type -->
    <view class="form-section">
      <view class="form-label">跟进方式 <text class="required">*</text></view>
      <view class="type-tags">
        <text
          v-for="t in typeOptions"
          :key="t.value"
          class="type-tag"
          :class="{ active: form.type === t.value }"
          @click="form.type = t.value"
        >
          {{ t.label }}
        </text>
      </view>
    </view>

    <!-- Content -->
    <view class="form-section">
      <view class="form-label">跟进内容 <text class="required">*</text></view>
      <textarea
        v-model="form.content"
        class="form-textarea"
        placeholder="请输入跟进内容"
        maxlength="2000"
        :auto-height="true"
      />
      <text class="char-count">{{ form.content.length }}/2000</text>
    </view>

    <!-- Next Follow-up Date -->
    <view class="form-section">
      <view class="form-label">下次跟进日期</view>
      <picker mode="date" :value="form.nextFollowUpDate" @change="onDateChange">
        <view class="form-picker">
          <text :class="{ placeholder: !form.nextFollowUpDate }">
            {{ form.nextFollowUpDate || '选择日期' }}
          </text>
          <text class="picker-arrow">&gt;</text>
        </view>
      </picker>
    </view>

    <!-- Next Follow-up Note -->
    <view class="form-section">
      <view class="form-label">下次跟进备注</view>
      <input
        v-model="form.nextFollowUpNote"
        class="form-input"
        placeholder="请输入备注"
      />
    </view>

    <!-- Submit -->
    <view class="submit-section">
      <button class="btn-submit" :loading="submitting" @click="handleSubmit">
        提交跟进记录
      </button>
    </view>

    <!-- Customer Search Modal -->
    <view v-if="showCustomerPicker" class="modal-mask" @click="showCustomerPicker = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择客户</text>
          <text class="modal-close" @click="showCustomerPicker = false">关闭</text>
        </view>
        <input
          v-model="customerSearch"
          class="modal-search"
          placeholder="搜索客户名称"
          @input="searchCustomers"
        />
        <scroll-view scroll-y class="modal-list">
          <view
            v-for="c in searchResults"
            :key="c.id"
            class="modal-item"
            @click="selectCustomer(c)"
          >
            <text class="modal-item-name">{{ c.name }}</text>
            <text class="modal-item-company">{{ c.company || '' }}</text>
          </view>
          <view v-if="searchResults.length === 0" class="modal-empty">
            <text>暂无匹配客户</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { followUpApi, FollowUpType } from '@/api/follow-up'
import { customerApi, type CustomerVO } from '@/api/customer'
import { offlineQueue } from '@/utils/offline-queue'

interface SelectedCustomer {
  id: number
  name: string
}

const showCustomerPicker = ref(false)
const customerSearch = ref('')
const searchResults = ref<CustomerVO[]>([])
const selectedCustomer = ref<SelectedCustomer | null>(null)
const submitting = ref(false)

const form = reactive({
  type: FollowUpType.CALL as string,
  content: '',
  nextFollowUpDate: '',
  nextFollowUpNote: '',
})

const typeOptions = [
  { value: FollowUpType.CALL, label: '电话' },
  { value: FollowUpType.VISIT, label: '拜访' },
  { value: FollowUpType.WECHAT, label: '微信' },
  { value: FollowUpType.EMAIL, label: '邮件' },
  { value: FollowUpType.OTHER, label: '其他' },
]

function onDateChange(e: { detail: { value: string } }) {
  form.nextFollowUpDate = e.detail.value
}

async function searchCustomers() {
  try {
    const res = await customerApi.getList({
      keyword: customerSearch.value,
      page: 1,
      pageSize: 20,
    })
    if (res.code === 0 && res.data) {
      searchResults.value = res.data.list
    }
  } catch {
    // Silently fail
  }
}

function selectCustomer(customer: CustomerVO) {
  selectedCustomer.value = { id: customer.id, name: customer.name }
  showCustomerPicker.value = false
}

async function handleSubmit() {
  if (!selectedCustomer.value) {
    uni.showToast({ title: '请选择客户', icon: 'none' })
    return
  }
  if (!form.content.trim()) {
    uni.showToast({ title: '请输入跟进内容', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true

  const data = {
    customerId: selectedCustomer.value.id,
    type: form.type,
    content: form.content.trim(),
    nextFollowUpDate: form.nextFollowUpDate || undefined,
    nextFollowUpNote: form.nextFollowUpNote || undefined,
  }

  try {
    const res = await followUpApi.create(data)
    if (res.code === 0) {
      uni.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch {
    // Offline — enqueue for later
    offlineQueue.push('POST', '/follow-ups', data as unknown as Record<string, unknown>)
    uni.showToast({ title: '已加入离线队列，联网后自动提交', icon: 'none', duration: 2500 })
    setTimeout(() => uni.navigateBack(), 2500)
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  if (options?.customerId) {
    selectedCustomer.value = {
      id: Number(options.customerId),
      name: decodeURIComponent(options.customerName || ''),
    }
  }
})

onMounted(() => {
  searchCustomers()
})
</script>

<style scoped>
.follow-up-create-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}

.form-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
}

.required {
  color: #f56c6c;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}

.placeholder {
  color: #c0c4cc;
}

.picker-arrow {
  color: #c0c4cc;
  font-size: 28rpx;
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.type-tag {
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f7fa;
  border-radius: 32rpx;
}

.type-tag.active {
  color: #409eff;
  background: #ecf5ff;
  font-weight: 500;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.char-count {
  text-align: right;
  font-size: 22rpx;
  color: #c0c4cc;
  display: block;
  margin-top: 8rpx;
}

.form-input {
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.submit-section {
  margin-top: 40rpx;
}

.btn-submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 44rpx;
  border: none;
}

.btn-submit::after {
  border: none;
}

/* Customer Search Modal */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-content {
  width: 100%;
  max-height: 70vh;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 28rpx;
  color: #409eff;
}

.modal-search {
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  margin-bottom: 16rpx;
}

.modal-list {
  max-height: 50vh;
}

.modal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-item-name {
  font-size: 28rpx;
  color: #333;
}

.modal-item-company {
  font-size: 24rpx;
  color: #999;
}

.modal-empty {
  padding: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: #ccc;
}
</style>
