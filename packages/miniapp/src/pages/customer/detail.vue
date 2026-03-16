<template>
  <view class="customer-detail-page">
    <!-- Loading State -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <template v-else-if="customer">
      <!-- Basic Info Card -->
      <view class="info-card">
        <view class="info-header">
          <view class="customer-avatar">
            <text class="avatar-char">{{ customer.name.charAt(0) }}</text>
          </view>
          <view class="customer-main-info">
            <text class="customer-name">{{ customer.name }}</text>
            <text class="customer-status" :class="'status-' + customer.status">
              {{ statusLabel(customer.status) }}
            </text>
          </view>
        </view>

        <!-- Quick Actions -->
        <view class="quick-actions">
          <view class="quick-action-btn" @click="smartDial">
            <text class="qa-icon">📞</text>
            <text class="qa-label">拨打</text>
          </view>
          <view class="quick-action-btn" @click="goVoiceMemo">
            <text class="qa-icon">🎤</text>
            <text class="qa-label">速记</text>
          </view>
          <view class="quick-action-btn" @click="addFollowUp">
            <text class="qa-icon">➕</text>
            <text class="qa-label">跟进</text>
          </view>
        </view>

        <view class="info-rows">
          <view class="info-row">
            <text class="info-label">公司</text>
            <text class="info-value">{{ customer.company || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">电话</text>
            <text class="info-value" @click="smartDial">
              {{ customer.phone || '-' }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">邮箱</text>
            <text class="info-value">{{ customer.email || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">行业</text>
            <text class="info-value">{{ customer.industry || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">地区</text>
            <text class="info-value">{{ customer.region || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">地址</text>
            <text class="info-value">{{ customer.address || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- Tabs -->
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- Tab Content: Contacts -->
      <view v-if="activeTab === 'contacts'" class="tab-content">
        <view v-if="contacts.length === 0" class="empty-state">
          <text class="empty-text">暂无联系人</text>
        </view>
        <view v-for="contact in contacts" :key="contact.id" class="list-card">
          <view class="list-card-row">
            <text class="list-card-title">{{ contact.name }}</text>
            <text class="list-card-subtitle">{{ contact.position || '' }}</text>
          </view>
          <text class="list-card-desc">{{ contact.phone || '' }} {{ contact.email || '' }}</text>
        </view>
      </view>

      <!-- Tab Content: Opportunities -->
      <view v-if="activeTab === 'opportunities'" class="tab-content">
        <view v-if="opportunities.length === 0" class="empty-state">
          <text class="empty-text">暂无商机</text>
        </view>
        <view v-for="opp in opportunities" :key="opp.id" class="list-card">
          <view class="list-card-row">
            <text class="list-card-title">{{ opp.title }}</text>
            <text class="list-card-amount">{{ (opp.amount / 10000).toFixed(1) }}万</text>
          </view>
          <text class="list-card-desc">阶段: {{ opp.stage }} | 概率: {{ opp.probability }}%</text>
        </view>
      </view>

      <!-- Tab Content: Follow-ups -->
      <view v-if="activeTab === 'followups'" class="tab-content">
        <view v-if="followUps.length === 0" class="empty-state">
          <text class="empty-text">暂无跟进记录</text>
        </view>
        <view v-for="fu in followUps" :key="fu.id" class="list-card">
          <view class="list-card-row">
            <text class="list-card-title">{{ typeLabel(fu.type) }}</text>
            <text class="list-card-date">{{ formatDate(fu.createdAt) }}</text>
          </view>
          <text class="list-card-desc">{{ fu.content }}</text>
          <text v-if="fu.nextFollowUpDate" class="list-card-next">
            下次跟进: {{ fu.nextFollowUpDate }}
          </text>
        </view>
      </view>

      <!-- Tab Content: Call Records -->
      <view v-if="activeTab === 'callRecords'" class="tab-content">
        <view v-if="callRecords.length === 0" class="empty-state">
          <text class="empty-text">暂无通话记录</text>
        </view>
        <view v-for="cr in callRecords" :key="cr.id" class="call-record-item">
          <view class="cr-timeline-dot" :class="{ connected: cr.callResult === 'connected' }" />
          <view class="cr-content">
            <view class="cr-header">
              <text class="cr-time">{{ formatDateTime(cr.callAt || cr.createdAt) }}</text>
              <text class="cr-result" :class="'cr-result-' + (cr.callResult || 'unknown')">
                {{ callResultLabel(cr.callResult) }}
              </text>
            </view>
            <text v-if="cr.estimatedDuration" class="cr-duration">
              约 {{ formatCallDuration(cr.estimatedDuration) }}
            </text>
            <text v-else-if="cr.duration" class="cr-duration">
              {{ formatCallDuration(cr.duration) }}
            </text>
            <view v-if="cr.aiSummary" class="cr-summary">
              <text class="cr-summary-icon">📝</text>
              <text class="cr-summary-text">{{ cr.aiSummary }}</text>
            </view>
            <text v-if="cr.notes" class="cr-notes">{{ cr.notes }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- Action Buttons -->
    <view class="action-bar" v-if="customer">
      <button class="btn-action btn-call" @click="smartDial">
        拨打电话
      </button>
      <button class="btn-action btn-followup" @click="addFollowUp">
        新建跟进
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { customerApi, type CustomerVO, CustomerStatus } from '@/api/customer'
import { opportunityApi, type OpportunityVO } from '@/api/opportunity'
import { followUpApi, type FollowUpVO } from '@/api/follow-up'
import { callRecordApi, type CallRecordVO } from '@/api/call-record'
import { useCallStateStore } from '@/stores/call-state'
import { http } from '@/api/request'

interface ContactVO {
  id: number
  name: string
  position: string | null
  phone: string | null
  email: string | null
}

const callState = useCallStateStore()
const customerId = ref(0)
const customer = ref<CustomerVO | null>(null)
const loading = ref(true)
const activeTab = ref('contacts')

const contacts = ref<ContactVO[]>([])
const opportunities = ref<OpportunityVO[]>([])
const followUps = ref<FollowUpVO[]>([])
const callRecords = ref<CallRecordVO[]>([])
const callRecordsLoaded = ref(false)

const tabs = [
  { key: 'contacts', label: '联系人' },
  { key: 'opportunities', label: '商机' },
  { key: 'followups', label: '跟进记录' },
  { key: 'callRecords', label: '通话记录' },
]

const statusOptions: Record<string, string> = {
  [CustomerStatus.LEAD]: '线索',
  [CustomerStatus.POTENTIAL]: '潜在',
  [CustomerStatus.INTENTION]: '有意向',
  [CustomerStatus.OPPORTUNITY]: '商机',
  [CustomerStatus.DEAL]: '成交',
  [CustomerStatus.MAINTAIN]: '维护',
  [CustomerStatus.INVALID]: '无效',
  [CustomerStatus.LOST]: '流失',
}

function statusLabel(status: string) {
  return statusOptions[status] || status
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    call: '电话', visit: '拜访', email: '邮件', wechat: '微信', other: '其他',
  }
  return map[type] || type
}

function formatDate(dateStr: string) {
  return dateStr ? dateStr.slice(0, 10) : ''
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
}

function callResultLabel(result: string | null): string {
  const map: Record<string, string> = {
    connected: '已接通',
    no_answer: '未接',
    busy: '忙线',
    power_off: '关机',
  }
  return result ? (map[result] || result) : '外呼'
}

/** Smart dial: record context then invoke native dialer */
function smartDial() {
  if (!customer.value?.phone) {
    uni.showToast({ title: '暂无电话号码', icon: 'none' })
    return
  }
  // Record pending call context for after-call tracking
  callState.setPendingCall({
    id: customer.value.id,
    name: customer.value.name,
    phone: customer.value.phone,
  })
  uni.makePhoneCall({
    phoneNumber: customer.value.phone,
    fail: () => {
      // User cancelled the dial, clear pending state
      callState.clearPendingCall()
    },
  })
}

function goVoiceMemo() {
  if (!customer.value) return
  uni.navigateTo({
    url: `/pages/voice/record?callContext=1&customerId=${customer.value.id}&customerName=${encodeURIComponent(customer.value.name)}`,
  })
}

function addFollowUp() {
  uni.navigateTo({ url: `/pages/follow-up/create?customerId=${customerId.value}&customerName=${encodeURIComponent(customer.value?.name || '')}` })
}

async function loadDetail() {
  loading.value = true
  try {
    const res = await customerApi.getDetail(customerId.value)
    if (res.code === 0 && res.data) {
      customer.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadContacts() {
  try {
    const res = await http.get<{ list: ContactVO[] }>(`/contacts`, { customerId: customerId.value })
    if (res.code === 0 && res.data) {
      contacts.value = (res.data as { list: ContactVO[] }).list || []
    }
  } catch {
    // Silently fail
  }
}

async function loadOpportunities() {
  try {
    const res = await opportunityApi.getList({ customerId: customerId.value, page: 1, pageSize: 50 })
    if (res.code === 0 && res.data) {
      opportunities.value = res.data.list
    }
  } catch {
    // Silently fail
  }
}

async function loadFollowUps() {
  try {
    const res = await followUpApi.getList({ customerId: customerId.value, page: 1, pageSize: 50 })
    if (res.code === 0 && res.data) {
      followUps.value = res.data.list
    }
  } catch {
    // Silently fail
  }
}

async function loadCallRecords() {
  try {
    const res = await callRecordApi.getList({ customerId: customerId.value, page: 1, pageSize: 50 })
    if (res.code === 0 && res.data) {
      callRecords.value = res.data.list
    }
  } catch {
    // Silently fail
  } finally {
    callRecordsLoaded.value = true
  }
}

// Lazy load call records when tab is switched
watch(activeTab, (val) => {
  if (val === 'callRecords' && !callRecordsLoaded.value) {
    loadCallRecords()
  }
})

onLoad((options) => {
  customerId.value = Number(options?.id) || 0
  if (customerId.value) {
    loadDetail()
    loadContacts()
    loadOpportunities()
    loadFollowUps()
  }
})
</script>

<style scoped>
.customer-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.loading-state {
  padding: 120rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}

.info-card {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 28rpx;
}

.info-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.customer-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #79bbff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-char {
  color: #ffffff;
  font-size: 40rpx;
  font-weight: bold;
}

.customer-main-info {
  display: flex;
  flex-direction: column;
}

.customer-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.customer-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  display: inline-block;
}

.status-lead { background: #f0f0f0; color: #999; }
.status-potential { background: #ecf5ff; color: #409eff; }
.status-intention { background: #fdf6ec; color: #e6a23c; }
.status-opportunity { background: #f0f9eb; color: #67c23a; }
.status-deal { background: #f0f9eb; color: #409eff; }
.status-maintain { background: #ecf5ff; color: #409eff; }
.status-invalid { background: #fef0f0; color: #f56c6c; }
.status-lost { background: #fef0f0; color: #f56c6c; }

/* Quick Actions */
.quick-actions {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 0;
  margin-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.qa-icon {
  font-size: 44rpx;
}

.qa-label {
  font-size: 24rpx;
  color: #666;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row {
  display: flex;
  align-items: baseline;
}

.info-label {
  width: 100rpx;
  font-size: 26rpx;
  color: #999;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.tab-bar {
  display: flex;
  background: #ffffff;
  margin: 0 24rpx;
  border-radius: 16rpx 16rpx 0 0;
  overflow: hidden;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}

.tab-item.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 500;
}

.tab-content {
  background: #ffffff;
  margin: 0 24rpx 24rpx;
  border-radius: 0 0 16rpx 16rpx;
  padding: 16rpx;
  min-height: 200rpx;
}

.list-card {
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.list-card:last-child {
  border-bottom: none;
}

.list-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.list-card-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.list-card-subtitle {
  font-size: 24rpx;
  color: #999;
}

.list-card-amount {
  font-size: 28rpx;
  color: #409eff;
  font-weight: bold;
}

.list-card-date {
  font-size: 22rpx;
  color: #999;
}

.list-card-desc {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 4rpx;
}

.list-card-next {
  font-size: 22rpx;
  color: #409eff;
  display: block;
  margin-top: 4rpx;
}

/* Call Record Timeline */
.call-record-item {
  display: flex;
  padding: 20rpx 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
  position: relative;
}

.call-record-item:last-child {
  border-bottom: none;
}

.cr-timeline-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ddd;
  margin-top: 10rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.cr-timeline-dot.connected {
  background: #67c23a;
}

.cr-content {
  flex: 1;
  min-width: 0;
}

.cr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.cr-time {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.cr-result {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.cr-result-connected { background: #f0f9eb; color: #67c23a; }
.cr-result-no_answer { background: #fdf6ec; color: #e6a23c; }
.cr-result-busy { background: #fef0f0; color: #f56c6c; }
.cr-result-power_off { background: #f0f0f0; color: #999; }
.cr-result-unknown { background: #ecf5ff; color: #409eff; }

.cr-duration {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.cr-summary {
  display: flex;
  gap: 8rpx;
  background: #f9fafc;
  border-radius: 8rpx;
  padding: 12rpx;
  margin-bottom: 8rpx;
}

.cr-summary-icon {
  font-size: 24rpx;
  flex-shrink: 0;
}

.cr-summary-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cr-notes {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.empty-state {
  padding: 60rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #ccc;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #eee;
}

.btn-action {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
}

.btn-action::after {
  border: none;
}

.btn-call {
  background: #f0f9eb;
  color: #67c23a;
}

.btn-followup {
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
}
</style>
