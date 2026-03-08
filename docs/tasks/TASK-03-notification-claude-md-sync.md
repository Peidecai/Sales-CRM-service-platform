# TASK-03: notification/CLAUDE.md 文档同步更新

**状态**: ⚠️ 文档与实际代码严重不符
**优先级**: P1 — 文档准确性（影响后续团队协作）
**模块**: 实时通知 (Notification)
**估算工作量**: 文档更新 1h

---

## 1. 背景与问题

### 问题描述

`packages/server/src/modules/notification/CLAUDE.md` 中标注前端通知功能"**完全缺失**"，并提供了需要新建的文件规范列表。

**实际情况完全相反**：前端实时通知已完整实现，且实现方式与 CLAUDE.md 所描述的设计规范存在以下差异：

| 维度            | CLAUDE.md 描述                                          | 实际代码                                                     |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| 状态            | "前端完全缺失"                                          | **已完整实现**                                               |
| composable 文件 | 需要新建 `useWebSocket.ts` + `useNotificationCenter.ts` | 实际为单一文件 `useNotification.ts`（功能合并）              |
| Socket 初始化   | `userStore.accessToken` 字段                            | 实际使用 `userStore.token` 字段                              |
| 通知位置        | `position: 'top-right'`                                 | 实际为 `position: 'bottom-right'`                            |
| 铃铛组件        | 需要新建独立 `NotificationBell.vue`                     | 铃铛 UI 直接内联在 `DefaultLayout.vue` 中                    |
| 自己操作过滤    | 未提及                                                  | `useNotification.ts` 已实现 `actorId === currentUserId` 过滤 |
| 测试工具        | 未提及                                                  | 导出了 `__resetNotificationStateForTest()` 测试辅助函数      |
| 断线重连次数    | 5次 + delay 2000ms                                      | 实际 5次 + delay 3000ms                                      |

### 影响

1. 其他开发者读到 CLAUDE.md 后会误认为功能未实现，可能重复开发
2. 文档指向的实现方案（两个 composable 文件）与实际架构不同，产生混乱
3. 新成员 onboarding 时获得错误的代码导航信息

---

## 2. 目标

将 `packages/server/src/modules/notification/CLAUDE.md` 重写为与实际代码 100% 对应的精确文档，内容包括：

1. 后端架构说明（保持，已准确）
2. 前端实际实现说明（全面重写）
3. 前后端数据流说明
4. 集成点和生命周期说明
5. 测试方法

---

## 3. 更新后的 CLAUDE.md 内容

以下是需要替换的完整文件内容：

```markdown
# 实时通知模块 (Notification) CLAUDE.md

## 模块信息

**模块**: 实时通知 (Notification)
**路径**: `packages/server/src/modules/notification/`
**类型**: 全局模块 (`@Global()`)
**协议**: WebSocket (Socket.IO，命名空间 `/ws/notifications`)

---

## 实现状态

| 层              | 状态    | 说明                                                   |
| --------------- | ------- | ------------------------------------------------------ |
| 后端 Gateway    | ✅ 完整 | Socket.IO 网关，JWT 鉴权，broadcast/sendToUser         |
| 后端 Service    | ✅ 完整 | 11 种业务事件的便捷方法                                |
| 后端 Types      | ✅ 完整 | `NotificationType` 枚举 + `NotificationPayload` 接口   |
| 后端 Module     | ✅ 完整 | `@Global()` 注册，全局可注入 `NotificationService`     |
| 前端 Composable | ✅ 完整 | `useNotification.ts` — Socket.IO 客户端 + 消息状态管理 |
| 前端 UI         | ✅ 完整 | 铃铛图标 + 弹出消息列表内联于 `DefaultLayout.vue`      |

---

## 后端架构

### 文件结构
```

packages/server/src/modules/notification/
├── notification.gateway.ts # Socket.IO WebSocket 网关
├── notification.service.ts # 业务事件通知便捷方法
├── notification.types.ts # NotificationType 枚举 + NotificationPayload 接口
└── notification.module.ts # @Global() 模块注册

