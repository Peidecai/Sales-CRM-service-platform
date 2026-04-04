import request from './request'
import type { ApiResponse, PageResult } from './types'

/* ========== Types ========== */

export interface ForumCategoryVO {
  id: number
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
  postCount: number
  isActive: boolean
}

export interface ForumPostVO {
  id: number
  title: string
  content: string
  categoryId: number
  authorId: number
  isPinned: boolean
  isFeatured: boolean
  isLocked: boolean
  viewCount: number
  likeCount: number
  commentCount: number
  linkedArticleId: number | null
  lastCommentAt: string | null
  isLiked?: boolean
  isFavorited?: boolean
  createdAt: string
  updatedAt: string
}

export interface ForumCommentVO {
  id: number
  postId: number
  authorId: number
  content: string
  parentId: number | null
  replyToUserId: number | null
  likeCount: number
  createdAt: string
}

export interface ForumPostQuery {
  categoryId?: number
  keyword?: string
  isPinned?: boolean
  isFeatured?: boolean
  sortBy?: 'latest' | 'popular' | 'commented'
  page?: number
  pageSize?: number
}

export interface CreateForumPostParams {
  title: string
  content: string
  categoryId: number
  linkedArticleId?: number
}

export interface ModeratePostParams {
  isPinned?: boolean
  isFeatured?: boolean
  isLocked?: boolean
  categoryId?: number
}

/* ========== API ========== */

export const forumApi = {
  // Categories
  getCategories(): Promise<ApiResponse<ForumCategoryVO[]>> {
    return request.get('/forum/categories')
  },
  createCategory(data: {
    name: string
    description?: string
    icon?: string
    sortOrder?: number
  }): Promise<ApiResponse<ForumCategoryVO>> {
    return request.post('/forum/categories', data)
  },
  updateCategory(
    id: number,
    data: { name?: string; description?: string; icon?: string; sortOrder?: number },
  ): Promise<ApiResponse<ForumCategoryVO>> {
    return request.put(`/forum/categories/${id}`, data)
  },
  deleteCategory(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/forum/categories/${id}`)
  },

  // Posts
  getPosts(params: ForumPostQuery): Promise<ApiResponse<PageResult<ForumPostVO>>> {
    return request.get('/forum/posts', { params })
  },
  getPost(id: number): Promise<ApiResponse<ForumPostVO>> {
    return request.get(`/forum/posts/${id}`)
  },
  createPost(data: CreateForumPostParams): Promise<ApiResponse<ForumPostVO>> {
    return request.post('/forum/posts', data)
  },
  updatePost(id: number, data: Partial<CreateForumPostParams>): Promise<ApiResponse<ForumPostVO>> {
    return request.put(`/forum/posts/${id}`, data)
  },
  deletePost(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/forum/posts/${id}`)
  },
  moderatePost(id: number, data: ModeratePostParams): Promise<ApiResponse<ForumPostVO>> {
    return request.put(`/forum/posts/${id}/moderate`, data)
  },
  toggleLikePost(id: number): Promise<ApiResponse<{ liked: boolean }>> {
    return request.post(`/forum/posts/${id}/like`)
  },
  toggleFavoritePost(id: number): Promise<ApiResponse<{ favorited: boolean }>> {
    return request.post(`/forum/posts/${id}/favorite`)
  },
  getFavorites(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<{ list: ForumPostVO[]; total: number }>> {
    return request.get('/forum/posts/favorites', { params })
  },

  // Comments
  getComments(
    postId: number,
    params?: { page?: number; pageSize?: number },
  ): Promise<ApiResponse<{ list: ForumCommentVO[]; total: number }>> {
    return request.get(`/forum/posts/${postId}/comments`, { params })
  },
  createComment(
    postId: number,
    data: { content: string; parentId?: number; replyToUserId?: number },
  ): Promise<ApiResponse<ForumCommentVO>> {
    return request.post(`/forum/posts/${postId}/comments`, data)
  },
  deleteComment(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/forum/comments/${id}`)
  },
  toggleLikeComment(id: number): Promise<ApiResponse<{ liked: boolean }>> {
    return request.post(`/forum/comments/${id}/like`)
  },
}
