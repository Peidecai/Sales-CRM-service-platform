<template>
  <el-container class="layout-container">
    <!-- Sidebar -->
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="layout-aside">
      <div class="logo-area">
        <el-icon v-if="isCollapsed" size="28" color="var(--el-color-primary)">
          <DataAnalysis />
        </el-icon>
        <span v-else class="logo-text">CRM 销售系统</span>
      </div>
      <el-menu
        :default-active="activeRoute"
        class="sidebar-menu"
        :collapse="isCollapsed"
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title> 工作台 </template>
        </el-menu-item>
        <el-sub-menu index="/customer">
          <template #title>
            <el-icon><User /></el-icon>
            <span>客户管理</span>
          </template>
          <el-menu-item index="/customer">
            <template #title> 客户列表 </template>
          </el-menu-item>
          <el-menu-item index="/customer/groups">
            <template #title> 客户分组 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/opportunity">
          <el-icon><TrendCharts /></el-icon>
          <template #title> 商机管理 </template>
        </el-menu-item>
        <el-menu-item index="/product">
          <el-icon><Box /></el-icon>
          <template #title> 产品管理 </template>
        </el-menu-item>
        <el-menu-item index="/signing">
          <el-icon><Stamp /></el-icon>
          <template #title> 签约促成 </template>
        </el-menu-item>
        <el-sub-menu index="/contract">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>合同管理</span>
          </template>
          <el-menu-item index="/contract">
            <template #title> 合同列表 </template>
          </el-menu-item>
          <el-menu-item v-if="isAdminOrManager" index="/contract/templates">
            <template #title> 合同模板 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/payment">
          <template #title>
            <el-icon><Money /></el-icon>
            <span>回款管理</span>
          </template>
          <el-menu-item index="/payment">
            <template #title> 回款列表 </template>
          </el-menu-item>
          <el-menu-item index="/payment/overdue">
            <template #title> 逾期回款 </template>
          </el-menu-item>
          <el-menu-item index="/payment/statistics">
            <template #title> 回款统计 </template>
          </el-menu-item>
          <el-menu-item index="/payment-plans">
            <template #title> 回款计划 </template>
          </el-menu-item>
          <el-menu-item index="/payment-dashboard">
            <template #title> 回款仪表盘 </template>
          </el-menu-item>
          <el-menu-item v-if="isAdminOrManager" index="/bank-statements">
            <template #title> 银行流水 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/service">
          <el-icon><Service /></el-icon>
          <template #title> 服务管理 </template>
        </el-menu-item>
        <el-menu-item index="/post-loan">
          <el-icon><Coin /></el-icon>
          <template #title> 贷后管理 </template>
        </el-menu-item>
        <el-menu-item index="/call-record">
          <el-icon><Phone /></el-icon>
          <template #title> 通话记录 </template>
        </el-menu-item>
        <el-menu-item index="/knowledge">
          <el-icon><Collection /></el-icon>
          <template #title> 知识库 </template>
        </el-menu-item>
        <el-menu-item index="/forum">
          <el-icon><ChatRound /></el-icon>
          <template #title> 企业论坛 </template>
        </el-menu-item>
        <el-menu-item index="/speech">
          <el-icon><ChatDotRound /></el-icon>
          <template #title> 话术管理 </template>
        </el-menu-item>
        <el-menu-item index="/negotiation">
          <el-icon><Histogram /></el-icon>
          <template #title> 谈判分析 </template>
        </el-menu-item>
        <el-sub-menu index="/training">
          <template #title>
            <el-icon><VideoPlay /></el-icon>
            <span>学习培训</span>
          </template>
          <el-menu-item index="/training/videos">
            <template #title> 视频课程 </template>
          </el-menu-item>
          <el-menu-item index="/training/tasks">
            <template #title> 学习任务 </template>
          </el-menu-item>
          <el-menu-item v-if="isAdminOrManager" index="/training/manage">
            <template #title> 视频管理 </template>
          </el-menu-item>
          <el-menu-item v-if="isAdminOrManager" index="/training/statistics">
            <template #title> 培训统计 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/prospect">
          <template #title>
            <el-icon><Magnet /></el-icon>
            <span>获客管理</span>
          </template>
          <el-menu-item v-if="isAdminOrManager" index="/prospect/search">
            <template #title> 搜索获客 </template>
          </el-menu-item>
          <el-menu-item index="/prospect">
            <template #title> 线索池 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/sales-target">
          <el-icon><Aim /></el-icon>
          <template #title> 目标业绩 </template>
        </el-menu-item>
        <el-menu-item index="/pk">
          <el-icon><Trophy /></el-icon>
          <template #title> 销售PK </template>
        </el-menu-item>
        <el-sub-menu index="/exam">
          <template #title>
            <el-icon><Reading /></el-icon>
            <span>在线考试</span>
          </template>
          <el-menu-item v-if="isAdminOrManager" index="/exam/questions">
            <template #title> 题库管理 </template>
          </el-menu-item>
          <el-menu-item v-if="isAdminOrManager" index="/exam/papers">
            <template #title> 试卷管理 </template>
          </el-menu-item>
          <el-menu-item index="/exam/my">
            <template #title> 我的考试 </template>
          </el-menu-item>
          <el-menu-item v-if="isAdminOrManager" index="/exam/statistics">
            <template #title> 考试统计 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/report">
          <template #title>
            <el-icon><DataLine /></el-icon>
            <span>智能报表</span>
          </template>
          <el-menu-item index="/report/call/statistics">
            <template #title> 通话报表 </template>
          </el-menu-item>
          <el-menu-item index="/report/performance/overview">
            <template #title> 业绩报表 </template>
          </el-menu-item>
          <el-menu-item index="/report/ai/speech-skill">
            <template #title> AI 分析 </template>
          </el-menu-item>
          <el-menu-item index="/report/funnel/sales">
            <template #title> 漏斗转化 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu v-if="isAdminOrManager" index="/screen">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <span>数据大屏</span>
          </template>
          <el-menu-item index="/screen/performance">
            <template #title> 业绩大屏 </template>
          </el-menu-item>
          <el-menu-item index="/screen/cockpit">
            <template #title> 驾驶舱 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/assistant">
          <template #title>
            <el-icon><List /></el-icon>
            <span>业务助手</span>
          </template>
          <el-menu-item index="/todo">
            <template #title> 待办事项 </template>
          </el-menu-item>
          <el-menu-item index="/annotation">
            <template #title> 批注管理 </template>
          </el-menu-item>
          <el-menu-item index="/annotation/my">
            <template #title> 我的批注 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/ai">
          <template #title>
            <el-icon><MagicStick /></el-icon>
            <span>AI 智能</span>
          </template>
          <el-menu-item index="/ai/communication-analysis">
            <template #title> 沟通分析 </template>
          </el-menu-item>
          <el-menu-item index="/ai/alerts">
            <template #title> 异常预警 </template>
          </el-menu-item>
          <el-menu-item index="/ai/reminders">
            <template #title> AI 助手 </template>
          </el-menu-item>
          <el-menu-item index="/ai/reports">
            <template #title> 报告中心 </template>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item v-if="isAdmin" index="/audit-log">
          <el-icon><Document /></el-icon>
          <template #title> 审计日志 </template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/user">
          <el-icon><Setting /></el-icon>
          <template #title> 用户管理 </template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/cloud-call/settings">
          <el-icon><Headset /></el-icon>
          <template #title> 云呼设置 </template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/settings">
          <el-icon><Tools /></el-icon>
          <template #title> 系统设置 </template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/settings/roles">
          <el-icon><UserFilled /></el-icon>
          <template #title> 角色管理 </template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/settings/data-masking">
          <el-icon><Hide /></el-icon>
          <template #title> 数据脱敏 </template>
        </el-menu-item>
        <el-sub-menu v-if="isAdmin" index="/settings/ai">
          <template #title>
            <el-icon><Cpu /></el-icon>
            <span>AI 设置</span>
          </template>
          <el-menu-item index="/settings/ai">
            <template #title> 模型配置 </template>
          </el-menu-item>
          <el-menu-item index="/settings/ai/prompts">
            <template #title> 提示词管理 </template>
          </el-menu-item>
          <el-menu-item index="/settings/ai/playground">
            <template #title> AI 测试 </template>
          </el-menu-item>
          <el-menu-item index="/settings/ai/usage">
            <template #title> 用量统计 </template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- Header -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-button text @click="isCollapsed = !isCollapsed">
            <el-icon size="20"> <Fold v-if="!isCollapsed" /><Expand v-else /> </el-icon>
          </el-button>
          <!-- Breadcrumb -->
          <el-breadcrumb separator="/" class="header-breadcrumb">
            <el-breadcrumb-item :to="{ path: '/' }"> 首页 </el-breadcrumb-item>
            <el-breadcrumb-item
              v-for="(crumb, index) in breadcrumbs"
              :key="index"
              :to="index < breadcrumbs.length - 1 ? getBreadcrumbRoute(crumb) : undefined"
            >
              {{ crumb }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <!-- Notification Bell -->
          <el-popover
            placement="bottom-end"
            :width="360"
            trigger="click"
            popper-class="notification-popover"
          >
            <template #reference>
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
                <el-button text class="notification-btn">
                  <el-icon size="20"><Bell /></el-icon>
                </el-button>
              </el-badge>
            </template>
            <div class="notification-panel">
              <div class="notification-header">
                <span class="notification-title">通知 ({{ notifications.length }})</span>
                <el-button
                  v-if="notifications.length > 0"
                  text
                  type="primary"
                  size="small"
                  @click="handleClearNotifications"
                >
                  清空
                </el-button>
              </div>
              <el-scrollbar max-height="400px">
                <div v-if="notifications.length === 0" class="notification-empty">
                  <el-empty description="暂无通知" :image-size="80" />
                </div>
                <div
                  v-for="(item, index) in notifications"
                  :key="index"
                  class="notification-item"
                  @click="handleNotificationClick(item)"
                >
                  <div class="notification-item-content">
                    <span class="notification-message">{{ item.message }}</span>
                    <span class="notification-time">{{ formatTime(item.timestamp) }}</span>
                  </div>
                </div>
              </el-scrollbar>
            </div>
          </el-popover>

          <!-- Connection indicator -->
          <el-tooltip
            :content="wsConnected ? '实时通知已连接' : '实时通知未连接'"
            placement="bottom"
          >
            <span :class="['ws-indicator', { connected: wsConnected }]" />
          </el-tooltip>

          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ userStore.userInfo?.name?.charAt(0) ?? 'U' }}
              </el-avatar>
              <span class="user-name">{{ userStore.userInfo?.name ?? '用户' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  {{ userStore.userInfo?.username ?? '' }} ({{ userStore.userRole }})
                </el-dropdown-item>
                <el-dropdown-item command="profile"> 个人中心 </el-dropdown-item>
                <el-dropdown-item divided command="logout"> 退出登录 </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- Main content -->
      <el-main class="layout-main">
        <ErrorBoundary>
          <RouterView v-slot="{ Component }">
            <Transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </ErrorBoundary>
        <ForceReadDialog />
      </el-main>
      <AiCopilot />
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { UserRole } from '@crm/shared'
import {
  HomeFilled,
  User,
  TrendCharts,
  Phone,
  Collection,
  DataAnalysis,
  Fold,
  Expand,
  ArrowDown,
  Setting,
  Document,
  Bell,
  Aim,
  MagicStick,
  Magnet,
  Tools,
  Headset,
  UserFilled,
  Box,
  Hide,
  DataLine,
  Monitor,
  Money,
  Coin,
  ChatDotRound,
  ChatRound,
  Histogram,
  Service,
  Cpu,
  Reading,
  Trophy,
  VideoPlay,
  Stamp,
  List,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/composables/usePermission'
import { useNotification, type NotificationPayload } from '@/composables/useNotification'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ForceReadDialog from '@/components/ForceReadDialog.vue'
import AiCopilot from '@/components/AiCopilot/AiCopilot.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapsed = ref(false)
const isAdmin = computed(() => userStore.userRole === UserRole.ADMIN)
const { isAdminOrManager } = usePermission()

// WebSocket notifications
const { connected: wsConnected, notifications, clearNotifications } = useNotification()
const unreadCount = computed(() => notifications.value.length)

function handleClearNotifications() {
  clearNotifications()
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function handleNotificationClick(item: NotificationPayload) {
  // Navigate to the relevant resource
  const routeMap: Record<string, string> = {
    customer: '/customer',
    opportunity: '/opportunity',
    call_record: '/call-record',
    article: '/knowledge',
  }
  const base = routeMap[item.resource]
  if (base && item.resourceId) {
    router.push(`${base}/${item.resourceId}`)
  }
}

const activeRoute = computed(() => {
  // For detail pages, highlight the parent menu item
  const path = route.path
  if (path.startsWith('/customer/groups')) return '/customer/groups'
  if (path.startsWith('/customer')) return '/customer'
  if (path.startsWith('/opportunity')) return '/opportunity'
  if (path.startsWith('/product')) return '/product'
  if (path.startsWith('/signing')) return '/signing'
  if (path.startsWith('/contract/templates')) return '/contract/templates'
  if (path.startsWith('/contract')) return '/contract'
  if (path.startsWith('/payment/overdue')) return '/payment/overdue'
  if (path.startsWith('/payment/statistics')) return '/payment/statistics'
  if (path.startsWith('/payment')) return '/payment'
  if (path.startsWith('/post-loan')) return '/post-loan'
  if (path.startsWith('/service')) return '/service'
  if (path.startsWith('/call-record')) return '/call-record'
  if (path.startsWith('/knowledge')) return '/knowledge'
  if (path.startsWith('/forum')) return '/forum'
  if (path.startsWith('/speech')) return '/speech'
  if (path.startsWith('/negotiation')) return '/negotiation'
  if (path.startsWith('/training')) return path.replace(/\/\d+$/, '')
  if (path.startsWith('/prospect/search')) return '/prospect/search'
  if (path.startsWith('/prospect')) return '/prospect'
  if (path.startsWith('/sales-target')) return '/sales-target'
  if (path.startsWith('/todo')) return '/todo'
  if (path.startsWith('/annotation/my')) return '/annotation/my'
  if (path.startsWith('/annotation')) return '/annotation'
  if (path.startsWith('/notification/settings')) return '/notification/settings'
  if (path.startsWith('/pk')) return '/pk'
  if (path.startsWith('/exam/questions')) return '/exam/questions'
  if (path.startsWith('/exam/papers')) return '/exam/papers'
  if (path.startsWith('/exam/statistics')) return '/exam/statistics'
  if (path.startsWith('/exam')) return '/exam/my'
  if (path.startsWith('/report')) return path
  if (path.startsWith('/screen')) return path
  if (path.startsWith('/ai/communication-analysis')) return '/ai/communication-analysis'
  if (path.startsWith('/ai/alerts')) return '/ai/alerts'
  if (path.startsWith('/ai/reminders')) return '/ai/reminders'
  if (path.startsWith('/ai/employee-profile')) return '/ai/reports'
  if (path.startsWith('/ai/reports')) return '/ai/reports'
  if (path.startsWith('/audit-log')) return '/audit-log'
  if (path.startsWith('/cloud-call')) return '/cloud-call/settings'
  if (path.startsWith('/settings/roles')) return '/settings/roles'
  if (path.startsWith('/settings/data-masking')) return '/settings/data-masking'
  if (path.startsWith('/settings/ai/prompts')) return '/settings/ai/prompts'
  if (path.startsWith('/settings/ai/playground')) return '/settings/ai/playground'
  if (path.startsWith('/settings/ai/usage')) return '/settings/ai/usage'
  if (path.startsWith('/settings/ai')) return '/settings/ai'
  if (path.startsWith('/settings')) return '/settings'
  if (path.startsWith('/user')) return '/user'
  if (path.startsWith('/profile')) return '/profile'
  return path
})

const breadcrumbs = computed(() => {
  const meta = route.meta
  if (meta?.breadcrumb && Array.isArray(meta.breadcrumb)) {
    return meta.breadcrumb as string[]
  }
  if (meta?.title) {
    return [meta.title as string]
  }
  return []
})

const breadcrumbRouteMap: Record<string, string> = {
  客户管理: '/customer',
  客户分组: '/customer/groups',
  商机管理: '/opportunity',
  产品管理: '/product',
  合同管理: '/contract',
  合同模板: '/contract/templates',
  回款管理: '/payment',
  逾期回款: '/payment/overdue',
  回款统计: '/payment/statistics',
  贷后管理: '/post-loan',
  服务管理: '/service',
  通话记录: '/call-record',
  知识库: '/knowledge',
  企业论坛: '/forum',
  话术管理: '/speech',
  谈判分析: '/negotiation',
  学习培训: '/training/videos',
  视频课程: '/training/videos',
  视频管理: '/training/manage',
  学习任务: '/training/tasks',
  培训统计: '/training/statistics',
  获客管理: '/prospect',
  线索池: '/prospect',
  搜索获客: '/prospect/search',
  目标业绩: '/sales-target',
  销售PK: '/pk',
  在线考试: '/exam/my',
  题库管理: '/exam/questions',
  试卷管理: '/exam/papers',
  我的考试: '/exam/my',
  考试统计: '/exam/statistics',
  沟通分析: '/ai/communication-analysis',
  异常预警: '/ai/alerts',
  'AI 助手': '/ai/reminders',
  报告中心: '/ai/reports',
  员工画像: '/ai/employee-profile',
  审计日志: '/audit-log',
  用户管理: '/user',
  云呼设置: '/cloud-call/settings',
  系统设置: '/settings',
  角色管理: '/settings/roles',
  数据脱敏: '/settings/data-masking',
  'AI 模型配置': '/settings/ai',
  'AI 提示词': '/settings/ai/prompts',
  'AI 测试': '/settings/ai/playground',
  'AI 用量统计': '/settings/ai/usage',
  个人中心: '/profile',
  业务助手: '/todo',
  待办事项: '/todo',
  批注管理: '/annotation',
  我的批注: '/annotation/my',
  通知设置: '/notification/settings',
  智能报表: '/report',
  数据大屏: '/screen/performance',
}

function getBreadcrumbRoute(crumb: string): { path: string } | undefined {
  const path = breadcrumbRouteMap[crumb]
  return path ? { path } : undefined
}

async function handleCommand(command: string) {
  if (command === 'profile') {
    router.push({ name: 'Profile' })
  } else if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      userStore.logout()
      router.push({ name: 'Login' })
    } catch {
      // user cancelled
    }
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  background-color: #001529;
  transition: width 0.3s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logo-area {
  height: 60px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-bottom: 1px solid #002140;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu::-webkit-scrollbar {
  width: 4px;
}

.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.sidebar-menu::-webkit-scrollbar-track {
  background: transparent;
}

.layout-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-breadcrumb {
  margin-left: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-btn {
  padding: 4px;
}

.notification-panel {
  padding: 0;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.notification-empty {
  padding: 20px 0;
}

.notification-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #fafafa;
}

.notification-item:hover {
  background: #f5f7fa;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notification-message {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.ws-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ddd;
  transition: background 0.3s;
}

.ws-indicator.connected {
  background: #67c23a;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f5f5;
}

.user-name {
  font-size: 14px;
  color: #333;
}

.layout-main {
  background: #f5f7fa;
  padding: 0;
  overflow-y: auto;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
