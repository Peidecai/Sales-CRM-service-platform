## 6. 销售流程管理详细设计

### 6.1 功能架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          销售流程管理模块                                     │
├─────────────┬─────────────┬──────────────┬──────────────┬───────────────────┤
│  商机管理   │  报价管理    │   合同管理    │   回款管理    │   目标与业绩      │
├─────────────┼─────────────┼──────────────┼──────────────┼───────────────────┤
│ ·商机创建   │ ·报价单生成  │ ·合同创建    │ ·回款计划     │ ·团队目标设定     │
│ ·商机跟进   │ ·产品选配    │ ·合同审批    │ ·到账确认     │ ·个人目标设定     │
│ ·阶段推进   │ ·折扣管理    │ ·电子签署    │ ·逾期提醒     │ ·目标分解         │
│ ·赢单/丢单  │ ·报价审批    │ ·合同归档    │ ·开票关联     │ ·达成率追踪       │
│ ·商机看板   │ ·报价对比    │ ·到期预警    │ ·坏账处理     │ ·业绩排行榜       │
│ ·商机预测   │ ·历史报价    │ ·续约提醒    │ ·回款统计     │ ·销售预测         │
├─────────────┴─────────────┴──────────────┴──────────────┴───────────────────┤
│                             销售漏斗分析                                      │
│         ·漏斗可视化  ·阶段转化率  ·赢率分析  ·周期分析  ·预测收入            │
├─────────────────────────────────────────────────────────────────────────────┤
│                             通用审批引擎                                      │
│     ·审批流配置  ·审批发起  ·多级审批  ·驳回/撤回  ·审批记录  ·消息通知      │
├─────────────────────────────────────────────────────────────────────────────┤
│                             AI 智能辅助层                                     │
│  ·赢率预测  ·最佳跟进建议  ·报价智能推荐  ·异常预警  ·智能催款  ·目标建议    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**模块间协作关系：**

```
                    ┌──────────┐
                    │ 客户管理 │
                    └────┬─────┘
                         │ 关联客户/联系人
                         ▼
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ 线索转化 │─────▶│ 商机管理 │─────▶│ 报价管理 │─────▶│ 合同管理 │
└──────────┘      └────┬─────┘      └──────────┘      └────┬─────┘
                       │                                    │
                       ▼                                    ▼
                ┌──────────────┐                     ┌──────────┐
                │ 销售漏斗分析 │                     │ 回款管理 │
                └──────────────┘                     └────┬─────┘
                                                          │
                       ┌──────────────────────────────────┘
                       ▼
              ┌──────────────────┐      ┌──────────────┐
              │ 目标与业绩追踪   │─────▶│  业绩排行榜  │
              └──────────────────┘      └──────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   提成计算结算   │
              └──────────────────┘
```

---

### 6.2 数据模型设计

#### 6.2.1 商机表（opportunities）

| 字段名              | 类型          | 必填 | 默认值            | 说明                                                      |
| ------------------- | ------------- | ---- | ----------------- | --------------------------------------------------------- |
| id                  | BIGINT        | 是   | 自增              | 主键ID                                                    |
| opportunity_no      | VARCHAR(32)   | 是   | 系统生成          | 商机编号，格式：OPP-YYYYMMDD-XXXX                         |
| title               | VARCHAR(200)  | 是   | -                 | 商机名称                                                  |
| customer_id         | BIGINT        | 是   | -                 | 关联客户ID，外键→customers.id                             |
| contact_id          | BIGINT        | 否   | NULL              | 主要联系人ID，外键→contacts.id                            |
| owner_id            | BIGINT        | 是   | -                 | 负责人ID，外键→users.id                                   |
| team_id             | BIGINT        | 否   | NULL              | 所属团队ID，外键→teams.id                                 |
| source              | VARCHAR(50)   | 否   | NULL              | 商机来源：LEAD_CONVERT/MANUAL/IMPORT/REFERRAL/WEBSITE/API |
| lead_id             | BIGINT        | 否   | NULL              | 来源线索ID（线索转化时记录），外键→leads.id               |
| stage               | VARCHAR(30)   | 是   | INITIAL_CONTACT   | 当前阶段，枚举见阶段定义                                  |
| stage_changed_at    | DATETIME      | 是   | CURRENT_TIMESTAMP | 最近阶段变更时间                                          |
| probability         | TINYINT       | 是   | 10                | 赢率百分比(0-100)                                         |
| expected_amount     | DECIMAL(15,2) | 是   | 0.00              | 预计成交金额                                              |
| weighted_amount     | DECIMAL(15,2) | 是   | 0.00              | 加权金额 = expected_amount × probability / 100            |
| currency            | VARCHAR(3)    | 是   | CNY               | 币种                                                      |
| expected_close_date | DATE          | 是   | -                 | 预计成交日期                                              |
| actual_close_date   | DATE          | 否   | NULL              | 实际成交日期                                              |
| close_reason        | VARCHAR(50)   | 否   | NULL              | 赢单/丢单原因分类                                         |
| close_remark        | TEXT          | 否   | NULL              | 赢单/丢单详细说明                                         |
| competitor_ids      | JSON          | 否   | NULL              | 竞争对手ID列表                                            |
| product_ids         | JSON          | 否   | NULL              | 关联产品ID列表                                            |
| priority            | VARCHAR(10)   | 否   | MEDIUM            | 优先级：HIGH/MEDIUM/LOW                                   |
| description         | TEXT          | 否   | NULL              | 商机描述                                                  |
| next_follow_date    | DATE          | 否   | NULL              | 下次跟进日期                                              |
| last_follow_at      | DATETIME      | 否   | NULL              | 最近跟进时间                                              |
| follow_count        | INT           | 否   | 0                 | 累计跟进次数                                              |
| ai_win_rate         | DECIMAL(5,2)  | 否   | NULL              | AI预测赢率                                                |
| ai_suggestion       | TEXT          | 否   | NULL              | AI跟进建议                                                |
| tags                | JSON          | 否   | NULL              | 标签列表                                                  |
| custom_fields       | JSON          | 否   | NULL              | 自定义扩展字段                                            |
| status              | TINYINT       | 是   | 1                 | 状态：1-活跃 2-赢单 3-丢单 4-搁置                         |
| created_by          | BIGINT        | 是   | -                 | 创建人                                                    |
| created_at          | DATETIME      | 是   | CURRENT_TIMESTAMP | 创建时间                                                  |
| updated_at          | DATETIME      | 是   | CURRENT_TIMESTAMP | 更新时间                                                  |
| deleted_at          | DATETIME      | 否   | NULL              | 逻辑删除时间                                              |

**索引设计：**

```sql
-- 商机表索引
CREATE INDEX idx_opp_customer ON opportunities(customer_id);
CREATE INDEX idx_opp_owner ON opportunities(owner_id);
CREATE INDEX idx_opp_team ON opportunities(team_id);
CREATE INDEX idx_opp_stage ON opportunities(stage, status);
CREATE INDEX idx_opp_close_date ON opportunities(expected_close_date);
CREATE INDEX idx_opp_no ON opportunities(opportunity_no);
CREATE INDEX idx_opp_status ON opportunities(status, deleted_at);
CREATE INDEX idx_opp_created ON opportunities(created_at);
```

#### 6.2.2 商机阶段变更记录表（opportunity_stage_logs）

| 字段名           | 类型        | 必填 | 默认值            | 说明                          |
| ---------------- | ----------- | ---- | ----------------- | ----------------------------- |
| id               | BIGINT      | 是   | 自增              | 主键ID                        |
| opportunity_id   | BIGINT      | 是   | -                 | 商机ID，外键→opportunities.id |
| from_stage       | VARCHAR(30) | 否   | NULL              | 原阶段（首次创建时为NULL）    |
| to_stage         | VARCHAR(30) | 是   | -                 | 目标阶段                      |
| from_probability | TINYINT     | 否   | NULL              | 变更前赢率                    |
| to_probability   | TINYINT     | 是   | -                 | 变更后赢率                    |
| duration_days    | INT         | 否   | NULL              | 在原阶段停留天数              |
| remark           | TEXT        | 否   | NULL              | 变更说明                      |
| operator_id      | BIGINT      | 是   | -                 | 操作人ID                      |
| created_at       | DATETIME    | 是   | CURRENT_TIMESTAMP | 变更时间                      |

#### 6.2.3 商机跟进记录表（opportunity_follow_logs）

| 字段名           | 类型        | 必填 | 默认值            | 说明                                             |
| ---------------- | ----------- | ---- | ----------------- | ------------------------------------------------ |
| id               | BIGINT      | 是   | 自增              | 主键ID                                           |
| opportunity_id   | BIGINT      | 是   | -                 | 商机ID，外键→opportunities.id                    |
| follow_type      | VARCHAR(20) | 是   | -                 | 跟进方式：PHONE/VISIT/EMAIL/WECHAT/MEETING/OTHER |
| content          | TEXT        | 是   | -                 | 跟进内容                                         |
| follow_date      | DATETIME    | 是   | -                 | 跟进时间                                         |
| next_follow_date | DATE        | 否   | NULL              | 下次跟进日期                                     |
| contact_id       | BIGINT      | 否   | NULL              | 联系人ID                                         |
| attachments      | JSON        | 否   | NULL              | 附件列表                                         |
| operator_id      | BIGINT      | 是   | -                 | 跟进人ID                                         |
| created_at       | DATETIME    | 是   | CURRENT_TIMESTAMP | 创建时间                                         |

#### 6.2.4 报价表（quotations）

| 字段名          | 类型          | 必填 | 默认值            | 说明                                                                           |
| --------------- | ------------- | ---- | ----------------- | ------------------------------------------------------------------------------ |
| id              | BIGINT        | 是   | 自增              | 主键ID                                                                         |
| quotation_no    | VARCHAR(32)   | 是   | 系统生成          | 报价编号，格式：QUO-YYYYMMDD-XXXX                                              |
| title           | VARCHAR(200)  | 是   | -                 | 报价单名称                                                                     |
| opportunity_id  | BIGINT        | 是   | -                 | 关联商机ID，外键→opportunities.id                                              |
| customer_id     | BIGINT        | 是   | -                 | 客户ID，外键→customers.id                                                      |
| contact_id      | BIGINT        | 否   | NULL              | 联系人ID                                                                       |
| owner_id        | BIGINT        | 是   | -                 | 负责人ID                                                                       |
| version         | INT           | 是   | 1                 | 版本号（同一商机可多次报价）                                                   |
| currency        | VARCHAR(3)    | 是   | CNY               | 币种                                                                           |
| subtotal        | DECIMAL(15,2) | 是   | 0.00              | 小计金额（折前）                                                               |
| discount_type   | VARCHAR(10)   | 否   | NULL              | 折扣类型：PERCENT/FIXED                                                        |
| discount_value  | DECIMAL(10,2) | 否   | 0.00              | 折扣值                                                                         |
| discount_amount | DECIMAL(15,2) | 否   | 0.00              | 折扣金额                                                                       |
| tax_rate        | DECIMAL(5,2)  | 否   | 0.00              | 税率(%)                                                                        |
| tax_amount      | DECIMAL(15,2) | 否   | 0.00              | 税额                                                                           |
| total_amount    | DECIMAL(15,2) | 是   | 0.00              | 总金额（含税）                                                                 |
| valid_until     | DATE          | 是   | -                 | 报价有效期                                                                     |
| payment_terms   | VARCHAR(500)  | 否   | NULL              | 付款条款                                                                       |
| delivery_terms  | VARCHAR(500)  | 否   | NULL              | 交付条款                                                                       |
| remark          | TEXT          | 否   | NULL              | 备注                                                                           |
| status          | VARCHAR(20)   | 是   | DRAFT             | 状态：DRAFT/PENDING_APPROVAL/APPROVED/REJECTED/SENT/ACCEPTED/EXPIRED/CANCELLED |
| approval_id     | BIGINT        | 否   | NULL              | 审批流ID                                                                       |
| sent_at         | DATETIME      | 否   | NULL              | 发送给客户时间                                                                 |
| accepted_at     | DATETIME      | 否   | NULL              | 客户接受时间                                                                   |
| template_id     | BIGINT        | 否   | NULL              | 报价单模板ID                                                                   |
| attachments     | JSON          | 否   | NULL              | 附件列表                                                                       |
| created_by      | BIGINT        | 是   | -                 | 创建人                                                                         |
| created_at      | DATETIME      | 是   | CURRENT_TIMESTAMP | 创建时间                                                                       |
| updated_at      | DATETIME      | 是   | CURRENT_TIMESTAMP | 更新时间                                                                       |
| deleted_at      | DATETIME      | 否   | NULL              | 逻辑删除时间                                                                   |

