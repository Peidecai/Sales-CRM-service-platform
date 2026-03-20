import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ExamSessionService } from '../../src/modules/exam/exam-session.service'
import { ExamSession } from '../../src/modules/exam/entities/exam-session.entity'
import { ExamPaper } from '../../src/modules/exam/entities/exam-paper.entity'
import { ExamPaperQuestion } from '../../src/modules/exam/entities/exam-paper-question.entity'
import { Question } from '../../src/modules/exam/entities/question.entity'
import { QuestionService } from '../../src/modules/exam/question.service'
import { createMockRepository, createMockQueryBuilder, type MockRepository } from '../test-utils'
import { ExamSessionStatus, QuestionType } from '@crm/shared'

describe('ExamSessionService', () => {
  let service: ExamSessionService
  let sessionRepo: MockRepository<ExamSession>
  let paperRepo: MockRepository<ExamPaper>
  let pqRepo: MockRepository<ExamPaperQuestion>
  let questionService: { getRandomQuestions: jest.Mock }

  const mockPaper = {
    id: 1,
    title: 'Test Paper',
    buildMode: 'manual',
    randomConfig: null,
    totalScore: 100,
    passScore: 60,
    duration: 60,
    createdById: 1,
  }

  const makeQuestion = (type: QuestionType, answer: string[]) => ({
    id: Math.random() * 1000 | 0,
    type,
    content: 'Q',
    options: [
      { label: 'A', content: 'opt A' },
      { label: 'B', content: 'opt B' },
      { label: 'C', content: 'opt C' },
    ],
    answer,
    explanation: null,
    categoryId: 1,
    difficulty: 1,
    usageCount: 0,
    correctRate: 0,
    linkedArticleId: null,
    createdById: 1,
  })

  beforeEach(async () => {
    sessionRepo = createMockRepository<ExamSession>()
    paperRepo = createMockRepository<ExamPaper>()
    pqRepo = createMockRepository<ExamPaperQuestion>()
    questionService = { getRandomQuestions: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        ExamSessionService,
        { provide: getRepositoryToken(ExamSession), useValue: sessionRepo },
        { provide: getRepositoryToken(ExamPaper), useValue: paperRepo },
        { provide: getRepositoryToken(ExamPaperQuestion), useValue: pqRepo },
        { provide: QuestionService, useValue: questionService },
      ],
    }).compile()
    service = module.get(ExamSessionService)
  })

  describe('start', () => {
    it('should create a session', async () => {
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.count.mockResolvedValue(0)
      sessionRepo.create.mockImplementation((d) => d)
      sessionRepo.save.mockImplementation(async (d) => ({ id: 1, ...d }))

      const result = await service.start(1, 1) as Record<string, unknown>
      expect(result.status).toBe(ExamSessionStatus.IN_PROGRESS)
      expect(result.attemptNo).toBe(1)
    })

    it('should increment attempt number', async () => {
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.count.mockResolvedValue(2)
      sessionRepo.create.mockImplementation((d) => d)
      sessionRepo.save.mockImplementation(async (d) => ({ id: 3, ...d }))

      const result = await service.start(1, 1) as Record<string, unknown>
      expect(result.attemptNo).toBe(3)
    })

    it('should throw when paper not found', async () => {
      paperRepo.findOne.mockResolvedValue(null)
      await expect(service.start(999, 1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('submit', () => {
    const mockSession = {
      id: 1,
      paperId: 1,
      userId: 1,
      status: ExamSessionStatus.IN_PROGRESS,
      startedAt: new Date(),
      answers: null,
      totalScore: null,
      passed: null,
    }

    it('should grade single choice correctly', async () => {
      const q = makeQuestion(QuestionType.SINGLE_CHOICE, ['B'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['B'] }] }, 1)
      expect(result.totalScore).toBe(10)
      expect(result.answers![0].isCorrect).toBe(true)
    })

    it('should grade single choice wrong', async () => {
      const q = makeQuestion(QuestionType.SINGLE_CHOICE, ['B'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['A'] }] }, 1)
      expect(result.totalScore).toBe(0)
      expect(result.answers![0].isCorrect).toBe(false)
    })

    it('should grade multi choice full correct', async () => {
      const q = makeQuestion(QuestionType.MULTI_CHOICE, ['A', 'B'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['A', 'B'] }] }, 1)
      expect(result.totalScore).toBe(10)
      expect(result.answers![0].isCorrect).toBe(true)
    })

    it('should grade multi choice partial correct (50%)', async () => {
      const q = makeQuestion(QuestionType.MULTI_CHOICE, ['A', 'B'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['A'] }] }, 1)
      expect(result.totalScore).toBe(5)
      expect(result.answers![0].isCorrect).toBe(false)
      expect(result.answers![0].score).toBe(5)
    })

    it('should grade multi choice wrong (has incorrect selection)', async () => {
      const q = makeQuestion(QuestionType.MULTI_CHOICE, ['A', 'B'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['A', 'C'] }] }, 1)
      expect(result.totalScore).toBe(0)
    })

    it('should grade true/false correctly', async () => {
      const q = makeQuestion(QuestionType.TRUE_FALSE, ['true'])
      const pq = { questionId: q.id, question: q, score: 5 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['true'] }] }, 1)
      expect(result.totalScore).toBe(5)
      expect(result.answers![0].isCorrect).toBe(true)
    })

    it('should grade fill blank correctly', async () => {
      const q = makeQuestion(QuestionType.FILL_BLANK, ['42'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['42'] }] }, 1)
      expect(result.totalScore).toBe(10)
    })

    it('should grade fill blank wrong', async () => {
      const q = makeQuestion(QuestionType.FILL_BLANK, ['42'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['43'] }] }, 1)
      expect(result.totalScore).toBe(0)
    })

    it('should set passed=true when score >= passScore', async () => {
      const q = makeQuestion(QuestionType.SINGLE_CHOICE, ['A'])
      const pq = { questionId: q.id, question: q, score: 100 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue(mockPaper)
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['A'] }] }, 1)
      expect(result.passed).toBe(true)
    })

    it('should set passed=false when score < passScore', async () => {
      const q = makeQuestion(QuestionType.SINGLE_CHOICE, ['A'])
      const pq = { questionId: q.id, question: q, score: 10 }
      sessionRepo.findOne.mockResolvedValue({ ...mockSession })
      pqRepo.find.mockResolvedValue([pq])
      paperRepo.findOne.mockResolvedValue({ ...mockPaper, passScore: 60 })
      sessionRepo.save.mockImplementation(async (d) => d)

      const result = await service.submit(1, { answers: [{ questionId: q.id, userAnswer: ['A'] }] }, 1)
      expect(result.passed).toBe(false)
    })

    it('should throw when session not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null)
      await expect(service.submit(999, { answers: [] }, 1)).rejects.toThrow(NotFoundException)
    })

    it('should throw when already submitted', async () => {
      sessionRepo.findOne.mockResolvedValue({ ...mockSession, status: ExamSessionStatus.GRADED })
      await expect(service.submit(1, { answers: [] }, 1)).rejects.toThrow(BadRequestException)
    })
  })

  describe('getResult', () => {
    it('should return session with paper questions', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 1, paperId: 1 })
      pqRepo.find.mockResolvedValue([{ id: 1, questionId: 1 }])

      const result = await service.getResult(1)
      expect(result.paperQuestions).toHaveLength(1)
    })

    it('should throw when session not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null)
      await expect(service.getResult(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getMyHistory', () => {
    it('should return paginated history', async () => {
      const qb = createMockQueryBuilder([{ id: 1 }], 1)
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getMyHistory(1)
      expect(result.list).toHaveLength(1)
      expect(qb.where).toHaveBeenCalledWith('s.userId = :userId', { userId: 1 })
    })
  })

  describe('getStatistics', () => {
    it('should return zero stats when no sessions', async () => {
      const qb = createMockQueryBuilder([], 0)
      qb.getMany = jest.fn().mockResolvedValue([])
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics({})
      expect(result.totalCount).toBe(0)
      expect(result.passRate).toBe(0)
    })

    it('should calculate pass rate and avg score', async () => {
      const sessions = [
        { id: 1, totalScore: 80, passed: true, status: ExamSessionStatus.GRADED, answers: [] },
        { id: 2, totalScore: 50, passed: false, status: ExamSessionStatus.GRADED, answers: [] },
      ]
      const qb = createMockQueryBuilder(sessions, 2)
      qb.getMany = jest.fn().mockResolvedValue(sessions)
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics({})
      expect(result.totalCount).toBe(2)
      expect(result.passRate).toBe(50)
      expect(result.avgScore).toBe(65)
    })

    it('should calculate score distribution', async () => {
      const sessions = [
        { id: 1, totalScore: 95, passed: true, status: ExamSessionStatus.GRADED, answers: [] },
        { id: 2, totalScore: 45, passed: false, status: ExamSessionStatus.GRADED, answers: [] },
        { id: 3, totalScore: 75, passed: true, status: ExamSessionStatus.GRADED, answers: [] },
      ]
      const qb = createMockQueryBuilder(sessions, 3)
      qb.getMany = jest.fn().mockResolvedValue(sessions)
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics({})
      expect(result.scoreDistribution['90-100']).toBe(1)
      expect(result.scoreDistribution['0-60']).toBe(1)
      expect(result.scoreDistribution['70-80']).toBe(1)
    })

    it('should identify top wrong questions', async () => {
      const sessions = [
        {
          id: 1,
          totalScore: 50,
          passed: false,
          status: ExamSessionStatus.GRADED,
          answers: [
            { questionId: 10, userAnswer: ['A'], isCorrect: false, score: 0 },
            { questionId: 11, userAnswer: ['B'], isCorrect: false, score: 0 },
          ],
        },
        {
          id: 2,
          totalScore: 50,
          passed: false,
          status: ExamSessionStatus.GRADED,
          answers: [
            { questionId: 10, userAnswer: ['A'], isCorrect: false, score: 0 },
          ],
        },
      ]
      const qb = createMockQueryBuilder(sessions, 2)
      qb.getMany = jest.fn().mockResolvedValue(sessions)
      sessionRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics({})
      expect(result.topWrongQuestions[0].questionId).toBe(10)
      expect(result.topWrongQuestions[0].wrongCount).toBe(2)
    })
  })
})
