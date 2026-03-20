# T21 — 回款追踪增强

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — paymentTracking
> 优先级: 🟡中
> 参考设计: 08-contract-payment.md §8.2

## 背景

磐销云提供回款追踪功能，本项目已有 payment 模块（CRUD+5态），但缺少回款计划分期管理、逾期预警、银行流水匹配、账龄分析等能力。增强回款追踪模块可帮助销售和财务实时掌握回款进度，降低坏账风险。

## 功能需求

| #   | 功能         | 说明                                                                          |
| --- | ------------ | ----------------------------------------------------------------------------- |
| F1  | 回款计划管理 | 按合同生成分期回款计划（等额/自定义），支持手动调整                           |
| F2  | 逾期预警     | 回款到期前 N 天自动提醒；逾期后按天数分级预警（1-30天/31-60天/61-90天/90+天） |
| F3  | 回款匹配     | 银行流水导入（CSV），自动/手动匹配到回款计划行项                              |
| F4  | 回款确认     | 财务确认收款，更新回款状态                                                    |
| F5  | 账龄分析     | 应收账款账龄分布（当期/1-30/31-60/61-90/90+），按客户/销售汇总                |
| F6  | 回款仪表盘   | 回款概览：本月应收/已收/逾期/回款率，趋势图                                   |
| F7  | 自动提醒     | 通过 notification 模块 + Bull Cron 定时检查并发送逾期提醒                     |
| F8  | 坏账处理     | 逾期超限后标记坏账，需 Manager 审批核销                                       |

## 技术方案

### 后端

#### Entity

```typescript
// payment-plan.entity.ts
@Entity("payment_plans")
export class PaymentPlan extends BaseEntity {
  @ManyToOne(() => Contract)
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({ type: "int" })
  contractId: number;

  @Column({ type: "varchar", length: 100 })
  planName: string;

  @Column({ type: "int", default: 1 })
  totalInstallments: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: "varchar", length: 30, default: "equal" })
  splitMethod: string; // equal | custom

  @OneToMany(() => PaymentPlanItem, (item) => item.plan)
  items: PaymentPlanItem[];

  @ManyToOne(() => User)
  @JoinColumn({ name: "salesUserId" })
  salesUser: User;

  @Column({ type: "int" })
  salesUserId: number;
}

// payment-plan-item.entity.ts
@Entity("payment_plan_items")
export class PaymentPlanItem extends BaseEntity {
  @ManyToOne(() => PaymentPlan, (plan) => plan.items)
  @JoinColumn({ name: "planId" })
  plan: PaymentPlan;

  @Column({ type: "int" })
  planId: number;

  @Column({ type: "int" })
  installmentNo: number; // 第几期

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "date" })
  dueDate: string; // 应收日期

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  paidAmount: number; // 已收金额

  @Column({ type: "datetime", nullable: true })
  paidAt: Date | null;

  @Column({ type: "varchar", length: 30 })
  status: PaymentPlanItemStatus; // pending | paid | partial | overdue | bad_debt

  @Column({ type: "varchar", length: 500, nullable: true })
  remark: string | null;
}

// bank-statement.entity.ts
@Entity("bank_statements")
export class BankStatement extends BaseEntity {
  @Column({ type: "date" })
  transactionDate: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 200 })
  payerName: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  payerAccount: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  reference: string | null; // 交易备注

  @Column({ type: "int", nullable: true })
  matchedPlanItemId: number | null; // 匹配到的回款计划行项

  @Column({ type: "varchar", length: 30, default: "unmatched" })
  matchStatus: string; // unmatched | auto_matched | manual_matched

  @ManyToOne(() => User)
  @JoinColumn({ name: "importedById" })
  importedBy: User;

  @Column({ type: "int" })
  importedById: number;
}
```

#### DTO

- `CreatePaymentPlanDto`: contractId, planName, totalInstallments, totalAmount, splitMethod, items?: { amount, dueDate }[]
- `UpdatePaymentPlanItemDto`: amount?, dueDate?, status?, remark?
- `ConfirmPaymentDto`: planItemId, paidAmount, paidAt, remark?
- `ImportBankStatementDto`: file (CSV upload)
- `MatchStatementDto`: statementId, planItemId
- `AgingQueryDto`: asOfDate?, salesUserId?, customerId?
- `PaymentDashboardQueryDto`: startDate, endDate, salesUserId?

#### Service

