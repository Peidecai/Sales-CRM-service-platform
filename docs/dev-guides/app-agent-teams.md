# CRM APP 开发 — Agent Teams 使用指南

> 使用 Claude Code 的 custom sub-agents 驱动 35 个 APP 开发任务。

## 快速开始

### 验证 Agent 列表

在 Claude Code 中运行 `/agents`，应看到以下 4 个 agent：

| Agent          | 职责                                                 |
| -------------- | ---------------------------------------------------- |
| `app-frontend` | uni-app 页面、组件、API 层、Store                    |
| `app-backend`  | NestJS 新增模块（CloudCall/Push/CheckIn/AppVersion） |
| `app-native`   | 原生能力封装（Push/GPS/双卡/OCR/生物识别）           |
| `app-reviewer` | 代码审查（只读，输出 Critical/Warning/Suggestion）   |

### 测试 Agent

```
@app-reviewer 审查 packages/miniapp/src/pages/index/index.vue
```

---

## 单任务执行模板

以 **B8 公共组件库** 为例：

```
@app-frontend

实现 B8 — 公共组件库

任务要求（来自 docs/tasks/T13-app-development.md）：
- 空状态组件 `components/EmptyState.vue`
- 加载骨架屏 `components/SkeletonLoader.vue`
- 标签组件 `components/TagGroup.vue`（支持多选）
- 金额输入组件 `components/AmountInput.vue`（格式化）
- 日期选择器 `components/DatePicker.vue`（uni-app 原生弹窗封装）

参考设计文档 docs/design/app/09-ui-ux.md 中的组件规范。
实现后运行 pnpm build:mp-weixin 验证。
```

---

## Phase 执行手册

### Phase 1 — MVP（工作台+客户+基础通话）

**目标**: 可演示的核心功能，覆盖日常工作流。

执行顺序（严格按依赖关系）：

```
步骤 1: @app-native  → A3（建 native/ 目录 + 基础模板）
步骤 2: @app-frontend → B8（公共组件库，其他页面依赖它）
步骤 3: @app-frontend → B1（工作台增强）
步骤 4: @app-frontend → B2（客户新建/编辑页面）
步骤 5: @app-frontend → B3（客户详情增强）
步骤 6: @app-frontend → B4（客户列表增强）
步骤 7: @app-frontend → C1（通话记录列表页）
步骤 8: @app-backend  → C2（CloudCallModule 后端）
步骤 9: @app-frontend → C3（通话后浮层 after-call.vue）
步骤 10: @app-frontend → C5（通话状态 Store call-state.ts）
步骤 11: @app-frontend → B5（跟进列表页）
步骤 12: @app-frontend → B7（个人中心增强）
步骤 13: @app-reviewer → 审查 Phase 1 所有新增文件
```

**验收**: `pnpm build:mp-weixin` 无错误，通话→跟进核心流程可跑通。

---

### Phase 2 — 通话功能完整实现

```
步骤 1: @app-frontend → C4（通话详情+AI摘要页）
步骤 2: @app-frontend → C6（录音上传+ASR集成）  ← 依赖 C2 后端
步骤 3: @app-backend  → E1（PushModule 后端）
步骤 4: @app-backend  → E2（CheckInModule 后端）
步骤 5: @app-native   → E3（Push 推送 + GPS 定位封装）
步骤 6: @app-frontend → B6（消息中心增强，依赖 E1）
步骤 7: @app-reviewer → 审查 Phase 2 所有新增文件
```

---

### Phase 3 — 商机+外勤+知识库

```
步骤 1: @app-frontend → D1（商机列表页）
步骤 2: @app-frontend → D2（商机详情页）
步骤 3: @app-frontend → D4（业绩排行榜）
步骤 4: @app-frontend → F1（知识库列表/详情）
步骤 5: @app-frontend → F2（素材库页面）
步骤 6: @app-native   → A3（补全外勤打卡原生支持，依赖 E2）
步骤 7: @app-frontend → G1（性能优化：分包+骨架屏）
步骤 8: @app-reviewer → 审查 Phase 3 所有新增文件
```

---

### Phase 4 — 增强功能+发布

```
步骤 1: @app-frontend → D3（商机创建/编辑表单）
步骤 2: @app-native   → E4（双卡检测+OCR）
步骤 3: @app-native   → E5（生物识别）
步骤 4: @app-frontend → F3（学习考试页面）
步骤 5: @app-native   → A4（CI/CD 构建流水线）  ← @app-backend 协助
步骤 6: @app-native   → A5（Sentry 错误监控集成）
步骤 7: @app-backend  → G2（APP 安全加固后端）
步骤 8: @app-backend  → G3（AppVersionModule）
步骤 9: @app-frontend → G4（前端发布检查）
步骤 10: @app-reviewer → 审查 Phase 4 + 全量安全审查
```

---

## 任务-Agent 速查表

