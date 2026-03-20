# T04 — 商机管理 开发任务

## 任务概述

- **目标**: 增强商机模块，新增销售漏斗可视化、AI成交预测、签单管理、看板视图
- **优先级**: P1
- **依赖模块**: opportunity, contract, customer, ai, user

## 现有模块

| 模块             | 路径                              | 状态                                              |
| ---------------- | --------------------------------- | ------------------------------------------------- |
| Opportunity      | `server/src/modules/opportunity/` | 已有（CRUD+阶段流转+关联客户+数据所有权+CSV导出） |
| Quotation        | `server/src/modules/quotation/`   | 已有                                              |
| Approval         | `server/src/modules/approval/`    | 已有                                              |
| Contract         | `server/src/modules/contract/`    | 已有                                              |
| Opportunity 视图 | `web/src/views/opportunity/`      | 已有（列表+详情）                                 |

## 子任务清单

### 后端任务

| #   | 标题                | 涉及文件                                                          | 依赖  | 验收标准                                                                    |
| --- | ------------------- | ----------------------------------------------------------------- | ----- | --------------------------------------------------------------------------- |
| B1  | 销售漏斗接口        | `server/src/modules/opportunity/opportunity.service.ts`           | —     | getFunnel(user, period): 各阶段数量+金额+转化率+平均停留天数                |
| B2  | 漏斗对比接口        | 同上                                                              | B1    | compareFunnels(periodA, periodB, teamId?): 两个时间段漏斗对比               |
| B3  | 阶段预警接口        | 同上                                                              | —     | getStaleOpportunities(daysThreshold): 停留超过N天的商机列表                 |
| B4  | AI 成交概率         | `server/src/modules/opportunity/opportunity-ai.service.ts` (新建) | —     | predictWinRate(opportunityId): 调用 AiService 基于客户+阶段+跟进历史预测    |
| B5  | Pipeline 预测       | 同上                                                              | B4    | forecastRevenue(period): 聚合各阶段加权金额预测营收                         |
| B6  | 风险商机标记        | 同上                                                              | B4    | identifyRiskOpportunities(): AI 识别可能丢单的商机                          |
| B7  | 看板数据接口        | `server/src/modules/opportunity/opportunity.service.ts`           | —     | getKanban(user, filters): 按阶段分组返回商机卡片数据                        |
| B8  | 看板阶段拖拽        | 同上                                                              | B7    | moveStage(opportunityId, newStage): 更新阶段+写日志                         |
| B9  | Signing Module      | `server/src/modules/signing/` (新建)                              | —     | Entity(关联opportunity+contract) + Service(签单记录/统计/排行) + Controller |
| B10 | Controller 端点汇总 | `server/src/modules/opportunity/opportunity.controller.ts`        | B1-B9 | funnel, forecast, :id/ai-score, stale, kanban + signing 端点                |

### 前端任务

| #   | 标题                 | 涉及文件                                                 | 依赖  | 验收标准                                                         |
| --- | -------------------- | -------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| F1  | Opportunity API 增强 | `web/src/api/opportunity.ts`                             | B10   | getFunnel, getForecast, getAiScore, getKanban, moveStage 等      |
| F2  | 销售漏斗组件         | `web/src/views/opportunity/components/FunnelChart.vue`   | F1    | ECharts 漏斗图+转化率标注+点击阶段筛选列表                       |
| F3  | 看板视图             | `web/src/views/opportunity/KanbanView.vue` (新建)        | F1    | 5 列看板(按阶段)，卡片拖拽(vuedraggable)，卡片显示金额/客户/天数 |
| F4  | 列表/看板切换        | `web/src/views/opportunity/index.vue`                    | F2,F3 | 工具栏切换按钮，记住用户偏好(localStorage)                       |
| F5  | AI 预测面板          | `web/src/views/opportunity/components/ForecastPanel.vue` | F1    | Pipeline 预测总额+各阶段加权+风险商机标记(红色)                  |
| F6  | 商机详情增强         | `web/src/views/opportunity/detail.vue`                   | F1    | 新增 AI 成交概率显示(进度条)+阶段停留天数                        |
| F7  | 签单管理页面         | `web/src/views/signing/index.vue` (新建)                 | F1    | 签单列表+统计卡片+排行榜                                         |
| F8  | 路由 + 菜单          | `web/src/router/index.ts`                                | F3,F7 | /opportunity/kanban, /signing 路由                               |

### 数据库迁移

| #   | 文件                                       | DDL                                                                                                 |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| M1  | `1709000076000-CreateSigningTable.ts`      | `signing` 表: id, opportunityId(FK), contractId(FK), amount, signedAt, signedBy(FK User), createdAt |
| M2  | `1709000077000-AddOpportunityStaleFlag.ts` | opportunity 表加 `is_stale` boolean default false, `stage_entered_at` datetime                      |

