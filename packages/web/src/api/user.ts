import request from './request'

// User role enum matching backend
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
}

// User VO returned from backend
export interface UserVO {
  id: number
  username: string
  name: string
  email: string | null
  role: UserRole
  phone: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Query params
export interface UserQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  role?: UserRole
}

// Create params
export interface CreateUserParams {
  username: string
  password: string
  name: string
  email?: string
  role?: UserRole
  phone?: string
}

// Update params
export interface UpdateUserParams {
  name?: string
  email?: string
  role?: UserRole
  phone?: string
  isActive?: boolean
  password?: string
}

// API response wrapper
export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

// Paginated result
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export const userApi = {
  getList(params: UserQueryParams): Promise<ApiResponse<PageResult<UserVO>>> {
    return request.get('/users', { params })
  },

  getDetail(id: number): Promise<ApiResponse<UserVO>> {
    return request.get(`/users/${id}`)
  },

  create(data: CreateUserParams): Promise<ApiResponse<UserVO>> {
    return request.post('/users', data)
  },

  update(id: number, data: UpdateUserParams): Promise<ApiResponse<UserVO>> {
    return request.put(`/users/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/users/${id}`)
  },
}
