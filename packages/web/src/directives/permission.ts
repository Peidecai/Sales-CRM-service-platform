import type { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * v-permission directive
 *
 * Usage:
 *   v-permission="'admin'"           — visible only to admin
 *   v-permission="['admin','manager']" — visible to admin or manager
 */
const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
  const userStore = useUserStore()
  const currentRole = userStore.userRole
  const requiredRoles = Array.isArray(binding.value) ? binding.value : [binding.value]

  if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
    // Remove element from DOM
    el.parentNode?.removeChild(el)
  }
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}