````

### NotificationGateway

- 命名空间：`/ws/notifications`
- CORS：从 `process.env.CORS_ORIGINS` 读取（逗号分隔，默认 `http://localhost:5173,http://localhost:3001`）
- JWT 鉴权：连接时从 `handshake.auth.token` 或 `handshake.query.token` 提取 JWT，验证合法性及黑名单
- 用户映射：`userSockets: Map<number, Set<string>>` 维护 userId → socketId 集合（支持多设备同时在线）
- 广播方法：`broadcast(payload)` — 发给所有在线客户端
- 定向方法：`sendToUser(userId, payload)` — 发给指定用户的所有设备

### NotificationService

可注入到任何业务 Service/Controller/Processor 中，提供以下便捷方法：

| 方法 | 触发场景 |
|------|----------|
| `customerCreated(actorId, actorName, customerId, customerName)` | 创建客户 |
| `customerUpdated(actorId, actorName, customerId, customerName)` | 更新客户 |
| `customerDeleted(actorId, actorName, customerId)` | 删除客户 |
| `opportunityCreated(actorId, actorName, oppId, title)` | 创建商机 |
| `opportunityStageChanged(actorId, actorName, oppId, title, from, to)` | 推进商机阶段 |
| `opportunityDeleted(actorId, actorName, oppId)` | 删除商机 |
| `callRecordCreated(actorId, actorName, recordId)` | 创建通话记录 |
| `callRecordDeleted(actorId, actorName, recordId)` | 删除通话记录 |
| `callSummaryCompleted(recordId)` | AI 摘要生成完成（actorId=0, actorName='AI 系统'） |
| `articleCreated(actorId, actorName, articleId, title)` | 发布知识文章 |
| `articleEmbeddingCompleted(articleId, title)` | 向量索引更新完成 |

**使用示例**（在 Controller 中）：

```typescript
// 注入
constructor(private readonly notificationService: NotificationService) {}

// 调用
this.notificationService.customerCreated(user.id, user.name, customer.id, customer.name)
````

### NotificationType 枚举

```typescript
CUSTOMER_CREATED = "customer:created";
CUSTOMER_UPDATED = "customer:updated";
CUSTOMER_DELETED = "customer:deleted";
OPPORTUNITY_CREATED = "opportunity:created";
OPPORTUNITY_UPDATED = "opportunity:updated";
OPPORTUNITY_STAGE_CHANGED = "opportunity:stage_changed";
OPPORTUNITY_DELETED = "opportunity:deleted";
CALL_RECORD_CREATED = "call_record:created";
CALL_RECORD_DELETED = "call_record:deleted";
CALL_SUMMARY_COMPLETED = "call_record:summary_completed";
ARTICLE_CREATED = "article:created";
ARTICLE_EMBEDDING_COMPLETED = "article:embedding_completed";
```

---

## 前端架构

### 核心文件

```
packages/web/src/
├── composables/
│   └── useNotification.ts    # Socket.IO 客户端 + 消息状态管理（模块级单例）
└── layout/
    └── DefaultLayout.vue     # 铃铛 UI + 消息列表（内联实现，无独立组件）
