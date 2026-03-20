import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { QuestionService } from '../../src/modules/exam/question.service'
import { Question } from '../../src/modules/exam/entities/question.entity'
import { createMockRepository, createMockQueryBuilder, type MockRepository } from '../test-utils'
import { QuestionType } from '@crm/shared'

describe('QuestionService', () => {
  let service: QuestionService
  let repo: MockRepository<Question>

  beforeEach(async () => {
    repo = createMockRepository<Question>()
    const module = await Test.createTestingModule({
      providers: [
        QuestionService,
        { provide: getRepositoryToken(Question), useValue: repo },
      ],
    }).compile()
    service = module.get(QuestionService)
  })

  const mockQuestion = {
    id: 1,
    type: QuestionType.SINGLE_CHOICE,
    content: 'What is 1+1?',
    options: [
      { label: 'A', content: '1' },
      { label: 'B', content: '2' },
      { label: 'C', content: '3' },
    ],
    answer: ['B'],
    explanation: '1+1=2',
    categoryId: 1,
    difficulty: 2,
    usageCount: 0,
    correctRate: 0,
    linkedArticleId: null,
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  it('should find all with pagination', async () => {
    const qb = createMockQueryBuilder([mockQuestion], 1)
    repo.createQueryBuilder.mockReturnValue(qb)

    const result = await service.findAll({ page: 1, pageSize: 10 })
    expect(result.list).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(qb.skip).toHaveBeenCalledWith(0)
    expect(qb.take).toHaveBeenCalledWith(10)
  })

  it('should filter by keyword', async () => {
    const qb = createMockQueryBuilder([], 0)
    repo.createQueryBuilder.mockReturnValue(qb)

    await service.findAll({ keyword: 'test' })
    expect(qb.andWhere).toHaveBeenCalled()
  })

  it('should filter by categoryId', async () => {
    const qb = createMockQueryBuilder([], 0)
    repo.createQueryBuilder.mockReturnValue(qb)

    await service.findAll({ categoryId: 1 })
    expect(qb.andWhere).toHaveBeenCalledWith('q.categoryId = :categoryId', { categoryId: 1 })
  })

  it('should filter by type', async () => {
    const qb = createMockQueryBuilder([], 0)
    repo.createQueryBuilder.mockReturnValue(qb)

    await service.findAll({ type: QuestionType.MULTI_CHOICE })
    expect(qb.andWhere).toHaveBeenCalledWith('q.type = :type', { type: QuestionType.MULTI_CHOICE })
  })

  it('should find one by id', async () => {
    repo.findOne.mockResolvedValue(mockQuestion)
    const result = await service.findOne(1)
    expect(result.id).toBe(1)
  })

  it('should throw NotFoundException when question not found', async () => {
    repo.findOne.mockResolvedValue(null)
    await expect(service.findOne(999)).rejects.toThrow('题目不存在')
  })

  it('should create a question', async () => {
    repo.create.mockReturnValue(mockQuestion)
    repo.save.mockResolvedValue(mockQuestion)

    const dto = {
      type: QuestionType.SINGLE_CHOICE,
      content: 'What is 1+1?',
      options: [{ label: 'A', content: '2' }],
      answer: ['A'],
      categoryId: 1,
    }
    const result = await service.create(dto, 1)
    expect(repo.create).toHaveBeenCalled()
    expect(result.id).toBe(1)
  })

  it('should update a question', async () => {
    repo.findOne.mockResolvedValue({ ...mockQuestion })
    repo.save.mockResolvedValue({ ...mockQuestion, content: 'Updated' })

    const result = await service.update(1, { content: 'Updated' })
    expect(result.content).toBe('Updated')
  })

  it('should soft remove a question', async () => {
    repo.findOne.mockResolvedValue(mockQuestion)
    repo.softRemove.mockResolvedValue({ ...mockQuestion, deletedAt: new Date() })

    const result = await service.remove(1)
    expect(repo.softRemove).toHaveBeenCalled()
    expect(result.deletedAt).toBeTruthy()
  })

  it('should get random questions', async () => {
    const qb = createMockQueryBuilder([mockQuestion], 1)
    repo.createQueryBuilder.mockReturnValue(qb)

    const config = { rules: [{ categoryId: 1, type: 'single_choice', count: 1, scorePerQuestion: 5 }] }
    const result = await service.getRandomQuestions(config)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(5)
  })

  it('should update correct rate', async () => {
    repo.update.mockResolvedValue({ affected: 1 })
    await service.updateCorrectRate(1, 7, 10)
    expect(repo.update).toHaveBeenCalledWith(1, { correctRate: 70 })
  })

  it('should not update correct rate when totalCount is 0', async () => {
    await service.updateCorrectRate(1, 0, 0)
    expect(repo.update).not.toHaveBeenCalled()
  })
})
