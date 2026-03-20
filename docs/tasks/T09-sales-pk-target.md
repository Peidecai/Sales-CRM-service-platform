# T09 — 销售PK与目标 开发任务

## 任务概述

- **目标**: 增强销售目标(目标分解/调整/对比)、新建销售PK模块(一对一/多对多PK)、增强排行榜(通话/新客/评分/综合/多周期)
- **优先级**: P3
- **依赖模块**: sales-target, opportunity, customer, call-record, notification, approval

## 现有模块

| 模块             | 路径                               | 状态                                |
| ---------------- | ---------------------------------- | ----------------------------------- |
| SalesTarget      | `server/src/modules/sales-target/` | 已有（CRUD+三级目标+四指标+排行榜） |
| Opportunity      | `server/src/modules/opportunity/`  | 已有                                |
| Customer         | `server/src/modules/customer/`     | 已有                                |
| CallRecord       | `server/src/modules/call-record/`  | 已有                                |
| Notification     | `server/src/modules/notification/` | 已有                                |
| Approval         | `server/src/modules/approval/`     | 已有                                |
| SalesTarget 视图 | `web/src/views/sales-target/`      | 已有                                |

## 子任务清单

### 后端任务

| #   | 标题                        | 涉及文件                                                                     | 依赖          | 验收标准                                                                                                                                                                                                                                  |
| --- | --------------------------- | ---------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | 目标分解                    | `server/src/modules/sales-target/sales-target.service.ts` 增强               | —             | decompose(targetId): 年目标→按季均分→按月均分，创建子 SalesTarget 记录（parentId 关联），返回分解树                                                                                                                                       |
| B2  | SalesTarget Entity 增强     | `server/src/modules/sales-target/entities/sales-target.entity.ts`            | —             | 新增字段: parentId(self ManyToOne nullable), adjustedAmount(decimal nullable), adjustReason(varchar nullable), adjustedAt(datetime nullable)                                                                                              |
| B3  | 目标调整(审批)              | `server/src/modules/sales-target/sales-target.service.ts` 增强               | B2            | requestAdjust(targetId, newAmount, reason, user): 创建审批流 → 审批通过后更新 adjustedAmount/adjustReason/adjustedAt                                                                                                                      |
| B4  | 目标对比                    | `server/src/modules/sales-target/sales-target.service.ts` 增强               | —             | compare(targetId, type:'yoy'\|'mom'): 同比/环比计算，返回 {current, previous, changeRate, changeAmount}                                                                                                                                   |
| B5  | SalesPk Entity              | `server/src/modules/sales-pk/entities/sales-pk.entity.ts` (新建)             | —             | PkType(one_on_one/team_vs_team), PkStatus(pending/active/finished/cancelled), PkMetric(revenue/deal_count/call_count/new_customer/collection), startDate, endDate, stake(varchar nullable), creatorId(ManyToOne User), winnerId(nullable) |
| B6  | SalesPkParticipant Entity   | `server/src/modules/sales-pk/entities/sales-pk-participant.entity.ts` (新建) | B5            | pkId(ManyToOne SalesPk), userId(ManyToOne User), team('A'\|'B'), currentValue(decimal default 0)                                                                                                                                          |
| B7  | SalesPk Service             | `server/src/modules/sales-pk/sales-pk.service.ts` (新建)                     | B5,B6         | create(创建PK+参与者), findAll(分页+状态筛选), findOne, cancel, getRanking(pkId): 按 currentValue 排序, getHistory(userId): 历史PK+胜率                                                                                                   |
| B8  | PK 自动结算                 | `server/src/modules/sales-pk/sales-pk.service.ts`                            | B7            | @Cron('0 0 \* \* \*') settleFinishedPks(): 查找 endDate <= now AND status=ACTIVE 的PK，计算胜方，更新 status=FINISHED + winnerId，发通知                                                                                                  |
| B9  | PK 进度更新                 | `server/src/modules/sales-pk/sales-pk.service.ts`                            | B7            | @Cron('0 _/2 _ \* \*') updatePkProgress(): 遍历 ACTIVE PK，按 metric 从 Opportunity/CallRecord/Customer 查询实际值更新 participant.currentValue；检测反超事件发通知                                                                       |
| B10 | SalesPk Controller          | `server/src/modules/sales-pk/sales-pk.controller.ts` (新建)                  | B7            | CRUD + GET /:id/ranking + GET /history；@UseGuards(JwtAuthGuard, RolesGuard) + @UseInterceptors(AuditLogInterceptor)                                                                                                                      |
| B11 | SalesPk Module              | `server/src/modules/sales-pk/sales-pk.module.ts` (新建)                      | B5-B10        | 导入 OpportunityModule, CustomerModule, CallRecordModule, UserModule, NotificationModule；注册到 AppModule                                                                                                                                |
| B12 | 排行榜增强 — 多维度         | `server/src/modules/sales-target/sales-target.service.ts` 增强               | —             | getRanking(type:'performance'\|'call'\|'new_customer'\|'score'\|'composite', period:'day'\|'week'\|'month'\|'quarter'\|'year'): 按维度+周期查排行                                                                                         |
| B13 | 综合排行加权                | `server/src/modules/sales-target/sales-target.service.ts` 增强               | B12           | getCompositeRanking(period, weights:{revenue:0.4, deal:0.2, call:0.2, newCustomer:0.2}): 多指标加权排名                                                                                                                                   |
| B14 | SalesTarget Controller 增强 | `server/src/modules/sales-target/sales-target.controller.ts`                 | B1-B4,B12-B13 | POST /decompose, PUT /:id/adjust, GET /compare, GET /ranking/:type                                                                                                                                                                        |

