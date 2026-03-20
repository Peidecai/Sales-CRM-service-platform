# T20 — 签约促成

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — signingFacilitation
> 优先级: 🟡中
> 参考设计: 03-customer-management.md §3.4 + 08-contract-payment.md §8.1

## 背景

磐销云提供签约促成功能，帮助销售在商机进入谈判阶段后快速推进签约流程。本项目已有 contract 模块（CRUD+10态流转）和 opportunity 模块，但缺少从商机到合同的自动转换、电子签章集成、签约进度追踪等能力。签约促成模块旨在打通 opportunity → contract 全链路，减少签约周期。

## 功能需求

| #   | 功能              | 说明                                                                 |
| --- | ----------------- | -------------------------------------------------------------------- |
| F1  | 合同草稿自动生成  | 基于商机数据（客户、金额、产品）自动填充合同模板生成草稿             |
| F2  | 合同模板管理      | 管理员维护合同模板（标题、正文模板、变量占位符）                     |
| F3  | 电子签章集成点    | 预留电子签章接口（e签宝/法大大），支持发起签署、回调状态             |
| F4  | 签约进度追踪      | 签约流程可视化：草稿→内部审批→发送客户→客户签署→完成                 |
| F5  | 签约提醒          | 商机达到 NEGOTIATION 阶段自动生成签约待办；客户超过 N 天未签署发提醒 |
| F6  | 商机→合同一键转换 | 从商机详情页一键创建关联合同，自动填充数据                           |
| F7  | 签约统计          | 签约数量/金额/平均签约周期/转化率统计                                |
| F8  | 签约排行          | 按签约金额/数量排行（日/周/月）                                      |

## 技术方案

### 后端

#### Entity

```typescript
// contract-template.entity.ts
@Entity("contract_templates")
export class ContractTemplate extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "text" })
  content: string; // 模板正文，支持 {{customerName}} 等变量

  @Column({ type: "simple-json", nullable: true })
  variables: string[]; // 可用变量列表

  @Column({ type: "varchar", length: 50, default: "active" })
  status: string; // active | archived

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdById" })
  createdBy: User;

  @Column({ type: "int" })
  createdById: number;
}

// signing-process.entity.ts
@Entity("signing_processes")
export class SigningProcess extends BaseEntity {
  @ManyToOne(() => Opportunity)
  @JoinColumn({ name: "opportunityId" })
  opportunity: Opportunity;

  @Column({ type: "int" })
  opportunityId: number;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @Column({ type: "int", nullable: true })
  contractId: number | null;

  @Column({ type: "varchar", length: 50 })
  status: SigningStatus; // draft | internal_review | sent_to_customer | customer_signed | completed | cancelled

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "datetime", nullable: true })
  sentAt: Date | null; // 发送给客户时间

  @Column({ type: "datetime", nullable: true })
  signedAt: Date | null; // 客户签署时间

  @Column({ type: "datetime", nullable: true })
  completedAt: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  externalSignId: string | null; // 第三方电子签章 ID

  @ManyToOne(() => User)
  @JoinColumn({ name: "salesUserId" })
  salesUser: User;

  @Column({ type: "int" })
  salesUserId: number;
}
```

#### DTO

- `CreateContractTemplateDto`: name, content, variables?
- `UpdateContractTemplateDto`: PartialType
- `GenerateContractDto`: opportunityId, templateId, overrides? (变量覆盖值)
- `CreateSigningProcessDto`: opportunityId, amount, templateId?
- `UpdateSigningStatusDto`: status, externalSignId?
- `SigningStatisticsQueryDto`: startDate, endDate, salesUserId?, teamId?

#### Service

- `ContractTemplateService`: CRUD + 模板变量解析 + 根据商机数据填充模板
- `SigningProcessService`:
  - `createFromOpportunity(opportunityId, user)`: 自动创建签约流程
  - `updateStatus(id, status, user)`: 流转状态 + 写审计日志
  - `generateContract(signingId, templateId)`: 从模板生成合同草稿
  - `getStatistics(query)`: 签约统计
  - `getRanking(period, limit)`: 签约排行
  - `getPendingReminders()`: 获取需提醒的签约流程（Bull Cron Job）

#### Controller

- `ContractTemplateController`: `/api/v1/contract-templates`
- `SigningProcessController`: `/api/v1/signing`

#### Module

- `SigningModule`: 导入 OpportunityModule, ContractModule, UserModule, NotificationModule

#### Migration

- `1709000080000-CreateContractTemplates.ts`
- `1709000081000-CreateSigningProcesses.ts`

### 前端 (PC)

| 文件                                                          | 说明                    |
| ------------------------------------------------------------- | ----------------------- |
| `web/src/views/signing/index.vue`                             | 签约流程列表 + 统计卡片 |
| `web/src/views/signing/components/SigningTimeline.vue`        | 签约进度时间线          |
| `web/src/views/signing/components/SigningStats.vue`           | 签约统计图表            |
| `web/src/views/signing/components/GenerateContractDialog.vue` | 选择模板生成合同        |
| `web/src/views/settings/contract-templates.vue`               | 合同模板管理（Admin）   |
| `web/src/api/signing.ts`                                      | API 层                  |
| `web/src/router/index.ts`                                     | 新增 /signing 路由      |

