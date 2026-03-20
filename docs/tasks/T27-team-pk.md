# T27 — 多人PK

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — 磐销云 manyTomany PK
> 优先级: 🟢低
> 参考设计: 09-sales-pk-target.md §9.2

## 背景

磐销云支持多对多 PK（团队 vs 团队），本项目现有 `sales-target` 模块仅支持排行榜，缺少 PK 对战功能。多人 PK 可激发团队竞争意识，提升销售积极性。需在现有 sales-target 模块基础上扩展 PK 子模块，支持一对一和多对多两种模式。

## 功能需求

| #   | 功能        | 说明                                                  | 优先级 |
| --- | ----------- | ----------------------------------------------------- | ------ |
| 1   | PK 创建     | Admin/Manager 创建 PK，选择类型(1v1/团队)、指标、周期 | P1     |
| 2   | 团队组建    | PK 创建时分配成员到两个队伍                           | P1     |
| 3   | PK 指标     | 支持: 签单金额、成交数、通话数、新客户数、回款金额    | P1     |
| 4   | 实时排行榜  | PK 进行中实时计算双方得分，WebSocket 推送更新         | P1     |
| 5   | PK 状态流转 | pending → active → finished / cancelled               | P1     |
| 6   | 自动结算    | PK 到期后自动判定胜负，Cron 定时检查                  | P1     |
| 7   | PK 历史     | 历史 PK 列表 + 个人胜率统计                           | P2     |
| 8   | 奖励徽章    | PK 胜利获得徽章（连胜/首胜/MVP 等）                   | P3     |
| 9   | 里程碑通知  | PK 开始/领先变更/反超/结束时推送通知                  | P2     |
| 10  | PK 赌注     | 可选文字赌注（如"输了请喝奶茶"）                      | P3     |

## 技术方案

### 后端

#### 共享枚举 (`@crm/shared`)

```typescript
enum PkType {
  ONE_ON_ONE = "one_on_one",
  TEAM_VS_TEAM = "team_vs_team",
}

enum PkStatus {
  PENDING = "pending",
  ACTIVE = "active",
  FINISHED = "finished",
  CANCELLED = "cancelled",
}

enum PkMetric {
  REVENUE = "revenue",
  DEAL_COUNT = "deal_count",
  CALL_COUNT = "call_count",
  NEW_CUSTOMER = "new_customer",
  COLLECTION = "collection",
}

enum PkResult {
  TEAM_A_WIN = "team_a_win",
  TEAM_B_WIN = "team_b_win",
  DRAW = "draw",
}
```

#### Entity

```typescript
// pk.entity.ts
@Entity("pk")
class Pk extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "varchar", length: 20 })
  type: PkType;

  @Column({ type: "varchar", length: 20 })
  status: PkStatus;

  @Column({ type: "varchar", length: 30 })
  metric: PkMetric;

  @Column({ type: "timestamp" })
  startDate: Date;

  @Column({ type: "timestamp" })
  endDate: Date;

  @Column({ type: "text", nullable: true })
  stake: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  result: PkResult | null;

  @ManyToOne(() => User)
  createdBy: User;

  @Column()
  createdById: string;

  @OneToMany(() => PkTeam, (t) => t.pk)
  teams: PkTeam[];
}

// pk-team.entity.ts
@Entity("pk_team")
class PkTeam extends BaseEntity {
  @ManyToOne(() => Pk, (p) => p.teams, { onDelete: "CASCADE" })
  pk: Pk;

  @Column()
  pkId: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 1, comment: "A or B" })
  side: "A" | "B";

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  score: number;

  @Column({ type: "boolean", default: false })
  isWinner: boolean;

  @OneToMany(() => PkMember, (m) => m.team)
  members: PkMember[];
}

// pk-member.entity.ts
@Entity("pk_member")
@Unique(["pkId", "userId"])
class PkMember extends BaseEntity {
  @ManyToOne(() => PkTeam, (t) => t.members, { onDelete: "CASCADE" })
  team: PkTeam;

  @Column()
  teamId: string;

  @Column()
  pkId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  contribution: number;
}

// pk-badge.entity.ts
@Entity("pk_badge")
class PkBadge extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: "varchar", length: 50 })
  type: "first_win" | "streak_3" | "streak_5" | "mvp" | "comeback";

  @ManyToOne(() => Pk, { onDelete: "SET NULL", nullable: true })
  pk: Pk | null;

  @Column({ type: "varchar", nullable: true })
  pkId: string | null;
}
```

#### Service

