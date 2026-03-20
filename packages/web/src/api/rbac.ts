import request from './request'
import type { ApiResponse, PageResult } from './types'

export interface SysPermission {
  id: number
  name: string
  code: string
  resource: string
  action: string
  module: string | null
  description: string | null
  sort: number
  createdAt: string
}

export interface SysRole {
  id: number
  name: string
  code: string
  description: string | null
  label: string | null
  isBuiltin: boolean
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
  permissions: SysPermission[]
}

export interface PermissionTreeNode {
  module: string
  label: string
  children: SysPermission[]
}

export interface CreateRoleDto {
  code: string
  name: string
  label?: string
  description?: string
}

export interface UpdateRoleDto {
  code?: string
  name?: string
  label?: string
  description?: string
  status?: 'active' | 'disabled'
}

export const rbacApi = {
  // Roles
  getRoles(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<PageResult<SysRole>>> {
    return request.get('/rbac/roles', { params })
  },

  getRole(id: number): Promise<ApiResponse<SysRole>> {
    return request.get(`/rbac/roles/${id}`)
  },

  createRole(data: CreateRoleDto): Promise<ApiResponse<SysRole>> {
    return request.post('/rbac/roles', data)
  },

  updateRole(id: number, data: UpdateRoleDto): Promise<ApiResponse<SysRole>> {
    return request.put(`/rbac/roles/${id}`, data)
  },

  deleteRole(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/rbac/roles/${id}`)
  },

  assignPermissions(roleId: number, permissionIds: number[]): Promise<ApiResponse<SysRole>> {
    return request.post(`/rbac/roles/${roleId}/permissions`, { permissionIds })
  },

  // Permissions
  getPermissions(): Promise<ApiResponse<SysPermission[]>> {
    return request.get('/rbac/permissions')
  },

  getPermissionTree(): Promise<ApiResponse<PermissionTreeNode[]>> {
    return request.get('/rbac/permissions/tree')
  },

  getMyPermissions(): Promise<ApiResponse<string[]>> {
    return request.get('/rbac/permissions/me')
  },
}
