/**
 * E2E Test Helpers — API mock data and route interceptors.
 *
 * Since E2E tests run against the Vite dev server (no real backend),
 * we use Playwright's `page.route()` to intercept all `/api/v1/*` calls
 * and return predictable mock data.
 */
import { type Page } from '@playwright/test'

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

export const ADMIN_USER = {
  id: 1,
  username: 'admin',
  name: 'Admin User',
  role: 'admin',
}

export const SALES_USER = {
  id: 2,
  username: 'sales01',
  name: 'Sales Rep',
  role: 'sales',
}

export const MOCK_TOKEN = 'mock-access-token-e2e'
export const MOCK_REFRESH_TOKEN = 'mock-refresh-token-e2e'

export const MOCK_CUSTOMERS = [
  {
    id: 1,
    name: 'Alice Wang',
    company: 'Tech Corp',
    phone: '13800138001',
    email: 'alice@techcorp.com',
    status: 'potential',
    assignedUserId: 1,
    notes: 'VIP customer',
    tags: ['vip'],
    industry: 'IT',
    source: 'website',
    deleted: false,
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-01-15T08:00:00Z',
  },
  {
    id: 2,
    name: 'Bob Li',
    company: 'Sales Inc',
    phone: '13800138002',
    email: 'bob@salesinc.com',
    status: 'following',
    assignedUserId: 1,
    notes: '',
    tags: [],
    industry: 'Finance',
    source: 'referral',
    deleted: false,
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2025-02-01T10:00:00Z',
  },
  {
    id: 3,
    name: 'Carol Zhang',
    company: 'Design Studio',
    phone: '13800138003',
    email: 'carol@design.com',
    status: 'signed',
    assignedUserId: 2,
    notes: 'Long term partner',
    tags: ['partner'],
    industry: 'Design',
    source: 'exhibition',
    deleted: false,
    createdAt: '2025-02-15T12:00:00Z',
    updatedAt: '2025-02-15T12:00:00Z',
  },
]

export const MOCK_OPPORTUNITIES = [
  {
    id: 1,
    title: 'ERP System Upgrade',
    customerId: 1,
    stage: 'proposal',
    amount: 150000,
    expectedCloseDate: '2025-06-30',
    probability: 40,
    assignedUserId: 1,
    description: 'Full ERP upgrade project',
    deleted: false,
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2025-01-20T09:00:00Z',
  },
  {
    id: 2,
    title: 'Cloud Migration',
    customerId: 2,
    stage: 'lead',
    amount: 80000,
    expectedCloseDate: '2025-08-15',
    probability: 10,
    assignedUserId: 1,
    description: 'Cloud infrastructure migration',
    deleted: false,
    createdAt: '2025-02-10T14:00:00Z',
    updatedAt: '2025-02-10T14:00:00Z',
  },
]

export const MOCK_CALL_RECORDS = [
  {
    id: 1,
    customerId: 1,
    customer: null,
    opportunityId: null,
    opportunity: null,
    userId: 1,
    callAt: '2025-03-01T10:00:00Z',
    duration: 300,
    notes: 'Discussed ERP requirements',
    aiSummary: null,
    recordingUrl: null,
    deleted: false,
    createdAt: '2025-03-01T10:05:00Z',
    updatedAt: '2025-03-01T10:05:00Z',
  },
]

export const MOCK_STAGE_STATS = [
  { stage: 'lead', count: 5, totalAmount: 200000 },
  { stage: 'qualified', count: 3, totalAmount: 150000 },
  { stage: 'proposal', count: 2, totalAmount: 300000 },
  { stage: 'negotiation', count: 1, totalAmount: 100000 },
  { stage: 'closed_won', count: 2, totalAmount: 250000 },
  { stage: 'closed_lost', count: 1, totalAmount: 50000 },
]

export const MOCK_CALL_STATS = {
  weekCount: 12,
  monthCount: 45,
  totalCount: 230,
}

export const MOCK_KNOWLEDGE_ARTICLES = [
  {
    id: 1,
    title: 'Sales Best Practices',
    content: '# Sales Best Practices\n\nAlways listen to the customer first.',
    categoryId: 1,
    category: { id: 1, name: 'Sales Tips' },
    authorId: 1,
    viewCount: 42,
    likeCount: 5,
    tags: ['sales', 'tips'],
    isPublished: true,
    deleted: false,
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-01-10T08:00:00Z',
  },
]

