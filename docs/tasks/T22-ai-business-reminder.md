# T22 — AI商机提醒完善

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — aiBusinessReminder
> 优先级: 🟡中
> 参考设计: 03-customer-management.md §3.4 + 11-sales-assistant.md

## 背景

磐销云提供 AI 商机提醒功能，本项目已有 `follow-up-ai-reminder.service.ts` 实现基础 AI 跟进提醒，但缺少商机评分、风险预警、竞品检测、自动排程等高级能力。本任务在现有 AI 提醒基础上增强，构建完整的 AI 商机智能助手。

## 功能需求

| #   | 功能         | 说明                                                                |
| --- | ------------ | ------------------------------------------------------------------- |
| F1  | AI 商机评分  | 基于客户画像、阶段、跟进频次、通话情感等多维度评分（0-100）         |
| F2  | 风险预警     | 检测停滞商机（长时间未推进）、负面情感趋势、跟进频次下降            |
| F3  | 下一步建议   | AI 分析商机当前状态，推荐最佳下一步行动（打电话/发方案/安排拜访等） |
| F4  | 自动排程     | AI 根据商机优先级和销售日程自动建议跟进计划                         |
| F5  | 竞品提及检测 | 从通话记录中检测竞品提及，自动标记并提醒                            |
| F6  | 提醒聚合     | 每日/每周汇总所有 AI 提醒，推送给销售（防消息轰炸）                 |
| F7  | 提醒反馈     | 销售对 AI 建议标记有用/无用，用于优化提醒质量                       |

## 技术方案

### 后端

#### Entity

```typescript
// opportunity-score.entity.ts
@Entity("opportunity_scores")
export class OpportunityScore extends BaseEntity {
  @ManyToOne(() => Opportunity)
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunity;

  @Column({ type: "int" })
  opportunityId: number;

  @Column({ type: "int" })
  score: number; // 0-100

  @Column({ type: "simple-json" })
  dimensions: OpportunityScoreDimensions;
  // { customerFit: number, engagementLevel: number, stageProgress: number, sentimentTrend: number, competitorRisk: number }

  @Column({ type: "text", nullable: true })
  aiReasoning: string | null; // AI 评分理由

  @Column({ type: "datetime" })
  scoredAt: Date;
}

// ai-reminder.entity.ts
@Entity("ai_reminders")
export class AiReminder extends BaseEntity {
  @ManyToOne(() => Opportunity, { nullable: true })
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunity;

  @Column({ type: "int", nullable: true })
  opportunityId: number | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: "customerId" })
  customer: Customer;

  @Column({ type: "int", nullable: true })
  customerId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "varchar", length: 50 })
  type: AiReminderType; // score_change | risk_alert | next_action | competitor_mention | follow_up_schedule | stagnant

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "varchar", length: 20, default: "medium" })
  priority: string; // low | medium | high | urgent

  @Column({ type: "boolean", default: false })
  isRead: boolean;

  @Column({ type: "varchar", length: 20, nullable: true })
  feedback: string | null; // useful | not_useful | null

  @Column({ type: "datetime", nullable: true })
  feedbackAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  scheduledAt: Date | null; // 计划发送时间（用于聚合）
}

// competitor-mention.entity.ts
@Entity("competitor_mentions")
export class CompetitorMention extends BaseEntity {
  @ManyToOne(() => CallRecord)
  @JoinColumn({ name: "callRecordId" })
  callRecord: CallRecord;

  @Column({ type: "int" })
  callRecordId: number;

  @ManyToOne(() => Opportunity, { nullable: true })
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunity;

  @Column({ type: "int", nullable: true })
  opportunityId: number | null;

  @Column({ type: "varchar", length: 200 })
  competitorName: string;

  @Column({ type: "text", nullable: true })
  context: string | null; // 提及上下文文本

  @Column({ type: "varchar", length: 30 })
  sentiment: string; // positive | neutral | negative
}
```

#### Enums (shared)

```typescript
enum AiReminderType {
  SCORE_CHANGE = "score_change",
  RISK_ALERT = "risk_alert",
  NEXT_ACTION = "next_action",
  COMPETITOR_MENTION = "competitor_mention",
  FOLLOW_UP_SCHEDULE = "follow_up_schedule",
  STAGNANT = "stagnant",
}
```

#### DTO

- `OpportunityScoreQueryDto`: opportunityId?, minScore?, maxScore?, page, pageSize
- `AiReminderQueryDto`: type?, priority?, isRead?, startDate?, endDate?, page, pageSize
- `AiReminderFeedbackDto`: feedback ('useful' | 'not_useful')
- `CompetitorMentionQueryDto`: opportunityId?, competitorName?, page, pageSize
- `ScheduleConfigDto`: dailySummaryTime?, weeklySummaryDay?, reminderAggregation (boolean)

