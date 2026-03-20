# 07 — 智能报表

> 合并来源: 本项目 Dashboard + 磐销云智能报表（20个子报表）

## 现有功能（本项目）

- [x] Dashboard 基础统计卡片
- [x] ECharts 图表
- [x] 销售目标模块（SalesTarget）

## 磐销云智能报表（20个子项）

- 通话统计、上门统计、员工评分、数据方舱、业绩大屏
- 签单统计、业绩统计、回款统计、贷后统计
- 话术能力、评分排行、邀约能力、标签统计
- 话单分析、每日分析、个人分析
- 销售漏斗、汇总统计
- 微信绑定、员工画像

## 合并后功能清单

### 7.1 通话报表

| 报表     | 说明                                  | 状态     |
| -------- | ------------------------------------- | -------- |
| 通话统计 | 按日/周/月统计通话量/接通率/平均时长  | **新增** |
| 话单分析 | 通话详细数据分析（时段分布/号码段等） | **新增** |
| 每日分析 | 每日通话数据汇总与环比                | **新增** |
| 个人分析 | 个人通话数据多维分析                  | **新增** |

**数据维度**: 通话总量、接通量、接通率、平均时长、有效通话数、意向客户数

**筛选条件**: 日期范围、部门、人员、通话类型

### 7.2 业绩报表

| 报表           | 说明                         | 状态     |
| -------------- | ---------------------------- | -------- |
| 业绩统计       | 按人/部门/时间段统计业绩金额 | **新增** |
| 签单统计       | 签单数量/金额/转化率         | **新增** |
| 回款统计       | 回款金额/回款率/逾期率       | **新增** |
| 业绩目标完成率 | 对比目标的完成度             | 已有增强 |
| 汇总统计       | 多维度综合汇总报表           | **新增** |

**数据维度**: 签单金额、签单数、客单价、回款金额、逾期金额、目标完成率

### 7.3 AI 分析报表

| 报表         | 说明                           | 状态     |
| ------------ | ------------------------------ | -------- |
| 话术能力分析 | 按6维度分析销售话术质量        | **新增** |
| 评分排行     | AI通话评分排行榜               | **新增** |
| 邀约能力分析 | 邀约成功率/到访率统计          | **新增** |
| 员工评分     | 综合能力评分（通话+业绩+跟进） | **新增** |
| 员工画像     | AI生成的销售能力画像           | **新增** |
| 标签统计     | 按客户标签维度的数据统计       | **新增** |

### 7.4 漏斗与转化

| 报表       | 说明                        | 状态     |
| ---------- | --------------------------- | -------- |
| 销售漏斗   | 线索→客户→商机→签单转化漏斗 | **新增** |
| 阶段转化率 | 各阶段之间的转化率趋势      | **新增** |
| 上门统计   | 客户拜访/上门的统计数据     | **新增** |

### 7.5 可视化大屏

| 大屏     | 说明                   | 状态     |
| -------- | ---------------------- | -------- |
| 业绩大屏 | 全公司业绩实时数据大屏 | **新增** |
| 数据方舱 | 多维数据综合监控大屏   | **新增** |

**业绩大屏内容**:

- 本月/季度/年度总业绩 (大数字)
- 各部门业绩占比 (饼图)
- 业绩趋势 (折线图)
- TOP10 销售排行 (横向柱状图)
- 实时签单动态 (滚动列表)
- 目标完成进度 (进度环)

**数据方舱内容**:

- 通话数据仪表盘
- 客户转化漏斗
- 回款进度
- 团队人效
- 地图分布（客户地域分布）

## 后端接口

| 接口                                           | 方法 | 说明         |
| ---------------------------------------------- | ---- | ------------ |
| `/api/v1/reports/call/statistics`              | GET  | 通话统计     |
| `/api/v1/reports/call/daily`                   | GET  | 每日通话分析 |
| `/api/v1/reports/call/personal/:userId`        | GET  | 个人通话分析 |
| `/api/v1/reports/call/detail`                  | GET  | 话单分析     |
| `/api/v1/reports/performance/summary`          | GET  | 业绩汇总     |
| `/api/v1/reports/performance/signing`          | GET  | 签单统计     |
| `/api/v1/reports/performance/collection`       | GET  | 回款统计     |
| `/api/v1/reports/performance/overview`         | GET  | 汇总统计     |
| `/api/v1/reports/ai/speech-skill`              | GET  | 话术能力分析 |
| `/api/v1/reports/ai/score-ranking`             | GET  | 评分排行     |
| `/api/v1/reports/ai/invitation`                | GET  | 邀约能力     |
| `/api/v1/reports/ai/employee-rating`           | GET  | 员工评分     |
| `/api/v1/reports/ai/employee-portrait/:userId` | GET  | 员工画像     |
| `/api/v1/reports/ai/tag-statistics`            | GET  | 标签统计     |
| `/api/v1/reports/funnel`                       | GET  | 销售漏斗     |
| `/api/v1/reports/visit/statistics`             | GET  | 上门统计     |
| `/api/v1/reports/screen/performance`           | GET  | 业绩大屏数据 |
| `/api/v1/reports/screen/cockpit`               | GET  | 数据方舱数据 |

## 涉及模块

- `packages/server/src/modules/report/` (**新建** — 报表聚合模块)
- `packages/server/src/modules/report/call-report.service.ts`
- `packages/server/src/modules/report/performance-report.service.ts`
- `packages/server/src/modules/report/ai-report.service.ts`
- `packages/server/src/modules/report/screen.service.ts`
- `packages/web/src/views/report/` (**新建**)
- `packages/web/src/views/report/call/`
- `packages/web/src/views/report/performance/`
- `packages/web/src/views/report/ai/`
- `packages/web/src/views/report/funnel/`
- `packages/web/src/views/screen/` (**新建** — 大屏页面)
