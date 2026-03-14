# CRM Sales Platform — 全局 CLAUDE.md

> 本文件供所有 Agent Teammates 读取，定义项目全局规范与协作约定。

## 项目概览

**项目名**: AI 智能 CRM 销售管理系统
**代码仓库**: `crm-sales-platform/` (Monorepo)
**技术栈**:

- Backend: NestJS 10 + TypeORM 0.3 + MySQL 8.0 + Redis 7 + Bull
- Frontend (PC): Vue 3.4 + Vite 5 + Element Plus 2 + Pinia + Vue Router 4
- Frontend (Mobile): uni-app 3.x + Vue 3 + Pinia（微信小程序，`@crm/miniapp`）
- Language: TypeScript 5.x (strict mode)
- Package Manager: pnpm (workspace)

## 目录结构

```
crm-sales-platform/
├── packages/
│   ├── shared/          # @crm/shared — 共享类型、枚举、接口
│   ├── server/          # @crm/server — NestJS 后端
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── decorators/    # @CurrentUser 自定义装饰器
│   │   │   │   ├── guards/        # JwtAuthGuard, RolesGuard, CustomThrottlerGuard
│   │   │   │   ├── interceptors/  # AuditLogInterceptor, TimeoutInterceptor, ResponseInterceptor
│   │   │   │   ├── filters/       # HttpExceptionFilter
│   │   │   │   ├── middleware/    # CSRF, SqlInjection, RequestContext
│   │   │   │   ├── security/      # EncryptionService (AES-256-GCM), DataMaskingInterceptor
│   │   │   │   └── redis/         # RedisService, cache-keys
│   │   │   ├── config/            # 数据库配置
│   │   │   └── modules/
│   │   │       ├── auth/          # JWT 双 Token 认证 + 微信 OAuth
│   │   │       ├── user/          # 用户管理（Admin）
│   │   │       ├── customer/      # 客户管理（含导入/导出/合并/查重）
│   │   │       ├── opportunity/   # 商机管理
│   │   │       ├── call-record/   # 通话记录 + AI 摘要
│   │   │       ├── call/          # 电话拨打 + 外呼弹屏 + 回调
│   │   │       ├── recording/     # 录音存储 + ASR 转写
│   │   │       ├── agent/         # 坐席状态管理 + 来电分配
│   │   │       ├── campaign/      # 外呼任务/活动管理
│   │   │       ├── knowledge/     # 知识库 + AI 问答
│   │   │       ├── ai/            # AI 集成（DashScope/Claude）
│   │   │       ├── notification/  # WebSocket 实时通知
│   │   │       ├── follow-up/     # 跟进提醒调度
│   │   │       ├── sales-target/  # 销售目标 + 绩效排名
│   │   │       ├── contact/       # 联系人管理
│   │   │       ├── customer-pool/ # 客户公海池
│   │   │       ├── customer-tag/  # 客户标签 + 自动打标
│   │   │       ├── custom-field/  # 自定义字段
│   │   │       ├── material/      # 素材管理（OSS 上传）
│   │   │       ├── announcement/  # 公告管理
│   │   │       ├── rbac/          # 角色权限表
│   │   │       ├── route/         # 路由权限
│   │   │       ├── quotation/     # 报价单
│   │   │       ├── payment/       # 回款记录
│   │   │       ├── contract/      # 合同管理
│   │   │       ├── approval/      # 审批流程
│   │   │       ├── audit-log/     # 审计日志（全局模块）
│   │   │       └── health/        # 健康检查
│   │   ├── database/              # TypeORM migrations
│   │   └── test/                  # Jest 单元测试
│   ├── web/             # @crm/web    — Vue 3 前端（PC 管理后台）
│   │   └── src/
│   │       ├── api/               # API 封装层 (axios)
│   │       ├── composables/       # usePermission 等组合式函数
│   │       ├── directives/        # v-permission 自定义指令
│   │       ├── layout/            # 布局组件
│   │       ├── router/            # 路由 + 守卫
│   │       ├── stores/            # Pinia 状态管理
│   │       ├── utils/             # 工具函数
│   │       └── views/             # 页面���件
│   └── miniapp/         # @crm/miniapp — 微信小程序（uni-app，销售移动端）
│       └── src/
│           ├── api/               # API 封装（wx.request 封装 + 离线队列）
│           ├── pages/             # 页面：首页、客户、跟进、签到、绩效、语音、消息
│           ├── stores/            # Pinia 状态管理（app/user）
│           └── utils/             # offline-queue, cache-store, geo
├── docker/              # Docker 配置文件 (MySQL/Redis/Nginx)
├── docker-compose.yml   # 一键部署编排
├── .dockerignore        # Docker 构建排除规则
├── pnpm-workspace.yaml
├── README.md            # 项目文档（快速开始、部署、API 说明）
└── CLAUDE.md            # 本文件
```

