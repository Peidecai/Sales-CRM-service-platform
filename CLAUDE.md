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

- **coding-standards** — 通用 TypeScript/JS 编码规范
- **security-review** — 处理认证、用户输入、API 端点时执行安全检查
- **database-migrations** — 数据库迁移变更遵循最佳实践
- **tdd-workflow** — 新功能/修复 bug 时遵循测试驱动开发
