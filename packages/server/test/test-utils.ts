/**
 * Shared test utilities — mock factories and fixtures.
 */
import {
  UserRole,
  CustomerStatus,
  OpportunityStage,
  PaymentStatus,
  PaymentMethod,
  ContractStatus,
  ContractType,
  QuotationStatus,
  PostLoanStatus,
  RepaymentStatus,
  ServiceType,
  ServiceStatus,
  ServicePriority,
} from '@crm/shared'
import { CampaignTaskStatus } from '../src/modules/campaign/entities/campaign-task.entity'
import { CampaignCallStatus } from '../src/modules/campaign/entities/campaign-call-item.entity'

/* ---------- Mock Repository Factory ---------- */

export type MockRepository<T = unknown> = Record<
  | 'find'
  | 'findOne'
  | 'findOneOrFail'
  | 'findAndCount'
  | 'create'
  | 'save'
  | 'remove'
  | 'softRemove'
  | 'delete'
  | 'update'
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
    findOneOrFail: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  }
}

/* ---------- Mock DataSource ---------- */

export function createMockDataSource() {
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn().mockImplementation(async (entity) => entity),
      findOne: jest.fn(),
      update: jest.fn(),
    },
  }
  return {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    mockQueryRunner,
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
  leftJoin: jest.Mock
  innerJoin: jest.Mock
  select: jest.Mock
  addSelect: jest.Mock
  groupBy: jest.Mock
  setParameter: jest.Mock
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
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
  }
  return qb
}

/* ---------- Mock RedisService ---------- */

export interface MockRedisService {
  get: jest.Mock
  safeGet: jest.Mock
  set: jest.Mock
  del: jest.Mock
  delByPattern: jest.Mock
  exists: jest.Mock
  safeExists: jest.Mock
  ping: jest.Mock
  getClient: jest.Mock
  incr: jest.Mock
  expire: jest.Mock
  zAdd: jest.Mock
  zRem: jest.Mock
  zRangeByScore: jest.Mock
  hSet: jest.Mock
  hGet: jest.Mock
  hGetAll: jest.Mock
  zRemRangeByRank: jest.Mock
  zRevRange: jest.Mock
  setBit: jest.Mock
  getBit: jest.Mock
}

