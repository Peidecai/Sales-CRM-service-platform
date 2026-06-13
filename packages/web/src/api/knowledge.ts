import request from './request'
import type { ApiResponse, PageResult } from './types'

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

export interface AskQuestionParams {
  question: string
  topK?: number
}

export interface AskResultSource {
  articleId: number
  title: string
  similarity: number
}

export interface AskResult {
  answer: string
  sources: AskResultSource[]
}

export interface ArticleActionResponse {
  liked: boolean
  favorited: boolean
  likeCount: number
}

export interface CreateCategoryParams {
  name: string
  parentId?: number
  sort?: number
  description?: string
}

export interface CommentVO {
  id: number
  articleId: number
  userId: number
  parentId: number | null
  content: string
  createdAt: string
  deleted: boolean
  children: CommentVO[]
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

  toggleArticleLike(id: number): Promise<ApiResponse<ArticleActionResponse>> {
    return request.post(`/knowledge/articles/${id}/like`)
  },

  toggleArticleFavorite(id: number): Promise<ApiResponse<ArticleActionResponse>> {
    return request.post(`/knowledge/articles/${id}/favorite`)
  },

  getArticleStatus(id: number): Promise<ApiResponse<ArticleActionResponse>> {
    return request.get(`/knowledge/articles/${id}/status`)
  },

  getUserFavorites(): Promise<ApiResponse<ArticleVO[]>> {
    return request.get('/knowledge/favorites')
  },

  // ---- Category APIs ----

  getCategories(tree?: boolean): Promise<ApiResponse<CategoryVO[]>> {
    return request.get('/knowledge/categories', { params: tree ? { tree: 'true' } : {} })
  },

  getComments(
    articleId: number,
    page?: number,
    pageSize?: number,
  ): Promise<ApiResponse<{ list: CommentVO[]; total: number }>> {
    return request.get(`/knowledge/articles/${articleId}/comments`, { params: { page, pageSize } })
  },

  createComment(
    articleId: number,
    data: { content: string; parentId?: number },
  ): Promise<ApiResponse<CommentVO>> {
    return request.post(`/knowledge/articles/${articleId}/comments`, data)
  },

  removeComment(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/knowledge/comments/${id}`)
  },

  getSearchHistory(): Promise<ApiResponse<string[]>> {
    return request.get('/knowledge/search/history')
  },

  getSearchSuggestions(q: string): Promise<ApiResponse<string[]>> {
    return request.get('/knowledge/search/suggestions', { params: { q } })
  },

  createCategory(data: CreateCategoryParams): Promise<ApiResponse<CategoryVO>> {
    return request.post('/knowledge/categories', data)
  },

  removeCategory(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/knowledge/categories/${id}`)
  },

  // ---- RAG Q&A API ----

  askQuestion(data: AskQuestionParams): Promise<ApiResponse<AskResult>> {
    return request.post('/knowledge/ask', data)
  },
}