export const MOCK_KNOWLEDGE_CATEGORIES = [
  {
    id: 1,
    name: 'Sales Tips',
    parentId: null,
    sort: 0,
    description: 'Sales techniques and tips',
    children: [],
    deleted: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

/* ------------------------------------------------------------------ */
/*  API response wrapper                                               */
/* ------------------------------------------------------------------ */

function apiOk<T>(data: T) {
  return { code: 0, message: 'success', data }
}

function apiPage<T>(list: T[], total?: number) {
  return apiOk({
    list,
    total: total ?? list.length,
    page: 1,
    pageSize: 20,
  })
}

/* ------------------------------------------------------------------ */
/*  Route interceptor                                                  */
/* ------------------------------------------------------------------ */

/**
 * Set up API mocks for all backend endpoints.
 * Call this in `beforeEach` or at the start of each test.
 */
export async function mockAllApis(page: Page, user = ADMIN_USER) {
  // ---- Auth ----
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON()
    if (body?.username && body?.password) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiOk({
          accessToken: MOCK_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
          user,
        })),
      })
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40100, message: '用户名或密码错误', data: null }),
      })
    }
  })

  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(null)),
    })
  })

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user,
      })),
    })
  })

  await page.route('**/api/v1/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk({
        ...user,
        email: `${user.username}@example.com`,
        phone: '13800138000',
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      })),
    })
  })

  // ---- Customers ----
  await page.route('**/api/v1/customers/export', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/csv',
      body: 'name,company,phone\nAlice Wang,Tech Corp,13800138001',
    })
  })

  await page.route('**/api/v1/customers/import', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk({ imported: 1, errors: [] })),
    })
  })

  await page.route(/\/api\/v1\/customers\/\d+$/, async (route) => {
    const url = route.request().url()
    const idMatch = url.match(/\/customers\/(\d+)/)
    const id = idMatch ? Number(idMatch[1]) : 1
    const method = route.request().method()

    if (method === 'GET') {
      const customer = MOCK_CUSTOMERS.find((c) => c.id === id) ?? MOCK_CUSTOMERS[0]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiOk(customer)),
      })
    } else if (method === 'PUT') {
      const body = route.request().postDataJSON()
      const customer = MOCK_CUSTOMERS.find((c) => c.id === id) ?? MOCK_CUSTOMERS[0]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiOk({ ...customer, ...body })),
      })
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiOk(null)),
      })
    } else {
      await route.continue()
    }
  })

  await page.route(/\/api\/v1\/customers(\?|$)/, async (route) => {
    const method = route.request().method()
    if (method === 'POST') {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(apiOk({
          id: 100,
          ...body,
          deleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      })
    } else {
      // GET list
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiPage(MOCK_CUSTOMERS, MOCK_CUSTOMERS.length)),
      })
    }
  })

  // ---- Opportunities ----
  await page.route('**/api/v1/opportunities/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(MOCK_STAGE_STATS)),
    })
  })

  await page.route('**/api/v1/opportunities/export', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/csv',
      body: 'title,amount\nERP System Upgrade,150000',
    })
  })

  await page.route(/\/api\/v1\/opportunities\/\d+/, async (route) => {
    const url = route.request().url()
    const idMatch = url.match(/\/opportunities\/(\d+)/)
    const id = idMatch ? Number(idMatch[1]) : 1
    const opp = MOCK_OPPORTUNITIES.find((o) => o.id === id) ?? MOCK_OPPORTUNITIES[0]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(opp)),
    })
  })

  await page.route(/\/api\/v1\/opportunities(\?|$)/, async (route) => {
    const method = route.request().method()
    if (method === 'POST') {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(apiOk({
          id: 100,
          ...body,
          deleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiPage(MOCK_OPPORTUNITIES, MOCK_OPPORTUNITIES.length)),
      })
    }
  })

  // ---- Call Records ----
  await page.route('**/api/v1/call-records/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(MOCK_CALL_STATS)),
    })
  })

  await page.route(/\/api\/v1\/call-records\/\d+/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(MOCK_CALL_RECORDS[0])),
    })
  })

  await page.route(/\/api\/v1\/call-records(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiPage(MOCK_CALL_RECORDS, MOCK_CALL_RECORDS.length)),
    })
  })

  // ---- Knowledge ----
  await page.route('**/api/v1/knowledge/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(MOCK_KNOWLEDGE_CATEGORIES)),
    })
  })

  await page.route('**/api/v1/knowledge/ask', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk({
        answer: 'Always listen to the customer first.',
        sources: [{ articleId: 1, title: 'Sales Best Practices', similarity: 0.92 }],
      })),
    })
  })

  await page.route(/\/api\/v1\/knowledge\/articles\/\d+/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(MOCK_KNOWLEDGE_ARTICLES[0])),
    })
  })

  await page.route(/\/api\/v1\/knowledge\/articles(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiPage(MOCK_KNOWLEDGE_ARTICLES, MOCK_KNOWLEDGE_ARTICLES.length)),
    })
  })

  // ---- Audit Logs ----
  await page.route(/\/api\/v1\/audit-logs/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiPage([
        {
          id: 1,
          userId: 1,
          username: 'admin',
          action: 'CREATE',
          resource: 'customer',
          resourceId: 1,
          before: null,
          after: JSON.stringify({ name: 'Alice Wang' }),
          ip: '127.0.0.1',
          createdAt: '2025-03-01T10:00:00Z',
        },
      ], 1)),
    })
  })

  // ---- Users (admin) ----
  await page.route(/\/api\/v1\/users(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiPage([
        { id: 1, username: 'admin', name: 'Admin User', email: 'admin@example.com', phone: '13800138000', role: 'admin', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
        { id: 2, username: 'sales01', name: 'Sales Rep', email: 'sales@example.com', phone: '13900139000', role: 'sales', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
      ], 2)),
    })
  })
}