#### Service

- `OpportunityScoringService`:
  - `scoreOpportunity(opportunityId)`: 调用 AiService 多维度评分
  - `batchScore()`: Bull Cron Job 每日凌晨批量评分所有活跃商机
  - `getScoreHistory(opportunityId)`: 评分趋势
  - `getScoreDistribution(userId?)`: 评分分布统计
- `AiReminderService` (增强现有 FollowUpAiReminderService):
  - `detectStagnantOpportunities()`: 检测停滞商机（stage_entered_at > N 天）
  - `generateNextActions(opportunityId)`: AI 生成下一步建议
  - `autoScheduleFollowUps(userId)`: 自动排程跟进计划
  - `aggregateReminders(userId, period)`: 聚合提醒（日/周报）
  - `submitFeedback(reminderId, feedback)`: 记录反馈
  - `getReminders(query, user)`: 查询提醒列表
- `CompetitorDetectionService`:
  - `detectFromCallRecord(callRecordId)`: 从通话记录 AI 分析检测竞品提及
  - `getCompetitorReport(opportunityId?)`: 竞品提及汇总

#### Controller

- `OpportunityScoringController`: `/api/v1/opportunity-scores`
- `AiReminderController`: `/api/v1/ai-reminders`
- `CompetitorMentionController`: `/api/v1/competitor-mentions`

#### Module

- `AiBusinessReminderModule`: 导入 OpportunityModule, CustomerModule, CallRecordModule, AiModule, NotificationModule, FollowUpModule, BullModule (ai-scoring queue, ai-reminder queue)

#### Migration

- `1709000085000-CreateOpportunityScores.ts`
- `1709000086000-CreateAiReminders.ts`
- `1709000087000-CreateCompetitorMentions.ts`

### 前端 (PC)

| 文件                                                       | 说明                          |
| ---------------------------------------------------------- | ----------------------------- |
| `web/src/views/ai-reminder/index.vue`                      | AI 提醒中心（列表+筛选+反馈） |
| `web/src/views/ai-reminder/components/ReminderCard.vue`    | 提醒卡片组件                  |
| `web/src/views/ai-reminder/components/ScoreTrend.vue`      | 商机评分趋势图                |
| `web/src/views/opportunity/components/AiScorePanel.vue`    | 商机详情页 AI 评分面板        |
| `web/src/views/opportunity/components/CompetitorAlert.vue` | 竞品提及警示                  |
| `web/src/api/ai-reminder.ts`                               | API 层                        |

### 前端 (APP)

| 文件                                           | 说明                |
| ---------------------------------------------- | ------------------- |
| `miniapp/src/pages-sub/ai-reminder/list.vue`   | AI 提醒列表         |
| `miniapp/src/pages-sub/ai-reminder/detail.vue` | 提醒详情 + 快捷操作 |

## API 接口

| Method | Path                                                | Description                   | Auth          |
| ------ | --------------------------------------------------- | ----------------------------- | ------------- |
| GET    | `/api/v1/opportunity-scores`                        | 评分列表（按商机/分数筛选）   | All           |
| GET    | `/api/v1/opportunity-scores/:opportunityId`         | 单商机最新评分                | All           |
| GET    | `/api/v1/opportunity-scores/:opportunityId/history` | 评分趋势                      | All           |
| POST   | `/api/v1/opportunity-scores/:opportunityId/refresh` | 手动触发重新评分              | All           |
| GET    | `/api/v1/opportunity-scores/distribution`           | 评分分布统计                  | Manager/Admin |
| GET    | `/api/v1/ai-reminders`                              | 提醒列表                      | All           |
| GET    | `/api/v1/ai-reminders/summary`                      | 提醒汇总（未读数/按类型统计） | All           |
| PUT    | `/api/v1/ai-reminders/:id/read`                     | 标记已读                      | All           |
| PUT    | `/api/v1/ai-reminders/:id/feedback`                 | 提交反馈                      | All           |
| PUT    | `/api/v1/ai-reminders/settings`                     | 更新提醒偏好设置              | All           |
| GET    | `/api/v1/competitor-mentions`                       | 竞品提及列表                  | All           |
| GET    | `/api/v1/competitor-mentions/report`                | 竞品提及汇总报告              | Manager/Admin |

## 数据库设计

### opportunity_scores