- `PaymentPlanService`:
  - `createPlan(dto, user)`: 创建回款计划 + 按分期方式自动生成行项
  - `confirmPayment(dto, user)`: 确认收款 + 更新行项状态 + 检查计划完成度
  - `getOverdueItems(page, pageSize)`: 查询逾期行项
  - `markBadDebt(planItemId, user)`: 标记坏账（需 Manager 角色）
- `BankStatementService`:
  - `importCsv(file, user)`: 解析银行流水 CSV
  - `autoMatch()`: 按金额+客户名自动匹配
  - `manualMatch(statementId, planItemId)`: 手动匹配
- `PaymentAnalyticsService`:
  - `getAgingAnalysis(query)`: 账龄分析
  - `getDashboard(query)`: 回款仪表盘数据
  - `getOverdueReminders()`: 获取待提醒列表（Cron Job 调用）

#### Controller

- `PaymentPlanController`: `/api/v1/payment-plans`
- `BankStatementController`: `/api/v1/bank-statements`
- `PaymentAnalyticsController`: `/api/v1/payment-analytics`

#### Module

- `PaymentTrackingModule`: 导入 ContractModule, CustomerModule, UserModule, NotificationModule, BullModule (payment-reminder queue)

#### Migration

- `1709000082000-CreatePaymentPlans.ts`
- `1709000083000-CreatePaymentPlanItems.ts`
- `1709000084000-CreateBankStatements.ts`

### 前端 (PC)

| 文件                                                | 说明                             |
| --------------------------------------------------- | -------------------------------- |
| `web/src/views/payment/plan.vue`                    | 回款计划列表 + 创建/编辑         |
| `web/src/views/payment/components/PlanTimeline.vue` | 分期时间线                       |
| `web/src/views/payment/components/AgingChart.vue`   | 账龄分布图（ECharts 堆叠柱状图） |
| `web/src/views/payment/dashboard.vue`               | 回款仪表盘                       |
| `web/src/views/payment/bank-statement.vue`          | 银行流水导入 + 匹配              |
| `web/src/api/payment-tracking.ts`                   | API 层                           |

### 前端 (APP)

| 文件                                            | 说明                    |
| ----------------------------------------------- | ----------------------- |
| `miniapp/src/pages-sub/payment/plan-list.vue`   | 回款计划列表            |
| `miniapp/src/pages-sub/payment/plan-detail.vue` | 回款计划详情 + 确认收款 |

## API 接口

| Method | Path                                       | Description            | Auth          |
| ------ | ------------------------------------------ | ---------------------- | ------------- |
| GET    | `/api/v1/payment-plans`                    | 回款计划列表           | All           |
| POST   | `/api/v1/payment-plans`                    | 创建回款计划           | All           |
| GET    | `/api/v1/payment-plans/:id`                | 回款计划详情（含行项） | All           |
| PUT    | `/api/v1/payment-plans/:id`                | 更新回款计划           | All           |
| DELETE | `/api/v1/payment-plans/:id`                | 删除回款计划           | Manager/Admin |
| PUT    | `/api/v1/payment-plans/items/:id`          | 更新行项               | All           |
| POST   | `/api/v1/payment-plans/items/:id/confirm`  | 确认收款               | Manager/Admin |
| POST   | `/api/v1/payment-plans/items/:id/bad-debt` | 标记坏账               | Manager/Admin |
| GET    | `/api/v1/payment-plans/overdue`            | 逾期行项列表           | All           |
| POST   | `/api/v1/bank-statements/import`           | 导入银行流水 CSV       | Manager/Admin |
| GET    | `/api/v1/bank-statements`                  | 银行流水列表           | Manager/Admin |
| POST   | `/api/v1/bank-statements/:id/match`        | 手动匹配流水           | Manager/Admin |
| POST   | `/api/v1/bank-statements/auto-match`       | 自动匹配               | Manager/Admin |
| GET    | `/api/v1/payment-analytics/dashboard`      | 回款仪表盘             | All           |
| GET    | `/api/v1/payment-analytics/aging`          | 账龄分析               | Manager/Admin |

## 数据库设计

### payment_plans