#### 6.2.5 报价明细表（quotation_items）

| 字段名        | 类型          | 必填 | 默认值 | 说明                                                     |
| ------------- | ------------- | ---- | ------ | -------------------------------------------------------- |
| id            | BIGINT        | 是   | 自增   | 主键ID                                                   |
| quotation_id  | BIGINT        | 是   | -      | 报价单ID，外键→quotations.id                             |
| product_id    | BIGINT        | 是   | -      | 产品ID，外键→products.id                                 |
| product_name  | VARCHAR(200)  | 是   | -      | 产品名称（冗余快照）                                     |
| product_spec  | VARCHAR(500)  | 否   | NULL   | 产品规格（冗余快照）                                     |
| unit          | VARCHAR(20)   | 否   | NULL   | 单位                                                     |
| quantity      | DECIMAL(10,2) | 是   | 1      | 数量                                                     |
| unit_price    | DECIMAL(15,2) | 是   | -      | 单价                                                     |
| list_price    | DECIMAL(15,2) | 是   | -      | 标准价（目录价）                                         |
| discount_rate | DECIMAL(5,2)  | 否   | 0.00   | 行项折扣率(%)                                            |
| line_amount   | DECIMAL(15,2) | 是   | -      | 行金额 = quantity × unit_price × (1 - discount_rate/100) |
| sort_order    | INT           | 否   | 0      | 排序序号                                                 |
| remark        | VARCHAR(500)  | 否   | NULL   | 行备注                                                   |

#### 6.2.6 合同表（contracts）

| 字段名                | 类型          | 必填 | 默认值            | 说明                                                                                                        |
| --------------------- | ------------- | ---- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| id                    | BIGINT        | 是   | 自增              | 主键ID                                                                                                      |
| contract_no           | VARCHAR(32)   | 是   | 系统生成          | 合同编号，格式：CON-YYYYMMDD-XXXX                                                                           |
| title                 | VARCHAR(200)  | 是   | -                 | 合同名称                                                                                                    |
| contract_type         | VARCHAR(30)   | 是   | -                 | 合同类型：SALES/SERVICE/FRAMEWORK/SUPPLEMENT                                                                |
| opportunity_id        | BIGINT        | 否   | NULL              | 关联商机ID                                                                                                  |
| quotation_id          | BIGINT        | 否   | NULL              | 关联报价单ID                                                                                                |
| customer_id           | BIGINT        | 是   | -                 | 客户ID                                                                                                      |
| owner_id              | BIGINT        | 是   | -                 | 负责人ID                                                                                                    |
| team_id               | BIGINT        | 否   | NULL              | 所属团队ID                                                                                                  |
| our_entity            | VARCHAR(100)  | 是   | -                 | 我方签约主体                                                                                                |
| customer_entity       | VARCHAR(100)  | 是   | -                 | 客户方签约主体                                                                                              |
| currency              | VARCHAR(3)    | 是   | CNY               | 币种                                                                                                        |
| total_amount          | DECIMAL(15,2) | 是   | -                 | 合同总金额                                                                                                  |
| paid_amount           | DECIMAL(15,2) | 否   | 0.00              | 已回款金额                                                                                                  |
| unpaid_amount         | DECIMAL(15,2) | 否   | -                 | 未回款金额（计算字段）                                                                                      |
| start_date            | DATE          | 是   | -                 | 合同开始日期                                                                                                |
| end_date              | DATE          | 是   | -                 | 合同结束日期                                                                                                |
| sign_date             | DATE          | 否   | NULL              | 签署日期                                                                                                    |
| payment_terms         | TEXT          | 否   | NULL              | 付款条款                                                                                                    |
| delivery_terms        | TEXT          | 否   | NULL              | 交付条款                                                                                                    |
| penalty_clause        | TEXT          | 否   | NULL              | 违约条款                                                                                                    |
| status                | VARCHAR(20)   | 是   | DRAFT             | 状态：DRAFT/PENDING_APPROVAL/APPROVED/REJECTED/PENDING_SIGN/SIGNED/EXECUTING/COMPLETED/TERMINATED/CANCELLED |
| approval_id           | BIGINT        | 否   | NULL              | 审批流ID                                                                                                    |
| sign_method           | VARCHAR(20)   | 否   | NULL              | 签署方式：ELECTRONIC/PAPER                                                                                  |
| sign_file_url         | VARCHAR(500)  | 否   | NULL              | 签署文件URL                                                                                                 |
| archive_status        | VARCHAR(20)   | 否   | NOT_ARCHIVED      | 归档状态：NOT_ARCHIVED/ARCHIVED                                                                             |
| archive_no            | VARCHAR(50)   | 否   | NULL              | 归档编号                                                                                                    |
| archived_at           | DATETIME      | 否   | NULL              | 归档时间                                                                                                    |
| renewal_reminder_days | INT           | 否   | 30                | 到期前提醒天数                                                                                              |
| parent_contract_id    | BIGINT        | 否   | NULL              | 父合同ID（补充协议关联）                                                                                    |
| attachments           | JSON          | 否   | NULL              | 附件列表                                                                                                    |
| custom_fields         | JSON          | 否   | NULL              | 自定义字段                                                                                                  |
| created_by            | BIGINT        | 是   | -                 | 创建人                                                                                                      |
| created_at            | DATETIME      | 是   | CURRENT_TIMESTAMP | 创建时间                                                                                                    |
| updated_at            | DATETIME      | 是   | CURRENT_TIMESTAMP | 更新时间                                                                                                    |
| deleted_at            | DATETIME      | 否   | NULL              | 逻辑删除时间                                                                                                |

#### 6.2.7 合同明细表（contract_items）

| 字段名        | 类型          | 必填 | 默认值 | 说明                      |
| ------------- | ------------- | ---- | ------ | ------------------------- |
| id            | BIGINT        | 是   | 自增   | 主键ID                    |
| contract_id   | BIGINT        | 是   | -      | 合同ID，外键→contracts.id |
| product_id    | BIGINT        | 是   | -      | 产品ID                    |
| product_name  | VARCHAR(200)  | 是   | -      | 产品名称（快照）          |
| quantity      | DECIMAL(10,2) | 是   | -      | 数量                      |
| unit_price    | DECIMAL(15,2) | 是   | -      | 单价                      |
| line_amount   | DECIMAL(15,2) | 是   | -      | 行金额                    |
| delivered_qty | DECIMAL(10,2) | 否   | 0      | 已交付数量                |
| remark        | VARCHAR(500)  | 否   | NULL   | 备注                      |

#### 6.2.8 回款表（payments）

| 字段名              | 类型          | 必填 | 默认值            | 说明                                                       |
| ------------------- | ------------- | ---- | ----------------- | ---------------------------------------------------------- |
| id                  | BIGINT        | 是   | 自增              | 主键ID                                                     |
| payment_no          | VARCHAR(32)   | 是   | 系统生成          | 回款编号，格式：PAY-YYYYMMDD-XXXX                          |
| contract_id         | BIGINT        | 是   | -                 | 合同ID，外键→contracts.id                                  |
| opportunity_id      | BIGINT        | 否   | NULL              | 商机ID                                                     |
| customer_id         | BIGINT        | 是   | -                 | 客户ID                                                     |
| owner_id            | BIGINT        | 是   | -                 | 负责人ID                                                   |
| payment_type        | VARCHAR(20)   | 是   | -                 | 类型：PLANNED/ACTUAL                                       |
| period_no           | INT           | 否   | NULL              | 期数（第几期回款）                                         |
| planned_amount      | DECIMAL(15,2) | 否   | NULL              | 计划回款金额                                               |
| actual_amount       | DECIMAL(15,2) | 否   | NULL              | 实际到账金额                                               |
| planned_date        | DATE          | 否   | NULL              | 计划回款日期                                               |
| actual_date         | DATE          | 否   | NULL              | 实际到账日期                                               |
| payment_method      | VARCHAR(30)   | 否   | NULL              | 回款方式：BANK_TRANSFER/CHECK/CASH/CREDIT_CARD/OTHER       |
| bank_transaction_no | VARCHAR(100)  | 否   | NULL              | 银行流水号                                                 |
| invoice_no          | VARCHAR(50)   | 否   | NULL              | 关联发票号                                                 |
| invoice_amount      | DECIMAL(15,2) | 否   | NULL              | 发票金额                                                   |
| is_overdue          | TINYINT       | 否   | 0                 | 是否逾期：0-否 1-是                                        |
| overdue_days        | INT           | 否   | 0                 | 逾期天数                                                   |
| status              | VARCHAR(20)   | 是   | PLANNED           | 状态：PLANNED/PENDING_CONFIRM/CONFIRMED/CANCELLED/BAD_DEBT |
| confirm_user_id     | BIGINT        | 否   | NULL              | 确认人ID（财务确认）                                       |
| confirmed_at        | DATETIME      | 否   | NULL              | 确认时间                                                   |
| remark              | TEXT          | 否   | NULL              | 备注                                                       |
| attachments         | JSON          | 否   | NULL              | 附件（回款凭证等）                                         |
| created_by          | BIGINT        | 是   | -                 | 创建人                                                     |
| created_at          | DATETIME      | 是   | CURRENT_TIMESTAMP | 创建时间                                                   |
| updated_at          | DATETIME      | 是   | CURRENT_TIMESTAMP | 更新时间                                                   |

#### 6.2.9 销售目标表（sales_targets）

| 字段名           | 类型          | 必填 | 默认值            | 说明                                               |
| ---------------- | ------------- | ---- | ----------------- | -------------------------------------------------- |
| id               | BIGINT        | 是   | 自增              | 主键ID                                             |
| target_type      | VARCHAR(20)   | 是   | -                 | 目标类型：COMPANY/TEAM/INDIVIDUAL                  |
| target_object_id | BIGINT        | 是   | -                 | 目标对象ID（公司ID/团队ID/用户ID）                 |
| period_type      | VARCHAR(10)   | 是   | -                 | 周期类型：YEARLY/QUARTERLY/MONTHLY                 |
| period_year      | INT           | 是   | -                 | 目标年份                                           |
| period_value     | INT           | 否   | NULL              | 周期值（季度:1-4，月份:1-12，年度为NULL）          |
| metric_type      | VARCHAR(30)   | 是   | -                 | 指标类型：REVENUE/ORDER_COUNT/NEW_CUSTOMER/PAYMENT |
| target_value     | DECIMAL(15,2) | 是   | -                 | 目标值                                             |
| achieved_value   | DECIMAL(15,2) | 否   | 0.00              | 已达成值                                           |
| achievement_rate | DECIMAL(5,2)  | 否   | 0.00              | 达成率(%)                                          |
| parent_target_id | BIGINT        | 否   | NULL              | 上级目标ID（用于目标分解）                         |
| status           | VARCHAR(20)   | 是   | ACTIVE            | 状态：DRAFT/ACTIVE/COMPLETED/CANCELLED             |
| remark           | TEXT          | 否   | NULL              | 备注                                               |
| created_by       | BIGINT        | 是   | -                 | 创建人                                             |
| created_at       | DATETIME      | 是   | CURRENT_TIMESTAMP | 创建时间                                           |
| updated_at       | DATETIME      | 是   | CURRENT_TIMESTAMP | 更新时间                                           |

