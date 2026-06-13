# CRM Sales Platform

> 全局规范。模块细节见各子目录 CLAUDE.md。

## 技术栈

| 层                | 技术                                                 |
| ----------------- | ---------------------------------------------------- |
| Backend           | NestJS 10 + TypeORM 0.3 + MySQL 8.0 + Redis 7 + Bull |
| Frontend (PC)     | Vue 3.4 + Vite 5 + Element Plus 2 + Pinia            |
| Frontend (Mobile) | uni-app 3.x + Vue 3 (微信小程序+APP, `@crm/miniapp`) |
| Language          | TypeScript 5.x (strict mode)                         |
| Package Manager   | pnpm (workspace, prefix `@crm/*`)                    |

## 目录结构

```
crm-sales-platform/
├── packages/
│   ├── shared/       # @crm/shared — 共享类型、枚举
│   ├── server/       # @crm/server — NestJS 后端 (见 server/CLAUDE.md)
│   ├── web/          # @crm/web — Vue 3 PC 端 (见 web/CLAUDE.md)
│   └── miniapp/      # @crm/miniapp — 微信小程序+APP (见 miniapp/CLAUDE.md)
├── docker/           # Docker 配置
├── docker-compose.yml
└── CLAUDE.md         # 本文件
```

## 通用编码规范

- TypeScript strict mode，禁止 `any`（用 `unknown`）
- 文件名 kebab-case，类名 PascalCase，变量/函数 camelCase
- 所有异步函数必须处理错误
- 使用 `@crm/shared` 共享类型，禁止重复定义

## 关键决策

| 项目                | 决策                                           |
| ------------------- | ---------------------------------------------- |
| API 前缀            | `/api/v1`                                      |
| 响应格式            | `{ code: 0, message: 'success', data: T }`     |
| 分页响应            | `data: { list: T[], total, page, pageSize }`   |
| 软删除              | `@DeleteDateColumn deletedAt` (BaseEntity)     |
| TypeORM synchronize | `false` — 必须用 Migration                     |
| JWT                 | Access 2h / Refresh 7d                         |
| 限流                | 全局 60 req/min，登录 5/min                    |
| 超时                | 30s (TimeoutInterceptor)                       |
| 审计                | AuditLogInterceptor — 自动记录 POST/PUT/DELETE |

## 错误码

| 范围  | 含义           |
| ----- | -------------- |
| 0     | 成功           |
| 400xx | 参数错误       |
| 401xx | 认证错误       |
| 403xx | 权限错误       |
| 404xx | 资源不存在     |
| 500xx | 服务器内部错误 |

## 权限体系 (RBAC)

| 角色    | 权限                            |
| ------- | ------------------------------- |
| Admin   | 全部功能 + 用户管理 + 系统设置  |
| Manager | 业务 CRUD + 删除/导入/导出      |
| Sales   | 业务 CRUD（不含删除/导入/导出） |

- 后端: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles()` + `@CurrentUser()`
- 前端: `v-permission` 指令 + `usePermission()` composable + `UserRole` 枚举

## 数据库规范

- 实体继承 `BaseEntity`（id, createdAt, updatedAt, deletedAt）
- 表名 snake_case，外键 `{relation}Id`
- 常用查询字段加索引
- 迁移用 `crm_migrator` DDL 账户

## Git 提交

```
feat: 添加客户列表分页
fix: 修复 JWT 刷新失效
chore: 更新依赖
```

## 常用命令

```bash
pnpm install                    # 安装依赖
pnpm dev:server                 # NestJS :3000
pnpm dev:web                    # Vue :5173
pnpm dev:miniapp                # 微信小程序+APP

cd packages/server
DB_USERNAME=crm_migrator DB_PASSWORD=<pwd> pnpm migration:run

