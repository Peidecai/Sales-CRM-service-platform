<template>
  <view class="customer-form-page">
    <!-- Loading for edit mode -->
    <view v-if="loadingDetail" class="loading-state">
      <text>加载中...</text>
    </view>

    <template v-else>
      <!-- Form -->
      <view class="form-card">
        <view class="form-section-title">
          <text>基本信息</text>
        </view>

        <!-- 客户名称 -->
        <view class="form-item" :class="{ 'has-error': errors.name }">
          <view class="form-label">
            <text class="required">*</text>
            <text>客户名称</text>
          </view>
          <input
            v-model="form.name"
            class="form-input"
            placeholder="请输入客户名称"
            maxlength="100"
          />
          <text v-if="errors.name" class="error-text">{{ errors.name }}</text>
        </view>

        <!-- 联系人姓名 -->
        <view class="form-item" :class="{ 'has-error': errors.contactName }">
          <view class="form-label">
            <text class="required">*</text>
            <text>联系人姓名</text>
          </view>
          <input
            v-model="form.contactName"
            class="form-input"
            placeholder="请输入联系人姓名"
            maxlength="50"
          />
          <text v-if="errors.contactName" class="error-text">{{ errors.contactName }}</text>
        </view>

        <!-- 手机号 -->
        <view class="form-item" :class="{ 'has-error': errors.phone }">
          <view class="form-label">
            <text class="required">*</text>
            <text>手机号</text>
          </view>
          <input
            v-model="form.phone"
            class="form-input"
            type="number"
            placeholder="请输入11位手机号"
            maxlength="11"
          />
          <text v-if="errors.phone" class="error-text">{{ errors.phone }}</text>
        </view>

        <!-- 邮箱 -->
        <view class="form-item" :class="{ 'has-error': errors.email }">
          <view class="form-label">
            <text>邮箱</text>
          </view>
          <input
            v-model="form.email"
            class="form-input"
            placeholder="请输入邮箱地址"
            maxlength="100"
          />
          <text v-if="errors.email" class="error-text">{{ errors.email }}</text>
        </view>
      </view>

      <view class="form-card">
        <view class="form-section-title">
          <text>其他信息</text>
        </view>

        <!-- 客户来源 -->
        <view class="form-item">
          <view class="form-label">
            <text>客户来源</text>
          </view>
          <picker :range="sourceOptions" :value="sourceIndex" @change="onSourceChange">
            <view class="form-picker">
              <text :class="{ placeholder: !form.source }">
                {{ form.source || '请选择客户来源' }}
              </text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>

        <!-- 客户等级 -->
        <view class="form-item">
          <view class="form-label">
            <text>客户等级</text>
          </view>
          <picker :range="levelOptions" :value="levelIndex" @change="onLevelChange">
            <view class="form-picker">
              <text :class="{ placeholder: !form.level }">
                {{ form.level || '请选择客户等级' }}
              </text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>

        <!-- 行业 -->
        <view class="form-item">
          <view class="form-label">
            <text>行业</text>
          </view>
          <input
            v-model="form.industry"
            class="form-input"
            placeholder="请输入行业"
            maxlength="50"
          />
        </view>

        <!-- 地址 -->
        <view class="form-item">
          <view class="form-label">
            <text>地址</text>
          </view>
          <input
            v-model="form.address"
            class="form-input"
            placeholder="请输入地址"
            maxlength="200"
          />
        </view>

        <!-- 备注 -->
        <view class="form-item">
          <view class="form-label">
            <text>备注</text>
          </view>
          <textarea
            v-model="form.notes"
            class="form-textarea"
            placeholder="请输入备注信息"
            maxlength="500"
            :auto-height="true"
          />
        </view>
      </view>

      <!-- Submit Button -->
      <view class="submit-bar">
        <button
          class="btn-submit"
          :loading="submitting"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ isEdit ? '保存修改' : '创建客户' }}
        </button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { customerApi, type CreateCustomerParams, type UpdateCustomerParams } from '@/api/customer'

interface FormData {
  name: string
  contactName: string
  phone: string
  email: string
  source: string
  level: string
  industry: string
  address: string
  notes: string
}

interface FormErrors {
  name: string
  contactName: string
  phone: string
  email: string
}

const sourceOptions = ['官网', '电话', '转介绍', '地推', '其他']
const levelOptions = ['A', 'B', 'C', 'D']

const editId = ref(0)
const isEdit = computed(() => editId.value > 0)
const loadingDetail = ref(false)
const submitting = ref(false)

