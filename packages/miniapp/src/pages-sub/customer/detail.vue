<template>
  <view class="customer-detail-page">
    <!-- Loading State -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <template v-else-if="customer">
      <!-- Header Card -->
      <view class="header-card">
        <view class="header-top">
          <view class="customer-avatar">
            <text class="avatar-char">{{ customer.name.charAt(0) }}</text>
          </view>
          <view class="customer-main-info">
            <text class="customer-name">{{ customer.name }}</text>
            <view class="customer-tags">
              <text class="tag tag-level" v-if="customer.tags?.length">{{ customer.tags[0] }}</text>
              <text class="tag tag-status" :class="'status-' + customer.status">
                {{ statusLabel(customer.status) }}
              </text>
              <text class="tag tag-source" v-if="customer.source">{{ customer.source }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Tab Bar -->
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- Tab Content: 基本信息 -->
      <view v-if="activeTab === 'info'" class="tab-content">
        <view class="info-section">
          <view class="info-row">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ customer.name }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">电话</text>
            <text class="info-value link" @click="showDialSheet">
              {{ customer.phone || '-' }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">邮箱</text>
            <text class="info-value">{{ customer.email || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">公司</text>
            <text class="info-value">{{ customer.company || '-' }}</text>
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
          <view class="info-row" v-if="customer.notes">
            <text class="info-label">备注</text>
            <text class="info-value">{{ customer.notes }}</text>
          </view>
        </view>

        <!-- Contacts Sub-section -->
        <view class="section-title" v-if="contacts.length > 0">
          <text>联系人 ({{ contacts.length }})</text>
        </view>
        <view v-for="contact in contacts" :key="contact.id" class="contact-card">
          <view class="contact-row">
            <text class="contact-name">{{ contact.name }}</text>
            <text class="contact-position" v-if="contact.position">{{ contact.position }}</text>
          </view>
          <text class="contact-detail" v-if="contact.phone || contact.email">
            {{ contact.phone || '' }} {{ contact.email || '' }}
          </text>
        </view>
      </view>

      <!-- Tab Content: 跟进记录 -->
      <view v-if="activeTab === 'followups'" class="tab-content">
        <view v-if="tabLoading.followups" class="tab-loading">
          <text>加载中...</text>
        </view>
        <template v-else>
          <view v-if="followUps.length === 0" class="empty-state">
            <text class="empty-text">暂无跟进记录</text>
          </view>
          <view v-for="fu in followUps" :key="fu.id" class="timeline-item">
            <view class="timeline-dot" :class="'dot-' + fu.type" />
            <view class="timeline-content">
              <view class="timeline-header">
                <text class="timeline-type">{{ typeLabel(fu.type) }}</text>
                <text class="timeline-date">{{ formatDate(fu.createdAt) }}</text>
              </view>
              <text class="timeline-text">{{ fu.content }}</text>
              <text v-if="fu.nextFollowUpDate" class="timeline-next">
                下次跟进: {{ fu.nextFollowUpDate.slice(0, 10) }}
              </text>
            </view>
          </view>
        </template>
      </view>

      <!-- Tab Content: 商机 -->
      <view v-if="activeTab === 'opportunities'" class="tab-content">
        <view v-if="tabLoading.opportunities" class="tab-loading">
          <text>加载中...</text>
        </view>
        <template v-else>
          <view v-if="opportunities.length === 0" class="empty-state">
            <text class="empty-text">暂无商机</text>
          </view>
          <view v-for="opp in opportunities" :key="opp.id" class="opp-card">
            <view class="opp-header">
              <text class="opp-title">{{ opp.title }}</text>
              <text class="opp-amount">{{ (opp.amount / 10000).toFixed(1) }}万</text>
            </view>
            <view class="opp-meta">
              <text class="opp-stage">{{ opp.stage }}</text>
              <text class="opp-probability">概率 {{ opp.probability }}%</text>
              <text class="opp-date" v-if="opp.expectedCloseDate">
                预计 {{ opp.expectedCloseDate.slice(0, 10) }}
              </text>
            </view>
          </view>
        </template>
      </view>

      <!-- Tab Content: 通话记录 -->
      <view v-if="activeTab === 'callRecords'" class="tab-content">
        <view v-if="tabLoading.callRecords" class="tab-loading">
          <text>加载中...</text>
        </view>
        <template v-else>
          <view v-if="callRecords.length === 0" class="empty-state">
            <text class="empty-text">暂无通话记录</text>
          </view>
          <view v-for="cr in callRecords" :key="cr.id" class="call-record-item">
            <view class="cr-timeline-dot" :class="{ connected: cr.callResult === 'connected' }" />
            <view class="cr-content">
              <view class="cr-header">
                <text class="cr-time">{{ formatDateTime(cr.callAt || cr.createdAt) }}</text>
                <view class="cr-badges">
                  <text class="cr-call-type" :class="'type-' + (cr.callType || 'normal')">
                    {{ callTypeLabel(cr.callType) }}
                  </text>
                  <text class="cr-result" :class="'cr-result-' + (cr.callResult || 'unknown')">
                    {{ callResultLabel(cr.callResult) }}
                  </text>
                </view>
              </view>
              <text v-if="cr.estimatedDuration" class="cr-duration">
                约 {{ formatCallDuration(cr.estimatedDuration) }}
              </text>
              <text v-else-if="cr.duration" class="cr-duration">
                {{ formatCallDuration(cr.duration) }}
              </text>
              <view v-if="cr.aiSummary" class="cr-summary">
                <text class="cr-summary-label">AI摘要</text>
                <text class="cr-summary-text">{{ cr.aiSummary }}</text>
              </view>
              <text v-if="cr.notes" class="cr-notes">{{ cr.notes }}</text>
            </view>
          </view>
        </template>
      </view>
    </template>

    <!-- Fixed Bottom Action Bar -->
    <view class="action-bar" v-if="customer">
      <view class="action-btn action-call" @click="showDialSheet">
        <text class="action-icon">tel</text>
        <text class="action-label">拨号</text>
      </view>
      <view class="action-btn action-followup" @click="addFollowUp">
        <text class="action-icon">edit</text>
        <text class="action-label">跟进</text>
      </view>
      <view class="action-btn action-edit" @click="editCustomer">
        <text class="action-icon">setting</text>
        <text class="action-label">编辑</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { customerApi, type CustomerVO, CustomerStatus } from '@/api/customer'
import { opportunityApi, type OpportunityVO } from '@/api/opportunity'
import { followUpApi, type FollowUpVO } from '@/api/follow-up'
import { callRecordApi, type CallRecordVO } from '@/api/call-record'
import { makeCall } from '@/native/phone-call'
import { getPreferredSimSlot } from '@/native/sim-card'
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
const activeTab = ref('info')

const contacts = ref<ContactVO[]>([])
const opportunities = ref<OpportunityVO[]>([])
const followUps = ref<FollowUpVO[]>([])
const callRecords = ref<CallRecordVO[]>([])

// Lazy load tracking
const tabLoaded = reactive({
  info: true, // loaded with detail
  followups: false,
  opportunities: false,
  callRecords: false,
})

const tabLoading = reactive({
  followups: false,
  opportunities: false,
  callRecords: false,
})

const tabs = [
  { key: 'info', label: '基本信息' },
  { key: 'followups', label: '跟进' },
  { key: 'opportunities', label: '商机' },
  { key: 'callRecords', label: '通话' },
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

function statusLabel(status: string): string {
  return statusOptions[status] || status
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    call: '电话', visit: '拜访', email: '邮件', wechat: '微信', other: '其他',
  }
  return map[type] || type
}

function formatDate(dateStr: string): string {
  return dateStr ? dateStr.slice(0, 10) : ''
}

function formatDateTime(dateStr: string): string {
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

function callTypeLabel(callType: string | null): string {
  const map: Record<string, string> = {
    normal: '原生',
    manual: '原生',
    callback: '回呼',
  }
  return callType ? (map[callType] || '原生') : '原生'
}

/** Switch tab with lazy loading */
function switchTab(key: string) {
  activeTab.value = key
  if (!tabLoaded[key as keyof typeof tabLoaded]) {
    loadTabData(key)
  }
}

async function loadTabData(key: string) {
  switch (key) {
    case 'followups':
      if (!tabLoaded.followups) {
        tabLoading.followups = true
        await loadFollowUps()
        tabLoaded.followups = true
        tabLoading.followups = false
      }
      break
    case 'opportunities':
      if (!tabLoaded.opportunities) {
        tabLoading.opportunities = true
        await loadOpportunities()
        tabLoaded.opportunities = true
        tabLoading.opportunities = false
      }
      break
    case 'callRecords':
      if (!tabLoaded.callRecords) {
        tabLoading.callRecords = true
        await loadCallRecords()
        tabLoaded.callRecords = true
        tabLoading.callRecords = false
      }
      break
  }
}

function showDialSheet() {
  if (!customer.value?.phone) {
    uni.showToast({ title: '暂无电话号码', icon: 'none' })
    return
  }
  dialNative()
}

/** Native dial (方案B) */
function dialNative() {
  if (!customer.value?.phone) return
  const simSlot = getPreferredSimSlot()

  callState.setPendingCall({
    id: customer.value.id,
    name: customer.value.name,
    phone: customer.value.phone,
    simSlot: simSlot ?? undefined,
  })

  makeCall({ phoneNumber: customer.value.phone, simSlot: simSlot ?? undefined })
    .then((result) => {
      if (!result.success) {
        callState.clearPendingCall()
      }
    })
    .catch(() => {
      callState.clearPendingCall()
    })
}

function addFollowUp() {
  uni.navigateTo({
    url: `/pages-sub/follow-up/create?customerId=${customerId.value}&customerName=${encodeURIComponent(customer.value?.name || '')}`,
  })
}

function editCustomer() {
  uni.navigateTo({
    url: `/pages-sub/customer/edit?id=${customerId.value}`,
  })
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
    const res = await http.get<{ list: ContactVO[] }>('/contacts', { customerId: customerId.value })
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
  }
}

onLoad((options) => {
  customerId.value = Number(options?.id) || 0
  if (customerId.value) {
    loadDetail()
    loadContacts() // loaded with info tab
  }

  // Listen for call record creation to auto-refresh
  uni.$on('call-record-created', onCallRecordCreated)
})

function onCallRecordCreated(payload: { customerId: number }) {
  if (payload.customerId === customerId.value) {
    // Force reload call records regardless of previous load state
    tabLoaded.callRecords = false
    if (activeTab.value === 'callRecords') {
      loadTabData('callRecords')
    }
  }
}

onUnmounted(() => {
  uni.$off('call-record-created', onCallRecordCreated)
})
</script>

<style scoped>
.customer-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.loading-state {
  padding: 120rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}

/* Header Card */
.header-card {
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  padding: 32rpx;
  padding-top: 24rpx;
}

.header-top {
  display: flex;
  align-items: center;
}

.customer-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar-char {
  color: #ffffff;
  font-size: 40rpx;
  font-weight: bold;
}

.customer-main-info {
  flex: 1;
  min-width: 0;
}

.customer-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 12rpx;
  display: block;
}

.customer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.tag-level {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.tag-status {
  background: rgba(255, 255, 255, 0.9);
}

.tag-source {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.status-lead { color: #999; }
.status-potential { color: #409eff; }
.status-intention { color: #e6a23c; }
.status-opportunity { color: #67c23a; }
.status-deal { color: #409eff; }
.status-maintain { color: #409eff; }
.status-invalid { color: #f56c6c; }
.status-lost { color: #f56c6c; }

/* Tab Bar */
.tab-bar {
  display: flex;
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
  position: relative;
}

.tab-item.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 600;
}

/* Tab Content */
.tab-content {
  background: #ffffff;
  margin: 16rpx 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 16rpx;
  min-height: 300rpx;
}

.tab-loading {
  padding: 80rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

/* Info Tab */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-row {
  display: flex;
  align-items: baseline;
  padding: 16rpx 8rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
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

.info-value.link {
  color: #409eff;
}

.section-title {
  padding: 24rpx 8rpx 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  border-top: 1rpx solid #f0f0f0;
  margin-top: 8rpx;
}

.contact-card {
  padding: 16rpx 8rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.contact-card:last-child {
  border-bottom: none;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 4rpx;
}

.contact-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.contact-position {
  font-size: 22rpx;
  color: #999;
}

.contact-detail {
  font-size: 24rpx;
  color: #666;
}

/* Follow-up Timeline */
.timeline-item {
  display: flex;
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid #f5f5f5;
  position: relative;
}

.timeline-item:last-child {
  border-bottom: none;
}

.timeline-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ddd;
  margin-top: 10rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.dot-call { background: #409eff; }
.dot-visit { background: #67c23a; }
.dot-email { background: #e6a23c; }
.dot-wechat { background: #07c160; }
.dot-other { background: #909399; }

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.timeline-type {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

.timeline-date {
  font-size: 22rpx;
  color: #999;
}

.timeline-text {
  font-size: 26rpx;
  color: #666;
  display: block;
  line-height: 1.5;
}

.timeline-next {
  font-size: 22rpx;
  color: #409eff;
  display: block;
  margin-top: 8rpx;
}

/* Opportunity Cards */
.opp-card {
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.opp-card:last-child {
  border-bottom: none;
}

.opp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.opp-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opp-amount {
  font-size: 28rpx;
  color: #409eff;
  font-weight: bold;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.opp-meta {
  display: flex;
  gap: 16rpx;
  font-size: 22rpx;
  color: #999;
}

.opp-stage {
  background: #ecf5ff;
  color: #409eff;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

/* Call Record Timeline */
.call-record-item {
  display: flex;
  padding: 20rpx 8rpx;
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

.cr-badges {
  display: flex;
  gap: 8rpx;
}

.cr-call-type {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.type-normal,
.type-manual {
  background: #f0f0f0;
  color: #666;
}

.type-callback {
  background: #ecf5ff;
  color: #409eff;
}

.cr-result {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
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
  background: #f9fafc;
  border-radius: 8rpx;
  padding: 12rpx;
  margin-bottom: 8rpx;
}

.cr-summary-label {
  font-size: 22rpx;
  color: #409eff;
  font-weight: 500;
  display: block;
  margin-bottom: 4rpx;
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

/* Empty State */
.empty-state {
  padding: 80rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #ccc;
}

/* Fixed Bottom Action Bar */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #ffffff;
  border-top: 1rpx solid #eee;
  padding: 12rpx 0;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  z-index: 100;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 8rpx 0;
}

.action-icon {
  font-size: 28rpx;
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 50%;
  color: #ffffff;
}

.action-call .action-icon {
  background: #67c23a;
}

.action-followup .action-icon {
  background: #409eff;
}

.action-edit .action-icon {
  background: #e6a23c;
}

.action-label {
  font-size: 22rpx;
  color: #666;
}

</style>
