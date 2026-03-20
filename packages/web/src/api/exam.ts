import request from './request'
import type { QuestionType, ExamSessionStatus } from '@crm/shared'
import type { QuestionOption, ExamAnswer, RandomPaperConfig } from '@crm/shared'

/* ---------- Types ---------- */

export interface QuestionCategory {
  id: number
  name: string
  description: string | null
  parentId: number | null
  sortOrder: number
  children?: QuestionCategory[]
}

export interface Question {
  id: number
  type: QuestionType
  content: string
  options: QuestionOption[]
  answer: string[]
  explanation: string | null
  categoryId: number
  category?: QuestionCategory
  difficulty: number
  usageCount: number
  correctRate: number
  linkedArticleId: number | null
  createdById: number
  createdAt: string
}

export interface ExamPaper {
  id: number
  title: string
  description: string | null
  buildMode: string
  randomConfig: RandomPaperConfig | null
  totalScore: number
  passScore: number
  duration: number
  createdById: number
  createdAt: string
  questions?: ExamPaperQuestion[]
}

export interface ExamPaperQuestion {
  id: number
  paperId: number
  questionId: number
  question?: Question
  sortOrder: number
  score: number
}

export interface ExamSession {
  id: number
  paperId: number
  paper?: ExamPaper
  userId: number
  status: ExamSessionStatus
  startedAt: string | null
  submittedAt: string | null
  totalScore: number | null
  passed: boolean | null
  answers: ExamAnswer[] | null
  attemptNo: number
  createdAt: string
  paperQuestions?: ExamPaperQuestion[]
}

export interface ExamStatistics {
  totalCount: number
  passRate: number
  avgScore: number
  scoreDistribution: Record<string, number>
  topWrongQuestions: Array<{ questionId: number; wrongCount: number }>
}

/* ---------- Question Categories ---------- */

export function getQuestionCategoryTree() {
  return request.get<QuestionCategory[]>('/exam/question-categories')
}

export function createQuestionCategory(data: {
  name: string
  description?: string
  parentId?: number
  sortOrder?: number
}) {
  return request.post<QuestionCategory>('/exam/question-categories', data)
}

export function updateQuestionCategory(
  id: number,
  data: Partial<{ name: string; description: string; parentId: number; sortOrder: number }>,
) {
  return request.put<QuestionCategory>(`/exam/question-categories/${id}`, data)
}

export function deleteQuestionCategory(id: number) {
  return request.delete(`/exam/question-categories/${id}`)
}

/* ---------- Questions ---------- */

export function getQuestions(params: {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  type?: string
  difficulty?: number
}) {
  return request.get<{ list: Question[]; total: number; page: number; pageSize: number }>(
    '/exam/questions',
    { params },
  )
}

export function getQuestion(id: number) {
  return request.get<Question>(`/exam/questions/${id}`)
}

export function createQuestion(data: Record<string, unknown>) {
  return request.post<Question>('/exam/questions', data)
}

export function updateQuestion(id: number, data: Record<string, unknown>) {
  return request.put<Question>(`/exam/questions/${id}`, data)
}

export function deleteQuestion(id: number) {
  return request.delete(`/exam/questions/${id}`)
}

export function importQuestions(data: Record<string, unknown>[]) {
  return request.post('/exam/questions/import', data)
}

/* ---------- Exam Papers ---------- */

export function getExamPapers(params?: { page?: number; pageSize?: number }) {
  return request.get<{ list: ExamPaper[]; total: number; page: number; pageSize: number }>(
    '/exam/papers',
    { params },
  )
}

export function getExamPaper(id: number) {
  return request.get<ExamPaper>(`/exam/papers/${id}`)
}

export function createExamPaper(data: Record<string, unknown>) {
  return request.post<ExamPaper>('/exam/papers', data)
}

export function deleteExamPaper(id: number) {
  return request.delete(`/exam/papers/${id}`)
}

/* ---------- Exam Sessions ---------- */

export function startExam(paperId: number) {
  return request.post<ExamSession>('/exam/sessions/start', { paperId })
}

export function submitExam(
  sessionId: number,
  answers: Array<{ questionId: number; userAnswer: string[] }>,
) {
  return request.post<ExamSession>(`/exam/sessions/${sessionId}/submit`, { answers })
}

export function getExamResult(sessionId: number) {
  return request.get<ExamSession>(`/exam/sessions/${sessionId}`)
}

export function getMyExamHistory(params?: { page?: number; pageSize?: number }) {
  return request.get<{ list: ExamSession[]; total: number; page: number; pageSize: number }>(
    '/exam/sessions/my-history',
    { params },
  )
}

/* ---------- Statistics ---------- */

export function getExamStatistics(params?: {
  paperId?: number
  startDate?: string
  endDate?: string
}) {
  return request.get<ExamStatistics>('/exam/statistics', { params })
}

export function getPaperStatistics(paperId: number) {
  return request.get<ExamStatistics>(`/exam/statistics/${paperId}`)
}
