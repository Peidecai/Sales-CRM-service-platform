# T02 — 线索管理 开发任务

## 任务概述

- **目标**: 增强线索模块，新增海量分配、公海池增强、黑名单、废弃站、重复检测、智能标签
- **优先级**: P1
- **依赖模块**: prospect, customer-pool, customer-tag, ai

## 现有模块

| 模块              | 路径                                | 状态                                                            |
| ----------------- | ----------------------------------- | --------------------------------------------------------------- |
| Prospect          | `server/src/modules/prospect/`      | 已有（天眼查/企查查API、数据源、搜索模板、筛选配置、导入/转化） |
| CustomerPool      | `server/src/modules/customer-pool/` | 已有（公海池基础）                                              |
| CustomerTag       | `server/src/modules/customer-tag/`  | 已有                                                            |
| Prospect 视图     | `web/src/views/prospect/`           | 已有                                                            |
| CustomerPool 视图 | `web/src/views/customer-pool/`      | 无独立视图                                                      |

## 子任务清单

### 后端任务

| #   | 标题                                  | 涉及文件                                                                                       | 依赖   | 验收标准                                                                                       |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| B1  | LeadDistribution Entity + 枚举        | `shared/src/types/lead.ts`, `server/src/modules/prospect/entities/lead-distribution.entity.ts` | —      | LeadDistributionMode, BlacklistReason, AbandonReason 枚举                                      |
| B2  | 海量分配 Service                      | `server/src/modules/prospect/prospect-distribution.service.ts`                                 | B1     | distribute(mode, leadIds, targetUserIds, weights?)，支持 round_robin/weighted/manual           |
| B3  | 分配规则 CRUD                         | 同上                                                                                           | B2     | getDistributionRules / updateDistributionRules                                                 |
| B4  | 分配记录 Entity + 日志                | `server/src/modules/prospect/entities/distribution-log.entity.ts`                              | B1     | 记录每次分配：线索ID、分配人、被分配人、时间                                                   |
| B5  | 公海池增强 — 自动回收                 | `server/src/modules/customer-pool/customer-pool.service.ts`                                    | —      | Cron job: N天未跟进自动回收到公海，回收规则可配置                                              |
| B6  | 公海池增强 — 批量领取/转让            | 同上                                                                                           | B5     | batchClaim(userId, leadIds), transfer(leadId, targetUserId), batchTransfer                     |
| B7  | 公海池 — 领取上限                     | 同上                                                                                           | B5     | 每人每日领取上限配置 + 校验                                                                    |
| B8  | Blacklist Module                      | `server/src/modules/blacklist/` (新建)                                                         | —      | Entity(phone, reason, remark, operator) + Service(CRUD, batchAdd, checkBlacklist) + Controller |
| B9  | 导入时黑名单过滤                      | `server/src/modules/prospect/prospect-import.service.ts`                                       | B8     | 导入线索时自动跳过黑名单号码                                                                   |
| B10 | 废弃站增强                            | `server/src/modules/prospect/prospect.service.ts`                                              | —      | abandon(id, reason), restore(id), permanentDelete(id, Admin), 废弃原因分类统计                 |
| B11 | 重复检测 Service                      | `server/src/modules/prospect/prospect-duplicate.service.ts`                                    | —      | checkDuplicate(phone/companyName) — 按手机号+企业名模糊匹配                                    |
| B12 | 智能标签(AI)                          | `server/src/modules/ai/` 增强                                                                  | —      | analyzeLeadTags(prospect): 行业/规模/意向自动打标                                              |
| B13 | 分配/公海/黑名单/废弃 Controller 端点 | `server/src/modules/prospect/prospect.controller.ts` 等                                        | B2-B11 | 见功能文档接口表                                                                               |

### 前端任务

| #   | 标题           | 涉及文件                                                 | 依赖  | 验收标准                                                         |
| --- | -------------- | -------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| F1  | 线索分配 API   | `web/src/api/lead.ts`                                    | B13   | distribute, getDistributionRules, updateDistributionRules        |
| F2  | 海量分配对话框 | `web/src/views/prospect/components/DistributeDialog.vue` | F1    | 选择分配模式+目标销售+线索列表，支持 round_robin/weighted/manual |
| F3  | 公海池页面     | `web/src/views/customer-pool/index.vue` (新建/增强)      | F1    | 公海列表+领取+批量领取+转让+回收规则配置(Admin)                  |
| F4  | 黑名单页面     | `web/src/views/blacklist/index.vue` (新建)               | F1    | 黑名单列表+搜索+添加+批量添加+移出+原因显示                      |
| F5  | 废弃站页面     | `web/src/views/prospect/components/AbandonedList.vue`    | F1    | 废弃线索列表+恢复+永久删除(Admin)+原因分类筛选+统计饼图          |
| F6  | 重复检测组件   | `web/src/views/prospect/components/DuplicateCheck.vue`   | F1    | 导入/录入时弹出重复提示                                          |
| F7  | 线索标签管理   | `web/src/views/prospect/components/LeadTags.vue`         | —     | 多标签选择+AI自动标签显示                                        |
| F8  | 路由 + 菜单    | `web/src/router/index.ts`, layout sidebar                | F3-F5 | 新增公海池、黑名单菜单项                                         |

