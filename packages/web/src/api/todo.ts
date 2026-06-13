import request from './request'
import type { ApiResponse, PageResult } from './types'
import { TodoStatus, TodoPriority, TodoCategory } from '@crm/shared'

export { TodoStatus, TodoPriority, TodoCategory }

export interface TodoVO {
  id: number
  userId: number
  title: string
  description: string | null
  category: TodoCategory
  priority: TodoPriority
  status: TodoStatus
  dueDate: string | null
  relatedType: string | null
  relatedId: number | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TodoQueryParams {
  page?: number
  pageSize?: number
  status?: TodoStatus
  priority?: TodoPriority
  category?: TodoCategory
}

export interface CreateTodoParams {
  title: string
  description?: string
  category?: TodoCategory
  priority?: TodoPriority
  dueDate?: string
  relatedType?: string
  relatedId?: number
}

export const todoApi = {
  list(params?: TodoQueryParams): Promise<ApiResponse<PageResult<TodoVO>>> {
    return request.get('/todos', { params: params ?? {} })
  },

  get(id: number): Promise<ApiResponse<TodoVO>> {
    return request.get(`/todos/${id}`)
  },

  create(data: CreateTodoParams): Promise<ApiResponse<TodoVO>> {
    return request.post('/todos', data)
  },

  update(id: number, data: Partial<CreateTodoParams>): Promise<ApiResponse<TodoVO>> {
    return request.put(`/todos/${id}`, data)
  },

  complete(id: number): Promise<ApiResponse<TodoVO>> {
    return request.put(`/todos/${id}/complete`)
  },

  cancel(id: number): Promise<ApiResponse<TodoVO>> {
    return request.put(`/todos/${id}/cancel`)
  },

  getOverdueCount(): Promise<ApiResponse<number>> {
    return request.get('/todos/overdue-count')
  },
}
