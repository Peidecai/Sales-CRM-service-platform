# 06 — 数据架构

## 本地存储

### Storage 结构

| Key                     | 类型    | TTL   | 说明             |
| ----------------------- | ------- | ----- | ---------------- |
| `crm_token`             | string  | —     | Access Token     |
| `crm_refresh_token`     | string  | —     | Refresh Token    |
| `crm_user`              | object  | —     | 用户信息         |
| `crm_cache_user:*`      | object  | 30min | 用户详情缓存     |
| `crm_cache_customers:*` | array   | 15min | 客户列表缓存     |
| `crm_cache_dict:*`      | object  | 24h   | 字典数据缓存     |
| `crm_offline_queue`     | array   | —     | 离线请求队列     |
| `crm_pending_call`      | object  | —     | 待处理通话上下文 |
| `crm_sim_preference`    | string  | —     | 默认 SIM 卡      |
| `crm_push_token`        | string  | —     | Push 设备 Token  |
| `crm_biometric_enabled` | boolean | —     | 生物识别开关     |

### 缓存工具 (cache-store.ts)

```typescript
interface CacheItem<T> {
  data: T;
  expireAt: number; // 时间戳
}

class CacheStore {
  set<T>(key: string, data: T, ttlMs: number): void {
    uni.setStorageSync(key, {
      data,
      expireAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const item = uni.getStorageSync(key) as CacheItem<T>;
    if (!item || Date.now() > item.expireAt) {
      uni.removeStorageSync(key);
      return null;
    }
    return item.data;
  }
}
```

### TTL 策略

| 场景       | TTL    | 理由              |
| ---------- | ------ | ----------------- |
| 用户信息   | 30 min | 角色/权限可能变更 |
| 客户列表   | 15 min | 频繁更新          |
| 字典数据   | 24 h   | 极少变更          |
| 商机列表   | 15 min | 频繁更新          |
| 知识库文章 | 1 h    | 低频更新          |

---

## 离线队列

### 架构

```
┌──────────────┐      ┌──────────────┐      ┌─────────┐
│   页面操作    │ ───→ │ offline-queue │ ───→ │ 后端 API │
│ (创建跟进)   │      │ (本地队列)   │      │         │
└──────────────┘      └──────────────┘      └─────────┘
                           │ 网络恢复时 flush
                           ↓
                      自动重试 (max 3次)
```

### 配置

| 参数       | 值            | 说明                        |
| ---------- | ------------- | --------------------------- |
| 最大容量   | 50 条         | 超出最早的丢弃              |
| 自动 flush | 网络恢复时    | `uni.onNetworkStatusChange` |
| 重试次数   | 3 次          | 超过则丢弃                  |
| 适用操作   | POST (写入类) | 跟进创建、签到等            |

### 队列数据结构

```typescript
interface QueueItem {
  id: string; // UUID
  url: string; // API 路径
  method: "POST" | "PUT";
  data: Record<string, unknown>;
  createdAt: number; // 时间戳
  retryCount: number; // 已重试次数
}
```

### Flush 流程

```typescript
async function flushQueue() {
  const queue = getQueue();
  for (const item of queue) {
    try {
      await request({ url: item.url, method: item.method, data: item.data });
      removeFromQueue(item.id);
    } catch {
      item.retryCount++;
      if (item.retryCount >= 3) {
        removeFromQueue(item.id); // 超过重试次数，丢弃
      }
    }
  }
}

// 监听网络恢复
uni.onNetworkStatusChange((res) => {
  if (res.isConnected) flushQueue();
});
```

---

## 数据同步策略

### 拉取策略 (Read)

| 场景           | 策略                                    | 说明          |
| -------------- | --------------------------------------- | ------------- |
| 页面 onShow    | 检查缓存 TTL → 命中直接用，过期重新请求 | 减少 API 调用 |
| 下拉刷新       | 强制忽略缓存，请求最新数据              | 用户主动刷新  |
| WebSocket 推送 | 收到变更通知 → 清除相关缓存             | 实时性保障    |

### 推送策略 (Write)

| 场景 | 策略                            |
| ---- | ------------------------------- |
| 在线 | 直接调 API → 成功后清除相关缓存 |
| 离线 | 写入离线队列 → 网络恢复后 flush |

### 冲突处理

| 冲突类型              | 策略                               |
| --------------------- | ---------------------------------- |
| 离线创建 → 在线已存在 | 后端返回 409 → 静默忽略            |
| 离线修改 → 他人已修改 | 后端 Last-Write-Wins → 提示用户    |
| Token 过期            | flush 遇到 401 → 清队列 → 重新登录 |

---

## SQLite 本地数据库 (v2.0 预留)

v2.0 可引入 SQLite 实现更强的离线能力：

| 能力     | Storage (v1.0) | SQLite (v2.0) |
| -------- | -------------- | ------------- |
| 容量     | ~10MB          | ~50MB+        |
| 查询     | 全量读取       | SQL 查询      |
| 索引     | 无             | 可建索引      |
| 离线浏览 | 仅缓存         | 全量数据      |
| 全文搜索 | 不支持         | FTS5 支持     |

### SQLite 方案 (参考)

```typescript
// #ifdef APP-PLUS
const db = plus.sqlite.openDatabase({
  name: "crm",
  path: "_doc/crm.db",
});

// 建表
db.executeSql(`CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  status TEXT,
  data TEXT,  -- JSON 全量
  syncedAt INTEGER
)`);
// #endif
```
