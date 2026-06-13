/**
 * Knowledge API — 知识库文章 & 分类
 */
import { http } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'

export interface KnowledgeArticleVO {
  id: number
  title: string
  content: string
  summary: string | null
  coverImage: string | null
  categoryId: number | null
  authorId: number
  viewCount: number
  likeCount: number
  collectCount: number
  commentCount: number
  tags: string[]
  isPublished: boolean
  isTop: boolean
  isRecommend: boolean
  publishedAt: string | null
  source: string | null
  status: string
  createdAt: string
  updatedAt: string
  category?: KnowledgeCategoryVO | null
}

export interface KnowledgeCategoryVO {
  id: number
  name: string
  parentId: number | null
  sort: number
  children?: KnowledgeCategoryVO[]
}

export interface ArticleQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  status?: string
}

export interface ArticleActionStatus {
  liked: boolean
  favorited: boolean
  likeCount: number
  collectCount: number
}

export const knowledgeApi = {
  getArticles(params: ArticleQueryParams): Promise<ApiResponse<PageResult<KnowledgeArticleVO>>> {
    return http.get('/knowledge/articles', params as unknown as Record<string, unknown>)
  },

  getArticle(id: number): Promise<ApiResponse<KnowledgeArticleVO>> {
    return http.get(`/knowledge/articles/${id}`)
  },

  getCategories(): Promise<ApiResponse<KnowledgeCategoryVO[]>> {
    return http.get('/knowledge/categories')
  },

  toggleLike(id: number): Promise<ApiResponse<ArticleActionStatus>> {
    return http.post(`/knowledge/articles/${id}/like`)
  },

  toggleFavorite(id: number): Promise<ApiResponse<ArticleActionStatus>> {
    return http.post(`/knowledge/articles/${id}/favorite`)
  },

  getArticleStatus(id: number): Promise<ApiResponse<ArticleActionStatus>> {
    return http.get(`/knowledge/articles/${id}/status`)
  },
}
