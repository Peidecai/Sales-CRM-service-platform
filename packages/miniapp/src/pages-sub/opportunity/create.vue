<template>
  <view class="opportunity-form-page">
    <!-- Loading for edit mode -->
    <view v-if="loadingDetail" class="loading-state">
      <text>加载中...</text>
    </view>

    <template v-else>
      <!-- Basic Info -->
      <view class="form-card">
        <view class="form-section-title">
          <text>基本信息</text>
        </view>

        <!-- 商机名称 -->
        <view class="form-item" :class="{ 'has-error': errors.title }">
          <view class="form-label">
            <text class="required">*</text>
            <text>商机名称</text>
          </view>
          <input
            v-model="form.title"
            class="form-input"
            placeholder="请输入商机名称"
            maxlength="100"
          />
          <text v-if="errors.title" class="error-text">{{ errors.title }}</text>
        </view>

        <!-- 关联客户 -->
        <view class="form-item" :class="{ 'has-error': errors.customerId }">
          <view class="form-label">
            <text class="required">*</text>
            <text>关联客户</text>
          </view>
          <view class="form-picker" @click="showCustomerPicker = true">
            <text :class="{ placeholder: !selectedCustomerName }">
              {{ selectedCustomerName || '请选择关联客户' }}
            </text>
            <text class="picker-arrow">></text>
          </view>
          <text v-if="errors.customerId" class="error-text">{{ errors.customerId }}</text>
        </view>

        <!-- 阶段 -->
        <view class="form-item">
          <view class="form-label">
            <text>阶段</text>
          </view>
          <picker :range="stageLabels" :value="stageIndex" @change="onStageChange">
            <view class="form-picker">
              <text :class="{ placeholder: !form.stage }">
                {{ stageLabelMap[form.stage] || '请选择阶段' }}
              </text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>

        <!-- 金额 -->
        <view class="form-item" :class="{ 'has-error': errors.amount }">
          <view class="form-label">
            <text class="required">*</text>
            <text>金额（元）</text>
          </view>
          <input
            v-model="form.amount"
            class="form-input"
            type="digit"
            placeholder="请输入金额"
          />
          <text v-if="errors.amount" class="error-text">{{ errors.amount }}</text>
        </view>

        <!-- 概率 -->
        <view class="form-item">
          <view class="form-label">
            <text>概率（%）</text>
          </view>
          <input
            v-model="form.probability"
            class="form-input"
            type="number"
            placeholder="0-100"
            maxlength="3"
          />
        </view>

        <!-- 预计成交日期 -->
        <view class="form-item">
          <view class="form-label">
            <text>预计成交日期</text>
          </view>
          <picker mode="date" :value="form.expectedCloseDate" @change="onDateChange">
            <view class="form-picker">
              <text :class="{ placeholder: !form.expectedCloseDate }">
                {{ form.expectedCloseDate || '请选择日期' }}
              </text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>
      </view>

      <!-- Other Info -->
      <view class="form-card">
        <view class="form-section-title">
          <text>其他信息</text>
        </view>

        <!-- 来源 -->
        <view class="form-item">
          <view class="form-label">
            <text>来源</text>
          </view>
          <input
            v-model="form.source"
            class="form-input"
            placeholder="请输入来源"
            maxlength="50"
          />
        </view>

        <!-- 备注 -->
        <view class="form-item">
          <view class="form-label">
            <text>备注</text>
          </view>
          <textarea
            v-model="form.description"
            class="form-textarea"
            placeholder="请输入备注信息"
            maxlength="500"
            :auto-height="true"
          />
        </view>
      </view>

      <!-- Submit -->
      <view class="submit-bar">
        <button
          class="btn-submit"
          :loading="submitting"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ isEdit ? '保存修改' : '创建商机' }}
        </button>
      </view>
    </template>

    <!-- Customer Picker Popup -->
    <view v-if="showCustomerPicker" class="picker-mask" @click="showCustomerPicker = false">
      <view class="picker-popup" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择客户</text>
          <text class="picker-close" @click="showCustomerPicker = false">关闭</text>
        </view>
        <view class="picker-search">
          <input
            v-model="customerKeyword"
            class="picker-search-input"
            placeholder="搜索客户名称"
            confirm-type="search"
            @confirm="searchCustomers"
            @input="onCustomerSearchInput"
          />
        </view>
        <scroll-view class="picker-list" scroll-y>
          <view v-if="customerLoading" class="picker-loading">
            <text>搜索中...</text>
          </view>
          <view v-else-if="customerList.length === 0" class="picker-empty">
            <text>{{ customerKeyword ? '未找到匹配客户' : '请输入关键字搜索' }}</text>
          </view>
          <view
            v-for="item in customerList"
            :key="item.id"
            class="picker-item"
            :class="{ active: form.customerId === item.id }"
            @click="selectCustomer(item)"
          >
            <text class="picker-item-name">{{ item.name }}</text>
            <text v-if="item.company" class="picker-item-sub">{{ item.company }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  opportunityApi,
  OpportunityStage,
  type CreateOpportunityParams,
  type UpdateOpportunityParams,
} from '@/api/opportunity'
import { customerApi, type CustomerVO } from '@/api/customer'