- `PkService`: CRUD + 状态流转 + 实时得分计算
  - `calculateScore(pkId)`: 根据 metric 查询 Opportunity/CallRecord/Customer 聚合计算
  - `settlePk(pkId)`: 判定胜负、发放徽章、发送通知
  - `getRanking(pkId)`: 实时排行（按成员贡献）
- `PkCronService`: `@Cron('0 */5 * * * *')` 检查到期 PK 自动结算；刷新进行中 PK 得分
- `PkBadgeService`: 徽章发放逻辑

#### Controller

- `PkController`: RESTful 端点 + `@UseGuards(JwtAuthGuard, RolesGuard)`

#### Module

- `PkModule`: imports UserModule, OpportunityModule, CustomerModule, CallRecordModule, NotificationModule

#### Migration

- `1709000091000-CreatePkTables.ts`: pk, pk_team, pk_member, pk_badge 四表

### 前端 (PC)

#### 页面

| 页面    | 路径          | 说明                                 |
| ------- | ------------- | ------------------------------------ |
| PK 列表 | `/pk`         | 进行中/已结束 PK 卡片列表            |
| PK 详情 | `/pk/:id`     | 实时得分看板 + 成员贡献排名 + 倒计时 |
| 创建 PK | `/pk/create`  | 表单: 类型/指标/时间/成员/赌注       |
| PK 历史 | `/pk/history` | 历史记录 + 个人战绩 + 徽章墙         |

#### 组件

- `PkCard.vue`: PK 卡片（双方头像+比分+状态+倒计时）
- `PkScoreboard.vue`: 实时得分看板（双柱形图/进度条对比）
- `PkMemberRank.vue`: 成员贡献排名表
- `PkBadgeWall.vue`: 徽章展示墙
- `PkCreateForm.vue`: 创建表单（step wizard: 类型 → 指标 → 时间 → 分队 → 确认）

#### API 层

- `api/pk.ts`: 所有 PK 相关接口

### 前端 (APP)

- `pages/pk/index.vue`: 进行中 PK 列表
- `pages/pk/detail.vue`: 实时排行 + 动效
- 工作台 PK 进展卡片集成

## API 接口

| 方法   | 路径                     | 说明                              | 权限           |
| ------ | ------------------------ | --------------------------------- | -------------- |
| GET    | `/api/v1/pk`             | PK 列表（分页，支持 status 筛选） | All            |
| POST   | `/api/v1/pk`             | 创建 PK                           | Admin, Manager |
| GET    | `/api/v1/pk/:id`         | PK 详情                           | All            |
| PUT    | `/api/v1/pk/:id`         | 编辑 PK（仅 PENDING 状态）        | Admin, Manager |
| DELETE | `/api/v1/pk/:id`         | 取消 PK（软删除）                 | Admin          |
| POST   | `/api/v1/pk/:id/start`   | 手动开始 PK                       | Admin, Manager |
| POST   | `/api/v1/pk/:id/settle`  | 手动结算 PK                       | Admin          |
| GET    | `/api/v1/pk/:id/ranking` | PK 实时排行                       | All            |
| GET    | `/api/v1/pk/:id/score`   | PK 实时得分                       | All            |
| GET    | `/api/v1/pk/history`     | 历史 PK 列表                      | All            |
| GET    | `/api/v1/pk/my-stats`    | 我的 PK 战绩统计                  | All            |
| GET    | `/api/v1/pk/badges`      | 我的徽章列表                      | All            |

## 数据库设计

### pk

| 字段          | 类型                                   | 说明                      |
| ------------- | -------------------------------------- | ------------------------- |
| id            | varchar(36) PK                         | UUID                      |
| title         | varchar(200) NOT NULL                  | PK 标题                   |
| type          | varchar(20) NOT NULL                   | one_on_one / team_vs_team |
| status        | varchar(20) NOT NULL DEFAULT 'pending' | 状态                      |
| metric        | varchar(30) NOT NULL                   | 竞争指标                  |
| start_date    | timestamp NOT NULL                     | 开始时间                  |
| end_date      | timestamp NOT NULL                     | 结束时间                  |
| stake         | text                                   | 赌注描述                  |
| result        | varchar(20)                            | 结果                      |
| created_by_id | varchar(36) FK                         | 创建人                    |
| created_at    | timestamp(6)                           |                           |
| updated_at    | timestamp(6)                           |                           |
| deleted_at    | timestamp(6)                           |                           |

**索引**: `IDX_pk_status` (status), `IDX_pk_end_date` (end_date)

### pk_team