| Column             | Type                 | Nullable | Description    |
| ------------------ | -------------------- | -------- | -------------- |
| id                 | int (PK, auto)       | NO       |                |
| contract_id        | int (FK → contracts) | NO       | 关联合同       |
| plan_name          | varchar(100)         | NO       | 计划名称       |
| total_installments | int                  | NO       | 总期数         |
| total_amount       | decimal(12,2)        | NO       | 计划总金额     |
| split_method       | varchar(30)          | NO       | equal / custom |
| sales_user_id      | int (FK → users)     | NO       | 负责销售       |
| created_at         | datetime(6)          | NO       |                |
| updated_at         | datetime(6)          | NO       |                |
| deleted_at         | datetime(6)          | YES      | 软删除         |

**索引**: `IDX_pp_contract` (contract_id), `IDX_pp_sales_user` (sales_user_id)

### payment_plan_items

| Column         | Type                     | Nullable | Description                           |
| -------------- | ------------------------ | -------- | ------------------------------------- |
| id             | int (PK, auto)           | NO       |                                       |
| plan_id        | int (FK → payment_plans) | NO       | 关联计划                              |
| installment_no | int                      | NO       | 期号                                  |
| amount         | decimal(12,2)            | NO       | 应收金额                              |
| due_date       | date                     | NO       | 应收日期                              |
| paid_amount    | decimal(12,2)            | NO       | 已收金额，默认 0                      |
| paid_at        | datetime                 | YES      | 实际收款时间                          |
| status         | varchar(30)              | NO       | pending/paid/partial/overdue/bad_debt |
| remark         | varchar(500)             | YES      | 备注                                  |
| created_at     | datetime(6)              | NO       |                                       |
| updated_at     | datetime(6)              | NO       |                                       |
| deleted_at     | datetime(6)              | YES      | 软删除                                |

**索引**: `IDX_ppi_plan` (plan_id), `IDX_ppi_due_date` (due_date), `IDX_ppi_status` (status)

### bank_statements

| Column               | Type                          | Nullable | Description                           |
| -------------------- | ----------------------------- | -------- | ------------------------------------- |
| id                   | int (PK, auto)                | NO       |                                       |
| transaction_date     | date                          | NO       | 交易日期                              |
| amount               | decimal(12,2)                 | NO       | 交易金额                              |
| payer_name           | varchar(200)                  | NO       | 付款方名称                            |
| payer_account        | varchar(100)                  | YES      | 付款方账号                            |
| reference            | varchar(500)                  | YES      | 交易备注/摘要                         |
| matched_plan_item_id | int (FK → payment_plan_items) | YES      | 匹配的行项                            |
| match_status         | varchar(30)                   | NO       | unmatched/auto_matched/manual_matched |
| imported_by_id       | int (FK → users)              | NO       | 导入人                                |
| created_at           | datetime(6)                   | NO       |                                       |
| updated_at           | datetime(6)                   | NO       |                                       |
| deleted_at           | datetime(6)                   | YES      | 软删除                                |

**索引**: `IDX_bs_transaction_date` (transaction_date), `IDX_bs_match_status` (match_status), `IDX_bs_matched_item` (matched_plan_item_id)

## 依赖模块

| 模块               | 关系                                       |
| ------------------ | ------------------------------------------ |
| ContractModule     | 导入 — 关联合同                            |
| CustomerModule     | 导入 — 按客户汇总账龄                      |
| UserModule         | 导入 — 负责人信息                          |
| NotificationModule | 导入 — 发送逾期提醒                        |
| BullModule         | 注册 payment-reminder queue — 定时检查逾期 |
| ApprovalModule     | 导入 — 坏账核销审批                        |

## 验收标准

- [ ] 回款计划 CRUD 完整，支持等额和自定义两种分期方式
- [ ] 等额分期自动生成 N 条行项，金额均分（尾差调整最后一期）
- [ ] 确认收款后行项状态正确更新（paid/partial）
- [ ] Cron Job 每日检查逾期行项，将 pending 状态自动更新为 overdue
- [ ] 逾期提醒通过 notification 模块发送给负责销售
- [ ] 银行流水 CSV 导入解析正确（支持常见银行格式）
- [ ] 自动匹配按金额+客户名模糊匹配，匹配率展示
- [ ] 账龄分析返回按 0/1-30/31-60/61-90/90+ 天分组的应收金额
- [ ] 回款仪表盘展示本月应收/已收/逾期金额/回款率
- [ ] 坏账标记需 Manager+ 角色，记录审计日志
- [ ] SALES 只能查看自己负责合同的回款数据
- [ ] 后端单元测试 ≥25 tests（PaymentPlanService + BankStatementService + PaymentAnalyticsService）
- [ ] Migration 可正向/反向执行
- [ ] Skills: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