interface FormData {
  title: string
  customerId: number
  stage: OpportunityStage | ''
  amount: string
  probability: string
  expectedCloseDate: string
  source: string
  description: string
}

interface FormErrors {
  title: string
  customerId: string
  amount: string
}

const stageValues: OpportunityStage[] = [
  OpportunityStage.LEAD,
  OpportunityStage.QUALIFIED,
  OpportunityStage.PROPOSAL,
  OpportunityStage.NEGOTIATION,
  OpportunityStage.CLOSED_WON,
  OpportunityStage.CLOSED_LOST,
]

const stageLabelMap: Record<string, string> = {
  [OpportunityStage.LEAD]: '线索',
  [OpportunityStage.QUALIFIED]: '合格',
  [OpportunityStage.PROPOSAL]: '方案',
  [OpportunityStage.NEGOTIATION]: '谈判',
  [OpportunityStage.CLOSED_WON]: '成交',
  [OpportunityStage.CLOSED_LOST]: '失败',
}

const stageLabels = stageValues.map((s) => stageLabelMap[s] ?? s)

const editId = ref(0)
const isEdit = computed(() => editId.value > 0)
const loadingDetail = ref(false)
const submitting = ref(false)

const form = reactive<FormData>({
  title: '',
  customerId: 0,
  stage: '',
  amount: '',
  probability: '',
  expectedCloseDate: '',
  source: '',
  description: '',
})

const errors = reactive<FormErrors>({
  title: '',
  customerId: '',
  amount: '',
})

const selectedCustomerName = ref('')

const stageIndex = computed(() => {
  if (!form.stage) return 0
  const idx = stageValues.indexOf(form.stage as OpportunityStage)
  return idx >= 0 ? idx : 0
})

function onStageChange(e: { detail: { value: number } }) {
  form.stage = stageValues[e.detail.value] ?? ''
}

function onDateChange(e: { detail: { value: string } }) {
  form.expectedCloseDate = e.detail.value
}

// --- Customer Picker ---
const showCustomerPicker = ref(false)
const customerKeyword = ref('')
const customerList = ref<CustomerVO[]>([])
const customerLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onCustomerSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchCustomers()
  }, 400)
}

async function searchCustomers() {
  const kw = customerKeyword.value.trim()
  if (!kw) {
    customerList.value = []
    return
  }
  customerLoading.value = true
  try {
    const res = await customerApi.getList({ keyword: kw, pageSize: 20 })
    if (res.code === 0 && res.data) {
      customerList.value = res.data.list
    }
  } catch {
    // silent
  } finally {
    customerLoading.value = false
  }
}

function selectCustomer(c: CustomerVO) {
  form.customerId = c.id
  selectedCustomerName.value = c.name
  showCustomerPicker.value = false
}

