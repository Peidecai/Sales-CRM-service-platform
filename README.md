# AI 智能 CRM 销售管理系统

基于 NestJS + Vue 3 的全栈 CRM 销售管理平台，集成 AI 通话摘要和知识库智能问答。

## 技术栈

| 层级   | 技术                                                 |
| ------ | ---------------------------------------------------- |
| 后端   | NestJS 10 + TypeORM 0.3 + MySQL 8.0 + Redis 7 + Bull |
| 前端   | Vue 3.4 + Vite 5 + Element Plus 2 + Pinia            |
| AI     | DashScope (Qwen) — 通话摘要 + 知识库 RAG             |
| 语言   | TypeScript 5.x (strict mode)                         |
| 包管理 | pnpm workspace (Monorepo)                            |
| 部署   | Docker Compose + Nginx 反向代理                      |

## 功能模块

| 模块     | 功能说明                                                     |
| -------- | ------------------------------------------------------------ |
| 认证     | JWT 双 Token（Access 2h + Refresh 7d）、登出黑名单、密码修改 |
| 客户管理 | CRUD、分页搜索、状态流转、CSV 导入/导出                      |
| 商机管理 | CRUD、阶段推进（自动概率调整）、金额统计、CSV 导出           |
| 通话记录 | CRUD、AI 通话摘要（Bull 异步队列）、CSV 导出                 |
| 知识库   | 文章 CRUD、分类管理、AI 智能问答（RAG）                      |
| 用户管理 | CRUD、角色分配（Admin/Manager/Sales）                        |
| 审计日志 | 自动记录所有写操作（用户、动作、资源、IP）                   |
| 工作台   | 概览统计、快捷入口                                           |

## 权限体系

| 角色    | 权限范围                        |
| ------- | ------------------------------- |
| Admin   | 全部功能 + 用户管理             |
| Manager | 业务 CRUD + 删除/导入/导出      |
| Sales   | 业务 CRUD（不含删除/导入/导出） |

## 项目结构

```
crm-sales-platform/
├── packages/
│   ├── shared/              # @crm/shared — 共享类型、枚举、接口
│   ├── server/              # @crm/server — NestJS 后端
│   │   ├── src/
│   │   │   ├── common/      # 守卫、拦截器、过滤器、装饰器、Redis
│   │   │   ├── config/      # 数据库配置
│   │   │   └── modules/     # 业务模块（auth, user, customer, opportunity,
│   │   │                    #   call-record, knowledge, ai, audit-log, health）
│   │   ├── database/        # TypeORM migrations
│   │   └── test/            # Jest 单元测试
│   └── web/                 # @crm/web — Vue 3 前端
│       └── src/
│           ├── api/         # API 封装层
│           ├── composables/ # 组合式函数（usePermission）
│           ├── directives/  # 自定义指令（v-permission）
│           ├── layout/      # 布局组件
│           ├── router/      # 路由 + 守卫
│           ├── stores/      # Pinia 状态管理
│           ├── utils/       # 工具函数
│           └── views/       # 页面组件
├── docker/                  # Docker 配置（MySQL/Redis/Nginx）
├── docker-compose.yml       # 一键部署编排
└── .env.example             # 环境变量模板
```

## 快速开始

### 前置条件

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### 方式一：Docker 一键启动（推荐）

```bash
# 1. 克隆项目
git clone <repo-url> && cd crm-sales-platform

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 JWT_SECRET、DASHSCOPE_API_KEY 等

# 3. 启动全部服务
docker compose up --build -d

# 4. 运行数据库迁移（首次启动）
docker exec crm-server sh -c "cd /app/packages/server && node -r ts-node/register ./node_modules/.bin/typeorm migration:run -d database/data-source.ts"

# 5. 访问
# 前端：http://localhost
# Swagger API 文档：http://localhost:3000/api/docs
```

### 方式二：本地开发（Docker 只运行中间件）

```bash
# 1. 启动 MySQL + Redis
docker compose up -d mysql redis

# 2. 安装依赖
pnpm install

# 3. 配置后端环境变量
cp packages/server/.env.example packages/server/.env
# 编辑 .env，填入实际值

# 4. 运行数据库迁移
cd packages/server
pnpm migration:run

# 5. 启动后端（http://localhost:3000）
pnpm start:dev

# 6. 另一个终端 — 启动前端（http://localhost:5173）
cd packages/web
pnpm dev
```

### 默认账号

| 用户名  | 密码     | 角色  |
| ------- | -------- | ----- |
| admin   | admin123 | Admin |
| sales01 | sales123 | Sales |

## 环境变量说明

| 变量名               | 说明                 | 默认值                  |
| -------------------- | -------------------- | ----------------------- |
| `NODE_ENV`           | 运行环境             | `development`           |
| `PORT`               | 后端端口             | `3000`                  |
| `API_PREFIX`         | API 路由前缀         | `/api/v1`               |
| `DB_HOST`            | MySQL 地址           | `localhost`             |
| `DB_PORT`            | MySQL 端口           | `3306`                  |
| `DB_USERNAME`        | MySQL 用户名         | `root`                  |
| `DB_PASSWORD`        | MySQL 密码           | `crm_password_123`      |
| `DB_DATABASE`        | 数据库名             | `crm_sales`             |
| `REDIS_HOST`         | Redis 地址           | `localhost`             |
| `REDIS_PORT`         | Redis 端口           | `6379`                  |
| `REDIS_PASSWORD`     | Redis 密码           | (空)                    |
| `JWT_SECRET`         | JWT 签名密钥         | (生产环境必须修改)      |
| `JWT_REFRESH_SECRET` | Refresh Token 密钥   | (生产环境必须修改)      |
| `DASHSCOPE_API_KEY`  | DashScope AI API Key | (可选，AI 功能需要)     |
| `CORS_ORIGINS`       | 允许的前端域名       | `http://localhost:5173` |
| `SWAGGER_ENABLED`    | 是否启用 Swagger     | `true`                  |

