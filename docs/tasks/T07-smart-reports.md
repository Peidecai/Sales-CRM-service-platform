# T07 — 智能报表 开发任务

## 任务概述

- **目标**: 新建报表模块，包含通话报表(4项)、业绩报表(5项)、AI分析报表(6项)、漏斗转化(3项)、可视化大屏(2项)
- **优先级**: P2
- **依赖模块**: call-record, opportunity, contract, payment, customer, customer-tag, ai, sales-target, user

## 现有模块

| 模块               | 路径                               | 状态             |
| ------------------ | ---------------------------------- | ---------------- |
| Dashboard          | `web/src/views/dashboard/`         | 已有（基础统计） |
| SalesTarget        | `server/src/modules/sales-target/` | 已有             |
| 无独立 Report 模块 | —                                  | 需新建           |

## 子任务清单

### 后端任务

| #   | 标题                     | 涉及文件                                                  | 依赖  | 验收标准                                                                                                                 |
| --- | ------------------------ | --------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| B1  | Report Module 骨架       | `server/src/modules/report/report.module.ts`              | —     | 导入所有业务 Module                                                                                                      |
| B2  | Report Controller        | `server/src/modules/report/report.controller.ts`          | B1    | 18 个 GET 端点，统一路由前缀 /api/v1/reports                                                                             |
| B3  | CallReportService        | `server/src/modules/report/call-report.service.ts`        | B1    | getStatistics, getDailyAnalysis, getPersonalAnalysis, getDetailAnalysis                                                  |
| B4  | PerformanceReportService | `server/src/modules/report/performance-report.service.ts` | B1    | getSummary, getSigningStats, getCollectionStats, getOverview, getTargetCompletion                                        |
| B5  | AiReportService          | `server/src/modules/report/ai-report.service.ts`          | B1    | getSpeechSkillAnalysis, getScoreRanking, getInvitationAnalysis, getEmployeeRating, getEmployeePortrait, getTagStatistics |
| B6  | FunnelReportService      | `server/src/modules/report/funnel-report.service.ts`      | B1    | getSalesFunnel, getStageConversion, getVisitStatistics                                                                   |
| B7  | ScreenService            | `server/src/modules/report/screen.service.ts`             | B1    | getPerformanceScreen, getCockpitScreen — 大屏数据聚合                                                                    |
| B8  | 通用筛选 DTO             | `server/src/modules/report/dto/report-filter.dto.ts`      | —     | startDate, endDate, departmentId?, userId?, groupBy(day/week/month)                                                      |
| B9  | Redis 缓存               | 各 service                                                | B3-B7 | 报表数据缓存 15min，大屏数据缓存 5min                                                                                    |

### 前端任务

| #   | 标题           | 涉及文件                                            | 依赖   | 验收标准                                                      |
| --- | -------------- | --------------------------------------------------- | ------ | ------------------------------------------------------------- |
| F1  | Report API 层  | `web/src/api/report.ts` (新建)                      | B2     | 封装 18 个 API 调用                                           |
| F2  | 报表布局容器   | `web/src/views/report/ReportLayout.vue`             | —      | 左侧报表分类菜单 + 右侧内容区 + 顶部筛选条件栏                |
| F3  | 通话统计页     | `web/src/views/report/call/Statistics.vue`          | F1     | 通话量/接通率/时长折线图 + 数据表格 + 导出                    |
| F4  | 每日通话分析页 | `web/src/views/report/call/DailyAnalysis.vue`       | F1     | 日环比/周同比 + 时段分布柱状图                                |
| F5  | 个人通话分析页 | `web/src/views/report/call/PersonalAnalysis.vue`    | F1     | 个人多维数据(通话量/接通率/评分/意向率)                       |
| F6  | 业绩汇总页     | `web/src/views/report/performance/Summary.vue`      | F1     | 按人/部门业绩表格 + 目标进度条                                |
| F7  | 签单统计页     | `web/src/views/report/performance/Signing.vue`      | F1     | 签单趋势+排行+转化率                                          |
| F8  | 回款统计页     | `web/src/views/report/performance/Collection.vue`   | F1     | 回款金额/回款率/逾期率图表                                    |
| F9  | 话术能力分析页 | `web/src/views/report/ai/SpeechSkill.vue`           | F1     | 6维度雷达图(团队/个人切换)                                    |
| F10 | 评分排行页     | `web/src/views/report/ai/ScoreRanking.vue`          | F1     | TOP排行 + 评分分布直方图                                      |
| F11 | 员工画像页     | `web/src/views/report/ai/EmployeePortrait.vue`      | F1     | 选择员工 → 画像+雷达+成长曲线                                 |
| F12 | 销售漏斗页     | `web/src/views/report/funnel/SalesFunnel.vue`       | F1     | 全链路漏斗(线索→客户→商机→签单) + 转化率趋势                  |
| F13 | 业绩大屏       | `web/src/views/screen/PerformanceScreen.vue` (新建) | F1     | 全屏深色大屏: 大数字+饼图+折线+排行+滚动动态+进度环           |
| F14 | 数据方舱       | `web/src/views/screen/CockpitScreen.vue` (新建)     | F1     | 全屏多面板: 通话仪表盘+漏斗+回款+人效+地图                    |
| F15 | 路由 + 菜单    | `web/src/router/index.ts`                           | F2-F14 | /report/\* (12个子路由), /screen/performance, /screen/cockpit |

