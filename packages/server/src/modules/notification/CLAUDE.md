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
├── notification.gateway.ts    # Socket.IO WebSocket 网关
├── notification.service.ts    # 业务事件通知便捷方法
├── notification.types.ts      # NotificationType 枚举 + NotificationPayload 接口
└── notification.module.ts     # @Global() 模块注册
```

### NotificationGateway

- 命名空间：`/ws/notifications`
- CORS：从 `process.env.CORS_ORIGINS` 读取（逗号分隔，默认 `http://localhost:5173,http://localhost:3001`）
- JWT 鉴权：连接时从 `handshake.auth.token` 或 `handshake.query.token` 提取 JWT，验证合法性及黑名单
- 用户映射：`userSockets: Map<number, Set<string>>` 维护 userId → socketId 集合（支持多设备同时在线）
- 广播方法：`broadcast(payload)` — 发给所有在线客户端
- 定向方法：`sendToUser(userId, payload)` — 发给指定用户的所有设备

### NotificationService

可注入到任何业务 Service/Controller/Processor 中，提供以下便捷方法：

| 方法                                                                  | 触发场景                                          |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `customerCreated(actorId, actorName, customerId, customerName)`       | 创建客户                                          |
| `customerUpdated(actorId, actorName, customerId, customerName)`       | 更新客户                                          |
| `customerDeleted(actorId, actorName, customerId)`                     | 删除客户                                          |
| `opportunityCreated(actorId, actorName, oppId, title)`                | 创建商机                                          |
| `opportunityStageChanged(actorId, actorName, oppId, title, from, to)` | 推进商机阶段                                      |
| `opportunityDeleted(actorId, actorName, oppId)`                       | 删除商机                                          |
| `callRecordCreated(actorId, actorName, recordId)`                     | 创建通话记录                                      |
| `callRecordDeleted(actorId, actorName, recordId)`                     | 删除通话记录                                      |
| `callSummaryCompleted(recordId)`                                      | AI 摘要生成完成（actorId=0, actorName='AI 系统'） |
| `articleCreated(actorId, actorName, articleId, title)`                | 发布知识文章                                      |
| `articleEmbeddingCompleted(articleId, title)`                         | 向量索引更新完成                                  |

**使用示例**（在 Controller 中）：

```typescript
// 注入
constructor(private readonly notificationService: NotificationService) {}

// 调用
this.notificationService.customerCreated(user.id, user.name, customer.id, customer.name)
```

### NotificationType 枚举

```typescript
CUSTOMER_CREATED = 'customer:created'
CUSTOMER_UPDATED = 'customer:updated'
CUSTOMER_DELETED = 'customer:deleted'
OPPORTUNITY_CREATED = 'opportunity:created'
OPPORTUNITY_UPDATED = 'opportunity:updated'
OPPORTUNITY_STAGE_CHANGED = 'opportunity:stage_changed'
OPPORTUNITY_DELETED = 'opportunity:deleted'
CALL_RECORD_CREATED = 'call_record:created'
CALL_RECORD_DELETED = 'call_record:deleted'
CALL_SUMMARY_COMPLETED = 'call_record:summary_completed'
ARTICLE_CREATED = 'article:created'
ARTICLE_EMBEDDING_COMPLETED = 'article:embedding_completed'
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
let socket: Socket | null = null
const connected = ref(false)
const notifications = ref<NotificationPayload[]>([])
let consumerCount = 0
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
| `DefaultLayout.vue` 挂载（`onMounted`） | `useNotification()` 的 `onMounted` 钩子自动调用 `connect()`  |
| `userStore.logout()` 执行               | 调用 `disconnectNotificationSocket()`，断开连接              |
| 组件卸载（`onUnmounted`）               | 仅减少 `consumerCount`，**不断开连接**（由 logout 统一管理） |

**Token 来源**：`userStore.token`（注意：字段名为 `token`，非 `accessToken`）

**公开 API**：

```typescript
export function useNotification(): {
  connected: Ref<boolean> // WebSocket 是否已连接
  notifications: Ref<NotificationPayload[]> // 消息列表（newest-first，max 50）
  connect: () => void // 手动连接（需 isLoggedIn=true）
  disconnect: () => void // 手动断开
  clearNotifications: () => void // 清空消息列表
}

// 供 logout 直接调用，不依赖组件实例
export function disconnectNotificationSocket(): void

// 测试辅助：重置所有模块级状态（断开连接 + 清空消息 + 重置计数）
export function __resetNotificationStateForTest(): void
```

### DefaultLayout.vue — 集成说明

布局组件已完整集成通知功能：

```vue
<!-- Header 右侧铃铛 -->
<el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
  <el-button text class="notification-btn">
    <el-icon size="20"><Bell /></el-icon>
  </el-button>
</el-badge>

<!-- WS 连接状态指示灯（绿色=已连接，灰色=断开） -->
<span :class="['ws-indicator', { connected: wsConnected }]" />
```

- `unreadCount` = `notifications.value.length`（所有未清除的消息计为未读）
- 点击铃铛触发 `el-popover`，展示消息列表（最大高度 400px，可滚动）
- 每条消息可点击跳转到对应资源页（`/customer/:id`、`/opportunity/:id` 等）
- "清空"按钮调用 `clearNotifications()`

### stores/user.ts — logout 集成

```typescript
import { disconnectNotificationSocket } from '@/composables/useNotification'

// logout() action 末尾
disconnectNotificationSocket()
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
socket.io: server.emit('notification', payload)
    ↓ (WebSocket)
前端 socket.on('notification', handler)
    ↓
过滤：actorId === currentUserId → 丢弃（操作者自身不收通知）
    ↓
notifications.value.unshift(payload)  → 铃铛角标 +1
ElNotification(...)                   → 右下角 Toast（4500ms）
```

---

## 权限与安全

- WebSocket 连接时校验 JWT Token（与 HTTP 接口标准一致）
- Token 黑名单检查：调用 `authService.isTokenBlacklisted(token)`，用户登出后 Token 无法建立新连接
- Token 提取优先级：`handshake.auth.token` > `handshake.query.token`
- **生产部署**：将 CORS 限制为实际域名（通过环境变量 `CORS_ORIGINS` 配置，多个域名逗号分隔）

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
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetNotificationStateForTest, useNotification } from './useNotification'

vi.mock('socket.io-client', () => ({ io: vi.fn(() => mockSocket) }))

describe('useNotification', () => {
  beforeEach(() => {
    __resetNotificationStateForTest()
  })

  it('初始状态：connected=false，notifications 为空数组')
  it('connect() 在 isLoggedIn=true 时建立 socket 连接')
  it('收到 notification 事件时 notifications 数组增加')
  it('actorId === currentUserId 时通知被过滤丢弃')
  it('notifications 超过 50 条时截断到 50 条')
  it('clearNotifications() 清空 notifications 数组')
})
```

### 手动集成测试

```bash
# 1. 启动服务
pnpm dev:server   # :3000
pnpm dev:web      # :5173

# 2. 打开两个浏览器标签（账号A、账号B 分别登录）

# 3. 在标签A中创建客户
# 期望：标签B 右下角出现 ElNotification 弹窗 + 铃铛角标 +1
# 期望：标签A 不出现弹窗（自操作过滤）

# 4. 验证 WS 连接
# 浏览器开发工具 → Network → WS → /ws/notifications
# 期望：看到 "notification" 帧，payload 含 type/actorId/message 等字段
```