| 字段       | 类型                    | 说明     |
| ---------- | ----------------------- | -------- |
| id         | varchar(36) PK          | UUID     |
| pk_id      | varchar(36) FK CASCADE  | PK ID    |
| name       | varchar(100) NOT NULL   | 队名     |
| side       | varchar(1) NOT NULL     | A / B    |
| score      | decimal(15,2) DEFAULT 0 | 当前得分 |
| is_winner  | boolean DEFAULT false   | 是否胜方 |
| created_at | timestamp(6)            |          |
| updated_at | timestamp(6)            |          |

**索引**: `IDX_pt_pk` (pk_id)

### pk_member

| 字段         | 类型                    | 说明                    |
| ------------ | ----------------------- | ----------------------- |
| id           | varchar(36) PK          | UUID                    |
| team_id      | varchar(36) FK CASCADE  | 队伍ID                  |
| pk_id        | varchar(36) NOT NULL    | PK ID（冗余，加速查询） |
| user_id      | varchar(36) FK          | 用户ID                  |
| contribution | decimal(15,2) DEFAULT 0 | 个人贡献                |
| created_at   | timestamp(6)            |                         |
| updated_at   | timestamp(6)            |                         |

**索引**: `UQ_pm_pk_user` UNIQUE (pk_id, user_id), `IDX_pm_team` (team_id)

### pk_badge

| 字段       | 类型                    | 说明     |
| ---------- | ----------------------- | -------- |
| id         | varchar(36) PK          | UUID     |
| user_id    | varchar(36) FK          | 用户ID   |
| type       | varchar(50) NOT NULL    | 徽章类型 |
| pk_id      | varchar(36) FK SET NULL | 关联 PK  |
| created_at | timestamp(6)            |          |
| updated_at | timestamp(6)            |          |

**索引**: `IDX_pb_user` (user_id)

## 依赖模块

| 模块               | 用途                             | 变更                      |
| ------------------ | -------------------------------- | ------------------------- |
| SalesTargetModule  | 排行榜数据共享、指标计算逻辑复用 | 导出计算方法              |
| UserModule         | 用户信息（成员列表）             | 导入                      |
| OpportunityModule  | revenue/deal_count 指标聚合查询  | 导入                      |
| CustomerModule     | new_customer 指标聚合查询        | 导入                      |
| CallRecordModule   | call_count 指标聚合查询          | 导入                      |
| NotificationModule | PK 里程碑推送通知                | 导入                      |
| Redis              | PK 实时得分缓存                  | `pk:score:{pkId}` TTL 60s |

## 验收标准

### 功能验收

- [ ] Manager 可创建一对一 PK（选择 2 人 + 指标 + 时间段）
- [ ] Manager 可创建团队 PK（分两队 + 各队至少 2 人）
- [ ] PK 到达开始时间自动转为 ACTIVE 状态
- [ ] 实时得分每 5 分钟自动刷新，页面通过 WebSocket/轮询更新
- [ ] PK 到期自动结算，判定胜负，发送通知
- [ ] PK 历史页展示过往记录，显示个人胜率
- [ ] 1v1 PK 中一方领先变更时推送通知
- [ ] PK 详情页展示双方得分对比 + 成员贡献排名

### 测试要求

| 类型         | 文件                       | 数量                                          |
| ------------ | -------------------------- | --------------------------------------------- |
| 后端单元测试 | `pk.service.spec.ts`       | ≥20 tests (CRUD + 得分计算 + 结算 + 状态流转) |
| 后端单元测试 | `pk-cron.service.spec.ts`  | ≥8 tests                                      |
| 后端单元测试 | `pk-badge.service.spec.ts` | ≥6 tests                                      |
| 前端单元测试 | `PkScoreboard.spec.ts`     | ≥5 tests                                      |
| E2E          | `pk.spec.ts`               | ≥8 tests                                      |

### 边界与约束

- 同一用户不可同时参加 2 个以上进行中的 PK
- PK 最短周期 1 天，最长 90 天
- 得分计算仅统计 PK 时间段内的数据
- PENDING 状态可编辑/取消，ACTIVE 状态仅可查看
- 1v1 时每个 team 恰好 1 个 member

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`
- **得分计算**: 使用 TypeORM QueryBuilder 按时间范围聚合，结果缓存到 Redis `pk:score:{pkId}` TTL 60s
- **Cron**: `PkCronService` 每 5 分钟刷新 ACTIVE PK 得分；每分钟检查到期 PK 结算
- **WebSocket**: 通过现有 NotificationGateway 推送 `pk:score_update` 和 `pk:milestone` 事件
