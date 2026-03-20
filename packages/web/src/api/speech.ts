import request from './request'

/* ---------- Types ---------- */

export interface SpeechCategory {
  id: number
  name: string
  code: string
  sort: number
}

export interface SpeechTemplate {
  id: number
  title: string
  content: string
  categoryId: number
  category?: SpeechCategory
  scene: string | null
  tags: string | null
  usageCount: number
  status: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface SpeechAnnotation {
  id: number
  callRecordId: number
  templateId: number | null
  template?: SpeechTemplate | null
  startTime: number
  endTime: number
  text: string
  comment: string | null
  score: number | null
  annotatedBy: number
  createdAt: string
}

export interface SpeechTemplateQuery {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  status?: string
}

/* ---------- Templates ---------- */

export function getTemplates(params: SpeechTemplateQuery) {
  return request.get<{ list: SpeechTemplate[]; total: number; page: number; pageSize: number }>(
    '/speech-templates',
    { params },
  )
}

export function getTemplate(id: number) {
  return request.get<SpeechTemplate>(`/speech-templates/${id}`)
}

export function createTemplate(data: Partial<SpeechTemplate>) {
  return request.post<SpeechTemplate>('/speech-templates', data)
}

export function updateTemplate(id: number, data: Partial<SpeechTemplate>) {
  return request.put<SpeechTemplate>(`/speech-templates/${id}`, data)
}

export function deleteTemplate(id: number) {
  return request.delete(`/speech-templates/${id}`)
}

export function exportTemplates() {
  return request.get('/speech-templates/export', { responseType: 'blob' })
}

export function getStatistics() {
  return request.get<Array<{ categoryId: number; count: string }>>('/speech-templates/statistics')
}

/* ---------- Categories ---------- */

export function getCategories() {
  return request.get<SpeechCategory[]>('/speech-categories')
}

export function createCategory(data: { name: string; code: string; sort?: number }) {
  return request.post<SpeechCategory>('/speech-categories', data)
}

export function updateCategory(id: number, data: Partial<SpeechCategory>) {
  return request.put<SpeechCategory>(`/speech-categories/${id}`, data)
}

export function deleteCategory(id: number) {
  return request.delete(`/speech-categories/${id}`)
}

/* ---------- Annotations ---------- */

export function getAnnotations(callRecordId: number) {
  return request.get<SpeechAnnotation[]>(`/speech-annotations/call-record/${callRecordId}`)
}

export function createAnnotation(data: {
  callRecordId: number
  templateId?: number
  startTime: number
  endTime: number
  text: string
  comment?: string
  score?: number
}) {
  return request.post<SpeechAnnotation>('/speech-annotations', data)
}

export function updateAnnotation(id: number, data: Partial<SpeechAnnotation>) {
  return request.put<SpeechAnnotation>(`/speech-annotations/${id}`, data)
}

export function deleteAnnotation(id: number) {
  return request.delete(`/speech-annotations/${id}`)
}
