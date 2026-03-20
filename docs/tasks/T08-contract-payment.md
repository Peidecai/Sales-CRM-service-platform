# T08 — 合同与回款 开发任务

## 任务概述

- **目标**: 增强合同模块(模板/电子签章/到期提醒/续签)、增强回款(逾期预警/统计)、新建贷后管理模块
- **优先级**: P2
- **依赖模块**: contract, payment, quotation, approval, customer, notification

## 现有模块

| 模块          | 路径                            | 状态                         |
| ------------- | ------------------------------- | ---------------------------- |
| Contract      | `server/src/modules/contract/`  | 已有（CRUD+10态流转+审批）   |
| Payment       | `server/src/modules/payment/`   | 已有（CRUD+5态+回款方式）    |
| Quotation     | `server/src/modules/quotation/` | 已有（CRUD+8态+审批+转合同） |
| Approval      | `server/src/modules/approval/`  | 已有（多级审批流）           |
| Contract 视图 | `web/src/views/contract/`       | 已有                         |
| Payment 视图  | `web/src/views/payment/`        | 已有                         |

## 子任务清单

### 后端任务

| #   | 标题                | 涉及文件                                                          | 依赖   | 验收标准                                                                                                                 |
| --- | ------------------- | ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| B1  | 合同模板 CRUD       | `server/src/modules/contract/contract-template.service.ts` (新建) | —      | ContractTemplate entity (name, content, category, variables[], isDefault) + Service + Controller                         |
| B2  | 从模板创建合同      | `server/src/modules/contract/contract.service.ts` 增强            | B1     | createFromTemplate(templateId, variables): 渲染模板变量生成合同内容                                                      |
| B3  | 合同到期提醒        | `server/src/modules/contract/contract.service.ts` 增强            | —      | Cron job @Cron('0 9 \* \* \*'): 查找 endDate - 30天/7天/1天 的合同，发通知                                               |
| B4  | 合同续签            | `server/src/modules/contract/contract.service.ts` 增强            | —      | renew(contractId, newEndDate, newAmount): 创建关联续签合同 + 原合同标记 RENEWED                                          |
| B5  | 电子签章(预留)      | —                                                                 | —      | 预留接口 POST /contracts/:id/sign，返回 501 "功能开发中"(依赖第三方服务)                                                 |
| B6  | 即将到期合同列表    | `server/src/modules/contract/contract.controller.ts`              | B3     | GET /contracts/expiring?days=30: 到期合同列表                                                                            |
| B7  | 逾期回款预警        | `server/src/modules/payment/payment.service.ts` 增强              | —      | Cron job: 查找 dueDate < now AND status != CONFIRMED 的回款，发通知                                                      |
| B8  | 逾期回款列表        | `server/src/modules/payment/payment.controller.ts`                | B7     | GET /payments/overdue: 逾期回款分页列表                                                                                  |
| B9  | 回款统计            | `server/src/modules/payment/payment.service.ts` 增强              | —      | getStatistics(filter): 按人/部门/客户统计回款金额/回款率/逾期率                                                          |
| B10 | PostLoan Module     | `server/src/modules/post-loan/` (新建)                            | —      | Entity(contractId, customerId, loanAmount, status, repaymentPlan[]) + Service(CRUD+逾期管理+提醒+统计+评级) + Controller |
| B11 | Controller 端点汇总 | 各 controller                                                     | B1-B10 | 见功能文档接口表共 9 个新端点                                                                                            |

### 前端任务

| #   | 标题              | 涉及文件                                                   | 依赖  | 验收标准                                                               |
| --- | ----------------- | ---------------------------------------------------------- | ----- | ---------------------------------------------------------------------- |
| F1  | Contract API 增强 | `web/src/api/contract.ts` 增强                             | B11   | getTemplates, createFromTemplate, renew, getExpiring                   |
| F2  | Payment API 增强  | `web/src/api/payment.ts` 增强                              | B11   | getOverdue, getStatistics                                              |
| F3  | 合同模板管理页    | `web/src/views/contract/templates/index.vue` (新建)        | F1    | 模板列表+创建/编辑(富文本+变量插入)+预览                               |
| F4  | 从模板新建合同    | `web/src/views/contract/components/CreateFromTemplate.vue` | F1    | 选择模板 → 填写变量 → 预览 → 创建                                      |
| F5  | 合同到期预警面板  | `web/src/views/contract/components/ExpiringPanel.vue`      | F1    | 到期合同列表(30天/7天/已到期分组) + 续签操作                           |
| F6  | 合同续签对话框    | `web/src/views/contract/components/RenewDialog.vue`        | F1    | 原合同信息 + 新结束日期 + 新金额 → 确认续签                            |
| F7  | 逾期回款页面      | `web/src/views/payment/overdue/index.vue` (新建)           | F2    | 逾期列表+逾期天数+催收状态+操作(发提醒/标坏账)                         |
| F8  | 回款统计页面      | `web/src/views/payment/statistics/index.vue` (新建)        | F2    | 回款金额趋势+回款率+逾期率图表                                         |
| F9  | 贷后管理页面      | `web/src/views/post-loan/index.vue` (新建)                 | B10   | 贷后列表+还款计划+逾期管理+统计面板                                    |
| F10 | 路由 + 菜单       | `web/src/router/index.ts`                                  | F3-F9 | /contract/templates, /payment/overdue, /payment/statistics, /post-loan |

### 数据库迁移