| 任务 | Agent        | 描述                                              |
| ---- | ------------ | ------------------------------------------------- |
| A1   | app-frontend | APP 构建配置（manifest.json APP-PLUS + 多端构建） |
| A2   | app-frontend | 分包配置（pages-sub/ + preloadRule）              |
| A3   | app-native   | native/ 目录 + 条件编译基础模板                   |
| A4   | app-native   | CI/CD 流水线（app-build.yml）                     |
| A5   | app-native   | Sentry 错误监控集成                               |
| B1   | app-frontend | 工作台增强（数据卡片/待办/PK进展/AI助理）         |
| B2   | app-frontend | 客户新建/编辑页面                                 |
| B3   | app-frontend | 客户详情增强（360视图Tab/底部操作栏）             |
| B4   | app-frontend | 客户列表增强（我的/全部Tab/长按多选）             |
| B5   | app-frontend | 跟进列表页 + 时间线组件                           |
| B6   | app-frontend | 消息中心增强（分类/Push跳转）                     |
| B7   | app-frontend | 个人中心增强（统计/排行/工作报告）                |
| B8   | app-frontend | 公共组件库（空状态/骨架屏/标签/金额输入）         |
| C1   | app-frontend | 通话记录列表页                                    |
| C2   | app-backend  | CloudCallModule（适配器+Webhook+Queue）           |
| C3   | app-frontend | 通话后浮层 after-call.vue                         |
| C4   | app-frontend | 通话详情+AI摘要页                                 |
| C5   | app-frontend | 通话状态 Store call-state.ts                      |
| C6   | app-frontend | 录音上传+ASR+AI集成                               |
| D1   | app-frontend | 商机列表页                                        |
| D2   | app-frontend | 商机详情页                                        |
| D3   | app-frontend | 商机创建/编辑表单                                 |
| D4   | app-frontend | 业绩排行榜                                        |
| E1   | app-backend  | PushModule（厂商适配器/FCM/APNs）                 |
| E2   | app-backend  | CheckInModule（GPS打卡+审批+统计）                |
| E3   | app-native   | Push 推送 + GPS 定位原生封装                      |
| E4   | app-native   | 双卡检测 + OCR 识别                               |
| E5   | app-native   | 生物识别（指纹/Face ID）                          |
| F1   | app-frontend | 知识库列表/详情页                                 |
| F2   | app-frontend | 素材库页面                                        |
| F3   | app-frontend | 学习考试页面                                      |
| G1   | app-frontend | 性能优化（分包+骨架屏+懒加载）                    |
| G2   | app-backend  | APP 安全加固（Token 绑定/设备指纹）               |
| G3   | app-backend  | AppVersionModule（强制升级/灰度发布）             |
| G4   | app-frontend | 发布前端检查（包大小/网络/权限）                  |

---

## 并行执行

Claude Code 支持同时委派多个独立任务给不同 agent（无文件冲突时）：

```
同时执行：
- @app-frontend 实现 B1 工作台增强（修改 pages/index/index.vue）
- @app-backend  实现 C2 CloudCallModule（新建 modules/cloud-call/）
```

**并行条件**: 修改的文件不重叠，且任务间无依赖关系。

**不可并行示例**:

- B3（客户详情，需要 B8 组件库）不能和 B8 并行
- C3（通话后浮层，需要 C5 Store）不能和 C5 并行

---

## 审查流程

每个 Phase 完成后，运行全量审查：

```
@app-reviewer 审查 Phase 1 新增的所有文件：
- packages/miniapp/src/native/（A3）
- packages/miniapp/src/components/（B8）
- packages/miniapp/src/pages/index/index.vue（B1）
- packages/miniapp/src/pages/customer/create.vue（B2）
- packages/miniapp/src/pages/customer/detail.vue（B3）
- packages/miniapp/src/pages/customer/list.vue（B4）
- packages/miniapp/src/pages/call/list.vue（C1）
- packages/server/src/modules/cloud-call/（C2）
- packages/miniapp/src/pages/call/after-call.vue（C3）
- packages/miniapp/src/stores/call-state.ts（C5）
- packages/miniapp/src/pages/follow-up/list.vue（B5）
- packages/miniapp/src/pages/user/index.vue（B7）

重点检查：条件编译正确性、类型安全、uni-app 用法、后端 Migration 存在性。
```

审查结果中，**所有 Critical 项必须修复后才能进入下一 Phase**。

---

## 常见问题

### Q: Agent 没有出现在 `/agents` 列表中？

确认文件路径：`.claude/agents/app-frontend.md`（相对于项目根目录）。
文件需有正确的 YAML frontmatter（`name`, `description` 字段必须）。

### Q: @app-frontend 没有读到已有的页面代码？

Agent 每次调用从零开始，需要在任务描述中明确指出需要读取哪些现有文件：

```
@app-frontend 修改 pages/customer/detail.vue，在现有代码基础上增加通话记录 Tab
（先读取现有文件，然后修改）
```

### Q: 后端 Migration 时间戳冲突？

查看现有 Migration 文件的最大时间戳：

```bash
ls packages/server/database/migrations/ | sort | tail -5
```

新 Migration 时间戳取当前时间戳（13位毫秒），确保大于所有现有时间戳。

---

## 参考文档

| 文档         | 路径                                 |
| ------------ | ------------------------------------ |
| APP 任务清单 | `docs/tasks/T13-app-development.md`  |
| 架构设计     | `docs/design/app/01-architecture.md` |
| 功能设计     | `docs/design/app/02-features.md`     |
| 原生能力设计 | `docs/design/app/07-native.md`       |
| APP API 规格 | `docs/design/app/08-api.md`          |
| UI/UX 规范   | `docs/design/app/09-ui-ux.md`        |
| 安全要求     | `docs/design/app/10-security.md`     |
| Miniapp 规范 | `packages/miniapp/CLAUDE.md`         |
| 全局规范     | `CLAUDE.md`                          |