#### 6.2.10 审批流程定义表（approval_flow_definitions）

| 字段名          | 类型         | 必填 | 默认值            | 说明                                                 |
| --------------- | ------------ | ---- | ----------------- | ---------------------------------------------------- |
| id              | BIGINT       | 是   | 自增              | 主键ID                                               |
| flow_code       | VARCHAR(50)  | 是   | -                 | 流程编码，唯一标识                                   |
| flow_name       | VARCHAR(100) | 是   | -                 | 流程名称                                             |
| biz_type        | VARCHAR(30)  | 是   | -                 | 业务类型：QUOTATION/CONTRACT/DISCOUNT/PAYMENT/REFUND |
| description     | TEXT         | 否   | NULL              | 流程描述                                             |
| condition_rules | JSON         | 否   | NULL              | 触发条件规则（如金额范围）                           |
| nodes           | JSON         | 是   | -                 | 审批节点配置（详见下方说明）                         |
| is_enabled      | TINYINT      | 是   | 1                 | 是否启用                                             |
| version         | INT          | 是   | 1                 | 版本号                                               |
| created_by      | BIGINT       | 是   | -                 | 创建人                                               |
| created_at      | DATETIME     | 是   | CURRENT_TIMESTAMP | 创建时间                                             |
| updated_at      | DATETIME     | 是   | CURRENT_TIMESTAMP | 更新时间                                             |

**nodes 字段 JSON 结构说明：**

```json
{
  "nodes": [
    {
      "node_id": "node_1",
      "node_name": "直属主管审批",
      "node_type": "APPROVAL",
      "approver_type": "ROLE",
      "approver_value": "DIRECT_MANAGER",
      "multi_approve_type": "OR",
      "timeout_hours": 48,
      "timeout_action": "AUTO_PASS",
      "conditions": {
        "amount_gte": 0,
        "amount_lt": 100000
      }
    },
    {
      "node_id": "node_2",
      "node_name": "销售总监审批",
      "node_type": "APPROVAL",
      "approver_type": "ROLE",
      "approver_value": "SALES_DIRECTOR",
      "multi_approve_type": "AND",
      "timeout_hours": 72,
      "timeout_action": "NOTIFY",
      "conditions": {
        "amount_gte": 100000
      }
    }
  ]
}
```

#### 6.2.11 审批实例表（approval_instances）

| 字段名             | 类型         | 必填 | 默认值            | 说明                                                |
| ------------------ | ------------ | ---- | ----------------- | --------------------------------------------------- |
| id                 | BIGINT       | 是   | 自增              | 主键ID                                              |
| flow_definition_id | BIGINT       | 是   | -                 | 审批流定义ID                                        |
| biz_type           | VARCHAR(30)  | 是   | -                 | 业务类型                                            |
| biz_id             | BIGINT       | 是   | -                 | 业务记录ID                                          |
| biz_no             | VARCHAR(50)  | 否   | NULL              | 业务单号                                            |
| title              | VARCHAR(200) | 是   | -                 | 审批标题                                            |
| applicant_id       | BIGINT       | 是   | -                 | 申请人ID                                            |
| current_node_id    | VARCHAR(50)  | 否   | NULL              | 当前节点ID                                          |
| status             | VARCHAR(20)  | 是   | PENDING           | 状态：PENDING/APPROVED/REJECTED/CANCELLED/WITHDRAWN |
| result_remark      | TEXT         | 否   | NULL              | 审批结果说明                                        |
| completed_at       | DATETIME     | 否   | NULL              | 完成时间                                            |
| created_at         | DATETIME     | 是   | CURRENT_TIMESTAMP | 创建时间                                            |
| updated_at         | DATETIME     | 是   | CURRENT_TIMESTAMP | 更新时间                                            |

#### 6.2.12 审批记录表（approval_records）

| 字段名           | 类型         | 必填 | 默认值            | 说明                                       |
| ---------------- | ------------ | ---- | ----------------- | ------------------------------------------ |
| id               | BIGINT       | 是   | 自增              | 主键ID                                     |
| instance_id      | BIGINT       | 是   | -                 | 审批实例ID，外键→approval_instances.id     |
| node_id          | VARCHAR(50)  | 是   | -                 | 节点ID                                     |
| node_name        | VARCHAR(100) | 是   | -                 | 节点名称                                   |
| approver_id      | BIGINT       | 是   | -                 | 审批人ID                                   |
| action           | VARCHAR(20)  | 是   | -                 | 审批动作：APPROVE/REJECT/DELEGATE/ADD_SIGN |
| opinion          | TEXT         | 否   | NULL              | 审批意见                                   |
| attachments      | JSON         | 否   | NULL              | 附件                                       |
| duration_minutes | INT          | 否   | NULL              | 审批耗时（分钟）                           |
| created_at       | DATETIME     | 是   | CURRENT_TIMESTAMP | 操作时间                                   |

#### 6.2.13 业绩排行表（performance_rankings）

| 字段名        | 类型          | 必填 | 默认值            | 说明                                                            |
| ------------- | ------------- | ---- | ----------------- | --------------------------------------------------------------- |
| id            | BIGINT        | 是   | 自增              | 主键ID                                                          |
| user_id       | BIGINT        | 是   | -                 | 用户ID                                                          |
| team_id       | BIGINT        | 否   | NULL              | 团队ID                                                          |
| period_type   | VARCHAR(10)   | 是   | -                 | 周期类型：DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY                 |
| period_key    | VARCHAR(20)   | 是   | -                 | 周期标识，如 2026-Q1、2026-03                                   |
| metric_type   | VARCHAR(30)   | 是   | -                 | 指标类型：REVENUE/ORDER_COUNT/NEW_CUSTOMER/PAYMENT/FOLLOW_COUNT |
| metric_value  | DECIMAL(15,2) | 是   | 0.00              | 指标值                                                          |
| rank_position | INT           | 否   | NULL              | 排名                                                            |
| rank_change   | INT           | 否   | 0                 | 排名变动（正为上升，负为下降）                                  |
| calculated_at | DATETIME      | 是   | -                 | 计算时间                                                        |
| created_at    | DATETIME      | 是   | CURRENT_TIMESTAMP | 创建时间                                                        |

**唯一索引：** `UNIQUE(user_id, period_type, period_key, metric_type)`

#### 6.2.14 表间关系 ER 图

```
customers (1) ──────────── (N) opportunities
                                   │
                   ┌───────────────┤
                   │               │
                   ▼               ▼
          opportunity_follow   opportunity_stage
          _logs (N)            _logs (N)

opportunities (1) ──── (N) quotations (1) ──── (N) quotation_items
                                │
                                ▼
                           products (N:M)

opportunities (1) ──── (N) contracts (1) ──── (N) contract_items
                                │
                                ├──── (N) payments
                                │
                                └──── (1) approval_instances

quotations (1) ────── (0..1) approval_instances
contracts  (1) ────── (0..1) approval_instances

approval_flow_definitions (1) ──── (N) approval_instances (1) ──── (N) approval_records

sales_targets (parent 1) ──── (N children) sales_targets

users (1) ──── (N) opportunities   [owner_id]
users (1) ──── (N) performance_rankings
teams (1) ──── (N) sales_targets
```

---

### 6.3 核心业务流程

#### 6.3.1 商机生命周期流程（状态机）

```
                              ┌──────────────────────┐
                              │      线索转化         │
                              │   /手动创建/导入      │
                              └──────────┬───────────┘
                                         │
                                         ▼
                    ┌────────────────────────────────────────┐
                    │         INITIAL_CONTACT (10%)          │
                    │            初步接触                     │
                    │  准入条件：客户+联系人+预计金额+关闭日期  │
                    └──────────┬──────────────┬──────────────┘
                               │              │
                    推进条件满足│              │ 直接丢单
                               ▼              │
                    ┌────────────────────┐    │
                    │  NEEDS_CONFIRMED   │    │
                    │  需求确认 (30%)     │    │
                    │  准入：≥1次跟进记录  │    │
                    │  +需求文档上传      │    │
                    └──────┬──────┬──────┘    │
                           │      │           │
                推进条件满足│      │回退        │
                           ▼      │           │
                    ┌─────────────┴──────┐    │
                    │ PROPOSAL_SUBMITTED │    │
                    │ 方案提报 (50%)      │    │
                    │ 准入：≥1份报价单    │    │
                    │ +方案文档上传       │    │
                    └──────┬──────┬──────┘    │
                           │      │           │
                推进条件满足│      │回退        │
                           ▼      │           │
                    ┌─────────────┴──────┐    │
                    │   NEGOTIATION      │    │
                    │   商务谈判 (70%)    │    │
                    │   准入：报价已发送   │    │
                    │   +客户反馈记录     │    │
                    └──────┬──────┬──────┘    │
                           │      │           │
                    ┌──────┘      │回退        │
                    │             │           │
              ┌─────▼─────┐      │     ┌─────▼─────┐
              │    WON     │◄────┘     │    LOST    │
              │ 赢单(100%) │           │ 丢单(0%)   │
              │ 准入：     │           │ 必填：     │
              │ ·签署合同  │           │ ·丢单原因  │
              │ ·审批通过  │           │ ·竞对信息  │
              └─────┬──────┘           └───────────┘
                    │
                    ▼
           ┌───────────────┐
           │  创建合同/回款  │
           └───────────────┘

注：任何活跃阶段均可直接转为"丢单"或"搁置"(SHELVED)
    搁置状态可重新激活回到搁置前的阶段
```

#### 6.3.2 商机阶段推进规则

| 阶段     | 阶段编码           | 默认赢率 | 准入必填项                                         | 推进条件                                    | 可回退至 |
| -------- | ------------------ | -------- | -------------------------------------------------- | ------------------------------------------- | -------- |
| 初步接触 | INITIAL_CONTACT    | 10%      | 客户名称、联系人、预计金额、预计关闭日期、商机来源 | 至少1次有效跟进；填写客户需求概要           | -        |
| 需求确认 | NEEDS_CONFIRMED    | 30%      | 需求描述文档、决策链信息（关键决策人）             | 上传需求确认文件或会议纪要；至少关联1个产品 | 初步接触 |
| 方案提报 | PROPOSAL_SUBMITTED | 50%      | 至少1份有效报价单、解决方案文档                    | 方案已发送客户；客户明确回复                | 需求确认 |
| 商务谈判 | NEGOTIATION        | 70%      | 报价状态为已发送、客户反馈记录                     | 商务条款基本达成一致；或客户明确放弃        | 方案提报 |
| 赢单     | WON                | 100%     | 合同已签署或审批通过、实际成交金额                 | -                                           | -        |
| 丢单     | LOST               | 0%       | 丢单原因（必选）、丢单说明                         | -                                           | -        |
| 搁置     | SHELVED            | 原值     | 搁置原因                                           | 可重新激活                                  | 原阶段   |