| #   | 文件                                      | DDL                                                                                                                                                                                                        |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `1709000083000-CreateContractTemplate.ts` | `contract_template` 表: id, name, content(longtext), category, variables(json), isDefault(boolean), createdBy(FK), createdAt, updatedAt, deletedAt                                                         |
| M2  | `1709000084000-AddContractRenewFields.ts` | contract 表加 `original_contract_id` (self FK nullable), `renewed_at` datetime                                                                                                                             |
| M3  | `1709000085000-CreatePostLoanTables.ts`   | `post_loan` 表: id, contractId(FK), customerId(FK), loanAmount, disbursedAt, status(enum), creditRating; `repayment_plan` 表: id, postLoanId(FK), period(int), dueDate, amount, paidAmount, paidAt, status |

### 测试任务

| #   | 标题                    | 文件                                                     | 验收标准                             |
| --- | ----------------------- | -------------------------------------------------------- | ------------------------------------ |
| T1  | ContractTemplateService | `server/test/contract/contract-template.service.spec.ts` | ≥10 tests (CRUD+模板渲染)            |
| T2  | 合同续签+到期           | `server/test/contract/contract-renew.spec.ts`            | ≥8 tests                             |
| T3  | Payment 逾期+统计       | `server/test/payment/payment-overdue.spec.ts`            | ≥10 tests                            |
| T4  | PostLoanService         | `server/test/post-loan/post-loan.service.spec.ts`        | ≥15 tests (CRUD+逾期+提醒+统计+评级) |
| T5  | E2E — 合同模板          | `e2e/contract-template.spec.ts`                          | 模板列表+从模板创建合同              |

## 边界与约束

- **Scope 外**: 真实电子签章集成（预留接口，返回 501）；发票管理
- **安全**: 合同模板管理仅 Admin；坏账核销仅 Admin；贷后数据对 SALES 限本人
- **性能**: 逾期 Cron 批量通知使用 Bull 队列避免阻塞；回款统计缓存 15min
- **模块接口**: PostLoanModule 导入 ContractModule + CustomerModule + NotificationModule

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
- **模板引擎**: 合同模板变量使用 `{{variable}}` 格式，简单 string.replace 渲染
- **通知**: 到期/逾期提醒通过 NotificationModule 发送(WebSocket + 持久化)
- **缓存**: 回款统计 key `payment:stats:{filter_hash}` TTL 15min

## Claude Code 提示词

### B1-B2: 合同模板

```
在 packages/server/src/modules/contract/ 新增模板功能：
1. 新建 entities/contract-template.entity.ts:
   - name, content(longtext), category(varchar), variables(simple-json: [{name, label, type, required}]), isDefault(boolean), createdBy(ManyToOne User)
   - 继承 BaseEntity
2. 新建 contract-template.service.ts:
   - findAll(分页+分类筛选), create, update, delete
   - renderTemplate(templateId, variableValues: Record<string,string>): 读取模板 content，替换 {{var}} 占位符
3. 修改 contract.service.ts 新增 createFromTemplate(templateId, variables, contractData, user):
   - 调用 renderTemplate 生成 content
   - 创建合同记录
4. 在 contract.controller.ts 新增 GET/POST/PUT/DELETE /contracts/templates, POST /contracts/from-template
```

### B3-B4+B6: 到期提醒 + 续签

```
增强 packages/server/src/modules/contract/contract.service.ts：
1. @Cron('0 9 * * *') checkExpiring():
   - 查找 endDate BETWEEN NOW() AND NOW()+30天 的 ACTIVE 合同
   - 按剩余天数分组(30天/7天/1天)
   - 通过 NotificationModule 发送到期提醒给合同负责人
2. getExpiring(days=30, page, pageSize): 即将到期合同分页列表
3. renew(contractId, newEndDate, newAmount, user):
   - 校验原合同状态为 ACTIVE/COMPLETED
   - 创建新合同: originalContractId=contractId, 其余字段复制
   - 更新原合同: status=RENEWED, renewedAt=now
   - 写审计日志
在 controller 新增 GET /contracts/expiring, POST /contracts/:id/renew
```

### B10: 贷后管理模块

```
新建 packages/server/src/modules/post-loan/ 模块：
1. entities/post-loan.entity.ts: contractId(ManyToOne Contract), customerId(ManyToOne Customer), loanAmount(decimal), disbursedAt(datetime), status(PostLoanStatus: NORMAL/OVERDUE/SETTLED/BAD_DEBT), creditRating(varchar)
2. entities/repayment-plan.entity.ts: postLoanId(ManyToOne PostLoan), period(int), dueDate, amount(decimal), paidAmount(decimal default 0), paidAt(datetime nullable), status(PENDING/PAID/OVERDUE/PARTIAL)
3. post-loan.service.ts:
   - create(contractId, loanAmount, repaymentCount, user): 创建贷后记录 + 自动生成还款计划
   - findAll(分页+状态筛选), findOne, update
   - getOverdueList(page, pageSize): 逾期记录
   - confirmRepayment(planId, paidAmount): 确认还款
   - sendReminder(postLoanId): 还款提醒(dueDate-3天)
   - getStatistics(filter): 放款总额/还款总额/逾期率/坏账率
   - updateCreditRating(postLoanId): 根据还款行为更新信用评级
4. post-loan.controller.ts: 路由前缀 /api/v1/post-loan
5. post-loan.module.ts: 导入 ContractModule, CustomerModule, NotificationModule, UserModule
注册到 AppModule。
```
