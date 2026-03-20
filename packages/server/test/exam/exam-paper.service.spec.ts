import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ExamPaperService } from '../../src/modules/exam/exam-paper.service'
import { ExamPaper } from '../../src/modules/exam/entities/exam-paper.entity'
import { ExamPaperQuestion } from '../../src/modules/exam/entities/exam-paper-question.entity'
import { createMockRepository, createMockQueryBuilder, type MockRepository } from '../test-utils'

describe('ExamPaperService', () => {
  let service: ExamPaperService
  let paperRepo: MockRepository<ExamPaper>
  let pqRepo: MockRepository<ExamPaperQuestion>

  beforeEach(async () => {
    paperRepo = createMockRepository<ExamPaper>()
    pqRepo = createMockRepository<ExamPaperQuestion>()
    const module = await Test.createTestingModule({
      providers: [
        ExamPaperService,
        { provide: getRepositoryToken(ExamPaper), useValue: paperRepo },
        { provide: getRepositoryToken(ExamPaperQuestion), useValue: pqRepo },
      ],
    }).compile()
    service = module.get(ExamPaperService)
  })

  const mockPaper = {
    id: 1,
    title: 'Test Paper',
    description: null,
    buildMode: 'manual',
    randomConfig: null,
    totalScore: 100,
    passScore: 60,
    duration: 60,
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  it('should create a manual paper with questions', async () => {
    paperRepo.create.mockReturnValue(mockPaper)
    paperRepo.save.mockResolvedValue(mockPaper)
    pqRepo.create.mockImplementation((data) => data)
    pqRepo.save.mockResolvedValue([])

    const result = await service.create({
      title: 'Test Paper',
      buildMode: 'manual',
      totalScore: 100,
      passScore: 60,
      duration: 60,
      questions: [{ questionId: 1, score: 10 }],
    }, 1)
    expect(result.id).toBe(1)
    expect(pqRepo.save).toHaveBeenCalled()
  })

  it('should create a random paper with config', async () => {
    const randomPaper = { ...mockPaper, buildMode: 'random', randomConfig: { rules: [] } }
    paperRepo.create.mockReturnValue(randomPaper)
    paperRepo.save.mockResolvedValue(randomPaper)

    const result = await service.create({
      title: 'Random Paper',
      buildMode: 'random',
      totalScore: 100,
      passScore: 60,
      duration: 60,
      randomConfig: [{ categoryId: 1, type: 'single_choice', count: 5, scorePerQuestion: 2 }],
    }, 1)
    expect(result.buildMode).toBe('random')
    expect(pqRepo.save).not.toHaveBeenCalled()
  })

  it('should find all papers with pagination', async () => {
    const qb = createMockQueryBuilder([mockPaper], 1)
    paperRepo.createQueryBuilder.mockReturnValue(qb)

    const result = await service.findAll(1, 10)
    expect(result.list).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('should find one paper with questions', async () => {
    paperRepo.findOne.mockResolvedValue(mockPaper)
    pqRepo.find.mockResolvedValue([{ id: 1, paperId: 1, questionId: 1, score: 10, sortOrder: 0 }])

    const result = await service.findOne(1)
    expect(result.title).toBe('Test Paper')
    expect(result.questions).toHaveLength(1)
  })

  it('should throw when paper not found', async () => {
    paperRepo.findOne.mockResolvedValue(null)
    await expect(service.findOne(999)).rejects.toThrow('试卷不存在')
  })

  it('should remove a paper and its questions', async () => {
    paperRepo.findOne.mockResolvedValue(mockPaper)
    pqRepo.delete.mockResolvedValue({ affected: 1 })
    paperRepo.softRemove.mockResolvedValue({ ...mockPaper, deletedAt: new Date() })

    const result = await service.remove(1)
    expect(pqRepo.delete).toHaveBeenCalledWith({ paperId: 1 })
    expect(result.deletedAt).toBeTruthy()
  })
})