## 关键技术决策

| 项目                     | 决策                                              |
| ------------------------ | ------------------------------------------------- |
| Package 前缀             | `@crm/*`                                          |
| JWT Access Token 有效期  | 2 小时                                            |
| JWT Refresh Token 有效期 | 7 天                                              |
| 数据库名                 | `crm_sales` (开发环境)                            |
| Redis 镜像               | `redis:7-alpine`                                  |
| TypeORM synchronize      | `false` — 必须使用 Migration                      |
| 响应格式                 | `{ code: number, message: string, data: T }`      |
| 软删除字段               | `@DeleteDateColumn deletedAt: Date\|null` (BaseEntity 中定义) |
| API 前缀                 | `/api/v1`                                                     |
| 请求限流                 | `@nestjs/throttler` — 全局 60 req/min（认证用户按 userId 计，匿名按 IP），登录 5/min |
| 请求超时                 | `TimeoutInterceptor` — 全局 30 秒                 |
| 审计日志                 | `AuditLogInterceptor` — 自动记录 POST/PUT/DELETE  |
| 权限守卫                 | `RolesGuard` + `@Roles()` 装饰器                  |
| 用户提取                 | `@CurrentUser()` 参数装饰器（替代 `@Req()`）      |

## 代码规范

### 通用规则

- 所有代码使用 TypeScript，开启 strict 模式
- 文件名使用 kebab-case（如 `user-service.ts`）
- 类名使用 PascalCase，变量/函数使用 camelCase
- 不允许 `any` 类型，使用 `unknown` 替代
- 所有异步函数必须处理错误

### 后端规范 (packages/server)

- 模块结构: `module.ts / controller.ts / service.ts / entity.ts / dto/`
- DTO 必须使用 `class-validator` 装饰器验证
- Service 层处理业务逻辑，Controller 层只负责 HTTP 适配
- 所有数据库操作通过 Repository 模式
- 敏感字段（密码等）不得出现在响应中
- 使用 `@crm/shared` 中的类型定义
- 所有业务 Controller 必须使用 `@UseGuards(JwtAuthGuard, RolesGuard)`
- 需权限限制的端点使用 `@Roles(UserRole.ADMIN, UserRole.MANAGER)` 等
- 使用 `@CurrentUser()` 获取当前用户（而非 `@Req()`）
- 写操作 Controller 使用 `@UseInterceptors(AuditLogInterceptor)` 自动审计

### 前端规范 (packages/web)

- 组件使用 `<script setup>` 语法
- 状态管理使用 Pinia stores
- API 调用统一通过 `src/api/request.ts` 的 axios 实例
- 路由守卫检查登录状态
- 使用 Element Plus 组件库，不引入其他 UI 库
- 权限控制使用 `v-permission` 指令或 `usePermission()` composable
- 需角色限制的按钮使用 `v-if="isAdminOrManager"` 隐藏

## API 响应格式

```typescript
// 成功响应
{ code: 0, message: 'success', data: T }

// 分页响应
{ code: 0, message: 'success', data: { list: T[], total: number, page: number, pageSize: number } }

// 错误响应
{ code: number, message: string, data: null }
```

## 错误码约定

| 范围  | 含义           |
| ----- | -------------- |
| 0     | 成功           |
| 400xx | 请求参数错误   |
| 401xx | 认证错误       |
| 403xx | 权限错误       |
| 404xx | 资源不存在     |
| 500xx | 服务器内部错误 |

