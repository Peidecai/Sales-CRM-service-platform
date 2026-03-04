import request from './request'

// ---- Interfaces ----

export interface CategoryVO {
  id: number
  name: string
  parentId: number | null
  sort: number
  description: string | null
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export interface ArticleVO {
  id: number
  title: string
  content: string
  categoryId: number | null
  authorId: number
  viewCount: number
  likeCount: number
  tags: string[] | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export interface ArticleQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  isPublished?: boolean
}

export interface CreateArticleParams {
  title: string
  content: string
  categoryId?: number
  authorId: number
  tags?: string[]
  isPublished?: boolean
}

export type UpdateArticleParams = Partial<CreateArticleParams>

export interface CreateCategoryParams {
  name: string
  parentId?: number
  sort?: number
  description?: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ---- Article APIs ----

export const knowledgeApi = {
  getArticles(params: ArticleQueryParams): Promise<ApiResponse<PageResult<ArticleVO>>> {
    return request.get('/knowledge/articles', { params })
  },

  getArticle(id: number): Promise<ApiResponse<ArticleVO>> {
    return request.get(`/knowledge/articles/${id}`)
  },

  createArticle(data: CreateArticleParams): Promise<ApiResponse<ArticleVO>> {
    return request.post('/knowledge/articles', data)
  },

  updateArticle(id: number, data: UpdateArticleParams): Promise<ApiResponse<ArticleVO>> {
    return request.put(`/knowledge/articles/${id}`, data)
  },

  removeArticle(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/knowledge/articles/${id}`)
  },

  // ---- Category APIs ----

  getCategories(): Promise<ApiResponse<CategoryVO[]>> {
    return request.get('/knowledge/categories')
  },

  createCategory(data: CreateCategoryParams): Promise<ApiResponse<CategoryVO>> {
    return request.post('/knowledge/categories', data)
  },

  removeCategory(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/knowledge/categories/${id}`)
  },
}
