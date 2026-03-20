import request from './request'

/* ========== Types ========== */

export interface TrainingCategoryVO {
  id: number
  name: string
  type: string
  sortOrder: number
  description: string | null
  createdAt: string
}

export interface TrainingVideoVO {
  id: number
  title: string
  description: string | null
  fileUrl: string
  coverUrl: string | null
  duration: number
  fileSize: number
  format: string
  categoryId: number
  sortOrder: number
  isPublished: boolean
  uploadedById: number
  category?: TrainingCategoryVO
  chapters?: VideoChapterVO[]
  createdAt: string
  updatedAt: string
}

export interface VideoChapterVO {
  id: number
  videoId: number
  title: string
  startTime: number
  sortOrder: number
}

export interface VideoProgressVO {
  id: number
  userId: number
  videoId: number
  watchedSeconds: number
  lastPosition: number
  completionRate: number
  isCompleted: boolean
  completedAt: string | null
}

export interface VideoBookmarkVO {
  id: number
  userId: number
  videoId: number
  timestamp: number
  note: string | null
  createdAt: string
}

export interface TrainingTaskVO {
  id: number
  title: string
  description: string | null
  videoId: number
  assignedById: number
  deadline: string
  video?: TrainingVideoVO
  assignees?: TrainingTaskAssigneeVO[]
  createdAt: string
}

export interface TrainingTaskAssigneeVO {
  id: number
  taskId: number
  userId: number
  isCompleted: boolean
  completedAt: string | null
}

export interface TrainingStatsVO {
  totalWatchTime: number
  completedCount: number
}

export interface TaskStatisticsVO {
  totalTasks: number
  completionRate: number
  overdueTasks: number
}

export interface VideoQueryParams {
  categoryId?: number
  isPublished?: boolean
  keyword?: string
  page?: number
  pageSize?: number
}

/* ========== API ========== */

export const trainingApi = {
  // Categories
  getCategories() {
    return request.get<TrainingCategoryVO[]>('/training/categories')
  },
  createCategory(data: { name: string; type: string; sortOrder?: number; description?: string }) {
    return request.post<TrainingCategoryVO>('/training/categories', data)
  },
  updateCategory(
    id: number,
    data: Partial<{ name: string; type: string; sortOrder: number; description: string }>,
  ) {
    return request.put<TrainingCategoryVO>(`/training/categories/${id}`, data)
  },
  deleteCategory(id: number) {
    return request.delete(`/training/categories/${id}`)
  },

  // Videos
  getVideos(params: VideoQueryParams) {
    return request.get<{ list: TrainingVideoVO[]; total: number; page: number; pageSize: number }>(
      '/training/videos',
      { params },
    )
  },
  getVideo(id: number) {
    return request.get<TrainingVideoVO>(`/training/videos/${id}`)
  },
  createVideo(data: {
    title: string
    fileUrl: string
    duration: number
    fileSize: number
    format: string
    categoryId: number
    description?: string
    coverUrl?: string
    sortOrder?: number
  }) {
    return request.post<TrainingVideoVO>('/training/videos', data)
  },
  updateVideo(id: number, data: Partial<TrainingVideoVO>) {
    return request.put<TrainingVideoVO>(`/training/videos/${id}`, data)
  },
  deleteVideo(id: number) {
    return request.delete(`/training/videos/${id}`)
  },
  togglePublish(id: number) {
    return request.post<TrainingVideoVO>(`/training/videos/${id}/publish`)
  },

  // Chapters
  getChapters(videoId: number) {
    return request.get<VideoChapterVO[]>(`/training/videos/${videoId}/chapters`)
  },
  createChapter(videoId: number, data: { title: string; startTime: number; sortOrder?: number }) {
    return request.post<VideoChapterVO>(`/training/videos/${videoId}/chapters`, data)
  },
  updateChapter(
    id: number,
    data: Partial<{ title: string; startTime: number; sortOrder: number }>,
  ) {
    return request.put<VideoChapterVO>(`/training/chapters/${id}`, data)
  },
  deleteChapter(id: number) {
    return request.delete(`/training/chapters/${id}`)
  },

  // Progress
  getProgress(videoId: number) {
    return request.get<VideoProgressVO | null>(`/training/videos/${videoId}/progress`)
  },
  updateProgress(videoId: number, data: { watchedSeconds: number; lastPosition: number }) {
    return request.put<VideoProgressVO>(`/training/videos/${videoId}/progress`, data)
  },
  getMyStats() {
    return request.get<TrainingStatsVO>('/training/my/stats')
  },

  // Bookmarks
  getBookmarks(videoId: number) {
    return request.get<VideoBookmarkVO[]>(`/training/videos/${videoId}/bookmarks`)
  },
  createBookmark(videoId: number, data: { timestamp: number; note?: string }) {
    return request.post<VideoBookmarkVO>(`/training/videos/${videoId}/bookmarks`, data)
  },
  deleteBookmark(id: number) {
    return request.delete(`/training/bookmarks/${id}`)
  },

  // Tasks
  getTasks(params?: { userId?: number; page?: number; pageSize?: number }) {
    return request.get<{ list: TrainingTaskVO[]; total: number; page: number; pageSize: number }>(
      '/training/tasks',
      { params },
    )
  },
  getTask(id: number) {
    return request.get<TrainingTaskVO>(`/training/tasks/${id}`)
  },
  createTask(data: {
    title: string
    videoId: number
    assigneeIds: number[]
    deadline: string
    description?: string
  }) {
    return request.post<TrainingTaskVO>('/training/tasks', data)
  },
  completeTask(id: number) {
    return request.post<TrainingTaskAssigneeVO>(`/training/tasks/${id}/complete`)
  },
  getTaskStatistics() {
    return request.get<TaskStatisticsVO>('/training/tasks/statistics')
  },
}