const form = reactive<FormData>({
  name: '',
  contactName: '',
  phone: '',
  email: '',
  source: '',
  level: '',
  industry: '',
  address: '',
  notes: '',
})

const errors = reactive<FormErrors>({
  name: '',
  contactName: '',
  phone: '',
  email: '',
})

const sourceIndex = computed(() => {
  const idx = sourceOptions.indexOf(form.source)
  return idx >= 0 ? idx : 0
})

const levelIndex = computed(() => {
  const idx = levelOptions.indexOf(form.level)
  return idx >= 0 ? idx : 0
})

function onSourceChange(e: { detail: { value: number } }) {
  form.source = sourceOptions[e.detail.value] ?? ''
}

function onLevelChange(e: { detail: { value: number } }) {
  form.level = levelOptions[e.detail.value] ?? ''
}

function validate(): boolean {
  let valid = true
  errors.name = ''
  errors.contactName = ''
  errors.phone = ''
  errors.email = ''

  if (!form.name.trim()) {
    errors.name = '请输入客户名称'
    valid = false
  }

  if (!form.contactName.trim()) {
    errors.contactName = '请输入联系人姓名'
    valid = false
  }

  if (!form.phone.trim()) {
    errors.phone = '请输入手机号'
    valid = false
  } else if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) {
    errors.phone = '请输入正确的11位手机号'
    valid = false
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = '请输入正确的邮箱地址'
    valid = false
  }

  if (!valid) {
    // Show first error
    const firstError = errors.name || errors.contactName || errors.phone || errors.email
    uni.showToast({ title: firstError, icon: 'none' })
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return
  if (submitting.value) return

  submitting.value = true
  try {
    if (isEdit.value) {
      const updateData: UpdateCustomerParams = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        source: form.source || undefined,
        industry: form.industry.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      const res = await customerApi.update(editId.value, updateData)
      if (res.code === 0) {
        uni.showToast({ title: '修改成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
      } else {
        uni.showToast({ title: res.message || '修改失败', icon: 'none' })
      }
    } else {
      const createData: CreateCustomerParams = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        source: form.source || undefined,
        industry: form.industry.trim() || undefined,
        notes: form.notes.trim() || undefined,
        assignedUserId: 0, // Backend will assign current user
      }
      const res = await customerApi.create(createData)
      if (res.code === 0 && res.data) {
        uni.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: `/pages-sub/customer/detail?id=${res.data.id}` })
        }, 1000)
      } else {
        uni.showToast({ title: res.message || '创建失败', icon: 'none' })
      }
    }
  } catch {
    uni.showToast({ title: isEdit.value ? '修改失败' : '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function loadCustomerDetail(id: number) {
  loadingDetail.value = true
  try {
    const res = await customerApi.getDetail(id)
    if (res.code === 0 && res.data) {
      const c = res.data
      form.name = c.name || ''
      form.contactName = '' // Contact name not on CustomerVO, user fills manually
      form.phone = c.phone || ''
      form.email = c.email || ''
      form.source = c.source || ''
      form.industry = c.industry || ''
      form.address = c.address || ''
      form.notes = c.notes || ''
    } else {
      uni.showToast({ title: '加载客户信息失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '加载客户信息失败', icon: 'none' })
  } finally {
    loadingDetail.value = false
  }
}

onLoad((options) => {
  const id = Number(options?.id) || 0
  if (id > 0) {
    editId.value = id
    uni.setNavigationBarTitle({ title: '编辑客户' })
    loadCustomerDetail(id)
  }
})
</script>

<style scoped>
.customer-form-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 160rpx;
}

.loading-state {
  padding: 120rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}

.form-card {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 0 28rpx;
}

.form-section-title {
  padding: 28rpx 0 16rpx;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.required {
  color: #f56c6c;
  font-size: 28rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  font-size: 28rpx;
  color: #333;
  background: #f9f9f9;
  border-radius: 8rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
  color: #333;
  background: #f9f9f9;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  font-size: 28rpx;
  color: #333;
  background: #f9f9f9;
  border-radius: 8rpx;
  padding: 0 20rpx;
}

.form-picker .placeholder {
  color: #c0c4cc;
}

.picker-arrow {
  color: #c0c4cc;
  font-size: 28rpx;
}

.has-error .form-input {
  background: #fef0f0;
}

.error-text {
  font-size: 22rpx;
  color: #f56c6c;
  margin-top: 8rpx;
  display: block;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 40rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #eee;
}

.btn-submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  border-radius: 44rpx;
  border: none;
}

.btn-submit::after {
  border: none;
}

.btn-submit[disabled] {
  opacity: 0.6;
}
</style>