export function createMockRedisService(): MockRedisService {
  return {
    get: jest.fn().mockResolvedValue(null),
    safeGet: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(0),
    delByPattern: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
    safeExists: jest.fn().mockResolvedValue(false),
    ping: jest.fn().mockResolvedValue('PONG'),
    getClient: jest.fn(),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(undefined),
    zAdd: jest.fn().mockResolvedValue(1),
    zRem: jest.fn().mockResolvedValue(0),
    zRangeByScore: jest.fn().mockResolvedValue([]),
    hSet: jest.fn().mockResolvedValue(undefined),
    hGet: jest.fn().mockResolvedValue(null),
    hGetAll: jest.fn().mockResolvedValue({}),
    zRemRangeByRank: jest.fn().mockResolvedValue(0),
    zRevRange: jest.fn().mockResolvedValue([]),
    setBit: jest.fn().mockResolvedValue(0),
    getBit: jest.fn().mockResolvedValue(0),
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
    skills: null as number[] | null,
    deletedAt: null as Date | null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    hasId: () => true,
    save: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    recover: jest.fn(),
    reload: jest.fn(),
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
    skills: null as number[] | null,
    deletedAt: null as Date | null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    hasId: () => true,
    save: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    recover: jest.fn(),
    reload: jest.fn(),
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
    deletedAt: null as Date | null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    opportunities: [],
    callRecords: [],
    customerNo: null as string | null,
    isInPool: false,
    poolEnteredAt: null as Date | null,
    protectUntil: null as Date | null,
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
    deletedAt: null as Date | null,
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
    deletedAt: null as Date | null,
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
    deletedAt: null as Date | null,
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
    deletedAt: null as Date | null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),

  payment: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    paymentNo: 'PAY-20250101-0001',
    contractId: 1,
    opportunityId: null,
    customerId: 1,
    ownerId: 1,
    periodNo: 1,
    plannedAmount: 10000,
    actualAmount: null,
    plannedDate: new Date('2025-03-15'),
    actualDate: null,
    paymentMethod: null,
    bankTransactionNo: null,
    invoiceNo: null,
    isOverdue: false,
    overdueDays: 0,
    status: PaymentStatus.PLANNED,
    confirmUserId: null,
    confirmedAt: null,
    remark: null,
    attachments: null,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  }),

  contract: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    contractNo: 'CON-20250101-0001',
    title: 'Test Contract',
    contractType: ContractType.SALES,
    opportunityId: 1,
    quotationId: null,
    customerId: 1,
    ownerId: 1,
    ourEntity: 'Our Company',
    customerEntity: 'Customer Company',
    currency: 'CNY',
    totalAmount: 100000,
    paidAmount: 0,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    signDate: null,
    paymentTerms: null,
    deliveryTerms: null,
    status: ContractStatus.DRAFT,
    signFileUrl: null,
    renewalReminderDays: 30,
    parentContractId: null,
    attachments: null,
    customFields: null,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  }),

  quotation: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    quotationNo: 'QUO-20250101-0001',
    title: 'Test Quotation',
    opportunityId: 1,
    customerId: 1,
    contactId: null,
    ownerId: 1,
    version: 1,
    currency: 'CNY',
    subtotal: 10000,
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
    taxRate: 13,
    taxAmount: 1300,
    totalAmount: 11300,
    validUntil: new Date('2025-06-30'),
    paymentTerms: null,
    deliveryTerms: null,
    remark: null,
    status: QuotationStatus.DRAFT,
    sentAt: null,
    acceptedAt: null,
    attachments: null,
    createdBy: 1,
    items: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  }),

  quotationItem: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    quotationId: 1,
    productName: 'Test Product',
    productSpec: null,
    unit: '个',
    quantity: 10,
    unitPrice: 1000,
    listPrice: 1200,
    discountRate: 0,
    lineAmount: 10000,
    sortOrder: 0,
    remark: null,
    ...overrides,
  }),

  campaignTask: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: 'Test Campaign',
    status: CampaignTaskStatus.DRAFT,
    totalCount: 0,
    completedCount: 0,
    successCount: 0,
    startedAt: null as Date | null,
    endedAt: null as Date | null,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }),

  campaignCallItem: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    campaignTaskId: 1,
    customerId: 10,
    contactId: null as number | null,
    phone: '13800000001',
    callStatus: CampaignCallStatus.PENDING,
    callRecordId: null as number | null,
    dialAt: null as Date | null,
    completedAt: null as Date | null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }),

  postLoan: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    contractId: 1,
    customerId: 1,
    loanAmount: 100000,
    disbursedAt: new Date('2025-01-15'),
    status: PostLoanStatus.NORMAL,
    creditRating: null as string | null,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  }),

  repaymentPlan: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    postLoanId: 1,
    period: 1,
    dueDate: '2025-02-15',
    amount: 10000,
    paidAmount: 0,
    paidAt: null as Date | null,
    status: RepaymentStatus.PENDING,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  }),

  serviceRecord: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    title: 'Test Service Record',
    description: 'Test description',
    type: ServiceType.COMPLAINT,
    status: ServiceStatus.PENDING,
    priority: ServicePriority.MEDIUM,
    customerId: 1,
    contractId: null,
    assigneeId: 1,
    createdBy: 1,
    resolution: null,
    satisfactionScore: null,
    satisfactionComment: null,
    slaResponseDeadline: new Date('2025-01-01T09:00:00Z'),
    slaResolveDeadline: new Date('2025-01-04T01:00:00Z'),
    respondedAt: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  }),
}
