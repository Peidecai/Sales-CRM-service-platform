# CRM Sales Platform — 全局 CLAUDE.md

> 本文件供所有 Agent Teammates 读取，定义项目全局规范与协作约定。

## 项目概览

**项目名**: AI 智能 CRM 销售管理系统
**代码仓库**: `crm-sales-platform/` (Monorepo)
**技术栈**:
- Backend: NestJS 10 + TypeORM 0.3 + MySQL 8.0 + Redis 7 + Bull
- Frontend: Vue 3.4 + Vite 5 + Element Plus 2 + Pinia + Vue Router 4
- Language: TypeScript 5.x (strict mode)
- Package Manager: pnpm (workspace)

## 目录结构

```
crm-sales-platform/
├── packages/
│   ├── shared/          # @crm/shared — 共享类型、枚举、接口
│   ├── server/          # @crm/server — NestJS 后端
│   └── web/             # @crm/web    — Vue 3 前端
├── docker/              # Docker 配置文件
├── docker-compose.yml
├── pnpm-workspace.yaml
└── CLAUDE.md            # 本文件
```

## 关键技术决策

| 项目 | 决策 |
|------|------|
| Package 前缀 | `@crm/*` |
| JWT Access Token 有效期 | 2 小时 |
| JWT Refresh Token 有效期 | 7 天 |
| 数据库名 | `crm_sales` (开发环境) |
| Redis 镜像 | `redis:7-alpine` |
| TypeORM synchronize | `false` — 必须使用 Migration |
| 响应格式 | `{ code: number, message: string, data: T }` |
| 软删除字段 | `deleted: boolean` (BaseEntity 中定义) |
| API 前缀 | `/api/v1` |

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

### 前端规范 (packages/web)
- 组件使用 `<script setup>` 语法
- 状态管理使用 Pinia stores
- API 调用统一通过 `src/api/request.ts` 的 axios 实例
- 路由守卫检查登录状态
- 使用 Element Plus 组件库，不引入其他 UI 库

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

| 范围 | 含义 |
|------|------|
| 0 | 成功 |
| 400xx | 请求参数错误 |
| 401xx | 认证错误 |
| 403xx | 权限错误 |
| 404xx | 资源不存在 |
| 500xx | 服务器内部错误 |

## 数据库规范

- 所有实体继承 `BaseEntity`（含 id, createdAt, updatedAt, deleted）
- 使用软删除，查询时自动过滤 `deleted = true`
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

## 模块分工（Phase 2 Agent Teams）

| Team | 模块 | CLAUDE.md 位置 |
|------|------|----------------|
| TM-A | 客户管理 (customer) | `packages/server/src/modules/customer/CLAUDE.md` |
| TM-B | 商机管理 (opportunity) | `packages/server/src/modules/opportunity/CLAUDE.md` |
| TM-C | 通话记录 (call-record) | `packages/server/src/modules/call-record/CLAUDE.md` |
| TM-D | 知识库 (knowledge) | `packages/server/src/modules/knowledge/CLAUDE.md` |

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

# 数据库迁移
cd packages/server
pnpm migration:run

# 代码检查
pnpm lint

# 运行测试
pnpm test
```