/* ------------------------------------------------------------------ */
/*  Login helper                                                       */
/* ------------------------------------------------------------------ */

/**
 * Perform login via the UI and wait for the dashboard.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill('admin')
  await page.getByPlaceholder('密码').fill('admin123')
  await page.getByRole('button', { name: /登\s*录/ }).click()
  // Wait for dashboard to load
  await page.waitForURL('/', { timeout: 10_000 })
}

/**
 * Inject auth state directly into localStorage to skip the login UI.
 * Useful when login itself isn't the test focus.
 */
export async function injectAuthState(page: Page, user = ADMIN_USER) {
  await page.addInitScript((userData) => {
    // Pinia persist key is 'crm-user', matching the store definition
    const state = {
      token: 'mock-access-token-e2e',
      refreshToken: 'mock-refresh-token-e2e',
      userInfo: userData,
    }
    localStorage.setItem('crm-user', JSON.stringify(state))
  }, user)
}

/* ------------------------------------------------------------------ */
/*  Security test helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Mock APIs where ALL authenticated endpoints return 401
 * (simulates expired/revoked token, refresh also fails).
 */
export async function mockExpiredSession(page: Page) {
  // Auth endpoints — refresh fails too
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 40101, message: '刷新令牌已过期', data: null }),
    })
  })

  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiOk(null)),
    })
  })

  // All other API calls return 401
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url()
    // Skip already-handled auth routes
    if (url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return route.fallback()
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 40100, message: '未授权', data: null }),
    })
  })
}

/**
 * Mock APIs where role-restricted endpoints return 403.
 */
export async function mockForbiddenApis(page: Page) {
  const forbiddenEndpoints = [
    '**/api/v1/audit-logs**',
    '**/api/v1/users?**',
    '**/api/v1/users',
    '**/api/v1/settings**',
  ]

  for (const pattern of forbiddenEndpoints) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40300, message: '没有权限执行此操作', data: null }),
      })
    })
  }
}

/** Customer data with full (unmasked) PII for masking assertions. */
export const MOCK_CUSTOMER_WITH_PII = {
  id: 10,
  name: 'PII Test User',
  company: 'Sensitive Corp',
  phone: '13912345678',
  email: 'secret@sensitive.com',
  status: 'potential',
  assignedUserId: 1,
  notes: 'Contains sensitive info',
  tags: [],
  industry: 'Finance',
  source: 'website',
  deleted: false,
  createdAt: '2025-03-01T08:00:00Z',
  updatedAt: '2025-03-01T08:00:00Z',
}

/** User list with PII fields visible to admin. */
export const MOCK_USERS_WITH_PII = [
  { id: 1, username: 'admin', name: 'Admin User', email: 'admin@company.com', phone: '13800138000', role: 'admin', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 2, username: 'sales01', name: 'Sales Rep', email: 'sales@company.com', phone: '13900139000', role: 'sales', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
]