#### 6.3.3 报价 → 合同 → 回款完整业务链

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌───────────┐
│ 创建报价 │────▶│ 产品选配  │────▶│ 折扣计算  │────▶│ 生成报价单 │
└─────────┘     └──────────┘     └───────────┘     └─────┬─────┘
                                                         │
                          ┌──────────────────────────────┘
                          ▼
                   ┌──────────────┐     ┌──────────────┐
             否    │ 是否需要审批？ │────▶│ 提交折扣审批 │
            ┌──────┤  (折扣>阈值)  │     └──────┬───────┘
            │      └──────────────┘            │
            │                            ┌─────▼─────┐
            │                      审批通过│          │审批驳回
            │                            │          ├────────▶ 修改后重新提交
            ▼                            ▼          │
     ┌──────────────┐           ┌──────────────┐
     │ 发送报价给客户 │◀──────────┤  审批通过    │
     └──────┬───────┘           └──────────────┘
            │
     ┌──────▼───────┐
     │  客户确认？   │
     ├──YES──┐      ├──NO──▶ 修改报价(新版本) ──▶ 重新发送
     │       ▼      │
     │  ┌─────────┐ │
     │  │ 创建合同 │ │
     │  └────┬────┘ │
     │       ▼      │
     │  ┌──────────────┐
     │  │ 合同内容填写  │
     │  │ (从报价单导入) │
     │  └──────┬───────┘
     │         ▼
     │  ┌──────────────┐     ┌──────────────┐
     │  │ 合同审批流程  │────▶│  审批通过    │
     │  └──────────────┘     └──────┬───────┘
     │                              ▼
     │                      ┌──────────────┐
     │                      │  合同签署     │
     │                      │ 电子签/纸签   │
     │                      └──────┬───────┘
     │                             ▼
     │                      ┌──────────────┐
     │                      │  合同生效     │
     │                      │  商机赢单     │
     │                      └──────┬───────┘
     │                             ▼
     │                      ┌──────────────┐
     │                      │ 创建回款计划  │
     │                      │ (按付款条款)  │
     │                      └──────┬───────┘
     │                             ▼
     │                      ┌──────────────┐     ┌──────────┐
     │                      │ 回款到账确认  │────▶│ 开票关联 │
     │                      │ (财务操作)    │     └──────────┘
     │                      └──────┬───────┘
     │                             ▼
     │                      ┌──────────────┐
     │                      │ 全部回款完成  │
     │                      │ 合同状态完结  │
     │                      └──────┬───────┘
     │                             ▼
     │                      ┌──────────────┐
     │                      │  合同归档     │
     └──────────────────────┴──────────────┘
```

#### 6.3.4 通用审批引擎流程

```
                           ┌───────────────┐
                           │  业务单据提交  │
                           │  审批请求     │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ 匹配审批流定义 │
                           │ (按业务类型    │
                           │  +条件规则)    │
                           └───────┬───────┘
                                   │
                            ┌──────▼──────┐
                      否    │ 找到匹配流程？│    是
                   ┌────────┤             ├────────┐
                   │        └─────────────┘        │
                   ▼                               ▼
          ┌──────────────┐                ┌──────────────────┐
          │  自动通过     │                │  创建审批实例     │
          │  (无需审批)   │                │  初始化节点链     │
          └──────────────┘                └────────┬─────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │  通知当前节点     │
                                          │  审批人           │
                                          │  (站内信+推送)    │
                                          └────────┬─────────┘
                                                   │
                                            ┌──────▼──────┐
                                ┌───────────┤  审批人操作  ├───────────┐
                                │           └──────┬──────┘           │
                                │                  │                  │
                          ┌─────▼─────┐    ┌──────▼──────┐   ┌──────▼──────┐
                          │   通过    │    │    驳回     │   │   转审/加签  │
                          └─────┬─────┘    └──────┬──────┘   └──────┬──────┘
                                │                 │                  │
                         ┌──────▼──────┐          │           ┌─────▼──────┐
                         │有下一节点？  │          │           │通知新审批人│
                         ├─是──┐       │          │           └─────┬──────┘
                         │     ▼  否──▶│          │                 │
                         │  进入下一    │          │           回到审批人操作
                         │  审批节点    │          │
                         │     │       │          │
                         │     │  ┌────▼────┐     │
                         │     │  │审批完成  │     │
                         │     │  │全部通过  │     │
                         │     │  └────┬────┘     │
                         │     │       │          │
                         └──┬──┘       │     ┌────▼─────┐
                            │          │     │ 审批驳回  │
                            ▼          ▼     └────┬─────┘
                     回到通知下一       │          │
                     节点审批人         │     ┌────▼──────────┐
                                       │     │ 退回申请人     │
                                       │     │ 可修改后重新   │
                                       │     │ 提交或撤回     │
                                       │     └───────────────┘
                                       ▼
                              ┌──────────────────┐
                              │  回调业务系统     │
                              │  更新业务状态     │
                              │  (报价→已审批     │
                              │   合同→已审批)    │
                              └──────────────────┘

申请人可在审批未完成时"撤回"申请：
  ┌──────────┐      ┌──────────────┐
  │ 申请人   │─────▶│  撤回审批    │──▶ 状态回到草稿
  │ 撤回操作 │      │  终止流程    │
  └──────────┘      └──────────────┘
```

**审批引擎核心配置能力：**

| 配置项       | 说明                              | 示例                        |
| ------------ | --------------------------------- | --------------------------- |
| 审批节点类型 | 审批/抄送/条件分支                | 审批=需处理，抄送=仅通知    |
| 审批人类型   | 指定人/角色/部门主管/发起人上级   | ROLE:SALES_DIRECTOR         |
| 多人审批策略 | 或签(一人通过即可)/会签(全部通过) | OR / AND                    |
| 条件分支     | 按金额/折扣率等条件走不同分支     | amount >= 100000 走总监审批 |
| 超时处理     | 自动通过/自动通知/自动升级        | 48小时超时自动通知          |
| 驳回策略     | 退回上一节点/退回发起人           | 退回发起人重新修改          |

#### 6.3.5 销售目标分解与追踪流程

```
┌──────────────────────────────────────────────────────────────────┐
│                    年度目标设定（管理层）                          │
│              公司年度销售收入目标：¥50,000,000                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │ 按团队分解
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │  华东团队     │ │ 华北团队 │ │  华南团队     │
     │ ¥20,000,000  │ │¥15,000,000│ │ ¥15,000,000  │
     └──────┬───────┘ └────┬─────┘ └──────┬───────┘
            │ 按季度分解    │              │
    ┌───────┼───────┐      │              │
    ▼       ▼       ▼      ▼              ▼
  Q1:5M   Q2:5M   Q3:5M  ...           ...
    │       按人员分解
    ├──────────┬──────────┐
    ▼          ▼          ▼
  张三:2M   李四:1.5M   王五:1.5M
    │
    │ 月度再分解
    ├──────┬──────┐
    ▼      ▼      ▼
  1月:600K 2月:700K 3月:700K

追踪机制：
┌────────────────────────────────────────────────────┐
│  每日：自动汇总赢单金额/回款金额 → 更新达成值       │
│  每周：生成周报 → 预警达成率 < 时间进度率的目标      │
│  每月：月度复盘 → 排名通报 → 目标调整(如需)         │
│  每季：季度汇总 → 提成核算 → 下季目标滚动调整       │
└────────────────────────────────────────────────────┘
```

---

### 6.4 页面设计

#### 6.4.1 商机看板页（Kanban视图）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 商机看板                                                    [列表视图] [看板视图] │
├──────────────┬───────────────────────────────────────────────┬───────────────────┤
│ 筛选条件：    │ 负责人 [全部 ▼] │ 时间范围 [本月 ▼]          │ [+ 新建商机]     │
│              │ 客户   [全部 ▼] │ 标签     [全部 ▼]          │                  │
├──────────────┴───────────────────────────────────────────────┴──────────────────┤
│                                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│ │ 初步接触(10%)│ │需求确认(30%)│ │方案提报(50%)│ │商务谈判(70%)│ │赢单(100%) │ │
│ │  ¥1,200,000 │ │ ¥3,500,000  │ │ ¥5,800,000  │ │ ¥4,200,000  │ │¥8,600,000 │ │
│ │  8个商机     │ │  6个商机     │ │  5个商机     │ │  3个商机     │ │ 12个商机  │ │
│ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├───────────┤ │
│ │┌───────────┐│ │┌───────────┐│ │┌───────────┐│ │┌───────────┐│ │┌─────────┐│ │
│ ││ XX公司ERP │││ ││ YY集团CRM │││ ││ ZZ科技    │││ ││ AA银行    │││ ││BB公司   ││ │
│ ││ ¥500,000  │││ ││ ¥1,200,000│││ ││ ¥2,000,000│││ ││ ¥2,500,000│││ ││¥800,000 ││ │
│ ││ 张三 ○    │││ ││ 李四 ○    │││ ││ 王五 ○    │││ ││ 张三 ○    │││ ││李四 ○   ││ │
│ ││ 3天未跟进 │││ ││ 今天跟进  │││ ││ 预计1月底 │││ ││ 预计下周  │││ ││已签约   ││ │
│ │└───────────┘│ │└───────────┘│ │└───────────┘│ │└───────────┘│ │└─────────┘│ │
│ │┌───────────┐│ │┌───────────┐│ │┌───────────┐│ │             │ │┌─────────┐│ │
│ ││ CC公司    │││ ││ DD医院    │││ ││ EE学校    │││ │   ...       │ ││FF公司   ││ │
│ ││ ¥200,000  │││ ││ ¥800,000  │││ ││ ¥1,500,000│││ │             │ ││¥1,200,00││ │
│ ││ 王五 ○    │││ ││ 张三 ○    │││ ││ 李四 ○    │││ │             │ ││王五     ││ │
│ │└───────────┘│ │└───────────┘│ │└───────────┘│ │             │ │└─────────┘│ │
│ │   ...       │ │   ...       │ │   ...       │ │             │ │  ...      │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                                 │
│ 拖拽商机卡片至目标阶段即可推进（系统自动校验推进条件）                              │
└─────────────────────────────────────────────────────────────────────────────────┘

拖拽推进时弹出确认框：
┌──────────────────────────────────────┐
│  确认推进商机阶段                      │
│                                      │
│  商机：XX公司ERP项目                   │
│  从：初步接触 (10%) → 需求确认 (30%)   │
│                                      │
│  ☑ 已完成至少1次有效跟进               │
│  ☐ 已填写客户需求概要    ← 未满足     │
│                                      │
│  推进备注：___________________        │
│                                      │
│        [取消]        [确认推进]        │
└──────────────────────────────────────┘
```