// --- Validation ---
function validate(): boolean {
  let valid = true
  errors.title = ''
  errors.customerId = ''
  errors.amount = ''

  if (!form.title.trim()) {
    errors.title = '请输入商机名称'
    valid = false
  }

  if (!form.customerId) {
    errors.customerId = '请选择关联客户'
    valid = false
  }

  const amountNum = parseFloat(form.amount)
  if (!form.amount.trim() || isNaN(amountNum)) {
    errors.amount = '请输入金额'
    valid = false
  } else if (amountNum < 0) {
    errors.amount = '金额不能为负数'
    valid = false
  }

  if (!valid) {
    const firstError = errors.title || errors.customerId || errors.amount
    uni.showToast({ title: firstError, icon: 'none' })
  }

  return valid
}

// --- Submit ---
async function handleSubmit() {
  if (!validate()) return
  if (submitting.value) return

  submitting.value = true
  try {
    const amountNum = parseFloat(form.amount)
    const probNum = form.probability ? parseInt(form.probability, 10) : undefined
    const clampedProb = probNum !== undefined ? Math.min(100, Math.max(0, probNum)) : undefined

    if (isEdit.value) {
      const updateData: UpdateOpportunityParams = {
        title: form.title.trim(),
        customerId: form.customerId,
        stage: (form.stage as OpportunityStage) || undefined,
        amount: amountNum,
        probability: clampedProb,
        expectedCloseDate: form.expectedCloseDate || undefined,
        source: form.source.trim() || undefined,
        description: form.description.trim() || undefined,
      }
      const res = await opportunityApi.update(editId.value, updateData)
      if (res.code === 0) {
        uni.showToast({ title: '修改成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
      } else {
        uni.showToast({ title: res.message || '修改失败', icon: 'none' })
      }
    } else {
      const createData: CreateOpportunityParams = {
        title: form.title.trim(),
        customerId: form.customerId,
        stage: (form.stage as OpportunityStage) || undefined,
        amount: amountNum,
        probability: clampedProb,
        expectedCloseDate: form.expectedCloseDate || undefined,
        source: form.source.trim() || undefined,
        description: form.description.trim() || undefined,
      }
      const res = await opportunityApi.create(createData)
      if (res.code === 0 && res.data) {
        uni.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: `/pages-sub/opportunity/detail?id=${res.data.id}` })
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

// --- Load for edit ---
async function loadOpportunityDetail(id: number) {
  loadingDetail.value = true
  try {
    const res = await opportunityApi.getDetail(id)
    if (res.code === 0 && res.data) {
      const o = res.data
      form.title = o.title || ''
      form.customerId = o.customerId
      form.stage = o.stage || ''
      form.amount = o.amount ? String(o.amount) : ''
      form.probability = o.probability ? String(o.probability) : ''
      form.expectedCloseDate = o.expectedCloseDate
        ? o.expectedCloseDate.substring(0, 10)
        : ''
      form.description = o.description || ''
      // Load customer name for display
      if (o.customerId) {
        try {
          const cRes = await customerApi.getDetail(o.customerId)
          if (cRes.code === 0 && cRes.data) {
            selectedCustomerName.value = cRes.data.name
          }
        } catch {
          // non-critical
        }
      }
    } else {
      uni.showToast({ title: '加载商机信息失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '加载商机信息失败', icon: 'none' })
  } finally {
    loadingDetail.value = false
  }
}

onLoad((options) => {
  const id = Number(options?.id) || 0
  if (id > 0) {
    editId.value = id
    uni.setNavigationBarTitle({ title: '编辑商机' })
    loadOpportunityDetail(id)
  }
})
</script>

<style scoped>
.opportunity-form-page {
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

.has-error .form-input,
.has-error .form-picker {
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

/* Customer Picker Popup */
.picker-mask {
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

.picker-popup {
  width: 100%;
  max-height: 70vh;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.picker-close {
  font-size: 28rpx;
  color: #409eff;
}

.picker-search {
  padding: 20rpx 32rpx;
}

.picker-search-input {
  width: 100%;
  height: 72rpx;
  font-size: 28rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
}

.picker-list {
  flex: 1;
  max-height: 50vh;
  padding: 0 32rpx;
}

.picker-loading,
.picker-empty {
  padding: 60rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.picker-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.picker-item.active {
  background: #f0f7ff;
  margin: 0 -32rpx;
  padding: 24rpx 32rpx;
}

.picker-item-name {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.picker-item-sub {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}
</style>