| Column         | Type                     | Nullable | Description    |
| -------------- | ------------------------ | -------- | -------------- |
| id             | int (PK, auto)           | NO       |                |
| opportunity_id | int (FK → opportunities) | NO       | 关联商机       |
| score          | int                      | NO       | 综合评分 0-100 |
| dimensions     | json                     | NO       | 多维度分项     |
| ai_reasoning   | text                     | YES      | AI 评分理由    |
| scored_at      | datetime                 | NO       | 评分时间       |
| created_at     | datetime(6)              | NO       |                |
| updated_at     | datetime(6)              | NO       |                |
| deleted_at     | datetime(6)              | YES      | 软删除         |

**索引**: `IDX_os_opportunity` (opportunity_id), `IDX_os_score` (score), `IDX_os_scored_at` (scored_at)

### ai_reminders

| Column         | Type                     | Nullable | Description  |
| -------------- | ------------------------ | -------- | ------------ |
| id             | int (PK, auto)           | NO       |              |
| opportunity_id | int (FK → opportunities) | YES      |              |
| customer_id    | int (FK → customers)     | YES      |              |
| user_id        | int (FK → users)         | NO       | 接收人       |
| type           | varchar(50)              | NO       | 提醒类型     |
| title          | varchar(200)             | NO       | 标题         |
| content        | text                     | NO       | 内容         |
| priority       | varchar(20)              | NO       | 优先级       |
| is_read        | boolean                  | NO       | 是否已读     |
| feedback       | varchar(20)              | YES      | 反馈         |
| feedback_at    | datetime                 | YES      | 反馈时间     |
| scheduled_at   | datetime                 | YES      | 计划发送时间 |
| created_at     | datetime(6)              | NO       |              |
| updated_at     | datetime(6)              | NO       |              |
| deleted_at     | datetime(6)              | YES      | 软删除       |

**索引**: `IDX_ar_user_read` (user_id, is_read), `IDX_ar_type` (type), `IDX_ar_opportunity` (opportunity_id), `IDX_ar_scheduled` (scheduled_at)

### competitor_mentions

| Column          | Type                     | Nullable | Description               |
| --------------- | ------------------------ | -------- | ------------------------- |
| id              | int (PK, auto)           | NO       |                           |
| call_record_id  | int (FK → call_records)  | NO       |                           |
| opportunity_id  | int (FK → opportunities) | YES      |                           |
| competitor_name | varchar(200)             | NO       | 竞品名称                  |
| context         | text                     | YES      | 提及上下文                |
| sentiment       | varchar(30)              | NO       | positive/neutral/negative |
| created_at      | datetime(6)              | NO       |                           |
| updated_at      | datetime(6)              | NO       |                           |
| deleted_at      | datetime(6)              | YES      | 软删除                    |

**索引**: `IDX_cm_call_record` (call_record_id), `IDX_cm_opportunity` (opportunity_id), `IDX_cm_competitor` (competitor_name)

## 依赖模块

| 模块               | 关系                                   |
| ------------------ | -------------------------------------- |
| OpportunityModule  | 导入 — 商机数据                        |
| CustomerModule     | 导入 — 客户画像数据                    |
| CallRecordModule   | 导入 — 通话记录用于竞品检测和情感分析  |
| AiModule           | 导入 — 调用 AI 评分和分析              |
| FollowUpModule     | 导入 — 跟进记录数据 + 现有 AI 提醒增强 |
| NotificationModule | 导入 — 推送提醒                        |
| BullModule         | 注册 ai-scoring / ai-reminder queue    |

## 验收标准

- [ ] 商机评分 0-100，包含 5 个维度分项（customerFit, engagementLevel, stageProgress, sentimentTrend, competitorRisk）
- [ ] 每日 Cron Job 自动批量评分所有活跃商机
- [ ] 停滞商机（超过配置天数未推进）自动生成风险预警
- [ ] AI 下一步建议基于商机阶段和跟进历史生成，内容具体可操作
- [ ] 竞品提及检测从通话记录 AI 摘要中提取，关联到对应商机
- [ ] 提醒聚合：支持日报/周报模式，合并多条提醒为一次推送
- [ ] 反馈机制：销售可标记有用/无用，统计反馈率
- [ ] SALES 只能查看自己商机的评分和提醒
- [ ] 前端 AI 提醒中心列表正确展示，支持按类型/优先级/已读筛选
- [ ] 商机详情页展示评分面板和竞品警示
- [ ] 后端单元测试 ≥25 tests（OpportunityScoringService + AiReminderService + CompetitorDetectionService）
- [ ] Migration 可正向/反向执行
- [ ] Skills: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
