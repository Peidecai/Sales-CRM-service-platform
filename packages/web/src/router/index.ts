import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'
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
        path: 'opportunity/:id',
        name: 'OpportunityDetail',
        component: () => import('@/views/opportunity/detail.vue'),
        meta: { title: '商机详情', breadcrumb: ['商机管理', '商机详情'] },
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
        path: 'knowledge',
        name: 'Knowledge',
        component: () => import('@/views/knowledge/index.vue'),
        meta: { title: '知识库', breadcrumb: ['知识库'] },
      },
      {
        path: 'knowledge/:id',
        name: 'KnowledgeDetail',
        component: () => import('@/views/knowledge/detail.vue'),
        meta: { title: '文章详情', breadcrumb: ['知识库', '文章详情'] },
      },
      {
        path: 'audit-log',
        name: 'AuditLog',
        component: () => import('@/views/audit-log/index.vue'),
        meta: { title: '审计日志', breadcrumb: ['审计日志'], roles: ['admin'] },
      },
      {
        path: 'user',
        name: 'UserManagement',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '用户管理', breadcrumb: ['用户管理'], roles: ['admin'] },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心', breadcrumb: ['个人中心'] },
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
  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = userStore.userRole
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