#### 6.4.2 商机详情页

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← 返回列表    OPP-20260301-0012  XX公司ERP项目          [编辑] [更多操作 ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  阶段进度条：                                                                │
│  ●━━━━━━━●━━━━━━━●━━━━━━━○━━━━━━━○━━━━━━━○                                  │
│  初步接触   需求确认  方案提报   商务谈判    赢单         [推进阶段 ▼]        │
│  (已完成)   (已完成)  (当前)                                                 │
│                                                                             │
├────────────────────────────────┬────────────────────────────────────────────┤
│  基本信息                       │  关键指标                                  │
│  ─────────                      │  ────────                                  │
│  客户：XX科技有限公司  →         │  预计金额：¥2,000,000                      │
│  联系人：张经理 138****1234     │  加权金额：¥1,000,000                      │
│  负责人：王五                    │  赢率：50% (AI预测：62%)                   │
│  团队：华东销售一组              │  预计成交日：2026-03-31                    │
│  来源：线索转化                  │  停留天数：12天                            │
│  优先级：★★★ 高                 │  跟进次数：8次                             │
│  标签：[ERP] [大客户]           │  最近跟进：2026-03-01                      │
│                                 │  下次跟进：2026-03-05                      │
├────────────────────────────────┴────────────────────────────────────────────┤
│                                                                             │
│  [跟进记录] [报价单] [合同] [回款] [关联产品] [竞争对手] [附件] [操作日志]    │
│  ─────────                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  + 新增跟进记录                                                     │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  2026-03-01 14:30  王五  [电话]                                     │    │
│  │  与张经理沟通了方案细节，客户对报价基本认可，需要补充实施计划。           │    │
│  │  下次跟进：2026-03-05                                               │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  2026-02-25 10:00  王五  [拜访]                                     │    │
│  │  携带方案PPT至客户现场演示，客户技术团队反馈良好，需求吻合度高。        │    │
│  │  附件：方案演示PPT.pdf                                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  ...更多记录...                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  AI智能建议面板：                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🤖 AI分析建议（基于历史相似商机）                                    │    │
│  │  · 当前阶段停留已超过平均周期(8天)，建议加快推进                       │    │
│  │  · 建议在下次沟通中明确客户预算审批流程                               │    │
│  │  · 同类型项目赢率参考：成功关键因素为高管支持度                        │    │
│  │  · 推荐关联产品：XX模块，历史加购率72%                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.3 销售漏斗可视化页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 销售漏斗分析                              时间范围 [2026年Q1 ▼]  [导出报表]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │              ╔═══════════════════════════════╗           │  漏斗指标      │
│  │              ║     初步接触：56个  ¥12.8M    ║           │                │
│  │              ╚═══════════════╤═══════════════╝           │  总商机：56    │
│  │                  ╔═══════════╧═══════════╗               │  总金额：¥12.8M│
│  │                  ║  需求确认：38个 ¥9.2M  ║               │                │
│  │                  ╚═══════════╤═══════════╝               │  转化率：      │
│  │                      ╔══════╧══════╗                     │  接触→确认:68% │
│  │                      ║方案提报:25个║                      │  确认→提报:66% │
│  │                      ║   ¥6.5M    ║                      │  提报→谈判:60% │
│  │                      ╚══════╤═════╝                      │  谈判→赢单:53% │
│  │                        ╔════╧════╗                       │                │
│  │                        ║商务谈判 ║                       │  整体赢率:     │
│  │                        ║15个¥4.2M║                       │  14.3%         │
│  │                        ╚════╤════╝                       │                │
│  │                          ╔══╧══╗                         │  平均周期:     │
│  │                          ║赢单 ║                         │  45天          │
│  │                          ║8个  ║                         │                │
│  │                          ║¥2.1M║                         │  加权管道值:   │
│  │                          ╚═════╝                         │  ¥5,860,000   │
│  └─────────────────────────────────────────────────────────┘                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 阶段转化详情                                                                │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────────────┐ │
│ │ 阶段      │ 商机数   │ 总金额   │ 转化数   │ 转化率   │ 平均停留天数     │ │
│ ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤ │
│ │ 初步接触  │    56    │ ¥12.8M  │    38    │  67.9%  │      5.2         │ │
│ │ 需求确认  │    38    │  ¥9.2M  │    25    │  65.8%  │      8.7         │ │
│ │ 方案提报  │    25    │  ¥6.5M  │    15    │  60.0%  │     12.3         │ │
│ │ 商务谈判  │    15    │  ¥4.2M  │     8    │  53.3%  │     15.6         │ │
│ │ 赢单      │     8    │  ¥2.1M  │     -    │    -    │       -          │ │
│ │ 丢单      │    18    │  ¥4.3M  │     -    │    -    │       -          │ │
│ └──────────┴──────────┴──────────┴──────────┴──────────┴──────────────────┘ │
│                                                                             │
│ 趋势对比（与上一周期）                                                       │
│  商机数：56 (↑12%)  金额：¥12.8M (↑8%)  赢率：14.3% (↓2.1%)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.4 合同管理页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 合同管理                                                    [+ 新建合同]    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [全部] [待审批(5)] [待签署(3)] [执行中(28)] [已完成(45)] [已终止(2)]        │
├──────────────────────────────────────────────────────────────────────────────┤
│ 搜索：[________________] 客户 [全部▼] 负责人 [全部▼] 签署日期 [____~____]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌────────┬────────────┬──────────┬───────────┬──────────┬────────┬────────┐ │
│ │ 合同号  │ 合同名称    │ 客户      │ 合同金额   │ 已回款    │ 状态   │ 操作   │ │
│ ├────────┼────────────┼──────────┼───────────┼──────────┼────────┼────────┤ │
│ │CON-0312│XX公司ERP合同│XX科技     │¥2,000,000│¥800,000  │执行中  │[详情]  │ │
│ │CON-0305│YY集团CRM   │YY集团     │¥1,200,000│¥1,200,000│已完成  │[详情]  │ │
│ │CON-0301│ZZ服务合同   │ZZ科技     │  ¥500,000│    ¥0    │待签署  │[详情]  │ │
│ │CON-0228│AA银行项目   │AA银行     │¥2,500,000│    -     │待审批  │[催审]  │ │
│ └────────┴────────────┴──────────┴───────────┴──────────┴────────┴────────┘ │
│                                                                             │
│ 合同统计卡片：                                                               │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐ │
│ │ 本月新签    │ │ 执行中合同 │ │ 本月到期   │ │ 待回款金额  │ │ 30天内到期    │ │
│ │ 12份       │ │ 28份      │ │ 3份       │ │ ¥8,500,000 │ │ 5份 需续约    │ │
│ │ ¥5,600,000 │ │¥18,200,000│ │ ¥1,200,000│ │            │ │               │ │
│ └───────────┘ └───────────┘ └───────────┘ └────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.5 回款管理页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 回款管理                                                   [+ 新增回款计划] │
├─────────────────────────────────────────────────────────────────────────────┤
│ [回款计划] [到账确认] [逾期提醒] [回款统计]                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 回款概览卡片：                                                               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ 本月计划回款   │ │ 本月实际回款  │ │ 逾期未回款    │ │ 回款完成率    │       │
│ │ ¥3,200,000   │ │ ¥2,800,000   │ │ ¥450,000     │ │ 87.5%        │       │
│ │              │ │ ↑15% vs上月  │ │ 3笔          │ │ ████████░░   │       │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                                             │
│ 回款计划列表：                                                               │
│ ┌────────┬──────────┬──────────┬──────────┬──────────┬────────┬──────────┐ │
│ │ 回款号  │ 合同/客户 │ 计划金额  │ 计划日期  │ 实际到账  │ 状态   │ 操作     │ │
│ ├────────┼──────────┼──────────┼──────────┼──────────┼────────┼──────────┤ │
│ │PAY-0015│CON-0312  │¥400,000  │03-15     │    -     │待回款  │[确认到账]│ │
│ │        │XX科技 2/5│          │          │          │        │          │ │
│ │PAY-0012│CON-0228  │¥200,000  │02-28     │    -     │⚠逾期3天│[催款]   │ │
│ │        │AA银行 1/4│          │          │          │        │          │ │
│ │PAY-0010│CON-0305  │¥600,000  │02-20     │¥600,000  │已确认  │[查看]   │ │
│ │        │YY集团 2/2│          │          │02-19到账 │        │          │ │
│ └────────┴──────────┴──────────┴──────────┴──────────┴────────┴──────────┘ │
│                                                                             │
│ 逾期提醒：                                                                  │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ ⚠ AA银行项目第1期回款逾期3天，计划¥200,000，负责人：张三  [一键催款]   │   │
│ │ ⚠ CC公司合同第3期回款逾期1天，计划¥150,000，负责人：王五  [一键催款]   │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.6 销售目标与业绩看板

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 销售目标与业绩                     周期 [2026年Q1 ▼]  维度 [团队 ▼] [个人▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 公司目标总览：                                                               │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │  年度目标：¥50,000,000    Q1目标：¥12,000,000                         │   │
│ │  Q1已达成：¥8,200,000     达成率：68.3%     时间进度：66.7%           │   │
│ │  ████████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░   │   │
│ │  预测达成：¥12,300,000 (102.5%) - 基于当前趋势和管道商机               │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ 团队目标排行：                                                               │
│ ┌────────────┬───────────┬───────────┬──────────┬──────────┬──────────┐    │
│ │ 排名        │ 团队       │ Q1目标    │ 已达成    │ 达成率   │ 进度条   │    │
│ ├────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤    │
│ │ 1 (↑1)     │ 华东团队   │ ¥5,000,000│¥3,800,000│  76.0%  │ ████████ │    │
│ │ 2 (↓1)     │ 华北团队   │ ¥4,000,000│¥2,600,000│  65.0%  │ ██████░░ │    │
│ │ 3 (-)      │ 华南团队   │ ¥3,000,000│¥1,800,000│  60.0%  │ ██████░░ │    │
│ └────────────┴───────────┴───────────┴──────────┴──────────┴──────────┘    │
│                                                                             │
│ 个人业绩排行榜（TOP 10）：                                                   │
│ ┌────┬──────┬──────────┬───────────┬──────────┬──────────┬───────────────┐ │
│ │排名│ 姓名  │ 团队      │ 签单金额   │ 回款金额  │ 新客户数 │ 本月较上月    │ │
│ ├────┼──────┼──────────┼───────────┼──────────┼──────────┼───────────────┤ │
│ │ 1  │ 张三  │ 华东团队  │ ¥1,500,000│¥1,200,000│    5    │ ↑ ¥300,000   │ │
│ │ 2  │ 李四  │ 华东团队  │ ¥1,200,000│  ¥900,000│    3    │ ↑ ¥200,000   │ │
│ │ 3  │ 王五  │ 华北团队  │ ¥1,100,000│  ¥800,000│    4    │ ↓ ¥100,000   │ │
│ │... │ ...  │ ...      │ ...       │ ...      │  ...    │ ...          │ │
│ └────┴──────┴──────────┴───────────┴──────────┴──────────┴───────────────┘ │
│                                                                             │
│ 月度趋势图(柱状图+折线图)：                                                  │
│  ¥                                                                          │
│  5M│            ╔══╗                                                        │
│  4M│    ╔══╗    ║  ║                                                        │
│  3M│    ║  ║    ║  ║    ╔══╗                                                │
│  2M│    ║  ║    ║  ║    ║  ║         目标 ─── 实际 ━━━                       │
│  1M│    ║  ║    ║  ║    ║  ║                                                │
│    └────╨──╨────╨──╨────╨──╨────                                            │
│         1月      2月      3月(进行中)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.7 审批中心页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 审批中心                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [待我审批(5)] [我已审批(23)] [我发起的(12)] [抄送我的(8)]                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 类型筛选：[全部▼] [报价审批] [合同审批] [折扣审批]  状态：[全部▼]            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 待我审批：                                                                  │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │  📋 【合同审批】AA银行项目销售合同                                      │   │
│ │  申请人：张三  │  合同金额：¥2,500,000  │  提交时间：2026-03-02 14:30  │   │
│ │  当前节点：销售总监审批（第2/3步）                                      │   │
│ │  ┌──────────────────────────────────────┐                             │   │
│ │  │ 审批历程：                            │                             │   │
│ │  │ ✔ 直属主管(李四) 2026-03-02 15:00    │                             │   │
│ │  │   意见：同意，客户资质良好            │                             │   │
│ │  │ → 销售总监(当前)  待审批              │                             │   │
│ │  │ ○ 法务审核  待前序完成                │                             │   │
│ │  └──────────────────────────────────────┘                             │   │
│ │                                                                       │   │
│ │  审批意见：[__________________________________]                        │   │
│ │                                                                       │   │
│ │  [通过]  [驳回]  [转审]  [查看详情]                                    │   │
│ ├───────────────────────────────────────────────────────────────────────┤   │
│ │  📋 【折扣审批】XX公司ERP报价单 - 折扣率15%                            │   │
│ │  申请人：王五  │  报价金额：¥2,000,000  │  折扣：15%                   │   │
│ │  提交时间：2026-03-01 10:00  │  已等待：2天                            │   │
│ │                                                                       │   │
│ │  [通过]  [驳回]  [转审]  [查看详情]                                    │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ 审批统计：                                                                  │
│  本月审批：23件  平均审批时长：4.2小时  超时率：8.7%                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.5 接口设计

#### 6.5.1 完整API列表

##### 商机管理接口

| 序号 | 路径                                     | 方法   | 说明                             |
| ---- | ---------------------------------------- | ------ | -------------------------------- |
| 1    | /api/v1/opportunities                    | POST   | 创建商机                         |
| 2    | /api/v1/opportunities                    | GET    | 商机列表查询（分页、筛选、排序） |
| 3    | /api/v1/opportunities/{id}               | GET    | 获取商机详情                     |
| 4    | /api/v1/opportunities/{id}               | PUT    | 更新商机信息                     |
| 5    | /api/v1/opportunities/{id}               | DELETE | 删除商机（逻辑删除）             |
| 6    | /api/v1/opportunities/{id}/stage         | PUT    | 推进/回退商机阶段                |
| 7    | /api/v1/opportunities/{id}/follow-logs   | POST   | 新增跟进记录                     |
| 8    | /api/v1/opportunities/{id}/follow-logs   | GET    | 获取跟进记录列表                 |
| 9    | /api/v1/opportunities/{id}/transfer      | POST   | 转让商机负责人                   |
| 10   | /api/v1/opportunities/{id}/close         | POST   | 赢单/丢单关闭商机                |
| 11   | /api/v1/opportunities/{id}/reactivate    | POST   | 重新激活搁置商机                 |
| 12   | /api/v1/opportunities/kanban             | GET    | 获取看板数据（按阶段分组）       |
| 13   | /api/v1/opportunities/{id}/ai-suggestion | GET    | 获取AI智能建议                   |

##### 销售漏斗接口

| 序号 | 路径                            | 方法 | 说明                       |
| ---- | ------------------------------- | ---- | -------------------------- |
| 14   | /api/v1/funnel/overview         | GET  | 获取漏斗概览数据           |
| 15   | /api/v1/funnel/conversion-rates | GET  | 获取各阶段转化率           |
| 16   | /api/v1/funnel/trend            | GET  | 获取漏斗趋势（按时间周期） |
| 17   | /api/v1/funnel/forecast         | GET  | 获取销售预测数据           |

##### 报价管理接口

| 序号 | 路径                                     | 方法 | 说明                 |
| ---- | ---------------------------------------- | ---- | -------------------- |
| 18   | /api/v1/quotations                       | POST | 创建报价单           |
| 19   | /api/v1/quotations                       | GET  | 报价单列表查询       |
| 20   | /api/v1/quotations/{id}                  | GET  | 获取报价单详情       |
| 21   | /api/v1/quotations/{id}                  | PUT  | 更新报价单           |
| 22   | /api/v1/quotations/{id}/items            | PUT  | 更新报价明细项       |
| 23   | /api/v1/quotations/{id}/submit-approval  | POST | 提交报价审批         |
| 24   | /api/v1/quotations/{id}/send             | POST | 发送报价给客户       |
| 25   | /api/v1/quotations/{id}/clone            | POST | 复制生成新版本报价单 |
| 26   | /api/v1/quotations/{id}/export-pdf       | GET  | 导出报价单PDF        |
| 27   | /api/v1/quotations/{id}/convert-contract | POST | 报价单转合同         |

##### 合同管理接口

| 序号 | 路径                                   | 方法 | 说明                 |
| ---- | -------------------------------------- | ---- | -------------------- |
| 28   | /api/v1/contracts                      | POST | 创建合同             |
| 29   | /api/v1/contracts                      | GET  | 合同列表查询         |
| 30   | /api/v1/contracts/{id}                 | GET  | 获取合同详情         |
| 31   | /api/v1/contracts/{id}                 | PUT  | 更新合同信息         |
| 32   | /api/v1/contracts/{id}/submit-approval | POST | 提交合同审批         |
| 33   | /api/v1/contracts/{id}/sign            | POST | 合同签署确认         |
| 34   | /api/v1/contracts/{id}/archive         | POST | 合同归档             |
| 35   | /api/v1/contracts/{id}/terminate       | POST | 合同终止             |
| 36   | /api/v1/contracts/{id}/export-pdf      | GET  | 导出合同PDF          |
| 37   | /api/v1/contracts/expiring             | GET  | 获取即将到期合同列表 |

##### 回款管理接口

| 序号 | 路径                          | 方法 | 说明                 |
| ---- | ----------------------------- | ---- | -------------------- |
| 38   | /api/v1/payments              | POST | 创建回款计划         |
| 39   | /api/v1/payments              | GET  | 回款列表查询         |
| 40   | /api/v1/payments/{id}         | GET  | 获取回款详情         |
| 41   | /api/v1/payments/{id}         | PUT  | 更新回款信息         |
| 42   | /api/v1/payments/{id}/confirm | POST | 确认到账（财务操作） |
| 43   | /api/v1/payments/{id}/remind  | POST | 发送催款提醒         |
| 44   | /api/v1/payments/overdue      | GET  | 获取逾期回款列表     |
| 45   | /api/v1/payments/statistics   | GET  | 回款统计数据         |

##### 销售目标接口

| 序号 | 路径                                 | 方法 | 说明                   |
| ---- | ------------------------------------ | ---- | ---------------------- |
| 46   | /api/v1/sales-targets                | POST | 创建销售目标           |
| 47   | /api/v1/sales-targets                | GET  | 目标列表查询           |
| 48   | /api/v1/sales-targets/{id}           | GET  | 获取目标详情           |
| 49   | /api/v1/sales-targets/{id}           | PUT  | 更新目标               |
| 50   | /api/v1/sales-targets/{id}/decompose | POST | 目标分解（拆分子目标） |
| 51   | /api/v1/sales-targets/achievement    | GET  | 获取目标达成情况       |
| 52   | /api/v1/sales-targets/forecast       | GET  | 目标预测达成数据       |

##### 业绩排行接口

| 序号 | 路径                   | 方法 | 说明             |
| ---- | ---------------------- | ---- | ---------------- |
| 53   | /api/v1/rankings/sales | GET  | 获取销售排行榜   |
| 54   | /api/v1/rankings/team  | GET  | 获取团队排行榜   |
| 55   | /api/v1/rankings/trend | GET  | 获取排名趋势变化 |

##### 审批流程接口

| 序号 | 路径                                     | 方法 | 说明                             |
| ---- | ---------------------------------------- | ---- | -------------------------------- |
| 56   | /api/v1/approval-flows                   | POST | 创建审批流定义                   |
| 57   | /api/v1/approval-flows                   | GET  | 审批流定义列表                   |
| 58   | /api/v1/approval-flows/{id}              | GET  | 获取审批流详情                   |
| 59   | /api/v1/approval-flows/{id}              | PUT  | 更新审批流定义                   |
| 60   | /api/v1/approval-instances               | POST | 发起审批                         |
| 61   | /api/v1/approval-instances               | GET  | 审批实例列表（待审/已审/我发起） |
| 62   | /api/v1/approval-instances/{id}          | GET  | 获取审批实例详情                 |
| 63   | /api/v1/approval-instances/{id}/approve  | POST | 审批通过                         |
| 64   | /api/v1/approval-instances/{id}/reject   | POST | 审批驳回                         |
| 65   | /api/v1/approval-instances/{id}/withdraw | POST | 撤回审批                         |
| 66   | /api/v1/approval-instances/{id}/delegate | POST | 转审                             |

#### 6.5.2 关键接口请求/响应示例

##### 接口1：创建商机

**请求：** `POST /api/v1/opportunities`

```json
{
  "title": "XX科技ERP系统项目",
  "customer_id": 10086,
  "contact_id": 20012,
  "source": "LEAD_CONVERT",
  "lead_id": 5001,
  "expected_amount": 2000000.0,
  "currency": "CNY",
  "expected_close_date": "2026-06-30",
  "priority": "HIGH",
  "description": "客户计划上线ERP系统，替换现有的用友系统，预算约200万",
  "product_ids": [101, 102, 105],
  "tags": ["ERP", "大客户", "制造业"],
  "custom_fields": {
    "industry": "制造业",
    "company_size": "500-1000人"
  }
}
```

**响应：** `201 Created`

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": 30056,
    "opportunity_no": "OPP-20260303-0056",
    "title": "XX科技ERP系统项目",
    "customer_id": 10086,
    "customer_name": "XX科技有限公司",
    "contact_id": 20012,
    "contact_name": "张经理",
    "owner_id": 1001,
    "owner_name": "王五",
    "team_id": 5,
    "team_name": "华东销售一组",
    "source": "LEAD_CONVERT",
    "lead_id": 5001,
    "stage": "INITIAL_CONTACT",
    "stage_name": "初步接触",
    "probability": 10,
    "expected_amount": 2000000.0,
    "weighted_amount": 200000.0,
    "currency": "CNY",
    "expected_close_date": "2026-06-30",
    "priority": "HIGH",
    "status": 1,
    "follow_count": 0,
    "product_ids": [101, 102, 105],
    "tags": ["ERP", "大客户", "制造业"],
    "created_at": "2026-03-03T10:30:00+08:00"
  }
}
```

##### 接口2：推进商机阶段

**请求：** `PUT /api/v1/opportunities/{id}/stage`

```json
{
  "target_stage": "NEEDS_CONFIRMED",
  "remark": "已完成首次客户拜访，客户明确了ERP上线需求，需求文档已整理",
  "checklist": {
    "has_follow_log": true,
    "has_requirement_summary": true
  }
}
```

**响应：** `200 OK`

```json
{
  "code": 0,
  "message": "阶段推进成功",
  "data": {
    "id": 30056,
    "opportunity_no": "OPP-20260303-0056",
    "previous_stage": "INITIAL_CONTACT",
    "current_stage": "NEEDS_CONFIRMED",
    "previous_probability": 10,
    "current_probability": 30,
    "weighted_amount": 600000.0,
    "stage_changed_at": "2026-03-05T14:00:00+08:00",
    "stage_log": {
      "id": 88001,
      "from_stage": "INITIAL_CONTACT",
      "to_stage": "NEEDS_CONFIRMED",
      "duration_days": 2,
      "remark": "已完成首次客户拜访，客户明确了ERP上线需求，需求文档已整理"
    }
  }
}
```

##### 接口3：创建报价单

**请求：** `POST /api/v1/quotations`

```json
{
  "title": "XX科技ERP系统报价单",
  "opportunity_id": 30056,
  "customer_id": 10086,
  "contact_id": 20012,
  "valid_until": "2026-04-30",
  "payment_terms": "合同签署后支付30%，系统上线后支付50%，验收通过后支付20%",
  "items": [
    {
      "product_id": 101,
      "product_name": "ERP基础平台",
      "quantity": 1,
      "unit_price": 800000.0,
      "list_price": 800000.0,
      "discount_rate": 0,
      "remark": "含基础模块：财务、采购、库存"
    },
    {
      "product_id": 102,
      "product_name": "生产制造模块",
      "quantity": 1,
      "unit_price": 500000.0,
      "list_price": 600000.0,
      "discount_rate": 16.67,
      "remark": "含MES对接接口"
    },
    {
      "product_id": 105,
      "product_name": "实施服务费",
      "quantity": 120,
      "unit": "人天",
      "unit_price": 3000.0,
      "list_price": 3500.0,
      "discount_rate": 14.29,
      "remark": "预估120人天"
    }
  ],
  "discount_type": "PERCENT",
  "discount_value": 5,
  "tax_rate": 6.0,
  "remark": "特别说明：含一年免费运维支持"
}
```

**响应：** `201 Created`

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": 15023,
    "quotation_no": "QUO-20260310-0023",
    "title": "XX科技ERP系统报价单",
    "version": 1,
    "opportunity_id": 30056,
    "customer_id": 10086,
    "subtotal": 1660000.0,
    "discount_type": "PERCENT",
    "discount_value": 5,
    "discount_amount": 83000.0,
    "tax_rate": 6.0,
    "tax_amount": 94620.0,
    "total_amount": 1671620.0,
    "valid_until": "2026-04-30",
    "status": "DRAFT",
    "items": [
      {
        "product_id": 101,
        "product_name": "ERP基础平台",
        "quantity": 1,
        "unit_price": 800000.0,
        "list_price": 800000.0,
        "discount_rate": 0,
        "line_amount": 800000.0
      },
      {
        "product_id": 102,
        "product_name": "生产制造模块",
        "quantity": 1,
        "unit_price": 500000.0,
        "list_price": 600000.0,
        "discount_rate": 16.67,
        "line_amount": 500000.0
      },
      {
        "product_id": 105,
        "product_name": "实施服务费",
        "quantity": 120,
        "unit": "人天",
        "unit_price": 3000.0,
        "list_price": 3500.0,
        "discount_rate": 14.29,
        "line_amount": 360000.0
      }
    ],
    "created_at": "2026-03-10T09:30:00+08:00"
  }
}
```

