# T23 — 客户分组

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — clientGroup
> 优先级: 🟢低
> 参考设计: 03-customer-management.md §3.1

## 背景

磐销云提供客户分组功能，本项目已有 customer-tag 模块实现标签管理，但缺少分组能力。标签是扁平的标记，分组则支持规则驱动的动态归类和手动静态归类，可对分组进行批量操作和分组级分析。客户分组是精细化运营的基础设施。

## 功能需求

| #   | 功能         | 说明                                                           |
| --- | ------------ | -------------------------------------------------------------- |
| F1  | 静态分组     | 手动将客户加入/移出分组                                        |
| F2  | 动态分组     | 基于规则自动匹配客户（行业、地区、阶段、最后联系日期、标签等） |
| F3  | 分组 CRUD    | 创建/编辑/删除分组，设置分组名称、描述、类型（static/dynamic） |
| F4  | 规则引擎     | 动态分组规则配置：字段+运算符+值，支持 AND/OR 组合             |
| F5  | 分组批量操作 | 对分组内所有客户批量转让/打标签/发通知                         |
| F6  | 分组分析     | 分组内客户统计（数量、阶段分布、活跃度、成交率）               |
| F7  | 分组刷新     | 动态分组定时/手动刷新成员列表                                  |

## 技术方案

### 后端

#### Entity

```typescript
// customer-group.entity.ts
@Entity("customer_groups")
export class CustomerGroup extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 20 })
  type: "static" | "dynamic";

  @Column({ type: "simple-json", nullable: true })
  rules: GroupRule[] | null;
  // [{ field: 'industry', operator: 'eq', value: 'IT' }, { logic: 'AND', field: 'status', operator: 'in', value: ['active','follow_up'] }]

  @Column({ type: "int", default: 0 })
  memberCount: number; // 缓存成员数

  @Column({ type: "datetime", nullable: true })
  lastRefreshedAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdById" })
  createdBy: User;

  @Column({ type: "int" })
  createdById: number;
}

// customer-group-member.entity.ts (静态分组使用)
@Entity("customer_group_members")
export class CustomerGroupMember extends BaseEntity {
  @ManyToOne(() => CustomerGroup)
  @JoinColumn({ name: "groupId" })
  group: CustomerGroup;

  @Column({ type: "int" })
  groupId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: "customerId" })
  customer: Customer;

  @Column({ type: "int" })
  customerId: number;
}
```

#### 规则引擎类型 (shared)

```typescript
interface GroupRule {
  logic?: "AND" | "OR"; // 与前一条规则的关系，第一条无此字段
  field: string; // customer 字段名: industry, region, status, scale, level, lastContactAt, tags
  operator:
    | "eq"
    | "neq"
    | "in"
    | "not_in"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "contains"
    | "before"
    | "after"
    | "days_ago_gt"
    | "days_ago_lt";
  value: string | number | string[];
}
```

#### DTO

- `CreateCustomerGroupDto`: name, description?, type, rules? (required when type=dynamic)
- `UpdateCustomerGroupDto`: PartialType
- `AddGroupMembersDto`: customerIds: number[]
- `RemoveGroupMembersDto`: customerIds: number[]
- `GroupBatchActionDto`: action ('transfer' | 'tag' | 'notify'), params: Record<string, unknown>
- `GroupAnalyticsQueryDto`: groupId

#### Service

- `CustomerGroupService`:
  - `create(dto, user)`: 创建分组；动态分组立即执行规则匹配
  - `update(id, dto, user)`: 更新分组；规则变更时重新匹配
  - `delete(id, user)`: 软删除分组
  - `findAll(user, page, pageSize)`: 列表（SALES 只看自己创建的 + 共享的）
  - `findOne(id)`: 详情含成员列表
  - `addMembers(groupId, customerIds)`: 静态分组添加成员
  - `removeMembers(groupId, customerIds)`: 静态分组移除成员
  - `refreshDynamic(groupId)`: 重新执行规则查询，更新成员列表
  - `batchRefreshAll()`: Cron Job 每日刷新所有动态分组
  - `getMembers(groupId, page, pageSize)`: 获取分组成员（动态分组实时查询）
  - `batchAction(groupId, action, params, user)`: 对分组执行批量操作
  - `getAnalytics(groupId)`: 分组统计分析
- `GroupRuleEngine`:
  - `buildQuery(rules: GroupRule[]): SelectQueryBuilder`: 将规则转换为 TypeORM QueryBuilder 条件

#### Controller

- `CustomerGroupController`: `/api/v1/customer-groups`

#### Module

- `CustomerGroupModule`: 导入 CustomerModule, CustomerTagModule, UserModule, NotificationModule

#### Migration

- `1709000088000-CreateCustomerGroups.ts`
- `1709000089000-CreateCustomerGroupMembers.ts`

### 前端 (PC)

