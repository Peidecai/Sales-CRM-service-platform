import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserRole } from '@crm/shared'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { requiresAuth: false, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layout/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台', icon: 'HomeFilled', breadcrumb: ['工作台'] },
      },
      {
        path: 'customer',
        name: 'Customer',
        component: () => import('@/views/customer/index.vue'),
        meta: { title: '客户管理', icon: 'User', breadcrumb: ['客户管理'] },
      },
      {
        path: 'customer/:id',
        name: 'CustomerDetail',
        component: () => import('@/views/customer/detail.vue'),
        meta: { title: '客户详情', breadcrumb: ['客户管理', '客户详情'] },
      },
      {
        path: 'opportunity',
        name: 'Opportunity',
        component: () => import('@/views/opportunity/index.vue'),
        meta: { title: '商机管理', icon: 'TrendCharts', breadcrumb: ['商机管理'] },
      },
      {
        path: 'opportunity/funnel',
        name: 'OpportunityFunnel',
        component: () => import('@/views/opportunity/funnel.vue'),
        meta: { title: '销售漏斗', breadcrumb: ['商机管理', '销售漏斗'] },
      },
      {
        path: 'opportunity/:id',
        name: 'OpportunityDetail',
        component: () => import('@/views/opportunity/detail.vue'),
        meta: { title: '商机详情', breadcrumb: ['商机管理', '商机详情'] },
      },
      {
        path: 'contract',
        name: 'Contract',
        component: () => import('@/views/contract/index.vue'),
        meta: { title: '合同管理', icon: 'Document', breadcrumb: ['合同管理'] },
      },
      {
        path: 'contract/:id',
        name: 'ContractDetail',
        component: () => import('@/views/contract/detail.vue'),
        meta: { title: '合同详情', breadcrumb: ['合同管理', '合同详情'] },
      },
      {
        path: 'payment',
        name: 'Payment',
        component: () => import('@/views/payment/index.vue'),
        meta: { title: '回款管理', icon: 'Money', breadcrumb: ['回款管理'] },
      },
      {
        path: 'call-record',
        name: 'CallRecord',
        component: () => import('@/views/call-record/index.vue'),
        meta: { title: '通话记录', breadcrumb: ['通话记录'] },
      },
      {
        path: 'call-record/:id',
        name: 'CallRecordDetail',
        component: () => import('@/views/call-record/detail.vue'),
        meta: { title: '通话详情', breadcrumb: ['通话记录', '通话详情'] },
      },
      {
        path: 'call-center',
        name: 'CallCenterAgent',
        component: () => import('@/views/call-center/agent-workspace.vue'),
        meta: { title: '坐席工作台', icon: 'Phone', breadcrumb: ['呼叫中心', '坐席工作台'] },
      },
      {
        path: 'call-center/stats',
        name: 'CallCenterStats',
        component: () => import('@/views/call-center/stats.vue'),
        meta: { title: '通话统计', breadcrumb: ['呼叫中心', '通话统计'] },
      },
      {
        path: 'campaign',
        name: 'CampaignList',
        component: () => import('@/views/campaign/index.vue'),
        meta: { title: '外呼任务', icon: 'Promotion', breadcrumb: ['外呼任务'] },
      },
      {
        path: 'campaign/create',
        name: 'CampaignCreate',
        component: () => import('@/views/campaign/create.vue'),
        meta: { title: '创建外呼任务', breadcrumb: ['外呼任务', '创建'] },
      },
      {
        path: 'campaign/:id',
        name: 'CampaignDetail',
        component: () => import('@/views/campaign/detail.vue'),
        meta: { title: '任务详情', breadcrumb: ['外呼任务', '详情'] },
      },
      {
        path: 'knowledge',
        name: 'Knowledge',
        component: () => import('@/views/knowledge/index.vue'),
        meta: { title: '知识库', breadcrumb: ['知识库'] },
      },
      {
        path: 'knowledge/favorites',
        name: 'KnowledgeFavorites',
        component: () => import('@/views/knowledge/favorites.vue'),
        meta: { title: '我的收藏', breadcrumb: ['知识库', '我的收藏'] },
      },
      {
        path: 'knowledge/:id',
        name: 'KnowledgeDetail',
        component: () => import('@/views/knowledge/detail.vue'),
        meta: { title: '文章详情', breadcrumb: ['知识库', '文章详情'] },
      },
      {
        path: 'material',
        name: 'Material',
        component: () => import('@/views/material/index.vue'),
        meta: { title: '素材库', breadcrumb: ['素材库'] },
      },
      {
        path: 'announcement',
        name: 'Announcement',
        component: () => import('@/views/announcement/index.vue'),
        meta: { title: '公告通知', breadcrumb: ['公告通知'] },
      },
      {
        path: 'announcement/:id',
        name: 'AnnouncementDetail',
        component: () => import('@/views/announcement/detail.vue'),
        meta: { title: '公告详情', breadcrumb: ['公告通知', '详情'] },
      },
      {
        path: 'sales-target',
        name: 'SalesTarget',
        component: () => import('@/views/sales-target/index.vue'),
        meta: { title: '目标业绩', icon: 'Aim', breadcrumb: ['目标业绩'] },
      },
      {
        path: 'customer-pool',
        name: 'CustomerPool',
        component: () => import('@/views/customer-pool/index.vue'),
        meta: { title: '客户公海池', icon: 'Connection', breadcrumb: ['客户公海池'] },
      },
      {
        path: 'customer-tag',
        name: 'CustomerTag',
        component: () => import('@/views/customer-tag/index.vue'),
        meta: { title: '标签管理', breadcrumb: ['标签管理'], roles: [UserRole.ADMIN, UserRole.MANAGER] },
      },
      {
        path: 'audit-log',
        name: 'AuditLog',
        component: () => import('@/views/audit-log/index.vue'),
        meta: { title: '审计日志', breadcrumb: ['审计日志'], roles: [UserRole.ADMIN] },
      },
      {
        path: 'user',
        name: 'UserManagement',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '用户管理', breadcrumb: ['用户管理'], roles: [UserRole.ADMIN] },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心', breadcrumb: ['个人中心'] },
      },
      {
        path: 'ai/alerts',
        name: 'AiAlerts',
        component: () => import('@/views/ai/alerts.vue'),
        meta: { title: '异常预警', icon: 'Warning', breadcrumb: ['AI 智能', '异常预警'] },
      },
      {
        path: 'ai/reports',
        name: 'AiReports',
        component: () => import('@/views/ai/reports.vue'),
        meta: { title: '报告中心', icon: 'Document', breadcrumb: ['AI 智能', '报告中心'] },
      },
      {
        path: 'call-center/call-log',
        name: 'CallCenterCallLog',
        component: () => import('@/views/call-center/call-log.vue'),
        meta: { title: '通话记录', breadcrumb: ['呼叫中心', '通话记录'] },
      },
      {
        path: 'ai/customer-portrait',
        name: 'AiCustomerPortrait',
        component: () => import('@/views/ai/customer-portrait.vue'),
        meta: { title: '客户画像', breadcrumb: ['AI 智能', '客户画像'] },
      },
      {
        path: 'ai/intent-prediction',
        name: 'AiIntentPrediction',
        component: () => import('@/views/ai/intent-prediction.vue'),
        meta: { title: '意向预测', breadcrumb: ['AI 智能', '意向预测'] },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { requiresAuth: false, title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Route guard
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.name === 'Login' && userStore.isLoggedIn) {
    next({ path: '/' })
    return
  }

  // Role-based access control
  const requiredRoles = to.meta.roles as UserRole[] | undefined
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = userStore.userRole as UserRole
    if (!requiredRoles.includes(userRole)) {
      ElMessage.warning('您没有权限访问该页面')
      next({ path: '/' })
      return
    }
  }

  next()
})

// Update document title after navigation
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - CRM 销售系统` : 'CRM 销售系统'
})

export default router
