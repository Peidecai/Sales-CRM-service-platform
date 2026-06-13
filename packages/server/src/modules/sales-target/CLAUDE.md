# 销售目标 & 业绩模块 CLAUDE.md

## 模块信息

**模块**: 销售目标与业绩 (Sales Target & Performance)
**路径**: `packages/server/src/modules/sales-target/`
**前端路由**: `/sales-target`

## 功能范围

### 核心功能

1. 销售目标 CRUD（公司/团队/个人三级）
2. 目标分解（公司→团队→个人）
3. 达成情况查询（达成率、剩余值、每日所需）
4. 业绩预测（线性推算）
5. 销售排行榜（个人 TOP10 + 团队排行）
6. 排名趋势（月度变化）
7. 达成率自动更新（定时任务，每小时）
8. 排行快照（定时任务，每日凌晨 2:30）

## 技术规范

### 实体设计

#### SalesTarget (sales_targets)

- scope: company | team | individual
- period: year | quarter | month
- metricType: revenue | deal_count | new_customer | call_count
- targetValue / achievedValue (decimal 14,2)
- year / quarter / month
- startDate / endDate
- assignedUserId (个人目标)
- teamId (团队目标)
- parentTargetId (分解关系)

#### PerformanceRanking (performance_rankings)

- userId / userName
- period / metricType / metricValue / rank
- snapshotDate / year / quarter / month

### API 端点

| 方法   | 路径                                  | 描述         |
| ------ | ------------------------------------- | ------------ |
| GET    | /api/v1/sales-targets                 | 分页列表     |
| POST   | /api/v1/sales-targets                 | 创建目标     |
| GET    | /api/v1/sales-targets/overview        | 公司目标总览 |
| GET    | /api/v1/sales-targets/ranking/sales   | 销售排行     |
| GET    | /api/v1/sales-targets/ranking/team    | 团队排行     |
| GET    | /api/v1/sales-targets/ranking/trend   | 排名趋势     |
| GET    | /api/v1/sales-targets/:id             | 目标详情     |
| PUT    | /api/v1/sales-targets/:id             | 更新目标     |
| DELETE | /api/v1/sales-targets/:id             | 软删除       |
| POST   | /api/v1/sales-targets/:id/decompose   | 分解目标     |
| GET    | /api/v1/sales-targets/:id/achievement | 达成情况     |
| GET    | /api/v1/sales-targets/:id/forecast    | 业绩预测     |

### 定时任务

- `SalesTargetScheduler.handleAchievementUpdate()` — 每小时（:15 分）更新达成值
- `SalesTargetScheduler.handleRankingSnapshot()` — 每日 02:30 生成排行快照

### Redis 缓存

- `cache:sales-targets:stats:overview:*` — TTL 300s

## 依赖关系

- **依赖**: Opportunity, Customer, CallRecord, User 模块
- **被依赖**: 无

## 权限

- 创建/更新/删除/分解: Admin + Manager only
- 查看列表/详情/达成/预测/排行: 所有已认证用户
- SALES 用户只能看到自己的个人目标 + 公司/团队目标

## Skill 规范

- **backend-patterns** — 定时任务、聚合查询
- **coding-standards** — TypeScript 严格模式
- **tdd-workflow** — 测试驱动开发
