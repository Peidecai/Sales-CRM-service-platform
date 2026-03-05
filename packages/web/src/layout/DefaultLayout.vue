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
        <el-menu-item index="/customer">
          <el-icon><User /></el-icon>
          <template #title> 客户管理 </template>
        </el-menu-item>
        <el-menu-item index="/opportunity">
          <el-icon><TrendCharts /></el-icon>
          <template #title> 商机管理 </template>
        </el-menu-item>
        <el-menu-item index="/call-record">
          <el-icon><Phone /></el-icon>
          <template #title> 通话记录 </template>
        </el-menu-item>
        <el-menu-item index="/knowledge">
          <el-icon><Collection /></el-icon>
          <template #title> 知识库 </template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/audit-log">
          <el-icon><Document /></el-icon>
          <template #title> 审计日志 </template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/user">
          <el-icon><Setting /></el-icon>
          <template #title> 用户管理 </template>
        </el-menu-item>
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
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
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
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapsed = ref(false)
const isAdmin = computed(() => userStore.userRole === 'admin')

const activeRoute = computed(() => {
  // For detail pages, highlight the parent menu item
  const path = route.path
  if (path.startsWith('/customer')) return '/customer'
  if (path.startsWith('/opportunity')) return '/opportunity'
  if (path.startsWith('/call-record')) return '/call-record'
  if (path.startsWith('/knowledge')) return '/knowledge'
  if (path.startsWith('/audit-log')) return '/audit-log'
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
  商机管理: '/opportunity',
  通话记录: '/call-record',
  知识库: '/knowledge',
  审计日志: '/audit-log',
  用户管理: '/user',
  个人中心: '/profile',
}

function getBreadcrumbRoute(crumb: string): { path: string } | undefined {
  const path = breadcrumbRouteMap[crumb]
  return path ? { path } : undefined
}

async function handleCommand(command: string) {
  if (command === 'profile') {
    router.push({ name: 'Profile' })
  } else if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    userStore.logout()
    router.push({ name: 'Login' })
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
}

.logo-area {
  height: 60px;
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
