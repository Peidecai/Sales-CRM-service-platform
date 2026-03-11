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
        <view class="info-rows">
          <view class="info-row">
            <text class="info-label">公司</text>
            <text class="info-value">{{ customer.company || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">电话</text>
            <text class="info-value" @click="callPhone">
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
    </template>

    <!-- Action Buttons -->
    <view class="action-bar" v-if="customer">
      <button class="btn-action btn-call" @click="callPhone">
        拨打电话
      </button>
      <button class="btn-action btn-followup" @click="addFollowUp">
        新建跟进
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { customerApi, type CustomerVO, CustomerStatus } from '@/api/customer'
import { opportunityApi, type OpportunityVO } from '@/api/opportunity'
import { followUpApi, type FollowUpVO } from '@/api/follow-up'
import { http } from '@/api/request'

interface ContactVO {
  id: number
  name: string
  position: string | null
  phone: string | null
  email: string | null
}

const customerId = ref(0)
const customer = ref<CustomerVO | null>(null)
const loading = ref(true)
const activeTab = ref('contacts')

const contacts = ref<ContactVO[]>([])
const opportunities = ref<OpportunityVO[]>([])
const followUps = ref<FollowUpVO[]>([])

const tabs = [
  { key: 'contacts', label: '联系人' },
  { key: 'opportunities', label: '商机' },
  { key: 'followups', label: '跟进记录' },
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

function callPhone() {
  if (customer.value?.phone) {
    uni.makePhoneCall({ phoneNumber: customer.value.phone })
  } else {
    uni.showToast({ title: '暂无电话号码', icon: 'none' })
  }
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
  font-size: 28rpx;
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
