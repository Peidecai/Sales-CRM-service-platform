import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { VectorService } from '../../../src/modules/ai/vector/vector.service'

describe('VectorService', () => {
  let tempRoot: string
  const originalVectorDbPath = process.env.VECTOR_DB_PATH

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-vector-'))
  })

  afterEach(() => {
    process.env.VECTOR_DB_PATH = originalVectorDbPath
    fs.rmSync(tempRoot, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('onModuleInit should create missing directory and initialize DB', () => {
    const dbDir = path.join(tempRoot, 'nested', 'db')
    const dbPath = path.join(dbDir, 'vectors.db')
    process.env.VECTOR_DB_PATH = dbPath
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync')
    const service = new VectorService()

    service.onModuleInit()

    expect(fs.existsSync(dbDir)).toBe(true)
    expect(mkdirSpy).toHaveBeenCalledWith(dbDir, { recursive: true })
    expect(service.getVectorCount()).toBe(0)
    service.onModuleDestroy()
  })

  it('onModuleInit should not create directory when it already exists', () => {
    const dbPath = path.join(tempRoot, 'vectors.db')
    process.env.VECTOR_DB_PATH = dbPath
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync')
    const service = new VectorService()

    service.onModuleInit()

    expect(mkdirSpy).not.toHaveBeenCalled()
    service.onModuleDestroy()
  })

  it('should upsert, search, delete vectors and count correctly', () => {
    process.env.VECTOR_DB_PATH = path.join(tempRoot, 'vectors-search.db')
    const service = new VectorService()
    service.onModuleInit()

    service.upsertArticleVectors(1, [
      { content: 'chunk-1', embedding: [1, 0] },
      { content: 'chunk-2', embedding: [0, 1] },
      { content: 'chunk-3', embedding: [0, 0] },
    ])

    expect(service.getVectorCount()).toBe(3)

    const results = service.search([1, 0], 5, 0.1)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].articleId).toBe(1)
    expect(results[0].chunkIndex).toBe(0)

    const topOne = service.search([1, 0], 1, 0)
    expect(topOne).toHaveLength(1)

    const mismatchResults = service.search([1], 5, 0.1)
    expect(mismatchResults).toEqual([])

    const zeroNormResults = service.search([0, 0], 5, 0)
    expect(zeroNormResults).toHaveLength(3)

    service.deleteArticleVectors(1)
    expect(service.getVectorCount()).toBe(0)

    service.onModuleDestroy()
  })

  it('search should use default topK and minSimilarity arguments', () => {
    process.env.VECTOR_DB_PATH = path.join(tempRoot, 'vectors-default-search.db')
    const service = new VectorService()
    service.onModuleInit()

    service.upsertArticleVectors(2, [
      { content: 'default-branch', embedding: [1, 0] },
    ])

    const result = service.search([1, 0])

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({
        articleId: 2,
        chunkIndex: 0,
      }),
    )

    service.onModuleDestroy()
  })

  it('onModuleDestroy should close DB and no-op safely before init', () => {
    const service = new VectorService()
    expect(() => service.onModuleDestroy()).not.toThrow()

    process.env.VECTOR_DB_PATH = path.join(tempRoot, 'vectors-close.db')
    service.onModuleInit()
    const closeSpy = jest.spyOn((service as unknown as { db: { close: () => void } }).db, 'close')

    service.onModuleDestroy()

    expect(closeSpy).toHaveBeenCalled()
  })
})
