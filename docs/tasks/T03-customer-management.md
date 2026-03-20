# T03 — 客户管理 开发任务

## 任务概述

- **目标**: 增强客户模块，新增360视图、批量操作、AI商务提醒、重复客户检测、客户分组、手机号脱敏
- **优先级**: P1
- **依赖模块**: customer, contact, follow-up, customer-tag, opportunity, contract, payment, call-record, ai, audit-log

## 现有模块

| 模块          | 路径                               | 状态                                         |
| ------------- | ---------------------------------- | -------------------------------------------- |
| Customer      | `server/src/modules/customer/`     | 已有（CRUD+软删除+数据所有权+状态流转+缓存） |
| Contact       | `server/src/modules/contact/`      | 已有                                         |
| FollowUp      | `server/src/modules/follow-up/`    | 已有（含 AI 提醒基础）                       |
| CustomerTag   | `server/src/modules/customer-tag/` | 已有                                         |
| Customer 视图 | `web/src/views/customer/`          | 已有（列表+详情页）                          |

## 子任务清单

### 后端任务

| #   | 标题                | 涉及文件                                                             | 依赖  | 验收标准                                                                                      |
| --- | ------------------- | -------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| B1  | 客户360视图聚合接口 | `server/src/modules/customer/customer.service.ts`                    | —     | get360View(id): 聚合基本信息+商机+通话+跟进+合同+回款+操作日志                                |
| B2  | AI 客户画像接口     | `server/src/modules/customer/customer-ai.service.ts` (新建)          | —     | getAiProfile(customerId): 调用 AiService 生成客户画像(行业特征+意向判断+推荐策略)             |
| B3  | 操作时间线接口      | `server/src/modules/customer/customer.service.ts`                    | —     | getTimeline(customerId): 从 audit_log 按 entityId 查询操作记录                                |
| B4  | 批量操作 Service    | `server/src/modules/customer/customer-batch.service.ts` (新建)       | —     | batchTransfer, batchToPool, batchToBlacklist, batchAbandon, batchAssign, batchTag             |
| B5  | 批量操作 Controller | `server/src/modules/customer/customer.controller.ts`                 | B4    | 6 个 POST /customers/batch/\* 端点                                                            |
| B6  | 客户分组 CRUD       | `server/src/modules/customer-group/` (新建)                          | —     | CustomerGroup Entity + Service + Controller, GET/POST/PUT/DELETE /customers/groups            |
| B7  | AI 商务提醒 Service | `server/src/modules/follow-up/follow-up-ai-reminder.service.ts` 增强 | —     | 签约促成提醒 + 回款到期提醒 + 客户流失预警 + 生日/纪念日提醒                                  |
| B8  | 重复客户检测        | `server/src/modules/customer/customer-duplicate.service.ts` (新建)   | —     | checkDuplicate(phone/companyName), getDuplicateList(分页), mergeCustomers(sourceId, targetId) |
| B9  | 手机号脱敏          | `server/src/common/interceptors/` 或 customer.service.ts             | —     | 列表接口默认脱敏(138\*\*\*\*1234)，详情接口需权限才返回完整号码                               |
| B10 | Controller 端点汇总 | `server/src/modules/customer/customer.controller.ts`                 | B1-B9 | /customers/:id/360, /:id/ai-profile, /:id/timeline, /duplicates, /duplicates/merge            |

### 前端任务

| #   | 标题               | 涉及文件                                                | 依赖 | 验收标准                                                             |
| --- | ------------------ | ------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| F1  | 客户 API 增强      | `web/src/api/customer.ts`                               | B10  | 新增 get360View, getAiProfile, getTimeline, batchTransfer 等         |
| F2  | 客户360视图页面    | `web/src/views/customer/detail.vue` 增强                | F1   | 9 个 Tab: 基本信息/商机/通话/跟进/合同/回款/AI分析/微信记录/操作日志 |
| F3  | AI 分析 Tab 组件   | `web/src/views/customer/components/AiProfileTab.vue`    | F1   | 客户画像卡片+意向雷达图+推荐策略列表                                 |
| F4  | 操作日志 Tab 组件  | `web/src/views/customer/components/TimelineTab.vue`     | F1   | el-timeline 展示操作记录                                             |
| F5  | 批量操作工具栏     | `web/src/views/customer/components/BatchToolbar.vue`    | F1   | 选中行后显示: 转公海/转让/废弃/黑名单/分配/打标签                    |
| F6  | 重复客户检测对话框 | `web/src/views/customer/components/DuplicateDialog.vue` | F1   | 创建客户时自动检测+手动查看重复列表+合并操作                         |
| F7  | 客户分组侧边栏     | `web/src/views/customer/components/GroupSidebar.vue`    | F1   | 左侧分组树+右侧列表联动                                              |
| F8  | 手机号脱敏显示     | `web/src/views/customer/`                               | —    | 列表默认脱敏，点击「查看」按钮请求完整号码(有权限时)                 |

### 数据库迁移

