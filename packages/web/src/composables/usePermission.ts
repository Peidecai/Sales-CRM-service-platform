import { computed } from 'vue'
import { UserRole } from '@crm/shared'
import { useUserStore } from '@/stores/user'

export function usePermission() {
  const userStore = useUserStore()

  // 这些仅用于前端展示控制；真实数据权限必须由后端 RBAC/数据范围兜底。
  const isAdmin = computed(() => userStore.userRole === UserRole.ADMIN)
  const isManager = computed(() => userStore.userRole === UserRole.MANAGER)
  const isSales = computed(() => userStore.userRole === UserRole.SALES)
  const isAdminOrManager = computed(() => isAdmin.value || isManager.value)

  function hasRole(...roles: UserRole[]): boolean {
    return roles.includes(userStore.userRole as UserRole)
  }

  function hasPermission(code: string): boolean {
    return userStore.hasPermission(code)
  }

  return {
    isAdmin,
    isManager,
    isSales,
    isAdminOrManager,
    hasRole,
    hasPermission,
  }
}