| 文件                                                     | 说明                      |
| -------------------------------------------------------- | ------------------------- |
| `web/src/views/customer/groups.vue`                      | 分组列表页                |
| `web/src/views/customer/components/GroupDetail.vue`      | 分组详情（成员列表+统计） |
| `web/src/views/customer/components/GroupRuleBuilder.vue` | 动态规则可视化构建器      |
| `web/src/views/customer/components/GroupBatchAction.vue` | 批量操作对话框            |
| `web/src/api/customer-group.ts`                          | API 层                    |

### 前端 (APP)

| 文件                                              | 说明            |
| ------------------------------------------------- | --------------- |
| `miniapp/src/pages-sub/customer/group-list.vue`   | 分组列表        |
| `miniapp/src/pages-sub/customer/group-detail.vue` | 分组详情 + 成员 |

## API 接口

| Method | Path                                       | Description          | Auth          |
| ------ | ------------------------------------------ | -------------------- | ------------- |
| GET    | `/api/v1/customer-groups`                  | 分组列表             | All           |
| POST   | `/api/v1/customer-groups`                  | 创建分组             | All           |
| GET    | `/api/v1/customer-groups/:id`              | 分组详情             | All           |
| PUT    | `/api/v1/customer-groups/:id`              | 更新分组             | All           |
| DELETE | `/api/v1/customer-groups/:id`              | 删除分组             | All           |
| GET    | `/api/v1/customer-groups/:id/members`      | 成员列表（分页）     | All           |
| POST   | `/api/v1/customer-groups/:id/members`      | 添加成员（静态分组） | All           |
| DELETE | `/api/v1/customer-groups/:id/members`      | 移除成员（静态分组） | All           |
| POST   | `/api/v1/customer-groups/:id/refresh`      | 刷新动态分组         | All           |
| POST   | `/api/v1/customer-groups/:id/batch-action` | 批量操作             | Manager/Admin |
| GET    | `/api/v1/customer-groups/:id/analytics`    | 分组分析             | All           |

## 数据库设计

### customer_groups

| Column            | Type             | Nullable | Description                |
| ----------------- | ---------------- | -------- | -------------------------- |
| id                | int (PK, auto)   | NO       |                            |
| name              | varchar(100)     | NO       | 分组名称                   |
| description       | varchar(500)     | YES      | 描述                       |
| type              | varchar(20)      | NO       | static / dynamic           |
| rules             | json             | YES      | 动态规则（dynamic 时必填） |
| member_count      | int              | NO       | 成员数缓存                 |
| last_refreshed_at | datetime         | YES      | 最后刷新时间               |
| created_by_id     | int (FK → users) | NO       | 创建人                     |
| created_at        | datetime(6)      | NO       |                            |
| updated_at        | datetime(6)      | NO       |                            |
| deleted_at        | datetime(6)      | YES      | 软删除                     |

**索引**: `IDX_cg_type` (type), `IDX_cg_created_by` (created_by_id)

### customer_group_members

| Column      | Type                       | Nullable | Description |
| ----------- | -------------------------- | -------- | ----------- |
| id          | int (PK, auto)             | NO       |             |
| group_id    | int (FK → customer_groups) | NO       | 分组 ID     |
| customer_id | int (FK → customers)       | NO       | 客户 ID     |
| created_at  | datetime(6)                | NO       |             |
| updated_at  | datetime(6)                | NO       |             |
| deleted_at  | datetime(6)                | YES      | 软删除      |

**索引**: `UNQ_cgm_group_customer` (group_id, customer_id) UNIQUE, `IDX_cgm_customer` (customer_id)

## 依赖模块

| 模块               | 关系                        |
| ------------------ | --------------------------- |
| CustomerModule     | 导入 — 客户数据查询         |
| CustomerTagModule  | 导入 — 规则引擎中按标签筛选 |
| UserModule         | 导入 — 创建人               |
| NotificationModule | 导入 — 批量通知操作         |

## 验收标准

- [ ] 静态分组：手动添加/移除客户，成员数正确更新
- [ ] 动态分组：规则配置后自动匹配客户，支持 AND/OR 组合
- [ ] 规则引擎支持字段：industry, region, status, scale, level, lastContactAt, tags
- [ ] 规则引擎支持运算符：eq, neq, in, not_in, gt, lt, contains, before, after, days_ago_gt, days_ago_lt
- [ ] 动态分组每日自动刷新 + 手动触发刷新
- [ ] 批量操作（转让、打标签）对分组内所有客户执行
- [ ] 分组分析返回成员数、阶段分布、平均活跃度
- [ ] SALES 只能查看自己创建的分组及其中自己负责的客户
- [ ] 前端规则构建器交互友好，支持可视化添加/删除条件
- [ ] 后端单元测试 ≥18 tests（CustomerGroupService + GroupRuleEngine）
- [ ] Migration 可正向/反向执行
- [ ] Skills: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
