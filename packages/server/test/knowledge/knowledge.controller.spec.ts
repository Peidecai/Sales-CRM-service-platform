import { Test, TestingModule } from '@nestjs/testing'
import { KnowledgeController } from '../../src/modules/knowledge/knowledge.controller'
import { KnowledgeService } from '../../src/modules/knowledge/knowledge.service'
import { ArticleCommentService } from '../../src/modules/knowledge/article-comment.service'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'

describe('KnowledgeController', () => {
  let controller: KnowledgeController
  let knowledgeService: {
    findAllArticles: jest.Mock
    createArticle: jest.Mock
    findOneArticle: jest.Mock
    toggleLike: jest.Mock
    toggleFavorite: jest.Mock
    getArticleActionStatus: jest.Mock
    getUserFavorites: jest.Mock
    updateArticle: jest.Mock
    removeArticle: jest.Mock
    findAllCategories: jest.Mock
    findTree: jest.Mock
    createCategory: jest.Mock
    removeCategory: jest.Mock
    ask: jest.Mock
    pushSearchHistory: jest.Mock
    getSearchHistory: jest.Mock
    getSearchSuggestions: jest.Mock
    submitArticle: jest.Mock
    reviewArticle: jest.Mock
    publishArticle: jest.Mock
    rejectArticle: jest.Mock
    offlineArticle: jest.Mock
    setTop: jest.Mock
    setRecommend: jest.Mock
    updateCategory: jest.Mock
  }

  beforeEach(async () => {
    knowledgeService = {
      findAllArticles: jest.fn(),
      createArticle: jest.fn(),
      findOneArticle: jest.fn(),
      toggleLike: jest.fn(),
      toggleFavorite: jest.fn(),
      getArticleActionStatus: jest.fn(),
      getUserFavorites: jest.fn(),
      updateArticle: jest.fn(),
      removeArticle: jest.fn(),
      findAllCategories: jest.fn(),
      findTree: jest.fn(),
      createCategory: jest.fn(),
      removeCategory: jest.fn(),
      ask: jest.fn(),
      pushSearchHistory: jest.fn(),
      getSearchHistory: jest.fn(),
      getSearchSuggestions: jest.fn(),
      submitArticle: jest.fn(),
      reviewArticle: jest.fn(),
      publishArticle: jest.fn(),
      rejectArticle: jest.fn(),
      offlineArticle: jest.fn(),
      setTop: jest.fn(),
      setRecommend: jest.fn(),
      updateCategory: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeService, useValue: knowledgeService },
        { provide: ArticleCommentService, useValue: { list: jest.fn(), create: jest.fn(), remove: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile()

    controller = module.get<KnowledgeController>(KnowledgeController)
  })

  it('findAllArticles should return paginated response with defaults', async () => {
    knowledgeService.findAllArticles.mockResolvedValue({
      list: [{ id: 1, title: 'A1' }],
      total: 1,
    })

    const result = await controller.findAllArticles({}, 1)

    expect(knowledgeService.findAllArticles).toHaveBeenCalledWith({})
    expect(result).toEqual({
      list: [{ id: 1, title: 'A1' }],
      total: 1,
      page: 1,
      pageSize: 20,
    })
  })

  it('findAllArticles should keep provided page and pageSize', async () => {
    const query = { page: 3, pageSize: 5 }
    knowledgeService.findAllArticles.mockResolvedValue({ list: [], total: 0 })

    const result = await controller.findAllArticles(query as never, 1)

    expect(result.page).toBe(3)
    expect(result.pageSize).toBe(5)
  })

  it('createArticle should delegate to service', async () => {
    const dto = { title: 'new article', content: 'body' }
    const article = { id: 2, title: 'new article' }
    knowledgeService.createArticle.mockResolvedValue(article)

    const result = await controller.createArticle(dto as never)

    expect(knowledgeService.createArticle).toHaveBeenCalledWith(dto)
    expect(result).toBe(article)
  })

  it('findOneArticle should delegate to service', async () => {
    knowledgeService.findOneArticle.mockResolvedValue({ id: 5 })

    const result = await controller.findOneArticle(5)

    expect(knowledgeService.findOneArticle).toHaveBeenCalledWith(5)
    expect(result).toEqual({ id: 5 })
  })

  it('toggleLike should delegate to service', async () => {
    knowledgeService.toggleLike.mockResolvedValue({ liked: true, favorited: false, likeCount: 1 })

    const result = await controller.toggleLike(5, 10)

    expect(knowledgeService.toggleLike).toHaveBeenCalledWith(5, 10)
    expect(result).toEqual({ liked: true, favorited: false, likeCount: 1 })
  })

  it('toggleFavorite should delegate to service', async () => {
    knowledgeService.toggleFavorite.mockResolvedValue({ liked: false, favorited: true, likeCount: 1 })

    const result = await controller.toggleFavorite(5, 10)

    expect(knowledgeService.toggleFavorite).toHaveBeenCalledWith(5, 10)
    expect(result).toEqual({ liked: false, favorited: true, likeCount: 1 })
  })

  it('getArticleStatus should delegate to service', async () => {
    knowledgeService.getArticleActionStatus.mockResolvedValue({
      liked: true,
      favorited: true,
      likeCount: 2,
    })

    const result = await controller.getArticleStatus(5, 10)

    expect(knowledgeService.getArticleActionStatus).toHaveBeenCalledWith(5, 10)
    expect(result).toEqual({ liked: true, favorited: true, likeCount: 2 })
  })

  it('getUserFavorites should delegate to service', async () => {
    knowledgeService.getUserFavorites.mockResolvedValue([{ id: 1, title: 'T1' }])

    const result = await controller.getUserFavorites(10)

    expect(knowledgeService.getUserFavorites).toHaveBeenCalledWith(10)
    expect(result).toEqual([{ id: 1, title: 'T1' }])
  })

  it('updateArticle should delegate to service', async () => {
    const dto = { title: 'updated title' }
    knowledgeService.updateArticle.mockResolvedValue({ id: 5, title: 'updated title' })

    const result = await controller.updateArticle(5, dto as never, 1)

    expect(knowledgeService.updateArticle).toHaveBeenCalledWith(5, dto, 1)
    expect(result).toEqual({ id: 5, title: 'updated title' })
  })

  it('removeArticle should return null after service call', async () => {
    knowledgeService.removeArticle.mockResolvedValue(undefined)

    const result = await controller.removeArticle(5)

    expect(knowledgeService.removeArticle).toHaveBeenCalledWith(5)
    expect(result).toBeNull()
  })

  it('getCategories should delegate to service.findAllCategories by default', async () => {
    knowledgeService.findAllCategories.mockResolvedValue([{ id: 1, name: 'FAQ' }])

    const result = await controller.getCategories()

    expect(knowledgeService.findAllCategories).toHaveBeenCalled()
    expect(result).toEqual([{ id: 1, name: 'FAQ' }])
  })

  it('createCategory should delegate to service', async () => {
    const dto = { name: 'Guides' }
    knowledgeService.createCategory.mockResolvedValue({ id: 3, name: 'Guides' })

    const result = await controller.createCategory(dto as never)

    expect(knowledgeService.createCategory).toHaveBeenCalledWith(dto)
    expect(result).toEqual({ id: 3, name: 'Guides' })
  })

  it('removeCategory should return null after service call', async () => {
    knowledgeService.removeCategory.mockResolvedValue(undefined)

    const result = await controller.removeCategory(3)

    expect(knowledgeService.removeCategory).toHaveBeenCalledWith(3)
    expect(result).toBeNull()
  })

  it('ask should delegate to service', async () => {
    knowledgeService.ask.mockResolvedValue({ answer: 'A', sources: [] })
    const dto = { question: 'what is crm?', topK: 4 }

    const result = await controller.ask(dto as never)

    expect(knowledgeService.ask).toHaveBeenCalledWith('what is crm?', 4)
    expect(result).toEqual({ answer: 'A', sources: [] })
  })
})