### 测试任务

| #   | 标题                 | 文件                                                     | 验收标准                     |
| --- | -------------------- | -------------------------------------------------------- | ---------------------------- |
| T1  | Funnel 聚合测试      | `server/test/opportunity/opportunity-funnel.spec.ts`     | ≥12 tests (漏斗+对比+转化率) |
| T2  | OpportunityAiService | `server/test/opportunity/opportunity-ai.service.spec.ts` | ≥10 tests                    |
| T3  | SigningService       | `server/test/signing/signing.service.spec.ts`            | ≥10 tests (CRUD+统计+排行)   |
| T4  | 看板接口             | `server/test/opportunity/opportunity-kanban.spec.ts`     | ≥8 tests (分组+拖拽+筛选)    |
| T5  | E2E — 看板视图       | `e2e/opportunity-kanban.spec.ts`                         | 拖拽+切换+筛选               |

## 边界与约束

- **Scope 外**: 预测准确度追踪（需历史数据积累，后续迭代）
- **安全**: AI 预测接口限流 10 req/min；签单管理 Manager+ 权限
- **性能**: 漏斗查询使用数据库 GROUP BY 聚合；看板一次加载所有阶段数据(通常 <500 条)
- **模块接口**: SigningModule 导入 OpportunityModule + ContractModule

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
- **缓存**: funnel 缓存 10min key `opportunity:funnel:{userId}:{period}`
- **看板**: 前端使用 `vuedraggable` (或 `@vueuse/integrations` sortable)

## Claude Code 提示词

### B1-B3: 销售漏斗

```
增强 packages/server/src/modules/opportunity/opportunity.service.ts：
1. getFunnel(user, startDate, endDate):
   - SELECT stage, COUNT(*) as count, SUM(amount) as totalAmount FROM opportunity WHERE createdAt BETWEEN ? AND ? GROUP BY stage
   - 计算相邻阶段转化率: nextStageCount / currentStageCount
   - 计算各阶段平均停留天数: AVG(DATEDIFF(stageChangedAt, stageEnteredAt))
   - SALES 只看自己数据
2. compareFunnels(periodA, periodB, teamId?): 调用 getFunnel 两次，返回对比数据
3. getStaleOpportunities(daysThreshold=30, page, pageSize): WHERE stage_entered_at + daysThreshold < NOW() AND stage NOT IN ('CLOSED_WON','CLOSED_LOST')
在 controller 新增 GET /opportunities/funnel, GET /opportunities/stale
```

### B7-B8: 看板

```
在 packages/server/src/modules/opportunity/opportunity.service.ts 新增：
1. getKanban(user, filters?):
   - 查询所有非关闭商机，按 stage 分组
   - 每张卡片包含: id, title, amount, customer.name, salesUser.name, daysInStage, updatedAt
   - 支持 filters: salesId, minAmount, maxAmount
   - SALES 只看自己
2. moveStage(opportunityId, newStage, user):
   - 校验所有权
   - 更新 stage + stage_entered_at = NOW()
   - 写审计日志
在 controller 新增 GET /opportunities/kanban, PUT /opportunities/:id/stage
```

### F3: 看板前端

```
新建 packages/web/src/views/opportunity/KanbanView.vue：
1. 安装 vuedraggable: pnpm add vuedraggable@next --filter @crm/web
2. 5 列布局(LEAD/QUALIFIED/PROPOSAL/NEGOTIATION/CLOSED_WON)，每列可垂直滚动
3. 卡片组件 KanbanCard.vue: 显示标题/金额/客户名/负责人/停留天数，停留>30天标红
4. 拖拽事件: @change → 调用 moveStage API → 刷新数据
5. 工具栏: 按负责人/金额区间筛选
6. 响应式: 移动端横向滚动
```

### B9: 签单模块

```
新建 packages/server/src/modules/signing/ 模块：
1. signing.entity.ts: 关联 opportunity(ManyToOne), contract(ManyToOne, nullable), amount, signedAt, signedBy(ManyToOne User)
2. signing.service.ts:
   - create(opportunityId, contractId?, amount, user): 创建签单记录，更新 opportunity.stage=CLOSED_WON
   - getList(filters, page, pageSize)
   - getStatistics(period): 按人/团队/月统计签单金额+数量
   - getRanking(period, limit=10): 签单金额排行
3. signing.controller.ts: GET /signing/list, GET /signing/statistics, GET /signing/ranking
4. signing.module.ts: 导入 OpportunityModule, ContractModule, UserModule
注册到 AppModule。
```