### 前端 (APP)

| 文件                                       | 说明            |
| ------------------------------------------ | --------------- |
| `miniapp/src/pages-sub/signing/list.vue`   | 签约流程列表    |
| `miniapp/src/pages-sub/signing/detail.vue` | 签约详情 + 进度 |

## API 接口

| Method | Path                                     | Description            | Auth          |
| ------ | ---------------------------------------- | ---------------------- | ------------- |
| GET    | `/api/v1/contract-templates`             | 合同模板列表           | Admin/Manager |
| POST   | `/api/v1/contract-templates`             | 创建合同模板           | Admin         |
| PUT    | `/api/v1/contract-templates/:id`         | 更新合同模板           | Admin         |
| DELETE | `/api/v1/contract-templates/:id`         | 删除合同模板           | Admin         |
| GET    | `/api/v1/contract-templates/:id/preview` | 预览模板（填充变量）   | All           |
| GET    | `/api/v1/signing`                        | 签约流程列表（分页）   | All           |
| POST   | `/api/v1/signing`                        | 创建签约流程（从商机） | All           |
| GET    | `/api/v1/signing/:id`                    | 签约流程详情           | All           |
| PUT    | `/api/v1/signing/:id/status`             | 更新签约状态           | All           |
| POST   | `/api/v1/signing/:id/generate-contract`  | 从模板生成合同         | All           |
| GET    | `/api/v1/signing/statistics`             | 签约统计               | Manager/Admin |
| GET    | `/api/v1/signing/ranking`                | 签约排行               | All           |
| POST   | `/api/v1/signing/esign/callback`         | 电子签章回调（预留）   | Public        |

## 数据库设计

### contract_templates

| Column        | Type             | Nullable | Description              |
| ------------- | ---------------- | -------- | ------------------------ |
| id            | int (PK, auto)   | NO       |                          |
| name          | varchar(200)     | NO       | 模板名称                 |
| content       | text             | NO       | 模板正文（含变量占位符） |
| variables     | json             | YES      | 可用变量列表             |
| status        | varchar(50)      | NO       | active / archived        |
| created_by_id | int (FK → users) | NO       | 创建人                   |
| created_at    | datetime(6)      | NO       |                          |
| updated_at    | datetime(6)      | NO       |                          |
| deleted_at    | datetime(6)      | YES      | 软删除                   |

**索引**: `IDX_ct_status` (status), `IDX_ct_created_by` (created_by_id)

### signing_processes

| Column           | Type                     | Nullable | Description            |
| ---------------- | ------------------------ | -------- | ---------------------- |
| id               | int (PK, auto)           | NO       |                        |
| opportunity_id   | int (FK → opportunities) | NO       | 关联商机               |
| contract_id      | int (FK → contracts)     | YES      | 关联合同（生成后填入） |
| status           | varchar(50)              | NO       | 签约状态               |
| amount           | decimal(12,2)            | NO       | 签约金额               |
| sent_at          | datetime                 | YES      | 发送时间               |
| signed_at        | datetime                 | YES      | 签署时间               |
| completed_at     | datetime                 | YES      | 完成时间               |
| external_sign_id | varchar(500)             | YES      | 第三方签章 ID          |
| sales_user_id    | int (FK → users)         | NO       | 负责销售               |
| created_at       | datetime(6)              | NO       |                        |
| updated_at       | datetime(6)              | NO       |                        |
| deleted_at       | datetime(6)              | YES      | 软删除                 |

**索引**: `IDX_sp_opportunity` (opportunity_id), `IDX_sp_status` (status), `IDX_sp_sales_user` (sales_user_id), `IDX_sp_signed_at` (signed_at)

## 依赖模块

| 模块               | 关系                              |
| ------------------ | --------------------------------- |
| OpportunityModule  | 导入 — 读取商机数据、更新商机阶段 |
| ContractModule     | 导入 — 创建合同记录               |
| UserModule         | 导入 — 负责人信息                 |
| NotificationModule | 导入 — 发送签约提醒               |
| ApprovalModule     | 导入 — 内部审批流                 |
| AuditLogModule     | 已全局 — 自动记录操作日志         |

## 验收标准

- [ ] 合同模板 CRUD 完整，支持变量占位符（{{customerName}}, {{amount}} 等）
- [ ] 从商机一键创建签约流程，自动填充客户和金额
- [ ] 签约状态流转正确（draft→internal_review→sent_to_customer→customer_signed→completed）
- [ ] 从模板生成合同草稿，变量正确替换
- [ ] 商机进入 NEGOTIATION 阶段自动生成签约待办通知
- [ ] 超过配置天数未签署发送提醒通知
- [ ] 签约统计接口返回正确数据（数量/金额/平均周期/转化率）
- [ ] 签约排行按金额/数量正确排序
- [ ] SALES 只能查看自己的签约流程
- [ ] 前端签约列表页 + 统计卡片 + 进度时间线展示正确
- [ ] 后端单元测试 ≥20 tests（SigningProcessService + ContractTemplateService）
- [ ] Migration 可正向/反向执行
- [ ] Skills: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