```

### useNotification.ts — 设计说明

**模式**：模块级单例（module-level singleton）

```typescript
// 模块级变量（跨组件共享，非 Pinia）
let socket: Socket | null = null;
const connected = ref(false);
const notifications = ref<NotificationPayload[]>([]);
let consumerCount = 0;
```

**为什么不用 Pinia**：Socket.IO 实例包含内部状态（事件监听器、连接状态），无法被 Pinia 序列化，且多个 Store 引用同一个 socket 对象会导致响应式污染。模块级变量是此场景的标准解法。

**关键行为**：

1. **自操作过滤**：当 `payload.actorId === currentUserId` 时静默丢弃，避免用户看到自己的操作通知
2. **消息上限**：`notifications` 最多保留 50 条（newest-first），超出时截断尾部
3. **Toast 提示**：每条新通知触发 `ElNotification`（位置：`bottom-right`，持续 4500ms）
4. **断线重连**：最多 5 次，每次间隔 3000ms

**连接生命周期**：

| 时机                                    | 动作                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| `DefaultLayout.vue` 挂载（`onMounted`） | 调用 `connect()`，建立 WebSocket 连接                        |
| `userStore.logout()` 执行               | 调用 `disconnectNotificationSocket()`，断开连接              |
| 组件卸载（`onUnmounted`）               | 仅减少 `consumerCount`，**不断开连接**（由 logout 统一管理） |

**Token 来源**：`userStore.token`（注意：不是 `userStore.accessToken`）

**公开 API**：

```typescript
export function useNotification(): {
  connected: Ref<boolean>; // WebSocket 是否已连接
  notifications: Ref<NotificationPayload[]>; // 消息列表（newest-first，max 50）
  connect: () => void; // 手动连接（loginRequired）
  disconnect: () => void; // 手动断开
  clearNotifications: () => void; // 清空消息列表
};

export function disconnectNotificationSocket(): void; // 供 logout 直接调用

export function __resetNotificationStateForTest(): void; // 测试辅助，重置所有模块级状态
```

### DefaultLayout.vue — 集成说明

布局组件已完整集成通知功能：

```vue
<!-- Header 右侧 -->
<el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
  <el-button text><el-icon size="20"><Bell /></el-icon></el-button>
</el-badge>

<!-- WS 连接状态指示灯 -->
<span :class="['ws-indicator', { connected: wsConnected }]" />
```

- `unreadCount` = `notifications.value.length`（所有未清除的消息计为未读）
- 点击铃铛触发 `el-popover`，展示消息列表（最大高度 400px，可滚动）
- 每条消息可点击跳转到对应资源页（`/customer/:id`、`/opportunity/:id` 等）
- "清空"按钮调用 `clearNotifications()`
- 绿色指示灯（`.ws-indicator.connected`）表示 WebSocket 已连接

### stores/user.ts — logout 集成

```typescript
// logout() action 末尾调用
import { disconnectNotificationSocket } from "@/composables/useNotification";

// 在 logout action 中
disconnectNotificationSocket();
```

---

## 数据流

```
用户操作（如创建客户）
    ↓
Controller 方法
    ↓
this.notificationService.customerCreated(...)
    ↓
NotificationService.notify({ type, actorId, ... })
    ↓
NotificationGateway.broadcast(payload)
    ↓
socket.io server.emit('notification', payload)
    ↓ (WebSocket)
前端 socket.on('notification', handler)
    ↓
过滤 actorId === currentUserId（自操作丢弃）
    ↓