##### 接口4：确认回款到账

**请求：** `POST /api/v1/payments/{id}/confirm`

```json
{
  "actual_amount": 600000.0,
  "actual_date": "2026-03-15",
  "payment_method": "BANK_TRANSFER",
  "bank_transaction_no": "BOC2026031500123456",
  "invoice_no": "INV-20260310-0088",
  "invoice_amount": 600000.0,
  "remark": "客户已按合同约定支付首期款项",
  "attachments": [
    {
      "name": "银行回单.pdf",
      "url": "/files/payments/bank_receipt_20260315.pdf"
    }
  ]
}
```

**响应：** `200 OK`

```json
{
  "code": 0,
  "message": "到账确认成功",
  "data": {
    "id": 8801,
    "payment_no": "PAY-20260315-0015",
    "contract_id": 7001,
    "contract_no": "CON-20260312-0012",
    "period_no": 1,
    "planned_amount": 600000.0,
    "actual_amount": 600000.0,
    "actual_date": "2026-03-15",
    "payment_method": "BANK_TRANSFER",
    "bank_transaction_no": "BOC2026031500123456",
    "status": "CONFIRMED",
    "confirm_user_id": 2001,
    "confirm_user_name": "财务李",
    "confirmed_at": "2026-03-15T16:30:00+08:00",
    "contract_summary": {
      "total_amount": 2000000.0,
      "paid_amount": 600000.0,
      "unpaid_amount": 1400000.0,
      "payment_progress": "30.00%"
    }
  }
}
```

