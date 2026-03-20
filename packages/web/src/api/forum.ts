import request from './request'

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
  getCategories() {
    return request.get<ForumCategoryVO[]>('/forum/categories')
  },
  createCategory(data: { name: string; description?: string; icon?: string; sortOrder?: number }) {
    return request.post('/forum/categories', data)
  },
  updateCategory(
    id: number,
    data: { name?: string; description?: string; icon?: string; sortOrder?: number },
  ) {
    return request.put(`/forum/categories/${id}`, data)
  },
  deleteCategory(id: number) {
    return request.delete(`/forum/categories/${id}`)
  },

  // Posts
  getPosts(params: ForumPostQuery) {
    return request.get<{ list: ForumPostVO[]; total: number; page: number; pageSize: number }>(
      '/forum/posts',
      { params },
    )
  },
  getPost(id: number) {
    return request.get<ForumPostVO>(`/forum/posts/${id}`)
  },
  createPost(data: CreateForumPostParams) {
    return request.post<ForumPostVO>('/forum/posts', data)
  },
  updatePost(id: number, data: Partial<CreateForumPostParams>) {
    return request.put<ForumPostVO>(`/forum/posts/${id}`, data)
  },
  deletePost(id: number) {
    return request.delete(`/forum/posts/${id}`)
  },
  moderatePost(id: number, data: ModeratePostParams) {
    return request.put(`/forum/posts/${id}/moderate`, data)
  },
  toggleLikePost(id: number) {
    return request.post<{ liked: boolean }>(`/forum/posts/${id}/like`)
  },
  toggleFavoritePost(id: number) {
    return request.post<{ favorited: boolean }>(`/forum/posts/${id}/favorite`)
  },
  getFavorites(params?: { page?: number; pageSize?: number }) {
    return request.get<{ list: ForumPostVO[]; total: number }>('/forum/posts/favorites', { params })
  },

  // Comments
  getComments(postId: number, params?: { page?: number; pageSize?: number }) {
    return request.get<{ list: ForumCommentVO[]; total: number }>(
      `/forum/posts/${postId}/comments`,
      { params },
    )
  },
  createComment(
    postId: number,
    data: { content: string; parentId?: number; replyToUserId?: number },
  ) {
    return request.post<ForumCommentVO>(`/forum/posts/${postId}/comments`, data)
  },
  deleteComment(id: number) {
    return request.delete(`/forum/comments/${id}`)
  },
  toggleLikeComment(id: number) {
    return request.post<{ liked: boolean }>(`/forum/comments/${id}/like`)
  },
}