### 数据库迁移

无新表。报表数据全部从现有表聚合查询。

### 测试任务

| #   | 标题                     | 文件                                                    | 验收标准            |
| --- | ------------------------ | ------------------------------------------------------- | ------------------- |
| T1  | CallReportService        | `server/test/report/call-report.service.spec.ts`        | ≥12 tests           |
| T2  | PerformanceReportService | `server/test/report/performance-report.service.spec.ts` | ≥15 tests           |
| T3  | AiReportService          | `server/test/report/ai-report.service.spec.ts`          | ≥12 tests           |
| T4  | ScreenService            | `server/test/report/screen.service.spec.ts`             | ≥8 tests            |
| T5  | E2E — 报表页面           | `e2e/report.spec.ts`                                    | 各报表页面渲染+筛选 |
| T6  | E2E — 业绩大屏           | `e2e/screen.spec.ts`                                    | 大屏组件渲染        |

## 边界与约束

- **Scope 外**: 微信绑定报表（无微信数据源）；报表自定义/拖拽配置（后续迭代）
- **安全**: SALES 只看自己数据；大屏页面需 Manager+ 权限；导出限 Admin/Manager
- **性能**: 聚合查询使用数据库 GROUP BY，避免应用层大量数据加载；大屏 5min 自动刷新(前端 setInterval)
- **模块接口**: ReportModule 只读(SELECT)访问各业务 Module，不做写操作

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `security-review`
- **缓存**: 报表 key `report:{type}:{filters_hash}` TTL 15min；大屏 key `screen:{type}` TTL 5min
- **大屏**: 全屏模式，深色主题，ECharts dark theme，自适应 rem 布局(基于 window.innerWidth)
- **图表**: 统一使用 ECharts，封装 useChart composable

## Claude Code 提示词

### B1-B2: Report Module 骨架

```
新建 packages/server/src/modules/report/ 模块：
1. report.module.ts: 导入 CallRecordModule, OpportunityModule, ContractModule, PaymentModule, CustomerModule, CustomerTagModule, SalesTargetModule, UserModule, AiModule
2. report.controller.ts: @Controller('api/v1/reports'), @UseGuards(JwtAuthGuard, RolesGuard), @UseInterceptors(AuditLogInterceptor)
   - 4组共18个GET端点，每组用独立prefix:
     - /call/statistics, /call/daily, /call/personal/:userId, /call/detail
     - /performance/summary, /performance/signing, /performance/collection, /performance/overview
     - /ai/speech-skill, /ai/score-ranking, /ai/invitation, /ai/employee-rating, /ai/employee-portrait/:userId, /ai/tag-statistics
     - /funnel, /visit/statistics
     - /screen/performance, /screen/cockpit
   - 所有端点接收 ReportFilterDto(startDate, endDate, departmentId?, userId?, groupBy?)
3. 骨架 service 文件: call-report, performance-report, ai-report, funnel-report, screen
注册到 AppModule。
```

### B3: 通话报表 Service

```
实现 packages/server/src/modules/report/call-report.service.ts：
1. 注入 CallRecordRepository (通过 CallRecordModule), UserRepository
2. getStatistics(filter):
   - SELECT DATE(createdAt) as date, COUNT(*) as total, SUM(CASE WHEN status='CONNECTED' THEN 1 ELSE 0 END) as connected, AVG(duration) as avgDuration FROM call_record WHERE createdAt BETWEEN ? AND ? GROUP BY DATE(createdAt)
   - 支持 groupBy day/week/month
3. getDailyAnalysis(filter):
   - 当日数据 + 昨日环比 + 上周同比
4. getPersonalAnalysis(userId, filter):
   - 个人维度: 通话量/接通率/平均评分/意向客户数
5. getDetailAnalysis(filter):
   - 通话时段分布(按小时), 号码段分布
SALES 只查自己数据，Manager 查团队，Admin 查全部。
```

### F13: 业绩大屏

```
新建 packages/web/src/views/screen/PerformanceScreen.vue：
1. 全屏深色布局(position: fixed, background: #0a1628)
2. 使用 CSS Grid 分区:
   - 顶部: 标题 + 当前时间 + 切换周期按钮(月/季/年)
   - 左上: 总业绩大数字 + 目标完成进度环
   - 左中: 各部门业绩占比(ECharts pie, dark theme)
   - 左下: 业绩趋势折线图
   - 右上: TOP10销售排行(横向柱状图)
   - 右中: 实时签单动态(auto-scroll列表, CSS animation)
   - 右下: 目标完成进度(多人进度条)
3. 5min 自动刷新(setInterval)
4. 自适应: 使用 vw/vh 单位
5. 退出按钮(ESC / 右上角关闭)
```

### F14: 数据方舱

```
新建 packages/web/src/views/screen/CockpitScreen.vue：
1. 同样全屏深色布局
2. 多面板:
   - 通话仪表盘: 今日通话量(gauge)+接通率(gauge)+平均时长
   - 客户转化漏斗: 线索→客户→商机→签单 (ECharts funnel)
   - 回款进度: 本月回款/目标(进度条) + 逾期金额(警告色)
   - 团队人效: 人均签单/人均通话量(柱状图)
   - 客户地域分布: ECharts map (中国地图)
3. 使用 ECharts registerMap 加载中国地图 JSON
4. 5min 自动刷新
```
