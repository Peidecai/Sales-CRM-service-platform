/**
 * Shared test utilities — mock factories and fixtures.
 */
import { UserRole, CustomerStatus, OpportunityStage } from '@crm/shared'

/* ---------- Mock Repository Factory ---------- */

export type MockRepository<T = unknown> = Record<
  | 'find'
  | 'findOne'
  | 'create'
  | 'save'
  | 'delete'
  | 'increment'
  | 'decrement'
  | 'createQueryBuilder'
  | 'count',
  jest.Mock
> & { _type?: T }

export function createMockRepository<T = unknown>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  }
}

/* ---------- Mock QueryBuilder ---------- */

export interface MockQueryBuilder {
  where: jest.Mock
  andWhere: jest.Mock
  orderBy: jest.Mock
  addOrderBy: jest.Mock
  skip: jest.Mock
  take: jest.Mock
  getManyAndCount: jest.Mock
  getMany: jest.Mock
  getOne: jest.Mock
  getCount: jest.Mock
  getRawOne: jest.Mock
  getRawMany: jest.Mock
  leftJoinAndSelect: jest.Mock
  select: jest.Mock
  addSelect: jest.Mock
  groupBy: jest.Mock
}

export function createMockQueryBuilder(data: unknown[] = [], total = 0): MockQueryBuilder {
  const qb: MockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    getMany: jest.fn().mockResolvedValue(data),
    getOne: jest.fn().mockResolvedValue(data[0] ?? null),
    getCount: jest.fn().mockResolvedValue(total),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
  }
  return qb
}

/* ---------- Mock RedisService ---------- */

export interface MockRedisService {
  get: jest.Mock
  set: jest.Mock
  del: jest.Mock
  delByPattern: jest.Mock
  exists: jest.Mock
  ping: jest.Mock
  getClient: jest.Mock
  incr: jest.Mock
  expire: jest.Mock
}

export function createMockRedisService(): MockRedisService {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(0),
    delByPattern: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
    ping: jest.fn().mockResolvedValue('PONG'),
    getClient: jest.fn(),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(undefined),
  }
}

/* ---------- Mock JwtService ---------- */

export interface MockJwtService {
  sign: jest.Mock
  verify: jest.Mock
}

export function createMockJwtService(): MockJwtService {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  }
}

/* ---------- Mock ConfigService ---------- */

export function createMockConfigService(overrides: Record<string, unknown> = {}): { get: jest.Mock } {
  const defaults: Record<string, unknown> = {
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '2h',
    JWT_REFRESH_EXPIRES_IN: '7d',
  }
  const values = { ...defaults, ...overrides }
  return {
    get: jest.fn((key: string, defaultVal?: unknown) => values[key] ?? defaultVal),
  }
}

/* ---------- Fixtures ---------- */

export const fixtures = {
  user: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    username: 'testuser',
    password: '$2a$10$hashedpassword',
    name: 'Test User',
    email: 'test@example.com',
    phone: '13800138000',
    role: UserRole.SALES,
    isActive: true,
    deleted: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),

  admin: (overrides: Record<string, unknown> = {}) => ({
    id: 2,
    username: 'admin',
    password: '$2a$10$hashedpassword',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '13900139000',
    role: UserRole.ADMIN,
    isActive: true,
    deleted: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),

  customer: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: 'Test Customer',
    company: 'Test Corp',
    phone: '13800138001',
    email: 'customer@example.com',
    status: CustomerStatus.POTENTIAL,
    assignedUserId: 1,
    notes: 'Test notes',
    tags: ['vip'],
    industry: 'IT',
    source: 'website',
    deleted: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    opportunities: [],
    callRecords: [],
    ...overrides,
  }),

  opportunity: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    title: 'Test Opportunity',
    customerId: 1,
    customer: null,
    stage: OpportunityStage.LEAD,
    amount: 50000,
    probability: 10,
    expectedCloseDate: new Date('2025-06-30'),
    assignedUserId: 1,
    description: 'Test description',
    deleted: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),

  callRecord: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    customerId: 1,
    customer: null,
    opportunityId: null,
    opportunity: null,
    userId: 1,
    callAt: new Date('2025-03-01T10:00:00Z'),
    duration: 300,
    notes: 'Test call notes',
    aiSummary: null,
    recordingUrl: null,
    deleted: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),

  knowledgeArticle: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    title: 'Test Article',
    content: 'This is test content for the knowledge article.',
    categoryId: 1,
    category: null,
    authorId: 1,
    viewCount: 0,
    likeCount: 0,
    tags: ['test'],
    isPublished: true,
    deleted: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),

  knowledgeCategory: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: 'Test Category',
    parentId: null,
    sort: 0,
    description: 'Test description',
    parent: null,
    children: [],
    articles: [],
    deleted: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),
}