##### 接口5：发起审批

**请求：** `POST /api/v1/approval-instances`

```json
{
  "flow_code": "CONTRACT_APPROVAL",
  "biz_type": "CONTRACT",
  "biz_id": 7001,
  "biz_no": "CON-20260312-0012",
  "title": "【合同审批】XX科技ERP系统销售合同 - ¥2,000,000",
  "form_data": {
    "contract_no": "CON-20260312-0012",
    "customer_name": "XX科技有限公司",
    "total_amount": 2000000.0,
    "contract_type": "SALES",
    "start_date": "2026-04-01",
    "end_date": "2027-03-31"
  }
}
```

**响应：** `201 Created`

```json
{
  "code": 0,
  "message": "审批发起成功",
  "data": {
    "id": 44012,
    "flow_definition_id": 3,
    "flow_name": "销售合同审批流程",
    "biz_type": "CONTRACT",
    "biz_id": 7001,
    "biz_no": "CON-20260312-0012",
    "title": "【合同审批】XX科技ERP系统销售合同 - ¥2,000,000",
    "applicant_id": 1001,
    "applicant_name": "王五",
    "current_node_id": "node_1",
    "current_node_name": "直属主管审批",
    "status": "PENDING",
    "nodes_summary": [
      {
        "node_id": "node_1",
        "node_name": "直属主管审批",
        "status": "PENDING",
        "approvers": [{ "id": 1002, "name": "李四" }]
      },
      {
        "node_id": "node_2",
        "node_name": "销售总监审批",
        "status": "WAITING",
        "approvers": [{ "id": 1010, "name": "赵总" }]
      },
      {
        "node_id": "node_3",
        "node_name": "法务审核",
        "status": "WAITING",
        "approvers": [{ "id": 2005, "name": "法务陈" }]
      }
    ],
    "created_at": "2026-03-12T11:00:00+08:00"
  }
}
```

##### 接口6：获取销售漏斗概览

**请求：** `GET /api/v1/funnel/overview?period=2026-Q1&team_id=5`

**响应：** `200 OK`

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "period": "2026-Q1",
    "team_id": 5,
    "team_name": "华东销售一组",
    "stages": [
      {
        "stage": "INITIAL_CONTACT",
        "stage_name": "初步接触",
        "count": 56,
        "total_amount": 12800000.0,
        "weighted_amount": 1280000.0,
        "avg_days": 5.2,
        "conversion_count": 38,
        "conversion_rate": 67.86
      },
      {
        "stage": "NEEDS_CONFIRMED",
        "stage_name": "需求确认",
        "count": 38,
        "total_amount": 9200000.0,
        "weighted_amount": 2760000.0,
        "avg_days": 8.7,
        "conversion_count": 25,
        "conversion_rate": 65.79
      },
      {
        "stage": "PROPOSAL_SUBMITTED",
        "stage_name": "方案提报",
        "count": 25,
        "total_amount": 6500000.0,
        "weighted_amount": 3250000.0,
        "avg_days": 12.3,
        "conversion_count": 15,
        "conversion_rate": 60.0
      },
      {
        "stage": "NEGOTIATION",
        "stage_name": "商务谈判",
        "count": 15,
        "total_amount": 4200000.0,
        "weighted_amount": 2940000.0,
        "avg_days": 15.6,
        "conversion_count": 8,
        "conversion_rate": 53.33
      },
      {
        "stage": "WON",
        "stage_name": "赢单",
        "count": 8,
        "total_amount": 2100000.0,
        "weighted_amount": 2100000.0,
        "avg_days": null,
        "conversion_count": null,
        "conversion_rate": null
      }
    ],
    "summary": {
      "total_opportunities": 56,
      "total_pipeline_value": 12800000.0,
      "weighted_pipeline_value": 5860000.0,
      "overall_win_rate": 14.29,
      "avg_deal_cycle_days": 45,
      "avg_deal_size": 262500.0,
      "lost_count": 18,
      "lost_amount": 4300000.0
    },
    "comparison": {
      "vs_previous_period": {
        "opportunity_count_change": 12.0,
        "amount_change": 8.0,
        "win_rate_change": -2.1
      }
    }
  }
}
```

##### 接口7：获取销售排行榜

**请求：** `GET /api/v1/rankings/sales?period_type=MONTHLY&period_key=2026-03&metric_type=REVENUE&limit=10`

**响应：** `200 OK`

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "period_type": "MONTHLY",
    "period_key": "2026-03",
    "metric_type": "REVENUE",
    "metric_name": "签单金额",
    "rankings": [
      {
        "rank_position": 1,
        "rank_change": 2,
        "user_id": 1001,
        "user_name": "张三",
        "avatar_url": "/avatars/1001.jpg",
        "team_name": "华东销售一组",
        "metric_value": 1500000.0,
        "target_value": 2000000.0,
        "achievement_rate": 75.0,
        "secondary_metrics": {
          "payment_amount": 1200000.0,
          "new_customer_count": 5,
          "opportunity_count": 12
        }
      },
      {
        "rank_position": 2,
        "rank_change": 0,
        "user_id": 1003,
        "user_name": "李四",
        "avatar_url": "/avatars/1003.jpg",
        "team_name": "华东销售一组",
        "metric_value": 1200000.0,
        "target_value": 1500000.0,
        "achievement_rate": 80.0,
        "secondary_metrics": {
          "payment_amount": 900000.0,
          "new_customer_count": 3,
          "opportunity_count": 8
        }
      },
      {
        "rank_position": 3,
        "rank_change": -1,
        "user_id": 1005,
        "user_name": "王五",
        "avatar_url": "/avatars/1005.jpg",
        "team_name": "华北销售组",
        "metric_value": 1100000.0,
        "target_value": 1500000.0,
        "achievement_rate": 73.33,
        "secondary_metrics": {
          "payment_amount": 800000.0,
          "new_customer_count": 4,
          "opportunity_count": 10
        }
      }
    ],
    "my_ranking": {
      "rank_position": 5,
      "metric_value": 800000.0,
      "achievement_rate": 53.33
    },
    "updated_at": "2026-03-03T08:00:00+08:00"
  }
}
```

---

### 6.6 业务规则

#### 6.6.1 商机阶段推进规则详细表

| 规则编号 | 目标阶段                           | 准入条件                                   | 必填字段               | 校验逻辑                                            | 失败提示                                 |
| -------- | ---------------------------------- | ------------------------------------------ | ---------------------- | --------------------------------------------------- | ---------------------------------------- |
| SR-001   | INITIAL_CONTACT→NEEDS_CONFIRMED    | 至少1条跟进记录                            | 需求概要               | follow_count >= 1 且 opportunity.description 不为空 | "请先添加至少一条跟进记录并填写需求概要" |
| SR-002   | NEEDS_CONFIRMED→PROPOSAL_SUBMITTED | 关联至少1个产品，至少1份报价单（任意状态） | 方案附件               | product_ids 不为空 且 quotations.count >= 1         | "请先关联产品并创建报价单"               |
| SR-003   | PROPOSAL_SUBMITTED→NEGOTIATION     | 至少1份报价单已发送给客户                  | 客户反馈记录           | 存在 quotation.status = 'SENT'                      | "请先将报价单发送给客户"                 |
| SR-004   | NEGOTIATION→WON                    | 合同已签署或审批通过                       | 实际成交金额、成交日期 | 存在关联 contract.status IN ('SIGNED','EXECUTING')  | "请先完成合同签署"                       |
| SR-005   | 任意→LOST                          | 无                                         | 丢单原因、丢单说明     | close_reason 不为空 且 close_remark 不为空          | "请填写丢单原因和详细说明"               |
| SR-006   | 任意→SHELVED                       | 无                                         | 搁置原因               | close_remark 不为空                                 | "请填写搁置原因"                         |
| SR-007   | SHELVED→原阶段                     | 无                                         | 激活说明               | 记录重新激活原因                                    | -                                        |
| SR-008   | 阶段回退                           | 仅允许回退至前一阶段                       | 回退原因               | to_stage 为 from_stage 的前一阶段                   | "只允许回退至上一阶段"                   |

**阶段推进权限控制：**

| 操作           | 权限要求                  |
| -------------- | ------------------------- |
| 推进至下一阶段 | 商机负责人或其上级        |
| 回退至上一阶段 | 商机负责人或销售经理      |
| 直接赢单       | 商机负责人 + 合同审批通过 |
| 标记丢单       | 商机负责人或销售经理      |
| 搁置/重新激活  | 商机负责人或销售经理      |
| 转让商机       | 销售经理或管理员          |

#### 6.6.2 赢单/丢单规则

**赢单规则：**

| 规则编号 | 规则内容                                 | 说明                                        |
| -------- | ---------------------------------------- | ------------------------------------------- |
| WIN-001  | 必须存在至少一份签署状态的合同           | contract.status IN ('SIGNED', 'EXECUTING')  |
| WIN-002  | 合同金额必须大于0                        | contract.total_amount > 0                   |
| WIN-003  | 实际成交金额自动取签署合同总金额         | actual_amount = SUM(contracts.total_amount) |
| WIN-004  | 赢单后自动生成回款计划（按合同付款条款） | 系统自动创建 payment 记录（PLANNED 类型）   |
| WIN-005  | 赢单后自动更新销售目标达成值             | 触发 sales_targets.achieved_value 增加      |
| WIN-006  | 赢单后自动更新业绩排行榜                 | 触发排行榜实时重计算                        |
| WIN-007  | 赢单后商机不可再编辑（仅可查看）         | status 设为 2(赢单)，锁定编辑               |

**丢单规则：**

| 规则编号 | 规则内容                                   | 说明                                                                                                            |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| LOST-001 | 丢单原因必须从预定义分类中选择             | PRICE(价格)/PRODUCT(产品功能)/COMPETITOR(竞争对手)/BUDGET(客户预算)/TIMING(时机)/RELATIONSHIP(关系)/OTHER(其他) |
| LOST-002 | 丢单时若选择竞争对手原因，必须填写竞对信息 | competitor_ids 不可为空                                                                                         |
| LOST-003 | 丢单后相关报价单自动标记为已取消           | quotation.status → CANCELLED                                                                                    |
| LOST-004 | 丢单后相关草稿合同自动标记为已取消         | contract.status = 'DRAFT' → CANCELLED                                                                           |
| LOST-005 | 丢单后30天内可由销售经理重新激活           | 超过30天需管理员操作                                                                                            |
| LOST-006 | 丢单商机自动进入公海池（可配置是否启用）   | 按系统配置决定                                                                                                  |