notifications.value.unshift(payload)  → 铃铛角标 +1
ElNotification(...)                   → 右下角 Toast
```

---

## 权限与安全

- WebSocket 连接时校验 JWT Token（与 HTTP 接口标准一致）
- Token 黑名单检查：调用 `authService.isTokenBlacklisted(token)`，用户登出后 Token 无法建立新连接
- Token 提取优先级：`handshake.auth.token` > `handshake.query.token`
- **生产部署**：将 CORS 限制为实际域名（当前开发配置从环境变量 `CORS_ORIGINS` 读取）

---

## 已实现的业务事件清单

| 事件 Key                        | 触发位置                            | 触发条件         |
| ------------------------------- | ----------------------------------- | ---------------- |
| `customer:created`              | `CustomerController.create`         | 创建客户成功     |
| `customer:updated`              | `CustomerController.update`         | 更新客户成功     |
| `customer:deleted`              | `CustomerController.remove`         | 删除客户成功     |
| `opportunity:created`           | `OpportunityController.create`      | 创建商机成功     |
| `opportunity:stage_changed`     | `OpportunityController.updateStage` | 商机阶段推进     |
| `opportunity:deleted`           | `OpportunityController.remove`      | 删除商机成功     |
| `call_record:created`           | `CallRecordController.create`       | 创建通话记录     |
| `call_record:deleted`           | `CallRecordController.remove`       | 删除通话记录     |
| `call_record:summary_completed` | `CallSummaryProcessor`              | AI 摘要生成完成  |
| `article:created`               | `KnowledgeController.createArticle` | 创建知识文章     |
| `article:embedding_completed`   | `EmbeddingProcessor`                | 向量索引生成完成 |

---

## 测试

### 后端单元测试

```bash
cd packages/server
pnpm test -- --runInBand test/notification/
```

覆盖：`notification.service.spec.ts`、`notification.gateway.spec.ts`、`notification.index.spec.ts`

### 前端单元测试

使用 `__resetNotificationStateForTest()` 在 `beforeEach` 中重置模块级状态：

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  __resetNotificationStateForTest,
  useNotification,
} from "./useNotification";

// Mock socket.io-client
vi.mock("socket.io-client", () => ({ io: vi.fn(() => mockSocket) }));

describe("useNotification", () => {
  beforeEach(() => {
    __resetNotificationStateForTest();
  });

  it("初始状态：connected=false，notifications 为空数组");
  it("connect() 后 isLoggedIn=true 时建立 socket 连接");
  it("收到 notification 事件时 notifications 数组增加");
  it("actorId === currentUserId 时通知被过滤丢弃");
  it("notifications 超过 50 条时截断");
  it("clearNotifications() 清空 notifications 数组");
});
```

### 手动集成测试

```bash
# 1. 启动服务
pnpm dev:server   # :3000
pnpm dev:web      # :5173

# 2. 打开两个浏览器标签（账号A、账号B）

# 3. 在标签A中创建客户
# 期望：标签B右下角出现 ElNotification 弹窗 + 铃铛角标 +1
# 期望：标签A 不出现弹窗（自操作过滤）

# 4. 浏览器开发工具 → Network → WS → /ws/notifications
# 期望：看到 "notification" 帧
```

````

---

## 4. 执行步骤

1. 使用上方"更新后的 CLAUDE.md 内容"完全替换 `packages/server/src/modules/notification/CLAUDE.md` 文件
2. 检查内容无误（无遗漏字段，无错误描述）
3. 提交 commit：`docs: 同步 notification 模块 CLAUDE.md 与实际实现`

---

## 5. 验证标准 (Acceptance Criteria)

### 文档准确性检查

| # | 检查项 | 验证方式 |
|---|--------|----------|
| D1 | 前端状态标注为"✅ 完整" | 目测 CLAUDE.md 状态表格 |
| D2 | composable 文件名为 `useNotification.ts`（非 `useWebSocket.ts`） | 对比 CLAUDE.md 与实际文件 |
| D3 | Token 字段描述为 `userStore.token` | 对比 `useNotification.ts` 第 105 行 |
| D4 | Toast 位置描述为 `bottom-right` | 对比 `useNotification.ts` 第 74 行 |
| D5 | 铃铛 UI 描述为"内联于 DefaultLayout.vue" | 对比 `DefaultLayout.vue` |
| D6 | 自操作过滤逻辑有说明 | 文档中有 `actorId === currentUserId` 描述 |
| D7 | `__resetNotificationStateForTest` 导出有记录 | 文档测试章节中提及 |
| D8 | 断线重连参数：5次 + 3000ms | 对比 `useNotification.ts` 第 48-49 行 |

### 前后对比验证

运行以下命令确认文档不再包含误导性内容：

```bash
# 确认不含"完全缺失"字样
grep -r "完全缺失" packages/server/src/modules/notification/CLAUDE.md
# 期望：无输出

# 确认不含错误的 composable 名称
grep "useWebSocket\|useNotificationCenter" packages/server/src/modules/notification/CLAUDE.md
# 期望：无输出（或仅在历史对比说明中出现）

# 确认文件存在且有内容
wc -l packages/server/src/modules/notification/CLAUDE.md
# 期望：行数 > 100
````
