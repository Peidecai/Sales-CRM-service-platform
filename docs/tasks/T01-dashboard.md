# T01 — 工作台 Dashboard 开发任务

## 任务概述

- **目标**: 增强工作台，新增销售漏斗、团队排行、通话热力图、待办事项区、回款/AI评分卡片
- **优先级**: P1
- **依赖模块**: opportunity, call-record, sales-target, contract, payment, follow-up, ai

## 现有模块

| 模块                             | 路径                                | 状态                                    |
| -------------------------------- | ----------------------------------- | --------------------------------------- |
| Dashboard 视图                   | `packages/web/src/views/dashboard/` | 已有（统计卡片+图表+最近记录+快捷操作） |
| Dashboard API                    | `packages/web/src/api/`             | 已有                                    |
| Server — 无独立 dashboard module | 各业务模块聚合                      | 需新建                                  |

## 子任务清单

### 后端任务

| #   | 标题                               | 涉及文件                                                             | 依赖  | 验收标准                                                         |
| --- | ---------------------------------- | -------------------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| B1  | 创建 Dashboard Module              | `server/src/modules/dashboard/dashboard.module.ts`                   | —     | Module 注册到 AppModule                                          |
| B2  | Dashboard Controller (6 endpoints) | `server/src/modules/dashboard/dashboard.controller.ts`               | B1    | GET overview/trend/funnel/ranking/todo/call-heatmap              |
| B3  | Dashboard Service — overview       | `server/src/modules/dashboard/dashboard.service.ts`                  | B1    | 聚合今日通话/客户/业绩/回款/AI评分                               |
| B4  | Dashboard Service — funnel         | 同上                                                                 | B1    | 按 OpportunityStage 统计数量+金额                                |
| B5  | Dashboard Service — ranking        | 同上                                                                 | B1    | 本月业绩 TOP10（签单金额），支持 ?period=week/month              |
| B6  | Dashboard Service — call-heatmap   | 同上                                                                 | B1    | 按小时(0-23)×天(近7天) 聚合通话量矩阵                            |
| B7  | Dashboard Service — todo           | 同上                                                                 | B1    | 聚合待跟进+待回款+PK进展+待审批                                  |
| B8  | DTO + 类型定义                     | `shared/src/types/dashboard.ts`, `server/src/modules/dashboard/dto/` | —     | DashboardOverviewDto, FunnelDto, RankingDto, HeatmapDto, TodoDto |
| B9  | Redis 缓存                         | dashboard.service.ts                                                 | B3-B7 | overview/ranking 缓存 5min，funnel/heatmap 缓存 10min            |

### 前端任务

| #   | 标题                 | 涉及文件                                             | 依赖  | 验收标准                             |
| --- | -------------------- | ---------------------------------------------------- | ----- | ------------------------------------ |
| F1  | Dashboard API 层     | `web/src/api/dashboard.ts`                           | B2    | 封装 6 个 API 调用                   |
| F2  | 数据概览卡片增强     | `web/src/views/dashboard/components/StatsCards.vue`  | F1    | 5 张卡片：通话/客户/业绩/回款/AI评分 |
| F3  | 销售漏斗组件         | `web/src/views/dashboard/components/SalesFunnel.vue` | F1    | ECharts 漏斗图，点击阶段跳转商机列表 |
| F4  | 团队排行榜组件       | `web/src/views/dashboard/components/TeamRanking.vue` | F1    | TOP10 列表，含头像/姓名/金额/环比    |
| F5  | 通话热力图组件       | `web/src/views/dashboard/components/CallHeatmap.vue` | F1    | ECharts heatmap，X轴=小时 Y轴=日期   |
| F6  | 待办事项区组件       | `web/src/views/dashboard/components/TodoSection.vue` | F1    | 4 类待办分 Tab，点击跳转对应页面     |
| F7  | 快捷操作增强         | `web/src/views/dashboard/`                           | —     | 新增「智能助理」「海量分配」快捷入口 |
| F8  | Dashboard 主页面集成 | `web/src/views/dashboard/index.vue`                  | F2-F7 | 响应式布局，组件懒加载               |

### 数据库迁移

无新表。Dashboard 数据全部从现有表聚合查询。

### 测试任务

| #   | 标题                         | 文件                                                 | 验收标准                                             |
| --- | ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| T1  | DashboardService 单元测试    | `server/test/dashboard/dashboard.service.spec.ts`    | ≥20 tests，覆盖 overview/funnel/ranking/heatmap/todo |
| T2  | DashboardController 单元测试 | `server/test/dashboard/dashboard.controller.spec.ts` | 6 endpoints 权限+响应格式                            |
| T3  | E2E — Dashboard 页面         | `e2e/dashboard-enhanced.spec.ts`                     | 漏斗/排行/热力图/待办渲染验证                        |

## 边界与约束

- **Scope 外**: PK 详情页（属于 T09）、智能助理对话（属于 T11）、回款详情（属于 T08）
- **性能**: overview 接口 <500ms，使用 Redis 缓存；ranking 使用数据库聚合而非应用层排序
- **权限**: SALES 只看自己数据，Manager/Admin 看团队数据；ranking 对所有角色可见

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `security-review`
- **缓存策略**: key 格式 `dashboard:{endpoint}:{userId}:{period}`，TTL 见 B9
- **响应格式**: `{ code: 0, message: 'success', data: T }`

## Claude Code 提示词

### B1-B2: 创建 Dashboard Module + Controller

```
在 packages/server/src/modules/ 下创建 dashboard 模块：
- dashboard.module.ts: 导入 OpportunityModule, CallRecordModule, CustomerModule, SalesTargetModule, ContractModule, PaymentModule, FollowUpModule, ApprovalModule, UserModule
- dashboard.controller.ts: 6 个 GET 端点 (overview, trend, funnel, ranking, todo, call-heatmap)，路由前缀 /api/v1/dashboard，@UseGuards(JwtAuthGuard, RolesGuard)
- dashboard.service.ts: 骨架方法
- 注册到 AppModule
遵循项目 CLAUDE.md 编码规范。
```

### B3-B7: Dashboard Service 实现

```
实现 packages/server/src/modules/dashboard/dashboard.service.ts 的所有方法：
1. getOverview(user): 聚合今日通话数/接通率/平均时长、今日新增/跟进/转化客户、本月签单金额/目标完成率、本月回款金额/回款率、AI评分(今日通话平均分)
2. getFunnel(user, period): 按 OpportunityStage 统计各阶段数量+金额，计算转化率
3. getRanking(user, period): 本月业绩 TOP10，JOIN user 表获取姓名
4. getCallHeatmap(user, days): 近N天按小时聚合通话量，返回 {hour, date, count}[]
5. getTodo(user): 聚合待跟进(follow-up where dueDate<=today)、待回款(payment where dueDate近7天)、待审批(approval where status=PENDING)
所有方法注入 RedisService，添加缓存。SALES 用户只查自己数据。
```

### F1-F8: 前端组件

```
增强 packages/web/src/views/dashboard/ 页面：
1. 新建 api/dashboard.ts，封装 getDashboardOverview/getFunnel/getRanking/getTodo/getCallHeatmap
2. 新建 components/SalesFunnel.vue — ECharts funnel 图表
3. 新建 components/TeamRanking.vue — Element Plus 表格/列表
4. 新建 components/CallHeatmap.vue — ECharts heatmap
5. 新建 components/TodoSection.vue — el-tabs 4类待办
6. 修改 index.vue 集成所有新组件，2列响应式布局
使用 Element Plus 组件，遵循项目 Vue 3 Composition API + <script setup> 规范。
```
