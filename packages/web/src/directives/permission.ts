import type { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * v-permission directive
 *
 * Usage:
 *   v-permission="'admin'"                     — visible only to admin (role check)
 *   v-permission="['admin','manager']"          — visible to admin or manager (role check)
 *   v-permission="'customer:customer:delete'"   — visible if user has permission code
 */
const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
}

function isPermissionCode(value: string): boolean {
  // Permission codes contain at least 2 colons: module:resource:action
  return value.includes(':')
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
  const userStore = useUserStore()
  const value = binding.value

  if (typeof value === 'string' && isPermissionCode(value)) {
    // Permission code check
    if (!userStore.hasPermission(value)) {
      el.parentNode?.removeChild(el)
    }
  } else {
    // Role check (backward compatible)
    const currentRole = userStore.userRole
    const requiredRoles = Array.isArray(value) ? value : [value]

    if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
      el.parentNode?.removeChild(el)
    }
  }
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}
