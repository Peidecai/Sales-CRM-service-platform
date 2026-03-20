/**
 * Exam API — online exam module for mobile
 */
import { http } from './request'

export interface ExamQuestion {
  id: number
  type: 'single' | 'multiple' | 'judge'
  title: string
  options: string[]
  /** Correct answer(s): index for single/judge, indices for multiple */
  correctAnswer: number | number[]
  score: number
}

export interface ExamVO {
  id: number
  title: string
  description: string
  questionCount: number
  timeLimit: number // minutes
  passingScore: number
  totalScore: number
  status: 'pending' | 'completed' | 'expired'
  score?: number
  createdAt: string
  expiredAt: string
}

export interface ExamDetailVO extends ExamVO {
  questions: ExamQuestion[]
}

export interface ExamSubmitResult {
  score: number
  totalScore: number
  passed: boolean
  correctCount: number
  questionCount: number
}

export interface ExamAnswer {
  questionId: number
  answer: number | number[]
}

export const examApi = {
  /** Get exam list */
  getExams(params?: { page?: number; pageSize?: number }) {
    return http.get<{ list: ExamVO[]; total: number }>('/exams', params as Record<string, unknown>)
  },

  /** Get exam detail with questions */
  getExam(id: number) {
    return http.get<ExamDetailVO>(`/exams/${id}`)
  },

  /** Submit exam answers */
  submitExam(id: number, answers: ExamAnswer[]) {
    return http.post<ExamSubmitResult>(`/exams/${id}/submit`, { answers } as unknown as Record<string, unknown>)
  },
}