| #   | 文件                                        | DDL                                                                                                   |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| M1  | `1709000073000-CreateCustomerGroup.ts`      | `customer_group` 表: id, name, description, parentId(自引用), userId, createdAt, updatedAt, deletedAt |
| M2  | `1709000074000-AddCustomerGroupRelation.ts` | customer 表加 `group_id` 外键                                                                         |
| M3  | `1709000075000-AddContactBirthday.ts`       | contact 表加 `birthday` 列 (nullable date)                                                            |

### 测试任务

| #   | 标题                     | 文件                                                               | 验收标准                                 |
| --- | ------------------------ | ------------------------------------------------------------------ | ---------------------------------------- |
| T1  | CustomerBatchService     | `server/test/customer/customer-batch.service.spec.ts`              | ≥18 tests (6个批量操作×正常+权限+空列表) |
| T2  | CustomerDuplicateService | `server/test/customer/customer-duplicate.service.spec.ts`          | ≥10 tests                                |
| T3  | Customer360 聚合         | `server/test/customer/customer-360.spec.ts`                        | ≥8 tests                                 |
| T4  | AI 商务提醒增强          | `server/test/follow-up/follow-up-ai-reminder.service.spec.ts` 增强 | 新增 ≥8 tests (4种提醒)                  |
| T5  | E2E — 客户详情360视图    | `e2e/customer-360.spec.ts`                                         | Tab切换+数据渲染                         |

## 边界与约束

- **Scope 外**: 微信记录分析（依赖第三方接口，预留 Tab 即可）、贷后服务（行业特定，暂不实现）
- **安全**: 合并客户仅 Admin；手机号完整查看需 `phone:view` 权限
- **性能**: 360视图接口并行聚合各模块数据，总响应 <1s；重复检测用数据库索引+模糊匹配
- **模块接口**: CustomerBatchService 调用 CustomerPoolService、BlacklistService(T02)

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
- **缓存**: 360视图不缓存(实时性要求高)；AI画像缓存 30min key `customer:ai-profile:{id}`
- **脱敏**: 使用通用工具函数 `maskPhone(phone: string): string`，放在 `@crm/shared`

## Claude Code 提示词

### B1+B3: 360视图 + 时间线

```
增强 packages/server/src/modules/customer/customer.service.ts：
1. 新增 get360View(customerId, user): 并行查询并返回 { basic, opportunities, callRecords, followUps, contracts, payments, auditLogs }
   - 使用 Promise.all 并行查询各模块
   - SALES 角色校验所有权
2. 新增 getTimeline(customerId, page, pageSize): 从 audit_log 表查 entityType='customer' AND entityId=customerId，按时间倒序分页
3. 在 customer.controller.ts 新增 GET /:id/360 和 GET /:id/timeline
```

### B4-B5: 批量操作

```
新建 packages/server/src/modules/customer/customer-batch.service.ts：
1. batchTransfer(customerIds[], targetUserId, currentUser): 校验权限(Manager+) → 批量更新 salesId
2. batchToPool(customerIds[], currentUser): 批量释放到公海 → 设 salesId=null, status=IN_POOL
3. batchToBlacklist(customerIds[], reason, currentUser): 调用 BlacklistService.batchAdd
4. batchAbandon(customerIds[], reason, currentUser): 批量标记废弃
5. batchAssign(customerIds[], targetUserId, currentUser): Admin 重新分配
6. batchTag(customerIds[], tagIds[], action:'add'|'remove', currentUser): 批量添加/移除标签
每个操作限制单次 ≤200 条，写审计日志。
在 customer.controller.ts 新增 6 个 POST /customers/batch/* 端点。
```

### B8: 重复客户检测

```
新建 packages/server/src/modules/customer/customer-duplicate.service.ts：
1. checkDuplicate(phone?, companyName?): 按手机号精确匹配 + 企业名 LIKE 模糊匹配，返回疑似重复列表
2. getDuplicateList(page, pageSize): 全量扫描返回所有重复组(按手机号分组)
3. mergeCustomers(sourceId, targetId, user): 将 source 的关联数据(商机/通话/跟进/联系人)转移到 target，软删除 source
   - 仅 Admin 可操作
   - 事务内执行
在 customer.controller.ts 新增 GET /duplicates, POST /duplicates/merge
```

### F2-F4: 360视图前端

```
增强 packages/web/src/views/customer/detail.vue（或拆分为子组件）：
1. 使用 el-tabs 展示 9 个 Tab，懒加载各 Tab 内容
2. 新建 components/AiProfileTab.vue: 调用 getAiProfile API，展示客户画像卡片(el-card) + ECharts 雷达图(意向维度)
3. 新建 components/TimelineTab.vue: 调用 getTimeline API，使用 el-timeline 展示操作记录
4. 合同Tab/回款Tab: 调用已有 contract/payment API 展示列表
5. 微信记录Tab: 预留空状态 "功能开发中"
Tab 切换不刷新已加载数据，使用 keep-alive。
```
