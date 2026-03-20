# T17 — 协商/谈判分析

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md)
> 优先级: 🟡中
> 参考设计: 06-ai-center.md §6.2

## 背景

磐销云提供 AI 再协商（analysis）功能，可分析通话录音中的谈判策略，检测让步模式，并生成重新谈判建议。本项目 AI 模块已有通话摘要和分类评分，但缺少专项的谈判分析能力。谈判分析可帮助销售团队识别赢单/丢单模式，提升谈判技巧。

## 功能需求

| #   | 功能          | 说明                                        |
| --- | ------------- | ------------------------------------------- |
| 1   | 谈判分析生成  | 基于通话转写文本，AI 分析谈判策略和关键节点 |
| 2   | 让步检测      | 识别价格让步、条件让步等模式                |
| 3   | 赢单/丢单模式 | 聚合分析成功/失败通话的谈判特征             |
| 4   | 重新谈判建议  | AI 生成下次谈判的策略建议                   |
| 5   | 谈判仪表盘    | 统计谈判指标（让步率/成功率/平均轮次）      |
| 6   | 分析报告导出  | 导出单次或批量谈判分析报告                  |

## 技术方案

### 后端

- **Entity**: `NegotiationAnalysis`
- **DTO**: `CreateNegotiationAnalysisDto`, `QueryNegotiationAnalysisDto`, `NegotiationDashboardQueryDto`
- **Service**: `NegotiationAnalysisService` — 调用 AiService 分析通话转写文本，解析谈判要素，存储结果
- **Queue**: `negotiation-analysis` Bull queue — 异步处理分析任务
- **Controller**: `NegotiationAnalysisController`
- **Module**: `NegotiationAnalysisModule` — imports `TypeOrmModule`, `AiModule`, `CallRecordModule`, `BullModule`
- **Migration**: `1709000084000-CreateNegotiationAnalysis`

### 前端 (PC)

- **页面**: `views/negotiation/index.vue`（分析列表/仪表盘）, `views/negotiation/detail.vue`（单次分析详情）
- **组件**: `NegotiationTimeline.vue`（谈判节点时间轴）, `ConcessionChart.vue`（让步趋势图）, `NegotiationDashboard.vue`（统计面板）
- **API 层**: `api/negotiation.ts`
- **路由**: `/negotiation` (列表), `/negotiation/:id` (详情)

### 前端 (APP)

- 通话详情页展示谈判分析摘要
- 查看重新谈判建议

## API 接口

| Method | Path                                            | Description                       | Auth     |
| ------ | ----------------------------------------------- | --------------------------------- | -------- |
| POST   | `/api/v1/negotiation-analysis`                  | 触发谈判分析（指定 callRecordId） | Sales+   |
| GET    | `/api/v1/negotiation-analysis`                  | 分析结果列表                      | All      |
| GET    | `/api/v1/negotiation-analysis/:id`              | 分析详情                          | All      |
| DELETE | `/api/v1/negotiation-analysis/:id`              | 删除分析                          | Manager+ |
| POST   | `/api/v1/negotiation-analysis/:id/re-negotiate` | 生成重新谈判建议                  | Sales+   |
| GET    | `/api/v1/negotiation-analysis/dashboard`        | 谈判仪表盘统计                    | Manager+ |
| GET    | `/api/v1/negotiation-analysis/export`           | 导出分析报告（CSV）               | Manager+ |
| GET    | `/api/v1/negotiation-analysis/patterns`         | 赢单/丢单模式分析                 | Manager+ |

## 数据库设计

### negotiation_analysis 表

| Column              | Type                                              | Nullable | Description                                                   |
| ------------------- | ------------------------------------------------- | -------- | ------------------------------------------------------------- |
| id                  | int, PK, auto_increment                           | NO       |                                                               |
| callRecordId        | int, FK → call_record.id, unique                  | NO       | 关联通话                                                      |
| customerId          | int, FK → customer.id                             | YES      | 关联客户                                                      |
| userId              | int, FK → user.id                                 | NO       | 销售人员                                                      |
| status              | enum('pending','processing','completed','failed') | NO       | 分析状态                                                      |
| overallScore        | int                                               | YES      | 谈判综合评分 1-100                                            |
| strategy            | varchar(50)                                       | YES      | 主要谈判策略（competitive/collaborative/compromise/avoidant） |
| concessions         | json                                              | YES      | 让步记录 `[{time, type, description, impact}]`                |
| keyMoments          | json                                              | YES      | 关键节点 `[{time, event, analysis}]`                          |
| strengths           | json                                              | YES      | 谈判优势 `[string]`                                           |
| weaknesses          | json                                              | YES      | 待改进 `[string]`                                             |
| reNegotiationAdvice | text                                              | YES      | 重新谈判建议                                                  |
| outcome             | enum('won','lost','pending','unknown')            | YES      | 谈判结果                                                      |
| summary             | text                                              | YES      | AI 分析摘要                                                   |
| rawAnalysis         | json                                              | YES      | AI 原始返回                                                   |
| createdAt           | datetime(6)                                       | NO       |                                                               |
| updatedAt           | datetime(6)                                       | NO       |                                                               |

**索引**: `IDX_negotiation_call` (callRecordId), `IDX_negotiation_user` (userId), `IDX_negotiation_customer` (customerId), `IDX_negotiation_status` (status), `IDX_negotiation_outcome` (outcome)

## 依赖模块

| 模块             | 关系             |
| ---------------- | ---------------- |
| AiModule         | 调用 AI 生成分析 |
| CallRecordModule | 读取通话转写文本 |
| CustomerModule   | 关联客户信息     |
| BullModule       | 异步任务队列     |
| AuthModule       | JWT + RBAC 守卫  |

## 验收标准

- [ ] 触发分析后 Bull queue 异步处理，status 从 pending → processing → completed
- [ ] AI 分析结果包含：综合评分、策略类型、让步记录、关键节点、优劣势
- [ ] 重新谈判建议基于分析结果和客户上下文生成
- [ ] 仪表盘统计：平均评分/让步率/赢单率/策略分布，支持时间范围筛选
- [ ] 模式分析：对比赢单/丢单通话的谈判特征差异
- [ ] 分析失败时 status 标记为 failed，支持重试
- [ ] 前端详情页展示：分析摘要 + 关键节点时间轴 + 让步趋势图 + 建议
- [ ] CSV 导出包含所有分析字段
- [ ] 后端单元测试 ≥ 15 tests（Service CRUD + AI 调用 mock + queue 处理 + dashboard 聚合）
- [ ] E2E 测试 ≥ 4 tests（列表 + 触发分析 + 详情 + 仪表盘）
