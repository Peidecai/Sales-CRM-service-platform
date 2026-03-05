import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

export function usePermission() {
  const userStore = useUserStore()

  const isAdmin = computed(() => userStore.userRole === 'admin')
  const isManager = computed(() => userStore.userRole === 'manager')
  const isSales = computed(() => userStore.userRole === 'sales')
  const isAdminOrManager = computed(() => isAdmin.value || isManager.value)

  function hasRole(...roles: string[]): boolean {
    return roles.includes(userStore.userRole)
  }

  return {
    isAdmin,
    isManager,
    isSales,
    isAdminOrManager,
    hasRole,
  }
}