### 前端任务

| #   | 标题                 | 涉及文件                                                          | 依赖  | 验收标准                                                          |
| --- | -------------------- | ----------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| F1  | SalesPk API 层       | `web/src/api/sales-pk.ts` (新建)                                  | B10   | CRUD + getRanking + getHistory                                    |
| F2  | SalesTarget API 增强 | `web/src/api/sales-target.ts` 增强                                | B14   | decompose, requestAdjust, compare, getRanking                     |
| F3  | 目标分解页面         | `web/src/views/sales-target/components/DecomposePanel.vue` (新建) | F2    | 年目标选择 → 一键分解 → 树形展示季/月子目标                       |
| F4  | 目标调整对话框       | `web/src/views/sales-target/components/AdjustDialog.vue` (新建)   | F2    | 当前值 + 新值输入 + 调整原因 + 提交审批                           |
| F5  | 目标对比图表         | `web/src/views/sales-target/components/CompareChart.vue` (新建)   | F2    | 同比/环比切换, ECharts 双柱+折线图(变化率)                        |
| F6  | PK 列表页            | `web/src/views/sales-pk/index.vue` (新建)                         | F1    | PK 卡片列表(进行中/待开始/已结束), 状态 tag, 进度条               |
| F7  | PK 创建对话框        | `web/src/views/sales-pk/components/CreatePkDialog.vue` (新建)     | F1    | 类型选择(1v1/团队) → 人员选择 → 指标+周期+赌注 → 创建             |
| F8  | PK 详情页            | `web/src/views/sales-pk/detail.vue` (新建)                        | F1    | PK 信息 + 实时排行榜(进度条对比) + 历史记录                       |
| F9  | 排行榜增强           | `web/src/views/sales-target/components/RankingPanel.vue` 增强     | F2    | 维度切换 tab(业绩/通话/新客/评分/综合) + 周期选择(日/周/月/季/年) |
| F10 | 路由 + 菜单          | `web/src/router/index.ts`                                         | F3-F9 | /sales-pk, /sales-pk/:id, 销售目标下新增子菜单                    |

### 数据库迁移

| #   | 文件                                       | DDL                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `1709000090000-AddSalesTargetDecompose.ts` | sales_target 表加 `parent_id` (self FK nullable), `adjusted_amount` decimal nullable, `adjust_reason` varchar nullable, `adjusted_at` datetime nullable                                                                                                                           |
| M2  | `1709000091000-CreateSalesPkTables.ts`     | `sales_pk` 表: id, type(enum), status(enum), metric(enum), start_date, end_date, stake, creator_id(FK User), winner_id(FK User nullable), createdAt, updatedAt, deletedAt; `sales_pk_participant` 表: id, pk_id(FK), user_id(FK), team(varchar), current_value(decimal default 0) |

### 测试任务

| #   | 标题               | 文件                                                    | 验收标准                                 |
| --- | ------------------ | ------------------------------------------------------- | ---------------------------------------- |
| T1  | 目标分解+调整+对比 | `server/test/sales-target/sales-target-enhance.spec.ts` | ≥12 tests (分解树/调整审批/同比环比)     |
| T2  | SalesPkService     | `server/test/sales-pk/sales-pk.service.spec.ts`         | ≥15 tests (CRUD+结算+进度更新+排行+历史) |
| T3  | 排行榜多维度       | `server/test/sales-target/ranking.spec.ts`              | ≥10 tests (5维度×2周期)                  |
| T4  | E2E — PK 流程      | `e2e/sales-pk.spec.ts`                                  | PK列表+创建+详情+排行                    |

## 边界与约束

- **Scope 外**: PK 奖金发放（仅记录赌注文本）；APP 推送（后续 T13）
- **安全**: PK 取消仅创建者或 Admin；目标调整需审批流；排行榜数据对 SALES 可见
- **性能**: PK 进度更新 Cron 每2小时，避免频繁查询；排行榜缓存 key `ranking:{type}:{period}` TTL 10min
- **模块接口**: SalesPkModule 导入 OpportunityModule + CustomerModule + CallRecordModule + UserModule + NotificationModule

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
- **枚举**: PkType, PkStatus, PkMetric 定义在 `@crm/shared`
- **通知**: PK 事件通过 NotificationModule 发送(WebSocket + 持久化)
- **缓存**: 排行榜 key `ranking:{type}:{period}` TTL 10min；PK 排行 key `pk:ranking:{pkId}` TTL 5min

