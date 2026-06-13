import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { DirectiveBinding, ObjectDirective } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { UserRole } from '@crm/shared'
import { useUserStore } from '@/stores/user'
import { setupPermissionDirective } from './permission'

function getRegisteredDirective() {
  const app = {
    directive: vi.fn(),
  }
  setupPermissionDirective(app as never)
  expect(app.directive).toHaveBeenCalledWith('permission', expect.any(Object))
  return app.directive.mock.calls[0][1] as ObjectDirective<HTMLElement, string | string[]>
}

describe('permission directive', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('removes element in mounted hook when role does not match', () => {
    const directive = getRegisteredDirective()
    const userStore = useUserStore()
    userStore.userInfo = { id: 1, username: 'sales', name: 'Sales User', role: UserRole.SALES }

    const removeChild = vi.fn()
    const el = { parentNode: { removeChild } } as unknown as HTMLElement
    const binding = { value: 'admin' } as DirectiveBinding<string | string[]>

    directive.mounted?.(el, binding, null as never, null as never)

    expect(removeChild).toHaveBeenCalledWith(el)
  })

  it('keeps element in mounted hook when role matches', () => {
    const directive = getRegisteredDirective()
    const userStore = useUserStore()
    userStore.userInfo = { id: 2, username: 'admin', name: 'Admin', role: UserRole.ADMIN }

    const removeChild = vi.fn()
    const el = { parentNode: { removeChild } } as unknown as HTMLElement
    const binding = { value: 'admin' } as DirectiveBinding<string | string[]>

    directive.mounted?.(el, binding, null as never, null as never)

    expect(removeChild).not.toHaveBeenCalled()
  })

  it('removes element in updated hook for array role mismatch', () => {
    const directive = getRegisteredDirective()
    const userStore = useUserStore()
    userStore.userInfo = { id: 3, username: 'sales', name: 'Sales', role: UserRole.SALES }

    const removeChild = vi.fn()
    const el = { parentNode: { removeChild } } as unknown as HTMLElement
    const binding = { value: ['admin', 'manager'] } as DirectiveBinding<string | string[]>

    directive.updated?.(el, binding, null as never, null as never)

    expect(removeChild).toHaveBeenCalledWith(el)
  })

  it('does not throw when parentNode is missing', () => {
    const directive = getRegisteredDirective()
    const userStore = useUserStore()
    userStore.userInfo = { id: 4, username: 'sales', name: 'Sales', role: UserRole.SALES }

    const el = { parentNode: null } as unknown as HTMLElement
    const binding = { value: 'admin' } as DirectiveBinding<string | string[]>

    expect(() => directive.mounted?.(el, binding, null as never, null as never)).not.toThrow()
  })
})
