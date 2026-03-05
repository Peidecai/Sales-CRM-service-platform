# TM-B: 商机管理模块 CLAUDE.md

## 模块信息

**Team**: TM-B
**模块**: 商机管理 (Opportunity Management)
**路径**: `packages/server/src/modules/opportunity/`
**前端路由**: `/opportunity`

## 功能范围

### 核心功能

1. 商机 CRUD
2. 商机看板视图（按阶段 Kanban）
3. 商机列表分页过滤
4. 商机阶段推进（含成交率自动更新）
5. 商机金额统计与预测
6. 关联客户与联系人

## 技术规范

### 实体设计

```typescript
// opportunity.entity.ts
@Entity('opportunities')
export class Opportunity extends BaseEntity {
  @Column({ length: 200 })
  title: string

  @Column({ name: 'customer_id' })
  customerId: number

  @Column({ type: 'enum', enum: OpportunityStage, default: OpportunityStage.LEAD })
  stage: OpportunityStage

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number

  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate: Date

  @Column({ type: 'int', default: 0, comment: '成交概率 0-100' })
  probability: number

  @Column({ name: 'assigned_user_id' })
  assignedUserId: number

  @Column({ type: 'text', nullable: true })
  description: string
}
```

### API 端点

| 方法   | 路径                            | 描述     |
| ------ | ------------------------------- | -------- |
| GET    | /api/v1/opportunities           | 分页列表 |
| POST   | /api/v1/opportunities           | 创建商机 |
| GET    | /api/v1/opportunities/:id       | 商机详情 |
| PUT    | /api/v1/opportunities/:id       | 更新商机 |
| PUT    | /api/v1/opportunities/:id/stage | 推进阶段 |
| DELETE | /api/v1/opportunities/:id       | 软删除   |
| GET    | /api/v1/opportunities/stats     | 统计数据 |

### 前端组件路径

- `packages/web/src/views/opportunity/index.vue` — 商机列表/看板
- `packages/web/src/api/opportunity.ts` — API 封装

## 依赖关系

- **依赖**: Customer 模块 (TM-A)、`@crm/shared` (OpportunityBasicInfo, OpportunityStage)
- **被依赖**: 通话记录模块 (TM-C) 可关联商机

## 成交概率参考

| 阶段        | 默认概率 |
| ----------- | -------- |
| LEAD        | 10%      |
| QUALIFIED   | 25%      |
| PROPOSAL    | 50%      |
| NEGOTIATION | 75%      |
| CLOSED_WON  | 100%     |
| CLOSED_LOST | 0%       |

## 权限与安全

### RBAC 权限控制

- Controller 类级别应用 `@UseGuards(JwtAuthGuard, RolesGuard)`
- DELETE (`/opportunities/:id`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 导出 (`GET /opportunities/export`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 其他 CRUD 操作（含阶段推进）所有已认证角色可用

### 审计日志

- Controller 使用 `@UseInterceptors(AuditLogInterceptor)` 自动记录所有写操作
- 记录字段：用户信息、操作类型、资源 ID、请求 IP

### Redis 缓存

- 列表缓存 `cache:opportunities:list:*`（TTL 60s）
- 详情缓存 `cache:opportunities:detail:*`（TTL 120s）
- 统计缓存 `cache:opportunities:stats`（TTL 300s）
- create/update/delete/updateStage 时自动失效缓存

### 前端权限

- 删除按钮、导出按钮使用 `v-if="isAdminOrManager"` 隐藏
