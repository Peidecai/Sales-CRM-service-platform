# 09 — 销售PK与目标

> 合并来源: 本项目 SalesTarget 模块 + 磐销云销售PK + 业绩目标

## 现有功能（本项目）

- [x] 销售目标 CRUD（公司/团队/个人级）
- [x] 目标周期（年/季/月）
- [x] 目标指标（收入/成交数/新客户数/通话数）
- [x] 排行榜

## 磐销云 PK 功能

- 一对一 PK
- 多对多 PK
- PK 管理
- 业绩目标设定

## 合并后功能清单

### 9.1 销售目标（增强）

| 功能       | 说明                             | 状态     |
| ---------- | -------------------------------- | -------- |
| 目标设定   | 公司/团队/个人三级目标           | 已有     |
| 目标分解   | 年→季→月自动分解                 | **新增** |
| 目标完成率 | 实时计算完成进度                 | 已有增强 |
| 目标调整   | 审批后调整目标值                 | **新增** |
| 多指标目标 | 同时设定收入+数量+通话等多个指标 | 已有     |
| 目标对比   | 同比/环比分析                    | **新增** |

### 9.2 销售PK（新增）

| 功能      | 说明                      | 状态     |
| --------- | ------------------------- | -------- |
| 一对一PK  | 两人PK，指定指标和时间段  | **新增** |
| 多对多PK  | 团队PK（A组 vs B组）      | **新增** |
| PK 创建   | 选择参与者/指标/周期/赌注 | **新增** |
| PK 实时榜 | 实时显示PK双方进度        | **新增** |
| PK 结果   | PK结束后自动结算胜负      | **新增** |
| PK 历史   | 历史PK记录与胜率统计      | **新增** |
| PK 通知   | PK开始/领先/反超/结束通知 | **新增** |

### 9.3 排行榜（增强）

| 功能     | 说明                | 状态     |
| -------- | ------------------- | -------- |
| 业绩排行 | 按签单金额排行      | 已有增强 |
| 通话排行 | 按通话量/接通率排行 | **新增** |
| 新客排行 | 按新客户开发数排行  | **新增** |
| 评分排行 | 按AI通话评分排行    | **新增** |
| 综合排行 | 多指标加权综合排名  | **新增** |
| 排行周期 | 日/周/月/季/年排行  | **新增** |

### 9.4 PK 枚举

```typescript
enum PkType {
  ONE_ON_ONE = "one_on_one",
  TEAM_VS_TEAM = "team_vs_team",
}

enum PkStatus {
  PENDING = "pending", // 待开始
  ACTIVE = "active", // 进行中
  FINISHED = "finished", // 已结束
  CANCELLED = "cancelled", // 已取消
}

enum PkMetric {
  REVENUE = "revenue",
  DEAL_COUNT = "deal_count",
  CALL_COUNT = "call_count",
  NEW_CUSTOMER = "new_customer",
  COLLECTION = "collection", // 回款金额
}
```

## 后端接口（新增部分）

| 接口                              | 方法           | 说明             |
| --------------------------------- | -------------- | ---------------- |
| `/api/v1/sales-targets/decompose` | POST           | 目标分解         |
| `/api/v1/sales-targets/compare`   | GET            | 目标同比环比     |
| `/api/v1/pk`                      | GET/POST       | PK列表/创建      |
| `/api/v1/pk/:id`                  | GET/PUT/DELETE | PK详情/编辑/取消 |
| `/api/v1/pk/:id/ranking`          | GET            | PK实时排行       |
| `/api/v1/pk/history`              | GET            | PK历史           |
| `/api/v1/ranking/performance`     | GET            | 业绩排行         |
| `/api/v1/ranking/call`            | GET            | 通话排行         |
| `/api/v1/ranking/composite`       | GET            | 综合排行         |

## 涉及模块

- `packages/server/src/modules/sales-target/` (增强)
- `packages/server/src/modules/sales-pk/` (**新建**)
- `packages/server/src/modules/ranking/` (**新建**)
- `packages/web/src/views/sales-target/` (增强)
- `packages/web/src/views/sales-pk/` (**新建**)
