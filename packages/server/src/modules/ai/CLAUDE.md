# AI 模块 CLAUDE.md

## 模块概述

AI 集成 (DashScope/Claude)：通话分析 pipeline、客户画像、员工画像、意向预测、风险评估

## 实体

| 实体               | 说明                                      |
| ------------------ | ----------------------------------------- |
| CallAnalysisResult | 通话分析结果 (summary, tags, scores)      |
| AiAnalysisConfig   | AI 分析配置 (模型参数, prompt 模板)       |
| CustomerProfile    | 客户画像 (含 intent/risk 扩展字段)        |
| EmployeeBadge      | 员工徽章 (badgeType, awardedAt, metadata) |

## 服务

| 服务                     | 核心方法                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| CallAnalysisService      | analyzeCall, getAnalysisList, exportAnalysisList, getLatestByCustomer, getDealAnalysis, getCustomerCallSummary |
| AiCustomerProfileService | NBA, churnRisk, bestContactTime, getRiskIntent                                                                 |
| AiEmployeeProfileService | 6D radar, generateNarrative, computeAndAwardBadges, getPortraitCards                                           |
| AiAnalysisConfigService  | CRUD for AI config                                                                                             |

## 控制器

- **CallAnalysisController** — 9 endpoints (分析列表/详情/导出/触发/按客户查询/成交分析/客户通话聚合)
- **AiController** — customer-profile, employee-portrait, copilot 等

## 迁移

- `1709000067500-CreateAiAnalysisTables` — 分析结果 + 配置表
- `1709000097000-ExtendCustomerProfileForIntent` — 客户画像意向/风险字段
- `1709000099000-CreateEmployeeBadgeTable` — 员工徽章表

## 数据权限

SALES 用户仅可查看自己相关的分析数据，通过 `applyDataPermission()` 过滤。

## Skill 规范

- **backend-patterns** — Service 分层、Bull 队列
- **coding-standards** — TypeScript 严格模式
- **security-review** — API 安全、数据权限