pnpm lint                       # 代码检查
pnpm test                       # 运行测试
pnpm test:e2e                   # Playwright E2E
```

## 分层 CLAUDE.md 索引

| 层级         | 文件                                        | 内容                          |
| ------------ | ------------------------------------------- | ----------------------------- |
| Server       | `packages/server/CLAUDE.md`                 | 后端架构、模块列表、缓存策略  |
| Web          | `packages/web/CLAUDE.md`                    | 前端规范、组件约定、路由      |
| Miniapp/APP  | `packages/miniapp/CLAUDE.md`                | 小程序+APP架构、离线队列      |
| Customer     | `server/src/modules/customer/CLAUDE.md`     | 客户管理                      |
| Opportunity  | `server/src/modules/opportunity/CLAUDE.md`  | 商机管理                      |
| Call Record  | `server/src/modules/call-record/CLAUDE.md`  | 通话记录 + AI 摘要 + 领导点评 |
| AI           | `server/src/modules/ai/CLAUDE.md`           | AI 通话分析/画像/意向预测     |
| Knowledge    | `server/src/modules/knowledge/CLAUDE.md`    | 知识��� + RAG                 |
| Prospect     | `server/src/modules/prospect/CLAUDE.md`     | 互联网获客 + 数据源管理       |
| Audit Log    | `server/src/modules/audit-log/CLAUDE.md`    | 审计日志（全局模块）          |
| Notification | `server/src/modules/notification/CLAUDE.md` | WebSocket 实时通知            |
| Sales Target | `server/src/modules/sales-target/CLAUDE.md` | 销售目标 + 排行               |

## Skill 规范要求

操作本项目时，应遵循以下 skill 的编码标准：

### 编码与架构

- **coding-standards** — TypeScript/JS 编码规范（命名、类型、错误处理）
- **backend-patterns** — NestJS 分层架构、API 设计、数据库优化
- **frontend-patterns** — Vue 3 组件设计、状态管理、性能优化
- **api-design** — REST 资源命名、状态码、分页、错误响应

### 安全

- **security-review** — 认证、用户输入、API 端点安全检查
- **security-scan** — Claude Code 配置安全扫描（CLAUDE.md、hooks）

### 数据库

- **database-migrations** — 迁移变更最佳实践（幂等、回滚）
- **docker-patterns** — Docker/Compose 容器化与本地开发

### 测试（开发时自动触发）

- **tdd-workflow** — 新功能/修复 bug 时遵循测试驱动开发（80%+ 覆盖率）
- **e2e-testing** — Playwright E2E 测试（Page Object、CI 集成）

### 代码审查（完成功能后手动触发）

- `/simplify` — 审查代码复用性、质量、效率，自动修复问题
- `/verification-loop` — 6 阶段验证（Build→Types→Lint→Tests→Security→Diff）

### 测试命令速查

```bash
# 后端 (Jest, 1249 tests)
cd packages/server
pnpm test                                  # 全量
pnpm test -- --testPathPattern=customer    # 按模块
pnpm test -- --coverage                   # 覆盖率

# 前端 (Vitest, 84 tests)
cd packages/web
npx vitest run                             # 全量
npx vue-tsc --noEmit                       # 类型检查

# E2E (Playwright, 46+ tests)
pnpm test:e2e                              # Chromium
pnpm test:e2e:ui                           # 交互模式

# Lint
pnpm --filter @crm/server lint             # 后端
pnpm --filter @crm/web lint                # 前端
```

### 审查检查清单

代码审查时关注以下要点：

1. **Guards** — Controller 类级别 `@UseGuards(JwtAuthGuard, RolesGuard)`
2. **Audit** — 写操作 `@UseInterceptors(AuditLogInterceptor)`
3. **权限** — 前端用 `UserRole` 枚举，禁止硬编码字符串
4. **缓存** — Redis 读取用 `safeGet()`，写操作失效缓存
5. **DTO** — 必须用 `class-validator` 装饰器验证
6. **模块边界** — 跨模块访问通过 Module import，禁止直接注册外部 Entity
7. **敏感字段** — 密码、API Key 不得出现在响应中
8. **测试** — 新 Service 依赖必须在 test-utils 中有对应 Mock