### 数据库迁移

| #   | 文件                                        | DDL                                                                                             |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| M1  | `1709000070000-CreateBlacklistTable.ts`     | `blacklist` 表: id, phone, reason(enum), remark, operatorId, createdAt, deletedAt               |
| M2  | `1709000071000-CreateDistributionTables.ts` | `distribution_rule` 表 + `distribution_log` 表                                                  |
| M3  | `1709000072000-AddAbandonFields.ts`         | prospect 表加 `abandon_reason` 列, customer_pool 加 `daily_claim_limit`, `auto_recycle_days` 列 |

### 测试任务

| #   | 标题                        | 文件                                                         | 验收标准                           |
| --- | --------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| T1  | ProspectDistributionService | `server/test/prospect/prospect-distribution.service.spec.ts` | ≥15 tests (3种分配模式+边界)       |
| T2  | BlacklistService            | `server/test/blacklist/blacklist.service.spec.ts`            | ≥12 tests (CRUD+批量+过滤)         |
| T3  | CustomerPoolService 增强    | `server/test/customer-pool/`                                 | ≥10 tests (自动回收+批量领取+上限) |
| T4  | DuplicateCheckService       | `server/test/prospect/prospect-duplicate.service.spec.ts`    | ≥8 tests                           |
| T5  | E2E — 黑名单页面            | `e2e/blacklist.spec.ts`                                      | 列表+添加+移出                     |

## 边界与约束

- **Scope 外**: 文件夹式线索分组（低优先级，后续迭代）、APP端双卡/拍照取号（属于 T13-移动端）
- **安全**: 永久删除仅 Admin；黑名单批量添加限制单次 ≤500 条
- **性能**: 海量分配支持单次 ≤10000 条线索，使用 Bull 队列异步处理
- **模块接口**: Blacklist Module 导出 `BlacklistService.checkBlacklist(phone)` 供 ProspectImportService 调用

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
- **枚举**: 定义在 `@crm/shared`，前后端共用
- **缓存**: 黑名单号码集合用 Redis Set，key `blacklist:phones`，导入时 SISMEMBER 检查

## Claude Code 提示词

### B1-B4: 海量分配

```
在 packages/server/src/modules/prospect/ 下实现线索海量分配功能：
1. 在 @crm/shared 新增枚举 LeadDistributionMode (round_robin/weighted/manual)
2. 新建 entities/distribution-rule.entity.ts 和 entities/distribution-log.entity.ts
3. 新建 prospect-distribution.service.ts:
   - distribute(mode, leadIds, targetUserIds, weights?): 按模式分配线索
   - round_robin: 平均轮询分配
   - weighted: 按 weights 数组加权分配
   - manual: 直接按指定映射分配
   - 每次分配写 distribution_log
4. 在 prospect.controller.ts 新增 POST /distribute 和 GET/PUT /distribute/rules
使用 Bull 队列异步处理大批量分配(>100条)。遵循项目 CLAUDE.md 规范。
```

### B8-B9: 黑名单模块

```
新建 packages/server/src/modules/blacklist/ 模块：
1. blacklist.entity.ts: phone(unique), reason(BlacklistReason enum), remark, operator(ManyToOne User)
2. blacklist.service.ts: findAll(分页+搜索), add(phone, reason), batchAdd(phones[], reason), remove(id), checkBlacklist(phone): boolean
3. blacklist.controller.ts: GET /, POST /, POST /batch, DELETE /:id — @UseGuards(JwtAuthGuard, RolesGuard), @Roles(UserRole.ADMIN, UserRole.MANAGER)
4. Redis Set 缓存所有黑名单号码，add/remove 时同步更新
5. 修改 prospect-import.service.ts: 导入前调用 blacklistService.checkBlacklist 过滤
6. 注册到 AppModule，导出 BlacklistService
```

### B5-B7: 公海池增强

```
增强 packages/server/src/modules/customer-pool/ 模块：
1. 新增配置字段: auto_recycle_days(int), daily_claim_limit(int)
2. 新增 Cron job @Cron('0 2 * * *'): 查找 last_follow_up_date + auto_recycle_days < now 的线索，自动移入公海
3. batchClaim(userId, leadIds[]): 校验每日领取上限 → 批量更新 ownerId
4. transfer(leadId, targetUserId): 从公海直接转让
5. batchTransfer(leadIds[], targetUserId): 管理员批量转让
6. 新增 Controller 端点: POST /pool/claim, POST /pool/transfer, GET/PUT /pool/recycle-rules
```

### F3-F5: 前端页面

```
新建/增强前端页面：
1. web/src/views/customer-pool/index.vue: 公海池列表(el-table)，操作列(领取/转让)，工具栏(批量领取/回收规则配置弹窗)
2. web/src/views/blacklist/index.vue: 黑名单列表，搜索框，添加弹窗(单条+批量)，移出按钮
3. web/src/views/prospect/components/AbandonedList.vue: 废弃线索列表，原因Tag，恢复/永久删除操作
4. 路由注册: /customer-pool, /blacklist, 废弃站作为 /prospect 子路由
5. 侧边栏菜单新增项，权限控制(黑名单 Manager+)
使用 Element Plus + Composition API <script setup>。
```
