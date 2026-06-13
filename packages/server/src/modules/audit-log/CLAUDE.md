# 审计日志模块 CLAUDE.md

## 模块信息

**模块**: 审计日志 (Audit Log)
**路径**: `packages/server/src/modules/audit-log/`
**类型**: 全局模块 (`@Global()`)

## 功能范围

### 核心功能

1. 自动记录所有写操作（CREATE / UPDATE / DELETE）
2. 记录操作用户、资源类型、资源 ID、请求 IP
3. 审计日志查询（分页、按用户/资源/操作类型过滤）

## 架构设计

### 组件结构

```
audit-log/
├── audit-log.entity.ts      # AuditLog 实体 + AuditAction 枚举
├── audit-log.service.ts      # log() 写入 + findAll() 查询
├── audit-log.module.ts       # @Global() 模块，全局可注入
└── CLAUDE.md                 # 本文件
```

### 拦截器（位于 common/interceptors/）

- `audit-log.interceptor.ts`：拦截 POST/PUT/PATCH/DELETE 请求
  - 从 Controller 类名推断 resource（如 `CustomerController` → `customer`）
  - 从 route params 提取 resourceId
  - 从 `req.user` 提取 userId 和 username
  - 从 `req.ip` / `x-forwarded-for` 提取客户端 IP
  - **fire-and-forget 模式**：不阻塞业务响应，失败静默忽略

## 实体设计

```typescript
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn() id: number
  @Column({ name: 'user_id' }) userId: number
  @Column({ length: 50 }) username: string
  @Column({ type: 'enum', enum: AuditAction }) action: AuditAction
  @Column({ length: 50 }) resource: string
  @Column({ name: 'resource_id', nullable: true }) resourceId: number
  @Column({ type: 'json', nullable: true }) before: Record<string, unknown> | null
  @Column({ type: 'json', nullable: true }) after: Record<string, unknown> | null
  @Column({ length: 50, nullable: true }) ip: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}
```

### 数据库索引

- `IDX_AUDIT_LOGS_USER_ID` — user_id
- `IDX_AUDIT_LOGS_RESOURCE` — resource
- `IDX_AUDIT_LOGS_CREATED_AT` — created_at

### 数据库迁移

- `1709000006000-CreateAuditLogsTable.ts` — 建表 + 索引

## API 端点

| 方法 | 路径               | 描述                         |
| ---- | ------------------ | ---------------------------- |
| GET  | /api/v1/audit-logs | 审计日志分页查询（仅 Admin） |

### 查询参数

- `page` — 页码（默认 1）
- `pageSize` — 每页条数（默认 20）
- `userId` — 按操作用户过滤
- `resource` — 按资源类型过滤（customer, opportunity, call-record, knowledge）
- `action` — 按操作类型过滤（CREATE, UPDATE, DELETE）

## 使用方式

### 自动审计（推荐）

在业务 Controller 类上添加拦截器：

```typescript
@UseInterceptors(AuditLogInterceptor)
@Controller('customers')
export class CustomerController { ... }
```

### 手动审计

注入 `AuditLogService` 后调用 `log()` 方法：

```typescript
await this.auditLogService.log({
  userId: 1,
  username: 'admin',
  action: AuditAction.CREATE,
  resource: 'customer',
  resourceId: 42,
  after: { name: '新客户' },
  ip: '127.0.0.1',
})
```

## 注意事项

1. 审计日志**不使用软删除**，不继承 BaseEntity
2. 审计日志只有 `created_at`，没有 `updated_at`（日志不可修改）
3. `AuditLogInterceptor` 依赖 DI 注入 `AuditLogService`，不能用 `new` 实例化
4. fire-and-forget 模式下，审计失败不会影响业务接口的正常响应

## Skill 规范

- **backend-patterns** — 全局模块、拦截器模式
- **coding-standards** — TypeScript 严格模式
- **tdd-workflow** — 8 tests (AuditLogService)
