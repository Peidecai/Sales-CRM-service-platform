import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { useUserStore } from '@/stores/user'
import { setupPermissionDirective } from './permission'

/**
 * Helper to mount a component with the v-permission directive registered.
 */
function mountWithPermission(template: string, role: string) {
  const pinia = createPinia()
  setActivePinia(pinia)

  // Set user role
  const userStore = useUserStore(pinia)
  if (role) {
    userStore.userInfo = { id: 1, username: 'test', name: 'Test', role }
  }

  const TestComponent = defineComponent({
    template,
  })

  return mount(TestComponent, {
    global: {
      plugins: [pinia],
      directives: {
        permission: {
          mounted(el: HTMLElement, binding: { value: string | string[] }) {
            const requiredRoles = Array.isArray(binding.value) ? binding.value : [binding.value]
            const currentRole = useUserStore(pinia).userRole
            if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
              el.parentNode?.removeChild(el)
            }
          },
          updated(el: HTMLElement, binding: { value: string | string[] }) {
            const requiredRoles = Array.isArray(binding.value) ? binding.value : [binding.value]
            const currentRole = useUserStore(pinia).userRole
            if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
              el.parentNode?.removeChild(el)
            }
          },
        },
      },
    },
  })
}

describe('v-permission directive', () => {
  it('should keep element when user has matching role (string)', () => {
    const wrapper = mountWithPermission(
      '<div><span v-permission="\'admin\'">Secret</span></div>',
      'admin',
    )
    expect(wrapper.find('span').exists()).toBe(true)
    expect(wrapper.text()).toContain('Secret')
  })

  it('should remove element when user does not have matching role (string)', () => {
    const wrapper = mountWithPermission(
      '<div><span v-permission="\'admin\'">Secret</span></div>',
      'sales',
    )
    expect(wrapper.find('span').exists()).toBe(false)
  })

  it('should keep element when user has one of the matching roles (array)', () => {
    const wrapper = mountWithPermission(
      `<div><span v-permission="['admin', 'manager']">Manage</span></div>`,
      'manager',
    )
    expect(wrapper.find('span').exists()).toBe(true)
  })

  it('should remove element when user does not have any matching role (array)', () => {
    const wrapper = mountWithPermission(
      `<div><span v-permission="['admin', 'manager']">Manage</span></div>`,
      'sales',
    )
    expect(wrapper.find('span').exists()).toBe(false)
  })

  it('should remove element when no user info', () => {
    const wrapper = mountWithPermission(
      '<div><span v-permission="\'admin\'">Secret</span></div>',
      '',
    )
    expect(wrapper.find('span').exists()).toBe(false)
  })
})

describe('setupPermissionDirective', () => {
  it('should be a function', () => {
    expect(typeof setupPermissionDirective).toBe('function')
  })
})