#### 6.6.3 金额计算规则

**报价单金额计算：**

```
行项金额计算：
  line_amount = quantity × unit_price × (1 - discount_rate / 100)

小计金额：
  subtotal = SUM(所有行项的 line_amount)

整单折扣金额：
  若 discount_type = 'PERCENT':
    discount_amount = subtotal × discount_value / 100
  若 discount_type = 'FIXED':
    discount_amount = discount_value

折后金额：
  net_amount = subtotal - discount_amount

税额计算：
  tax_amount = net_amount × tax_rate / 100

总金额（含税）：
  total_amount = net_amount + tax_amount

公式汇总：
  total_amount = (subtotal - discount_amount) × (1 + tax_rate / 100)
```

**折扣率计算（与标准价对比）：**

```
行项折扣率：
  actual_discount_rate = (1 - unit_price / list_price) × 100

整单折扣率（加权）：
  overall_discount_rate = (1 - total_amount(不含税) / SUM(quantity × list_price)) × 100
```

**回款金额规则：**

```
合同回款进度：
  paid_amount = SUM(所有已确认回款的 actual_amount)
  unpaid_amount = contract.total_amount - paid_amount
  payment_progress = paid_amount / contract.total_amount × 100%

回款超付校验：
  每次确认回款时校验：paid_amount + current_payment <= contract.total_amount × 1.05
  (允许5%的超付误差，超出部分需审批确认)
```

#### 6.6.4 销售预测算法说明

**基础预测模型（加权管道法）：**

```
预测收入 = Σ (商机预计金额 × 阶段赢率)

各阶段赢率：
  INITIAL_CONTACT  : 10%
  NEEDS_CONFIRMED  : 30%
  PROPOSAL_SUBMITTED: 50%
  NEGOTIATION       : 70%
  WON              : 100%

示例计算：
  管道中商机A(初步接触, ¥100万) + 商机B(方案提报, ¥200万) + 商机C(商务谈判, ¥150万)
  预测收入 = 100万×10% + 200万×50% + 150万×70% = 10万 + 100万 + 105万 = ¥215万
```

**AI增强预测模型：**

```
AI预测综合考虑以下因素（机器学习模型）：

输入特征：
  1. 商机基础特征
     - 预计金额
     - 产品类型
     - 客户行业
     - 客户规模
     - 商机来源

  2. 行为特征
     - 当前阶段停留天数
     - 阶段推进速度（vs 平均值）
     - 跟进频率
     - 跟进方式分布（拜访占比越高，赢率越高）
     - 关键决策人参与度

  3. 历史特征
     - 同客户历史成交率
     - 同类产品历史赢率
     - 同销售人员历史赢率
     - 同行业历史赢率

  4. 竞争特征
     - 是否有竞争对手
     - 竞对数量
     - 对主要竞对的历史赢率

输出：
  ai_win_rate: 0-100 的预测赢率
  confidence: 预测置信度（HIGH/MEDIUM/LOW）
  key_factors: 影响赢率的关键因素列表

预测更新频率：
  - 阶段变更时实时更新
  - 每次跟进后实时更新
  - 每天凌晨批量更新所有活跃商机
```

**目标预测达成模型：**

```
预测达成值 = 已达成值 + 预测增量

预测增量 = Σ(管道内商机的 AI预测赢率 × 预计金额 × 时间衰减因子)

时间衰减因子：
  若 expected_close_date 在目标周期内: factor = 1.0
  若 expected_close_date 超出目标周期 30 天内: factor = 0.3
  其他: factor = 0

预测达成率 = 预测达成值 / 目标值 × 100%

预警规则：
  当 预测达成率 < 时间进度率 × 0.8 时，触发红色预警
  当 预测达成率 < 时间进度率 × 1.0 时，触发黄色预警
  当 预测达成率 >= 时间进度率 × 1.0 时，绿色正常

时间进度率 = 当前周期已过天数 / 周期总天数 × 100%
```

#### 6.6.5 提成计算规则

**提成基础规则：**

| 规则编号 | 规则内容     | 计算方式                                                                                                                                                                |
| -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| COMM-001 | 提成基数     | 以合同回款金额（不含税）为计算基数                                                                                                                                      |
| COMM-002 | 基础提成比例 | 按产品线设定不同比例（见下表）                                                                                                                                          |
| COMM-003 | 超额累进     | 完成率100%-120%部分，提成比例×1.5倍                                                                                                                                     |
| COMM-004 | 超额累进     | 完成率120%以上部分，提成比例×2.0倍                                                                                                                                      |
| COMM-005 | 新客户加成   | 新客户首单提成比例额外+1%                                                                                                                                               |
| COMM-006 | 大单加成     | 单笔合同 >= 100万，提成比例额外+0.5%                                                                                                                                    |
| COMM-007 | 提成确认时点 | 回款到账并API Error: Claude's response exceeded the 32000 output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable. |

确认后计算提成 |
| COMM-008 | 提成发放周期 | 按月汇总，次月15日前发放 |

**产品线提成比例：**

| 产品线       | 基础提成比例    | 说明                 |
| ------------ | --------------- | -------------------- |
| 标准软件产品 | 8%              | 含ERP、CRM等标准产品 |
| 定制开发     | 5%              | 定制化开发项目       |
| 实施服务     | 6%              | 项目实施与部署       |
| SaaS订阅     | 首年10%，续费5% | 订阅制产品           |
| 硬件设备     | 3%              | 配套硬件             |
| 运维服务     | 4%              | 年度运维服务         |

**提成计算公式：**

```
单笔提成 = 回款金额(不含税) × 提成比例 × 系数调整

系数调整规则：
  1. 目标完成率系数
     完成率 < 60%    : 系数 = 0.6 (降低激励)
     完成率 60%-80%  : 系数 = 0.8
     完成率 80%-100% : 系数 = 1.0
     完成率 100%-120%: 系数 = 1.5 (超额激励)
     完成率 > 120%   : 系数 = 2.0 (大幅激励)

  2. 新客户加成
     is_new_customer = true: 提成比例 += 1%

  3. 大单加成
     contract.total_amount >= 1,000,000: 提成比例 += 0.5%

示例计算：
  销售张三本月回款 ¥600,000(不含税)，产品线为标准软件，
  本月目标完成率为 110%，为新客户首单，合同金额 ¥1,200,000

  基础比例 = 8%
  新客户加成 = +1% → 9%
  大单加成 = +0.5% → 9.5%
  完成率系数 = 1.5 (超额100%-120%区间)

  提成 = 600,000 × 9.5% × 1.5 = ¥85,500
```

**团队管理者提成规则：**

| 角色     | 提成来源                       | 比例                            |
| -------- | ------------------------------ | ------------------------------- |
| 销售经理 | 个人直接签单 + 团队总业绩      | 个人按正常比例 + 团队总提成的3% |
| 销售总监 | 所辖全部团队业绩               | 全部团队总提成的1.5%            |
| 协助签单 | 协助他人签单（需登记协助关系） | 按协助比例分配，总提成不变      |

#### 6.6.6 审批权限配置规则

**审批流触发规则：**

| 业务场景             | 触发条件                          | 审批流编码               | 说明                   |
| -------------------- | --------------------------------- | ------------------------ | ---------------------- |
| 报价折扣审批         | 整单折扣率 > 10%                  | DISCOUNT_APPROVAL        | 折扣超过权限范围需审批 |
| 报价折扣审批（高级） | 整单折扣率 > 20%                  | DISCOUNT_APPROVAL_HIGH   | 高折扣增加总经理审批   |
| 合同审批（小额）     | 合同金额 < ¥500,000               | CONTRACT_APPROVAL_SMALL  | 两级审批               |
| 合同审批（中额）     | ¥500,000 <= 合同金额 < ¥2,000,000 | CONTRACT_APPROVAL_MEDIUM | 三级审批               |
| 合同审批（大额）     | 合同金额 >= ¥2,000,000            | CONTRACT_APPROVAL_LARGE  | 四级审批含总经理       |
| 回款确认             | 所有回款到账                      | PAYMENT_CONFIRM          | 财务确认流程           |
| 坏账申请             | 申请标记坏账                      | BAD_DEBT_APPROVAL        | 需财务总监+总经理      |
| 合同终止             | 申请终止合同                      | CONTRACT_TERMINATE       | 需法务+销售总监        |

**各审批流节点配置：**

**折扣审批流（DISCOUNT_APPROVAL）：**

```
折扣率 10%-20%:
  节点1: 直属销售经理 (或签, 超时48h自动提醒)

折扣率 > 20%:
  节点1: 直属销售经理 (或签, 超时48h自动提醒)
  节点2: 销售总监 (或签, 超时48h自动提醒)
  节点3: 总经理 (或签, 超时72h自动提醒)
```

**合同审批流（CONTRACT_APPROVAL_LARGE，以大额为例）：**

```
节点1: 直属销售经理    (或签, 超时24h提醒)
节点2: 销售总监        (或签, 超时48h提醒)
节点3: 法务审核        (或签, 超时48h提醒)
节点4: 总经理          (或签, 超时72h提醒)
抄送:  财务总监 (节点4通过后抄送)
```

**审批权限矩阵：**

| 角色       | 报价折扣审批   | 合同审批       | 回款确认       | 坏账审批       | 合同终止       |
| ---------- | -------------- | -------------- | -------------- | -------------- | -------------- |
| 销售专员   | 发起           | 发起           | 发起           | 发起           | 发起           |
| 销售经理   | 审批(<=20%)    | 审批(<=200万)  | -              | -              | -              |
| 销售总监   | 审批(>20%)     | 审批(全部)     | -              | -              | 审批           |
| 财务专员   | -              | -              | 审批           | 发起           | -              |
| 财务总监   | -              | 抄送           | 审批           | 审批           | -              |
| 法务       | -              | 审批(>=50万)   | -              | -              | 审批           |
| 总经理     | 审批(>20%)     | 审批(>=200万)  | -              | 审批           | 审批           |
| 系统管理员 | 配置所有审批流 | 配置所有审批流 | 配置所有审批流 | 配置所有审批流 | 配置所有审批流 |

**审批超时处理规则：**

| 超时时长            | 处理动作                          | 说明         |
| ------------------- | --------------------------------- | ------------ |
| 达到设定时长的50%   | 站内消息提醒审批人                | 首次温和提醒 |
| 达到设定时长的80%   | 站内消息 + 短信提醒审批人         | 紧急提醒     |
| 达到设定时长的100%  | 通知审批人上级 + 记录超时         | 升级处理     |
| 超时后继续未处理24h | 根据配置：自动通过/自动升级至上级 | 防止流程阻塞 |

**审批撤回与驳回规则：**

| 操作           | 条件                             | 处理逻辑                                 |
| -------------- | -------------------------------- | ---------------------------------------- |
| 申请人撤回     | 当前审批节点尚未有人操作"通过"   | 审批实例状态→WITHDRAWN，业务单据回到草稿 |
| 审批人驳回     | 审批人操作驳回并填写驳回原因     | 审批实例状态→REJECTED，通知申请人        |
| 驳回后重新提交 | 申请人修改业务单据后             | 创建新的审批实例（保留原实例记录）       |
| 转审           | 审批人将当前节点转给其他人审批   | 记录转审日志，新审批人收到通知           |
| 加签           | 审批人增加一位额外审批人（会签） | 当前节点变为会签模式，需全部通过         |

---

以上即为销售流程管理模块的完整详细设计，涵盖功能架构、数据模型（含12张核心数据表及完整字段定义）、核心业务流程（含商机生命周期状态机、完整业务链、审批引擎、目标追踪）、7个核心页面设计、66个API接口（含7个关键接口的完整请求/响应示例），以及全量业务规则（阶段推进规则、赢单/丢单规则、金额计算规则、销售预测算法、提成计算规则、审批权限配置规则）。