## Claude Code 提示词

### B1-B4+B14: 销售目标增强

```
增强 packages/server/src/modules/sales-target/ 模块：
1. 修改 entities/sales-target.entity.ts:
   - 新增 parentId(ManyToOne self nullable), adjustedAmount(decimal nullable), adjustReason(varchar nullable), adjustedAt(datetime nullable)
   - 新增 children: OneToMany(() => SalesTarget)
2. 在 sales-target.service.ts 新增:
   - decompose(targetId): 年→季→月自动分解，创建子记录（parentId 关联）
   - requestAdjust(targetId, newAmount, reason, user): 创建审批流→回调更新 adjustedAmount
   - compare(targetId, type:'yoy'|'mom'): 查找上期同级目标，计算变化率
3. 在 sales-target.controller.ts 新增:
   - POST /sales-targets/decompose
   - PUT /sales-targets/:id/adjust
   - GET /sales-targets/compare?targetId=&type=yoy
4. 创建迁移 1709000090000-AddSalesTargetDecompose.ts
```

### B5-B11: 销售PK模块

```
新建 packages/server/src/modules/sales-pk/ 模块：
1. entities/sales-pk.entity.ts:
   - type(PkType enum), status(PkStatus enum), metric(PkMetric enum)
   - startDate, endDate, stake(varchar nullable)
   - creator: ManyToOne User, winner: ManyToOne User nullable
   - participants: OneToMany(() => SalesPkParticipant)
   - 继承 BaseEntity
2. entities/sales-pk-participant.entity.ts:
   - pk: ManyToOne SalesPk, user: ManyToOne User
   - team('A'|'B'), currentValue(decimal default 0)
3. sales-pk.service.ts:
   - create(dto, user): 创建PK + 批量创建参与者 + 发通知
   - findAll(分页+状态筛选), findOne(id)
   - cancel(id, user): 仅创建者或Admin
   - getRanking(pkId): 按 currentValue 排序返回参与者列表
   - getHistory(userId): 用户历史PK + 胜率统计
   - @Cron('0 0 * * *') settleFinishedPks(): 结算到期PK
   - @Cron('0 */2 * * *') updatePkProgress(): 按 metric 查询实际值更新进度
4. sales-pk.controller.ts: /api/v1/pk 前缀
   - @UseGuards(JwtAuthGuard, RolesGuard) @UseInterceptors(AuditLogInterceptor)
5. sales-pk.module.ts: 导入 OpportunityModule, CustomerModule, CallRecordModule, UserModule, NotificationModule
6. 注册到 AppModule
7. PkType/PkStatus/PkMetric 枚举放 @crm/shared
8. 创建迁移 1709000091000-CreateSalesPkTables.ts
```

### B12-B13: 排行榜增强

```
增强 packages/server/src/modules/sales-target/sales-target.service.ts 排行榜：
1. 重构 getRanking 为 getRanking(type, period, page, pageSize):
   - type: 'performance' | 'call' | 'new_customer' | 'score' | 'composite'
   - period: 'day' | 'week' | 'month' | 'quarter' | 'year'
   - performance: 按 Opportunity(WON) amount 汇总
   - call: 按 CallRecord count + 接通率
   - new_customer: 按 Customer createdAt 在周期内 count
   - score: 按 CallRecord aiScore 平均分
   - composite: 按 weights 加权计算
2. 缓存: safeGet/set key `ranking:{type}:{period}` TTL 10min
3. Controller: GET /sales-targets/ranking/:type?period=month
```

### F6-F8: PK 前端

```
新建 packages/web/src/views/sales-pk/ 页面：
1. api/sales-pk.ts: getList, getDetail, create, cancel, getRanking, getHistory
2. index.vue: PK 卡片列表
   - 三栏 tab(进行中/待开始/已结束)
   - 每张卡片: PK类型标签 + 参与者头像 + 指标 + 进度条 + 剩余时间
   - 右上角 "创建PK" 按钮(Manager+Admin)
3. components/CreatePkDialog.vue:
   - Step 1: 类型选择(1v1/团队)
   - Step 2: 人员选择(el-transfer)
   - Step 3: 指标+周期+赌注
   - 表单校验: 至少2人, 结束日期>开始日期
4. detail.vue: PK详情
   - 顶部: PK信息(类型/指标/周期/赌注)
   - 中部: 实时排行(进度条对比, 每5秒自动刷新)
   - 底部: 参与者列表
5. router: /sales-pk, /sales-pk/:id
6. 菜单: 在销售管理分组下新增 "销售PK"
```
