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
        path: 'customer/groups',
        name: 'CustomerGroups',
        component: () => import('@/views/customer/groups.vue'),
        meta: { title: '客户分组', breadcrumb: ['客户管理', '客户分组'] },
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
        path: 'product',
        name: 'Product',
        component: () => import('@/views/product/index.vue'),
        meta: { title: '产品管理', icon: 'Box', breadcrumb: ['产品管理'] },
      },
      {
        path: 'product/:id',
        name: 'ProductDetail',
        component: () => import('@/views/product/detail.vue'),
        meta: { title: '产品详情', breadcrumb: ['产品管理', '产品详情'] },
      },
      {
        path: 'signing',
        name: 'Signing',
        component: () => import('@/views/signing/index.vue'),
        meta: { title: '签约促成', icon: 'Stamp', breadcrumb: ['签约促成'] },
      },
      {
        path: 'signing/:id',
        name: 'SigningDetail',
        component: () => import('@/views/signing/detail.vue'),
        meta: { title: '签约详情', breadcrumb: ['签约促成', '签约详情'] },
      },
      {
        path: 'payment-plans',
        name: 'PaymentPlans',
        component: () => import('@/views/payment/plan.vue'),
        meta: { title: '回款计划', breadcrumb: ['回款管理', '回款计划'] },
      },
      {
        path: 'payment-dashboard',
        name: 'PaymentDashboard',
        component: () => import('@/views/payment/dashboard.vue'),
        meta: { title: '回款仪表盘', breadcrumb: ['回款管理', '回款仪表盘'] },
      },
      {
        path: 'bank-statements',
        name: 'BankStatements',
        component: () => import('@/views/payment/bank-statement.vue'),
        meta: {
          title: '银行流水',
          breadcrumb: ['回款管理', '银行流水'],
          roles: [UserRole.ADMIN, UserRole.MANAGER] as UserRole[],
        },
      },
      {
        path: 'contract',
        name: 'Contract',
        component: () => import('@/views/contract/index.vue'),
        meta: { title: '合同管理', icon: 'Document', breadcrumb: ['合同管理'] },
      },
      {
        path: 'contract/templates',
        name: 'ContractTemplates',
        component: () => import('@/views/contract/templates/index.vue'),
        meta: {
          title: '合同模板',
          breadcrumb: ['合同管理', '合同模板'],
          roles: [UserRole.ADMIN, UserRole.MANAGER],
        },
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
        path: 'payment/overdue',
        name: 'PaymentOverdue',
        component: () => import('@/views/payment/overdue/index.vue'),
        meta: { title: '逾期回款', breadcrumb: ['回款管理', '逾期回款'] },
      },
      {
        path: 'payment/statistics',
        name: 'PaymentStatistics',
        component: () => import('@/views/payment/statistics/index.vue'),
        meta: { title: '回款统计', breadcrumb: ['回款管理', '回款统计'] },
      },
      {
        path: 'service',
        name: 'Service',
        component: () => import('@/views/service/index.vue'),
        meta: { title: '服务管理', icon: 'Service', breadcrumb: ['服务管理'] },
      },
      {
        path: 'service/:id',
        name: 'ServiceDetail',
        component: () => import('@/views/service/detail.vue'),
        meta: { title: '服务详情', breadcrumb: ['服务管理', '服务详情'] },
      },
      {
        path: 'post-loan',
        name: 'PostLoan',
        component: () => import('@/views/post-loan/index.vue'),
        meta: { title: '贷后管理', icon: 'Coin', breadcrumb: ['贷后管理'] },
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
        path: 'pk',
        name: 'PkList',
        component: () => import('@/views/pk/index.vue'),
        meta: { title: '销售PK', icon: 'Trophy', breadcrumb: ['销售PK'] },
      },
      {
        path: 'pk/create',
        name: 'PkCreate',
        component: () => import('@/views/pk/create.vue'),
        meta: {
          title: '发起PK',
          breadcrumb: ['销售PK', '发起PK'],
          roles: [UserRole.ADMIN, UserRole.MANAGER],
        },
      },
      {
        path: 'pk/history',
        name: 'PkHistory',
        component: () => import('@/views/pk/history.vue'),
        meta: { title: 'PK历史', breadcrumb: ['销售PK', 'PK历史'] },
      },
      {
        path: 'pk/:id',
        name: 'PkDetail',
        component: () => import('@/views/pk/detail.vue'),
        meta: { title: 'PK详情', breadcrumb: ['销售PK', 'PK详情'] },
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
        meta: {
          title: '标签管理',
          breadcrumb: ['标签管理'],
          roles: [UserRole.ADMIN, UserRole.MANAGER],
        },
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
        path: 'ai/communication-analysis',
        name: 'AiCommunicationAnalysis',
        component: () => import('@/views/ai/communication-analysis.vue'),
        meta: { title: '沟通分析', breadcrumb: ['AI 智能', '沟通分析'] },
      },
      {
        path: 'ai/reminders',
        name: 'AiReminders',
        component: () => import('@/views/ai-reminder/index.vue'),
        meta: { title: 'AI 助手', icon: 'MagicStick', breadcrumb: ['AI 智能', 'AI 助手'] },
      },
      {
        path: 'ai/reports',
        name: 'AiReports',
        component: () => import('@/views/ai/reports.vue'),
        meta: { title: '报告中心', icon: 'Document', breadcrumb: ['AI 智能', '报告中心'] },
      },
      {
        path: 'ai/employee-profile/:id',
        name: 'AiEmployeeProfile',
        component: () => import('@/views/ai/employee-profile.vue'),
        meta: { title: '员工画像', breadcrumb: ['AI 智能', '员工画像'] },
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
      {
        path: 'prospect',
        name: 'Prospect',
        component: () => import('@/views/prospect/index.vue'),
        meta: { title: '线索池', icon: 'Magnet', breadcrumb: ['获客管理', '线索池'] },
      },
      {
        path: 'prospect/search',
        name: 'ProspectSearch',
        component: () => import('@/views/prospect/search.vue'),
        meta: {
          title: '搜索获客',
          breadcrumb: ['获客管理', '搜索获客'],
          roles: [UserRole.ADMIN, UserRole.MANAGER],
        },
      },
      {
        path: 'prospect/:id',
        name: 'ProspectDetail',
        component: () => import('@/views/prospect/detail.vue'),
        meta: { title: '线索详情', breadcrumb: ['获客管理', '线索详情'] },
      },
      {
        path: 'cloud-call/settings',
        name: 'CloudCallSettings',
        component: () => import('@/views/cloud-call/settings.vue'),
        meta: {
          title: '云呼设置',
          breadcrumb: ['云呼设置'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'speech',
        name: 'Speech',
        component: () => import('@/views/speech/index.vue'),
        meta: { title: '话术管理', icon: 'ChatDotRound', breadcrumb: ['话术管理'] },
      },
      {
        path: 'speech/:id',
        name: 'SpeechDetail',
        component: () => import('@/views/speech/detail.vue'),
        meta: { title: '话术详情', breadcrumb: ['话术管理', '话术详情'] },
      },
      {
        path: 'negotiation',
        name: 'Negotiation',
        component: () => import('@/views/negotiation/index.vue'),
        meta: { title: '谈判分析', icon: 'Histogram', breadcrumb: ['谈判分析'] },
      },
      {
        path: 'negotiation/:id',
        name: 'NegotiationDetail',
        component: () => import('@/views/negotiation/detail.vue'),
        meta: { title: '谈判分析详情', breadcrumb: ['谈判分析', '详情'] },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: {
          title: '系统设置',
          icon: 'Setting',
          breadcrumb: ['系统设置'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'settings/roles',
        name: 'RoleManagement',
        component: () => import('@/views/settings/roles.vue'),
        meta: {
          title: '角色管理',
          breadcrumb: ['系统设置', '角色管理'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'settings/data-masking',
        name: 'DataMasking',
        component: () => import('@/views/settings/data-masking.vue'),
        meta: {
          title: '数据脱敏',
          breadcrumb: ['系统设置', '数据脱敏'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'settings/ai',
        name: 'AiConfig',
        component: () => import('@/views/settings/ai-config.vue'),
        meta: {
          title: 'AI 模型配置',
          breadcrumb: ['系统设置', 'AI 模型配置'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'settings/ai/prompts',
        name: 'AiPrompts',
        component: () => import('@/views/settings/ai-prompts.vue'),
        meta: {
          title: 'AI 提示词',
          breadcrumb: ['系统设置', 'AI 提示词'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'settings/ai/playground',
        name: 'AiPlayground',
        component: () => import('@/views/settings/ai-playground.vue'),
        meta: {
          title: 'AI 测试',
          breadcrumb: ['系统设置', 'AI 测试'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'settings/ai/usage',
        name: 'AiUsage',
        component: () => import('@/views/settings/ai-usage.vue'),
        meta: {
          title: 'AI 用量统计',
          breadcrumb: ['系统设置', 'AI 用量统计'],
          roles: [UserRole.ADMIN],
        },
      },
      {
        path: 'forum',
        name: 'Forum',
        component: () => import('@/views/forum/index.vue'),
        meta: { title: '企业论坛', icon: 'ChatRound', breadcrumb: ['企业论坛'] },
      },
      {
        path: 'forum/create-post',
        name: 'ForumCreatePost',
        component: () => import('@/views/forum/create-post.vue'),
        meta: { title: '发表帖子', breadcrumb: ['企业论坛', '发表帖子'] },
      },
      {
        path: 'forum/post/:id',
        name: 'ForumPostDetail',
        component: () => import('@/views/forum/post-detail.vue'),
        meta: { title: '帖子详情', breadcrumb: ['企业论坛', '帖子详情'] },
      },
      // ─── Report Routes ────────────────────────────────────────────
      {
        path: 'report',
        component: () => import('@/views/report/ReportLayout.vue'),
        meta: { title: '智能报表', breadcrumb: ['智能报表'] },
        children: [
          {
            path: '',
            redirect: '/report/call/statistics',
          },
          {
            path: 'call/statistics',
            name: 'ReportCallStatistics',
            component: () => import('@/views/report/call/Statistics.vue'),
            meta: { title: '通话统计', breadcrumb: ['智能报表', '通话统计'] },
          },
          {
            path: 'call/daily',
            name: 'ReportCallDaily',
            component: () => import('@/views/report/call/DailyAnalysis.vue'),
            meta: { title: '每日分析', breadcrumb: ['智能报表', '每日分析'] },
          },
          {
            path: 'call/personal',
            name: 'ReportCallPersonal',
            component: () => import('@/views/report/call/PersonalAnalysis.vue'),
            meta: { title: '个人分析', breadcrumb: ['智能报表', '个人分析'] },
          },
          {
            path: 'call/detail',
            name: 'ReportCallDetail',
            component: () => import('@/views/report/call/DetailAnalysis.vue'),
            meta: { title: '详细分析', breadcrumb: ['智能报表', '详细分析'] },
          },
          {
            path: 'performance/overview',
            name: 'ReportPerformanceOverview',
            component: () => import('@/views/report/performance/Overview.vue'),
            meta: { title: '业绩概览', breadcrumb: ['智能报表', '业绩概览'] },
          },
          {
            path: 'performance/summary',
            name: 'ReportPerformanceSummary',
            component: () => import('@/views/report/performance/Summary.vue'),
            meta: { title: '业绩汇总', breadcrumb: ['智能报表', '业绩汇总'] },
          },
          {
            path: 'performance/signing',
            name: 'ReportPerformanceSigning',
            component: () => import('@/views/report/performance/Signing.vue'),
            meta: { title: '签约统计', breadcrumb: ['智能报表', '签约统计'] },
          },
          {
            path: 'performance/collection',
            name: 'ReportPerformanceCollection',
            component: () => import('@/views/report/performance/Collection.vue'),
            meta: { title: '回款统计', breadcrumb: ['智能报表', '回款统计'] },
          },
          {
            path: 'ai/speech-skill',
            name: 'ReportAiSpeechSkill',
            component: () => import('@/views/report/ai/SpeechSkill.vue'),
            meta: { title: '话术分析', breadcrumb: ['智能报表', '话术分析'] },
          },
          {
            path: 'ai/score-ranking',
            name: 'ReportAiScoreRanking',
            component: () => import('@/views/report/ai/ScoreRanking.vue'),
            meta: { title: '评分排行', breadcrumb: ['智能报表', '评分排行'] },
          },
          {
            path: 'ai/employee-portrait',
            name: 'ReportAiEmployeePortrait',
            component: () => import('@/views/report/ai/EmployeePortrait.vue'),
            meta: { title: '员工画像', breadcrumb: ['智能报表', '员工画像'] },
          },
          {
            path: 'ai/tag-stats',
            name: 'ReportAiTagStats',
            component: () => import('@/views/report/ai/TagStats.vue'),
            meta: { title: '标签统计', breadcrumb: ['智能报表', '标签统计'] },
          },
          {
            path: 'ai/appointment-ability',
            name: 'ReportAiAppointmentAbility',
            component: () => import('@/views/report/ai/AppointmentAbility.vue'),
            meta: { title: '邀约能力', breadcrumb: ['智能报表', '邀约能力'] },
          },
          {
            path: 'funnel/sales',
            name: 'ReportFunnelSales',
            component: () => import('@/views/report/funnel/SalesFunnel.vue'),
            meta: { title: '销售漏斗', breadcrumb: ['智能报表', '销售漏斗'] },
          },
        ],
      },
      // ─── Sales Assistant Routes ──────────────────────────────────
      {
        path: 'todo',
        name: 'Todo',
        component: () => import('@/views/todo/index.vue'),
        meta: { title: '待办事项', icon: 'List', breadcrumb: ['业务助手', '待办事项'] },
      },
      {
        path: 'annotation',
        name: 'Annotation',
        component: () => import('@/views/annotation/index.vue'),
        meta: { title: '批注管理', breadcrumb: ['业务助手', '批注管理'] },
      },
      {
        path: 'annotation/my',
        name: 'AnnotationMy',
        component: () => import('@/views/annotation/my.vue'),
        meta: { title: '我的批注', breadcrumb: ['业务助手', '我的批注'] },
      },
      {
        path: 'notification/settings',
        name: 'NotificationSettings',
        component: () => import('@/views/notification/settings.vue'),
        meta: { title: '通知设置', breadcrumb: ['通知设置'] },
      },
      // ─── Screen Routes ────────────────────────────────────────────
      {
        path: 'screen/performance',
        name: 'ScreenPerformance',
        component: () => import('@/views/screen/PerformanceScreen.vue'),
        meta: {
          title: '业绩大屏',
          breadcrumb: ['数据大屏', '业绩大屏'],
          roles: [UserRole.ADMIN, UserRole.MANAGER],
        },
      },
      {
        path: 'screen/cockpit',
        name: 'ScreenCockpit',
        component: () => import('@/views/screen/CockpitScreen.vue'),
        meta: {
          title: '驾驶舱',
          breadcrumb: ['数据大屏', '驾驶舱'],
          roles: [UserRole.ADMIN, UserRole.MANAGER],
        },
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
