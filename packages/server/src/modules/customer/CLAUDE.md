# TM-A: 客户管理模块 CLAUDE.md

## 模块信息

**Team**: TM-A
**模块**: 客户管理 (Customer Management)
**路径**: `packages/server/src/modules/customer/`
**前端路由**: `/customer`

## 功能范围

### 核心功能

1. 客户 CRUD（创建、查询、更新、软删除）
2. 客户列表分页搜索（关键词、状态、负责人过滤）
3. 客户状态流转管理
4. 客户详情查看（联系记录、商机列表）
5. 客户批量导入/导出（CSV/Excel）
6. 客户分配（管理员可重新分配负责销售员）

## 技术规范

### 实体设计

```typescript
// customer.entity.ts
@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ length: 100 })
  name: string

  @Column({ length: 200, nullable: true })
  company: string

  @Column({ length: 20, nullable: true })
  phone: string

  @Column({ length: 100, nullable: true })
  email: string

  @Column({ type: 'enum', enum: CustomerStatus, default: CustomerStatus.POTENTIAL })
  status: CustomerStatus

  @Column({ name: 'assigned_user_id' })
  assignedUserId: number

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ type: 'json', nullable: true })
  tags: string[]
}
```

### API 端点

| 方法   | 路径                     | 描述     |
| ------ | ------------------------ | -------- |
| GET    | /api/v1/customers        | 分页列表 |
| POST   | /api/v1/customers        | 创建客户 |
| GET    | /api/v1/customers/:id    | 客户详情 |
| PUT    | /api/v1/customers/:id    | 更新客户 |
| DELETE | /api/v1/customers/:id    | 软删除   |
| POST   | /api/v1/customers/import | 批量导入 |
| GET    | /api/v1/customers/export | 导出     |

### 前端组件路径

- `packages/web/src/views/customer/index.vue` — 客户列表页
- `packages/web/src/views/customer/detail.vue` — 客户详情页
- `packages/web/src/api/customer.ts` — API 封装

## 依赖关系

- **依赖**: `@crm/shared` (CustomerBasicInfo, CustomerStatus)
- **被依赖**: 商机模块 (TM-B) 会引用 Customer 实体

## 注意事项

1. 查询时必须过滤 `deleted = false`
2. 状态变更需记录操作日志
3. 导入时需验证手机号格式
4. 列表查询默认按 `updatedAt DESC` 排序

## 权限与安全

### RBAC 权限控制

- Controller 类级别应用 `@UseGuards(JwtAuthGuard, RolesGuard)`
- DELETE (`/customers/:id`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 导入 (`POST /customers/import`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 导出 (`GET /customers/export`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 其他 CRUD 操作所有已认证角色可用

### 审计日志

- Controller 使用 `@UseInterceptors(AuditLogInterceptor)` 自动记录所有写操作
- 记录字段：用户信息、操作类型（CREATE/UPDATE/DELETE）、资源 ID、请求 IP

### Redis 缓存

- 列表缓存 `cache:customers:list:*`（TTL 60s）
- 详情缓存 `cache:customers:detail:*`（TTL 120s）
- create/update/delete 时自动失效列表和详情缓存

### 前端权限

- 删除按钮、导入/导出按钮使用 `v-if="isAdminOrManager"` 隐藏
- 使用 `usePermission()` composable 获取角色状态