## 数据库迁移

```bash
cd packages/server

# 运行迁移（创建/更新表结构）
pnpm migration:run

# 回滚上一次迁移
pnpm migration:revert

# 生成新迁移（基于实体变更）
pnpm migration:generate -- database/migrations/MigrationName
```

当前迁移文件：

1. `CreateCustomersTable` — 客户表
2. `CreateOpportunitiesTable` — 商机表
3. `CreateCallRecordsTable` — 通话记录表
4. `CreateKnowledgeTables` — 知识库（文章 + 分类）
5. `CreateUsersTable` — 用户表
6. `SeedDemoUsers` — 初始化 admin/sales01 账号
7. `CreateAuditLogsTable` — 审计日志表

## API 文档

启动后端后访问 Swagger UI：`http://localhost:3000/api/docs`

### API 响应格式

```json
// 成功
{ "code": 0, "message": "success", "data": { ... } }

// 分页
{ "code": 0, "message": "success", "data": { "list": [], "total": 100, "page": 1, "pageSize": 20 } }

// 错误
{ "code": 40101, "message": "用户名或密码错误", "data": null }
```

### 主要 API 端点

| 模块   | 端点                               | 说明              |
| ------ | ---------------------------------- | ----------------- |
| 认证   | `POST /auth/login`                 | 登录              |
| 认证   | `POST /auth/refresh`               | 刷新 Token        |
| 客户   | `GET /customers`                   | 客户列表（分页）  |
| 客户   | `POST /customers/import`           | CSV 导入          |
| 客户   | `GET /customers/export`            | CSV 导出          |
| 商机   | `GET /opportunities`               | 商机列表          |
| 商机   | `PUT /opportunities/:id/stage`     | 推进阶段          |
| 商机   | `GET /opportunities/stats`         | 统计数据          |
| 通话   | `GET /call-records`                | 通话列表          |
| 通话   | `POST /call-records/:id/summarize` | AI 摘要           |
| 知识库 | `GET /knowledge/articles`          | 文章列表          |
| 知识库 | `POST /knowledge/ask`              | AI 问答 (RAG)     |
| 用户   | `GET /users`                       | 用户列表（Admin） |

> 所有业务端点需要 `Authorization: Bearer <token>` 请求头

## 测试

```bash
cd packages/server

# 运行全部测试
pnpm test

# 运行并查看覆盖率
pnpm test -- --coverage
```

当前测试覆盖：60 个测试用例（UserService、AuthService、CustomerService、AuthController）

## 生产部署

### Docker Compose 部署

```bash
# 1. 在服务器上配置 .env
cp .env.example .env
# 修改以下关键配置：
# - JWT_SECRET / JWT_REFRESH_SECRET：使用强随机字符串
# - DB_PASSWORD：使用安全密码
# - DASHSCOPE_API_KEY：填入 AI 功能密钥
# - CORS_ORIGINS：设置为实际前端域名
# - SWAGGER_ENABLED：生产环境建议设为 false

# 2. 构建并启动
docker compose up --build -d

# 3. 运行迁移
docker exec crm-server sh -c "cd /app/packages/server && node -r ts-node/register ./node_modules/.bin/typeorm migration:run -d database/data-source.ts"

# 4. 查看日志
docker compose logs -f server
```

### 服务架构

```
                    ┌─────────────────┐
  用户浏览器 ──────►│  Nginx (:80)    │
                    │  静态文件 + 反代  │
                    └────────┬────────┘
                             │ /api/*
                    ┌────────▼────────┐
                    │  NestJS (:3000) │
                    │  REST API       │
                    └───┬────────┬────┘
                        │        │
               ┌────────▼──┐ ┌──▼────────┐
               │ MySQL 8.0 │ │ Redis 7   │
               │ (:3306)   │ │ (:6379)   │
               └───────────┘ └───────────┘
```

### 安全检查清单

- [ ] 修改所有默认密码（DB_PASSWORD, JWT_SECRET 等）
- [ ] 删除 demo 用户或修改其密码
- [ ] 生产环境关闭 Swagger (`SWAGGER_ENABLED=false`)
- [ ] 配置 HTTPS（Nginx 或云服务商负载均衡）
- [ ] 设置 CORS_ORIGINS 为实际域名
- [ ] 配置数据库定期备份

## 技术亮点

- **RBAC 权限控制**：后端 RolesGuard + 前端 v-permission 指令双重保护
- **审计日志**：AuditLogInterceptor 自动记录所有 CUD 操作
- **Redis 缓存**：列表查询 + 详情页 + 统计数据多级缓存，自动失效
- **AI 集成**：Bull 异步队列处理 AI 摘要，RAG 知识库问答
- **请求限流**：@nestjs/throttler 防止暴力破解（登录 5次/分钟）
- **请求超时**：30s 全局超时拦截器
- **统一响应格式**：ResponseInterceptor + HttpExceptionFilter
- **前端体验**：路由过渡动画、动态页面标题、表格列排序