## 数据库规范

- 所有实体继承 `BaseEntity`（含 id, createdAt, updatedAt, deletedAt）
- 使用软删除（`@DeleteDateColumn`），TypeORM WithDeleted=false 时自动过滤 `deleted_at IS NOT NULL`
- 表名使用 snake_case
- 外键字段命名：`{relation}Id`
- 必须为常用查询字段添加索引

## Git 提交规范

使用 Conventional Commits：

```
feat: 添加客户列表分页功能
fix: 修复 JWT 刷新 token 失效问题
chore: 更新依赖版本
docs: 更新 API 文档
```

## 权限体系 (RBAC)

| 角色    | 权限范围                        |
| ------- | ------------------------------- |
| Admin   | 全部功能 + 用户管理             |
| Manager | 业务 CRUD + 删除/导入/导出      |
| Sales   | 业务 CRUD（不含删除/导入/导出） |

### 后端权限实现

- `JwtAuthGuard`：验证 JWT Token，提取用户信息到 `req.user`
- `RolesGuard`：读取 `@Roles()` 元数据，校验 `user.role` 是否匹配
- `@CurrentUser()` 装饰器：从 `req.user` 提取用户信息（支持属性访问如 `@CurrentUser('id')`）
- 所有业务 Controller 类级别应用 `@UseGuards(JwtAuthGuard, RolesGuard)`
- DELETE / export / import 端点限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`

### 前端权限实现

- `v-permission` 指令：`<el-button v-permission="['admin', 'manager']">` — 不匹配时移除 DOM
- `usePermission()` composable：提供 `isAdmin`, `isManager`, `isSales`, `isAdminOrManager` 计算属性

## 审计日志

- 全局模块 `AuditLogModule`（`@Global()`），所有模块可注入 `AuditLogService`
- `AuditLogInterceptor`：拦截 POST/PUT/DELETE 请求，自动记录操作
- 记录字段：userId, username, action, resource, resourceId, before, after, ip, createdAt
- fire-and-forget 模式，不阻塞业务响应

## 缓存策略 (Redis)

| 缓存类型 | Key 前缀                     | TTL  |
| -------- | ---------------------------- | ---- |
| 客户列表 | `cache:customers:list`       | 60s  |
| 客户详情 | `cache:customers:detail`     | 120s |
| 商机列表 | `cache:opportunities:list`   | 60s  |
| 商机详情 | `cache:opportunities:detail` | 120s |
| 商机统计 | `cache:opportunities:stats`  | 300s |

- 写操作（create/update/delete）自动失效相关缓存
- 使用 `RedisService.delByPattern()` 批量清除

## 模块分工

| Team | 模块                   | CLAUDE.md 位置                                      |
| ---- | ---------------------- | --------------------------------------------------- |
| TM-A | 客户管理 (customer)    | `packages/server/src/modules/customer/CLAUDE.md`    |
| TM-B | 商机管理 (opportunity) | `packages/server/src/modules/opportunity/CLAUDE.md` |
| TM-C | 通话记录 (call-record) | `packages/server/src/modules/call-record/CLAUDE.md` |
| TM-D | 知识库 (knowledge)     | `packages/server/src/modules/knowledge/CLAUDE.md`   |
| —    | 审计日志 (audit-log)   | `packages/server/src/modules/audit-log/CLAUDE.md`   |
| —    | 微信小程序 (miniapp)   | `packages/miniapp/CLAUDE.md`                        |

## 环境变量

参考 `packages/server/.env.example` 和根目录 `.env.example`。
本地开发需复制为 `.env` 并填入实际值。

## 常用命令

```bash
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev:server    # NestJS: http://localhost:3000
pnpm dev:web       # Vue: http://localhost:5173
pnpm --filter @crm/miniapp dev:mp-weixin  # 微信小程序（需微信开发者工具）

# 数据库迁移（必须使用 crm_migrator DDL 账户，不能用 crm_user）
cd packages/server
DB_USERNAME=crm_migrator DB_PASSWORD=<migrator-pwd> pnpm migration:run

# 代码检查
pnpm lint

# 运行测试
pnpm test
```
