## 10. 微信小程序详细设计

### 10.1 技术架构

#### 10.1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    微信小程序客户端                        │
├─────────────────────────────────────────────────────────┤
│  页面层 (Pages)                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐      │
│  │ 工作台   │ │ 客户管理 │ │ 外勤签到 │ │ 业绩看板  │      │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘      │
├───────┼──────────┼──────────┼───────────┼──────────────┤
│  组件层 (Components)                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 业务组件  │ │ 通用组件  │ │ 图表组件  │ │ 地图组件  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
├───────┼──────────┼──────────┼───────────┼──────────────┤
│  状态层 (Pinia Stores)                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ user │ │client│ │ visit│ │ perf │ │ msg  │         │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘         │
├─────┼────────┼───────┼───────┼────────┼────────────────┤
│  服务层 (Services)                                       │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────┐     │
│  │ API 请求层 │ │ 离线队列   │ │ 微信原生能力封装    │     │
│  │(共享+专用) │ │OfflineQueue│ │(登录/LBS/拍照/语音)│     │
│  └─────┬─────┘ └─────┬─────┘ └────────┬──────────┘     │
├────────┼─────────────┼────────────────┼────────────────┤
│  基础层 (Core)                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │本地存储   │ │ 网络监测  │ │ 权限管理  │ │ 日志上报   │  │
│  │CacheStore│ │NetMonitor│ │AuthGuard │ │LogReporter│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
   ┌─────────────┐    ┌──────────────┐
   │ CRM后端API   │    │ 微信开放平台   │
   │ (REST/WSS)  │    │ (登录/支付等) │
   └─────────────┘    └──────────────┘
```

#### 10.1.2 uni-app + Vue 3 项目结构

```
src/
├── App.vue                     # 应用入口
├── main.ts                     # 主入口文件
├── manifest.json               # uni-app 配置
├── pages.json                  # 页面路由配置
├── uni.scss                    # 全局样式变量
├── pages/                      # 页面目录
│   ├── workbench/              # 工作台
│   │   └── index.vue
│   ├── client/                 # 客户管理
│   │   ├── list.vue
│   │   ├── detail.vue
│   │   └── follow-up.vue
│   ├── visit/                  # 外勤签到
│   │   ├── check-in.vue
│   │   └── route-plan.vue
│   ├── voice/                  # 语音记录
│   │   └── record.vue
│   ├── performance/            # 业绩看板
│   │   └── dashboard.vue
│   └── message/                # 消息中心
│       └── index.vue
├── components/                 # 组件目录
│   ├── biz/                    # 业务组件
│   │   ├── ClientCard.vue
│   │   ├── TodoItem.vue
│   │   ├── FollowUpTimeline.vue
│   │   └── PerformanceChart.vue
│   └── common/                 # 通用组件
│       ├── SearchBar.vue
│       ├── EmptyState.vue
│       ├── LoadMore.vue
│       └── VirtualList.vue
├── stores/                     # Pinia 状态管理
│   ├── user.ts
│   ├── client.ts
│   ├── visit.ts
│   ├── performance.ts
│   └── message.ts
├── api/                        # API 层（与PC端共享核心定义）
│   ├── shared/                 # 共享接口定义
│   │   ├── client.ts
│   │   ├── follow-up.ts
│   │   └── types.ts
│   ├── mini/                   # 小程序专有接口
│   │   ├── wechat-auth.ts
│   │   ├── check-in.ts
│   │   └── voice.ts
│   └── request.ts             # 请求封装（适配uni.request）
├── services/                   # 服务层
│   ├── offline-queue.ts        # 离线队列
│   ├── cache-store.ts          # 本地缓存
│   ├── net-monitor.ts          # 网络监测
│   └── wx-bridge.ts            # 微信能力桥接
├── utils/                      # 工具函数
│   ├── auth.ts
│   ├── location.ts
│   ├── image.ts
│   └── crypto.ts
└── static/                     # 静态资源
```

#### 10.1.3 与PC端共享的API层设计

共享层通过抽象请求适配器实现跨端复用：

```typescript
// api/shared/types.ts — 共享类型定义（PC端与小程序端通用）
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// api/request.ts — 小程序端请求适配器
import { useUserStore } from "@/stores/user";
import { OfflineQueue } from "@/services/offline-queue";

const BASE_URL = import.meta.env.VITE_API_BASE;

interface RequestConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  data?: any;
  offlineSupport?: boolean; // 是否支持离线排队
}

export async function request<T>(
  config: RequestConfig,
): Promise<ApiResponse<T>> {
  const userStore = useUserStore();

  // 网络不可用且支持离线 → 加入离线队列
  if (!networkAvailable() && config.offlineSupport) {
    await OfflineQueue.enqueue(config);
    return {
      code: 0,
      message: "queued_offline",
      data: null as any,
      timestamp: Date.now(),
    };
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${config.url}`,
      method: config.method,
      data: config.data,
      header: {
        Authorization: `Bearer ${userStore.token}`,
        "X-Platform": "mini-program",
        "X-Device-Id": userStore.deviceId,
      },
      success: (res) => {
        if (res.statusCode === 401) {
          userStore.refreshToken();
          return;
        }
        resolve(res.data as ApiResponse<T>);
      },
      fail: (err) => {
        if (config.offlineSupport) {
          OfflineQueue.enqueue(config);
          resolve({
            code: 0,
            message: "queued_offline",
            data: null as any,
            timestamp: Date.now(),
          });
        } else {
          reject(err);
        }
      },
    });
  });
}
```

#### 10.1.4 小程序端特有能力封装

```typescript
// services/wx-bridge.ts
export class WxBridge {
  /** 微信登录：获取code */
  static login(): Promise<string> {
    return new Promise((resolve, reject) => {
      uni.login({
        provider: "weixin",
        success: (res) => resolve(res.code),
        fail: reject,
      });
    });
  }

  /** LBS定位 */
  static getLocation(): Promise<{
    lat: number;
    lng: number;
    accuracy: number;
  }> {
    return new Promise((resolve, reject) => {
      uni.getLocation({
        type: "gcj02",
        isHighAccuracy: true,
        highAccuracyExpireTime: 3000,
        success: (res) =>
          resolve({
            lat: res.latitude,
            lng: res.longitude,
            accuracy: res.accuracy,
          }),
        fail: reject,
      });
    });
  }

  /** 拍照 */
  static takePhoto(
    compressed = true,
  ): Promise<{ tempPath: string; size: number }> {
    return new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sourceType: ["camera"],
        sizeType: compressed ? ["compressed"] : ["original"],
        success: (res) =>
          resolve({
            tempPath: res.tempFilePaths[0],
            size: res.tempFiles[0].size,
          }),
        fail: reject,
      });
    });
  }

  /** 录音管理器 */
  static createRecorder() {
    const manager = uni.getRecorderManager();
    return {
      start: (duration = 600) =>
        manager.start({
          duration: duration * 1000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: "mp3",
        }),
      stop: () => manager.stop(),
      onStop: (cb: (res: { tempFilePath: string; duration: number }) => void) =>
        manager.onStop(cb),
      onError: (cb: (err: any) => void) => manager.onError(cb),
    };
  }
}
```

---

### 10.2 功能模块

#### 10.2.1 功能模块总览

| 模块       | 核心功能                          | 离线支持      | 微信能力依赖 |
| ---------- | --------------------------------- | ------------- | ------------ |
| 工作台首页 | 今日待办、业绩概览、快捷入口      | 缓存只读      | —            |
| 客户管理   | 列表搜索、详情查看、跟进记录      | 缓存+离线写入 | —            |
| 外勤签到   | LBS定位、拍照、距离校验、签到提交 | 离线排队      | 定位、相机   |
| 语音记录   | 录音、ASR转写、AI摘要生成         | 录音本地暂存  | 录音         |
| 路线规划   | 拜访路线展示、地图导航跳转        | 缓存只读      | 地图、导航   |
| 业绩看板   | 个人业绩、目标进度、团队排行      | 缓存只读      | —            |
| 消息中心   | 通知列表、审批消息、已读标记      | 缓存只读      | 订阅消息     |

#### 10.2.2 工作台首页

工作台作为小程序首页，聚合展示当日核心信息：

```typescript
// stores/workbench.ts
export const useWorkbenchStore = defineStore("workbench", () => {
  const todayTodos = ref<TodoItem[]>([]);
  const perfSummary = ref<PerfSummary | null>(null);
  const shortcuts = ref<Shortcut[]>([
    { icon: "checkin", label: "外勤签到", path: "/pages/visit/check-in" },
    { icon: "client", label: "新建客户", path: "/pages/client/create" },
    { icon: "voice", label: "语音记录", path: "/pages/voice/record" },
    { icon: "route", label: "路线规划", path: "/pages/visit/route-plan" },
  ]);

  async function loadDashboard() {
    const [todos, perf] = await Promise.all([
      api.getTodayTodos(),
      api.getPerfSummary(),
    ]);
    todayTodos.value = todos.data;
    perfSummary.value = perf.data;
    // 写入缓存供离线使用
    CacheStore.set("workbench_todos", todos.data, 30 * 60 * 1000);
    CacheStore.set("workbench_perf", perf.data, 30 * 60 * 1000);
  }

  return { todayTodos, perfSummary, shortcuts, loadDashboard };
});
```

#### 10.2.3 客户管理

支持列表浏览、搜索筛选、详情查看、新增跟进：

```typescript
// stores/client.ts
export const useClientStore = defineStore("client", () => {
  const clientList = ref<Client[]>([]);
  const currentClient = ref<ClientDetail | null>(null);
  const loading = ref(false);
  const hasMore = ref(true);
  const page = ref(1);

  async function fetchList(params: ClientQueryParams) {
    loading.value = true;
    try {
      const res = await request<PageResult<Client>>({
        url: "/api/v1/clients",
        method: "GET",
        data: { ...params, page: page.value, pageSize: 20 },
      });
      if (page.value === 1) {
        clientList.value = res.data.list;
      } else {
        clientList.value.push(...res.data.list);
      }
      hasMore.value = clientList.value.length < res.data.total;
      // 缓存前2页
      if (page.value <= 2) {
        CacheStore.set(
          `client_list_p${page.value}`,
          res.data.list,
          60 * 60 * 1000,
        );
      }
    } finally {
      loading.value = false;
    }
  }

  /** 新增跟进记录（支持离线） */
  async function addFollowUp(clientId: string, record: FollowUpInput) {
    return request({
      url: `/api/v1/clients/${clientId}/follow-ups`,
      method: "POST",
      data: record,
      offlineSupport: true,
    });
  }

  return {
    clientList,
    currentClient,
    loading,
    hasMore,
    page,
    fetchList,
    addFollowUp,
  };
});
```

#### 10.2.4 外勤签到

签到流程：获取定位 → 距离校验 → 拍照 → 提交签到。

```typescript
// 签到核心逻辑
interface CheckInData {
  clientId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distance: number; // 与客户地址的距离(米)
  photoUrl: string;
  address: string; // 逆地理编码地址
  remark?: string;
  timestamp: number;
}

async function performCheckIn(
  clientId: string,
  clientLoc: { lat: number; lng: number },
) {
  // 1. 获取当前定位
  const loc = await WxBridge.getLocation();

  // 2. 计算距离
  const distance = calcDistance(loc.lat, loc.lng, clientLoc.lat, clientLoc.lng);
  if (distance > 500) {
    throw new Error(`距离客户地址${distance}米，超出500米签到范围`);
  }

  // 3. 拍照
  const photo = await WxBridge.takePhoto(true);

  // 4. 上传照片
  const photoUrl = await uploadFile(photo.tempPath);

  // 5. 逆地理编码
  const address = await reverseGeocode(loc.lat, loc.lng);

  // 6. 提交签到（支持离线）
  return request<CheckInData>({
    url: "/api/v1/visits/check-in",
    method: "POST",
    data: {
      clientId,
      latitude: loc.lat,
      longitude: loc.lng,
      accuracy: loc.accuracy,
      distance,
      photoUrl,
      address,
      timestamp: Date.now(),
    },
    offlineSupport: true,
  });
}
```

#### 10.2.5 语音记录

录音 → 上传 → ASR转写 → AI摘要提取，全流程设计：

```typescript
// pages/voice/record.vue 核心逻辑
const recorder = WxBridge.createRecorder();
const recording = ref(false);
const audioPath = ref("");
const transcript = ref("");
const aiSummary = ref("");

function startRecord() {
  recorder.start(600); // 最长10分钟
  recording.value = true;
}

recorder.onStop(async (res) => {
  recording.value = false;
  audioPath.value = res.tempFilePath;

  // 上传录音文件
  const fileUrl = await uploadFile(res.tempFilePath);

  // 请求ASR转写
  const asrRes = await request<{ text: string }>({
    url: "/api/v1/voice/transcribe",
    method: "POST",
    data: { audioUrl: fileUrl, duration: res.duration },
  });
  transcript.value = asrRes.data.text;

  // 请求AI摘要
  const summaryRes = await request<{
    summary: string;
    keyPoints: string[];
    nextAction: string;
  }>({
    url: "/api/v1/ai/summarize",
    method: "POST",
    data: { text: transcript.value, scene: "sales_visit" },
  });
  aiSummary.value = summaryRes.data.summary;
});
```

#### 10.2.6 路线规划

基于当日拜访计划，调用腾讯地图SDK生成最优路线：

```typescript
async function planRoute(visitPlan: VisitPlanItem[]) {
  const currentLoc = await WxBridge.getLocation();
  const waypoints = visitPlan.map((v) => ({
    id: v.clientId,
    name: v.clientName,
    lat: v.latitude,
    lng: v.longitude,
  }));

  // 请求后端计算最优路线顺序（TSP算法）
  const routeRes = await request<{
    orderedWaypoints: typeof waypoints;
    totalDistance: number;
  }>({
    url: "/api/v1/visits/route-optimize",
    method: "POST",
    data: {
      origin: { lat: currentLoc.lat, lng: currentLoc.lng },
      waypoints,
    },
  });

  return routeRes.data;
}

// 调起微信导航
function navigateTo(lat: number, lng: number, name: string) {
  uni.openLocation({ latitude: lat, longitude: lng, name, scale: 16 });
}
```

#### 10.2.7 业绩看板与消息中心

业绩看板展示个人销售额、目标完成率、团队排名；消息中心聚合系统通知与审批消息，支持消息分类与已读状态管理。两个模块均采用缓存只读模式支持弱网场景。

---

### 10.3 离线支持设计

#### 10.3.1 本地缓存策略

```typescript
// services/cache-store.ts
interface CacheEntry<T> {
  data: T;
  expireAt: number; // 过期时间戳
  version: number; // 数据版本号
}

export class CacheStore {
  private static PREFIX = "crm_cache_";

  /** 写入缓存 */
  static set<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      expireAt: Date.now() + ttl,
      version: Date.now(),
    };
    uni.setStorageSync(this.PREFIX + key, JSON.stringify(entry));
  }

  /** 读取缓存，过期返回null */
  static get<T>(key: string): T | null {
    try {
      const raw = uni.getStorageSync(this.PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expireAt) {
        uni.removeStorageSync(this.PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  /** 清理所有过期缓存 */
  static cleanup(): void {
    const info = uni.getStorageInfoSync();
    info.keys
      .filter((k) => k.startsWith(this.PREFIX))
      .forEach((k) => {
        try {
          const entry = JSON.parse(uni.getStorageSync(k));
          if (Date.now() > entry.expireAt) uni.removeStorageSync(k);
        } catch {
          uni.removeStorageSync(k);
        }
      });
  }
}
```

**缓存策略矩阵：**

| 数据类型          | 缓存时长 | 存储上限 | 更新策略       |
| ----------------- | -------- | -------- | -------------- |
| 客户列表（前2页） | 1小时    | 200条    | 下拉刷新时更新 |
| 客户详情          | 30分钟   | 最近50个 | 进入页面时刷新 |
| 工作台数据        | 30分钟   | —        | 每次进入刷新   |
| 业绩数据          | 15分钟   | —        | 手动刷新       |
| 用户配置          | 24小时   | —        | 登录时刷新     |

#### 10.3.2 离线队列

```typescript
// services/offline-queue.ts
interface QueueItem {
  id: string;
  config: RequestConfig;
  createdAt: number;
  retryCount: number;
  maxRetry: number;
  status: "pending" | "syncing" | "failed";
}

export class OfflineQueue {
  private static STORAGE_KEY = "crm_offline_queue";
  private static MAX_QUEUE_SIZE = 50;

  /** 入队 */
  static async enqueue(config: RequestConfig): Promise<string> {
    const queue = this.getQueue();
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error("离线队列已满，请联网后重试");
    }
    const item: QueueItem = {
      id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      config,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetry: 3,
      status: "pending",
    };
    queue.push(item);
    this.saveQueue(queue);
    uni.showToast({ title: "已保存，联网后自动同步", icon: "none" });
    return item.id;
  }

  /** 联网后自动同步 */
  static async syncAll(): Promise<{ success: number; failed: number }> {
    const queue = this.getQueue();
    const pending = queue.filter((i) => i.status === "pending");
    let success = 0,
      failed = 0;

    for (const item of pending) {
      item.status = "syncing";
      try {
        await request(item.config);
        // 同步成功，移除
        const idx = queue.findIndex((i) => i.id === item.id);
        if (idx > -1) queue.splice(idx, 1);
        success++;
      } catch {
        item.retryCount++;
        item.status = item.retryCount >= item.maxRetry ? "failed" : "pending";
        failed++;
      }
    }

    this.saveQueue(queue);
    return { success, failed };
  }

  private static getQueue(): QueueItem[] {
    try {
      return JSON.parse(uni.getStorageSync(this.STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  private static saveQueue(queue: QueueItem[]): void {
    uni.setStorageSync(this.STORAGE_KEY, JSON.stringify(queue));
  }
}
```

#### 10.3.3 网络监测与自动同步

```typescript
// services/net-monitor.ts
export class NetMonitor {
  private static isOnline = true;

  static init() {
    uni.onNetworkStatusChange((res) => {
      const wasOffline = !this.isOnline;
      this.isOnline = res.isConnected;

      if (wasOffline && res.isConnected) {
        // 从离线恢复在线 → 触发自动同步
        console.log("[NetMonitor] 网络恢复，开始同步离线数据");
        OfflineQueue.syncAll().then(({ success, failed }) => {
          if (success > 0) {
            uni.showToast({
              title: `已同步${success}条离线数据`,
              icon: "success",
            });
          }
          if (failed > 0) {
            uni.showToast({ title: `${failed}条数据同步失败`, icon: "none" });
          }
        });
      }
    });
  }

  static get online() {
    return this.isOnline;
  }
}
```

#### 10.3.4 数据冲突解决策略

| 冲突类型         | 解决策略             | 说明                                                               |
| ---------------- | -------------------- | ------------------------------------------------------------------ |
| 客户信息修改冲突 | **服务端时间戳优先** | 比较 `updatedAt`，后提交者收到冲突提示，可选择覆盖或放弃           |
| 跟进记录冲突     | **仅追加，不冲突**   | 跟进记录为追加型数据，不同终端提交的记录均保留                     |
| 签到记录冲突     | **客户端时间为准**   | 离线签到以设备记录的时间戳和定位为准，服务端标记`offline_sync`标签 |
| 客户状态变更冲突 | **乐观锁 + 提示**    | 提交时携带`version`字段，版本不匹配时返回冲突并提示用户刷新后重试  |

冲突检测的请求头约定：

```
X-Data-Version: 1709456000000     // 客户端数据版本
X-Offline-Timestamp: 1709455000000 // 离线操作时间
X-Sync-Mode: offline              // 离线同步标记
```

---

### 10.4 页面设计

#### 10.4.1 工作台首页

```
┌──────────────────────────────────┐
│ ◀  AI智能CRM         [消息铃铛]  │  ← 顶部导航栏
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │  早上好，张经理               │ │  ← 用户问候区
│ │  今日待办 5项 · 已完成 2项    │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │  本月业绩          目标完成率 │ │  ← 业绩概览卡片
│ │  ¥128,500           64.3%   │ │
│ │  ████████████░░░░░░░░░░░░░  │ │     进度条
│ │  目标 ¥200,000  排名 第3/15  │ │
│ └──────────────────────────────┘ │
│                                  │
│  快捷操作                        │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ │[签到]│ │[客户]│ │[语音]│ │[路线]││ ← 4个快捷入口
│ │外勤  │ │新建  │ │记录  │ │规划  ││
│ └──────┘ └──────┘ └──────┘ └──────┘│
│                                  │
│  今日待办                  查看全部>│
│ ┌──────────────────────────────┐ │
│ │ ○ 10:00 拜访 华为科技         │ │  ← 待办列表
│ │ ✓ 11:30 电话回访 腾讯云       │ │     已完成置灰+勾选
│ │ ○ 14:00 合同签署 阿里巴巴     │ │
│ │ ○ 15:30 需求沟通 字节跳动     │ │
│ └──────────────────────────────┘ │
│                                  │
├──────────────────────────────────┤
│  [工作台]  [客户]  [+]  [业绩]  [我的] │ ← 底部TabBar
└──────────────────────────────────┘
```

**组件说明：**

| 组件         | 说明                                   |
| ------------ | -------------------------------------- |
| UserGreeting | 根据时段显示问候语，展示待办统计       |
| PerfCard     | 当月业绩金额、目标进度条、排名         |
| QuickActions | 4宫格快捷操作入口，点击跳转对应页面    |
| TodoList     | 今日待办列表，支持勾选完成，按时间排序 |

#### 10.4.2 客户列表页

```
┌──────────────────────────────────┐
│ ◀  客户管理           [+新建]    │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ 🔍 搜索客户名称/联系人/电话  │ │  ← 搜索栏
│ └──────────────────────────────┘ │
│                                  │
│ [全部] [我的] [近期跟进] [未跟进]  │  ← 筛选Tab
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 华为科技有限公司          A级 │ │  ← ClientCard组件
│ │ 联系人：李明  138****1234    │ │
│ │ 最近跟进：2天前              │ │
│ │ 商机：¥500,000  谈判阶段     │ │
│ ├──────────────────────────────┤ │
│ │ 腾讯云计算有限公司        B级 │ │
│ │ 联系人：王芳  139****5678    │ │
│ │ 最近跟进：5天前              │ │
│ │ 商机：¥320,000  方案阶段     │ │
│ ├──────────────────────────────┤ │
│ │ 阿里巴巴集团             A级 │ │
│ │ 联系人：赵刚  137****9012    │ │
│ │ 最近跟进：1天前              │ │
│ │ 商机：¥800,000  签约阶段     │ │
│ └──────────────────────────────┘ │
│                                  │
│         ↑ 上拉加载更多 ↑         │
├──────────────────────────────────┤
│  [工作台]  [客户]  [+]  [业绩]  [我的] │
└──────────────────────────────────┘
```

#### 10.4.3 客户详情页

```
┌──────────────────────────────────┐
│ ◀  客户详情         [编辑] [...]  │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │  华为科技有限公司             │ │  ← 基础信息区
│ │  等级：A级    行业：通信       │ │
│ │  来源：展会   负责人：张经理   │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌────────┐ ┌────────┐ ┌────────┐│
│ │ 拨打电话 │ │ 外勤签到 │ │ 语音记录 ││ ← 快捷操作栏
│ └────────┘ └────────┘ └────────┘│
│                                  │
│ [联系人] [商机] [跟进] [文档]     │  ← 详情Tab
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                  │
│  跟进记录                 +新增  │
│                                  │
│  ● 03-02 14:30  电话沟通         │  ← 时间线组件
│  │ 确认了技术方案，客户需要       │
│  │ 内部审批，预计下周答复         │
│  │ [AI摘要] [录音]               │
│  │                               │
│  ● 02-28 10:00  上门拜访         │
│  │ 产品演示，客户反馈满意         │
│  │ [签到记录] [拍照]             │
│  │                               │
│  ● 02-25 16:00  初次接触         │
│  │ 展会上交换名片，客户对         │
│  │ CRM产品有采购意向              │
│                                  │
└──────────────────────────────────┘
```

#### 10.4.4 拜访签到页

```
┌──────────────────────────────────┐
│ ◀  外勤签到                      │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │         [ 地 图 区 域 ]       │ │  ← 地图组件
│ │                              │ │     显示当前位置(蓝点)
│ │    📍当前位置                  │ │     和客户位置(红标)
│ │              🏢客户地址        │ │
│ │                              │ │
│ │   距离客户: 128米  ✓ 范围内   │ │  ← 距离校验结果
│ └──────────────────────────────┘ │
│                                  │
│  签到客户                        │
│ ┌──────────────────────────────┐ │
│ │ 华为科技有限公司          ▼  │ │  ← 客户选择器
│ └──────────────────────────────┘ │
│                                  │
│  签到照片                        │
│ ┌─────────┐                     │
│ │         │                     │
│ │  [拍照]  │   点击拍照上传      │  ← 拍照区域
│ │  +       │                    │
│ └─────────┘                     │
│                                  │
│  备注                            │
│ ┌──────────────────────────────┐ │
│ │ 请输入签到备注（选填）...     │ │  ← 备注输入框
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │        ✓  确认签到            │ │  ← 签到按钮
│ └──────────────────────────────┘ │
│  定位精度: 10m  地址: 深圳南山..  │  ← 定位信息
└──────────────────────────────────┘
```

**组件说明：**

| 组件          | 说明                                                       |
| ------------- | ---------------------------------------------------------- |
| MapView       | `<map>` 组件，展示客户位置标记与当前位置，实时计算距离     |
| DistanceBadge | 距离校验状态指示：绿色(<=500m可签到) / 红色(>500m不可签到) |
| PhotoCapture  | 调用相机拍照，支持压缩与预览，最多3张                      |
| ClientPicker  | 客户选择弹窗，支持搜索，选中后地图自动定位到客户地址       |

#### 10.4.5 语音记录页

```
┌──────────────────────────────────┐
│ ◀  语音记录                      │
├──────────────────────────────────┤
│                                  │
│  关联客户                        │
│ ┌──────────────────────────────┐ │
│ │ 华为科技有限公司          ▼  │ │  ← 关联客户(选填)
│ └──────────────────────────────┘ │
│                                  │
│             05:32                │  ← 录音时长
│                                  │
│        ~~~~~~~~~~~               │  ← 声波动画
│       ~~~~~~~~~~~~~              │
│        ~~~~~~~~~~~               │
│                                  │
│     [ ● 长按录音 / ■ 停止 ]      │  ← 录音控制按钮
│                                  │
│ ┌──────────────────────────────┐ │
│ │  转写结果                     │ │
│ │                              │ │  ← ASR转写文本区
│ │  今天和华为李总沟通了CRM系    │ │     可编辑修正
│ │  统的部署方案，他们希望采用    │ │
│ │  私有化部署，预算在50万左右    │ │
│ │  ...                         │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │  AI智能摘要            [刷新] │ │
│ │ ─────────────────────────── │ │
│ │ 摘要：与华为讨论私有化部署    │ │  ← AI分析结果
│ │ 关键点：                     │ │
│ │  · 客户倾向私有化部署方案     │ │
│ │  · 预算约50万               │ │
│ │ 下一步：                     │ │
│ │  · 准备私有化部署报价方案     │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │    保存为跟进记录              │ │  ← 保存按钮
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

---

### 10.5 接口设计

#### 10.5.1 小程序专用API列表

| 序号 | 接口         | 方法 | 路径                              | 说明            | 离线 |
| ---- | ------------ | ---- | --------------------------------- | --------------- | ---- |
| 1    | 微信登录     | POST | /api/v1/auth/wx-login             | code换token     | —    |
| 2    | 绑定手机号   | POST | /api/v1/auth/bind-phone           | 绑定微信手机号  | —    |
| 3    | 刷新Token    | POST | /api/v1/auth/refresh              | 刷新访问令牌    | —    |
| 4    | 获取用户信息 | GET  | /api/v1/user/profile              | 当前用户信息    | 缓存 |
| 5    | 工作台概览   | GET  | /api/v1/workbench/overview        | 首页聚合数据    | 缓存 |
| 6    | 今日待办列表 | GET  | /api/v1/workbench/todos           | 今日待办任务    | 缓存 |
| 7    | 完成待办     | PUT  | /api/v1/workbench/todos/:id/done  | 标记完成        | 队列 |
| 8    | 客户列表     | GET  | /api/v1/clients                   | 分页+筛选+搜索  | 缓存 |
| 9    | 客户详情     | GET  | /api/v1/clients/:id               | 客户完整信息    | 缓存 |
| 10   | 新建客户     | POST | /api/v1/clients                   | 创建客户        | 队列 |
| 11   | 编辑客户     | PUT  | /api/v1/clients/:id               | 修改客户信息    | 队列 |
| 12   | 客户联系人   | GET  | /api/v1/clients/:id/contacts      | 联系人列表      | 缓存 |
| 13   | 跟进记录列表 | GET  | /api/v1/clients/:id/follow-ups    | 跟进历史        | 缓存 |
| 14   | 新增跟进记录 | POST | /api/v1/clients/:id/follow-ups    | 添加跟进        | 队列 |
| 15   | 客户商机列表 | GET  | /api/v1/clients/:id/opportunities | 关联商机        | 缓存 |
| 16   | 外勤签到     | POST | /api/v1/visits/check-in           | 定位+拍照签到   | 队列 |
| 17   | 签到记录列表 | GET  | /api/v1/visits/records            | 签到历史        | 缓存 |
| 18   | 签到详情     | GET  | /api/v1/visits/records/:id        | 签到详细信息    | 缓存 |
| 19   | 路线优化     | POST | /api/v1/visits/route-optimize     | TSP最优路线     | —    |
| 20   | 今日拜访计划 | GET  | /api/v1/visits/plan/today         | 今日拜访清单    | 缓存 |
| 21   | 附近客户     | GET  | /api/v1/visits/nearby             | LBS查找附近客户 | —    |
| 22   | 语音上传     | POST | /api/v1/voice/upload              | 上传录音文件    | —    |
| 23   | 语音转写     | POST | /api/v1/voice/transcribe          | ASR语音转文字   | —    |
| 24   | AI摘要       | POST | /api/v1/ai/summarize              | 文本智能摘要    | —    |
| 25   | AI下步建议   | POST | /api/v1/ai/next-action            | AI推荐下一步    | —    |
| 26   | 图片上传     | POST | /api/v1/files/upload/image        | 上传签到照片等  | —    |
| 27   | 业绩概览     | GET  | /api/v1/performance/summary       | 个人业绩汇总    | 缓存 |
| 28   | 业绩趋势     | GET  | /api/v1/performance/trend         | 月度趋势数据    | 缓存 |
| 29   | 团队排行榜   | GET  | /api/v1/performance/ranking       | 团队业绩排名    | 缓存 |
| 30   | 目标完成情况 | GET  | /api/v1/performance/targets       | 目标进度        | 缓存 |
| 31   | 消息列表     | GET  | /api/v1/messages                  | 通知消息分页    | 缓存 |
| 32   | 消息已读     | PUT  | /api/v1/messages/:id/read         | 标记已读        | 队列 |
| 33   | 未读数量     | GET  | /api/v1/messages/unread-count     | 未读消息统计    | —    |
| 34   | 审批列表     | GET  | /api/v1/approvals                 | 待审批列表      | 缓存 |
| 35   | 审批操作     | POST | /api/v1/approvals/:id/action      | 通过/驳回       | —    |
| 36   | 数据字典     | GET  | /api/v1/dict/options              | 行业/来源等选项 | 缓存 |

> **离线标识说明**：`缓存` = 支持离线读取缓存数据；`队列` = 支持离线写入排队，联网自动同步；`—` = 必须在线使用。

#### 10.5.2 关键接口请求/响应示例

**接口1：微信登录**

```
POST /api/v1/auth/wx-login
Content-Type: application/json

请求体：
{
  "code": "0c3Rnoll2VMM...",         // wx.login 获取的临时code
  "encryptedData": "CiyLU1Aw2...",   // 加密用户数据（可选）
  "iv": "r7BXXKkLb8qr..."            // 加密初始向量（可选）
}

响应（200 OK）：
{
  "code": 200,
  "message": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiI...",
    "refreshToken": "dGhpcyBpcyBhIHJl...",
    "expiresIn": 7200,
    "userInfo": {
      "userId": "u_20260301001",
      "name": "张经理",
      "avatar": "https://cdn.crm.com/avatar/001.jpg",
      "role": "sales_manager",
      "department": "华南销售一部"
    },
    "isNewUser": false,
    "needBindPhone": false
  },
  "timestamp": 1709280000000
}
```

**接口2：外勤签到**

```
POST /api/v1/visits/check-in
Authorization: Bearer eyJhbGciOiJ...
Content-Type: application/json

请求体：
{
  "clientId": "c_20260215001",
  "latitude": 22.543096,
  "longitude": 114.057865,
  "accuracy": 10.5,
  "distance": 128,
  "photoUrls": [
    "https://cdn.crm.com/visit/20260303_001.jpg"
  ],
  "address": "广东省深圳市南山区科技园南路华为基地A座",
  "remark": "与李总确认部署方案",
  "timestamp": 1709452800000,
  "offlineSync": false
}

响应（200 OK）：
{
  "code": 200,
  "message": "签到成功",
  "data": {
    "checkInId": "ci_20260303001",
    "clientId": "c_20260215001",
    "clientName": "华为科技有限公司",
    "checkInTime": "2026-03-03T10:00:00+08:00",
    "address": "广东省深圳市南山区科技园南路华为基地A座",
    "distance": 128,
    "photoUrls": [
      "https://cdn.crm.com/visit/20260303_001.jpg"
    ],
    "status": "valid",
    "todayCheckInCount": 3
  },
  "timestamp": 1709452800500
}
```

**接口3：语音转写 + AI摘要**

```
POST /api/v1/voice/transcribe
Authorization: Bearer eyJhbGciOiJ...
Content-Type: application/json

请求体：
{
  "audioUrl": "https://cdn.crm.com/voice/20260303_002.mp3",
  "duration": 332,
  "clientId": "c_20260215001",
  "language": "zh-CN"
}

响应（200 OK）：
{
  "code": 200,
  "message": "success",
  "data": {
    "transcriptId": "tr_20260303002",
    "text": "今天和华为的李总沟通了CRM系统的部署方案。他们倾向于私有化部署，安全性是首要考虑因素。预算方面大概在五十万左右，希望我们能够在四月底之前完成部署。另外他们还提到需要和现有的ERP系统做对接...",
    "duration": 332,
    "confidence": 0.94,
    "aiAnalysis": {
      "summary": "与华为李总讨论CRM私有化部署方案，客户重视安全性，预算约50万，期望4月底前完成。",
      "keyPoints": [
        "客户倾向私有化部署方案",
        "安全性是首要考虑因素",
        "预算约50万人民币",
        "期望4月底前完成部署",
        "需要与现有ERP系统对接"
      ],
      "sentiment": "positive",
      "nextActions": [
        "准备私有化部署技术方案与报价",
        "调研华为ERP系统接口规范",
        "预约下周进行技术对接会议"
      ]
    }
  },
  "timestamp": 1709453200000
}
```

---

### 10.6 安全与性能

#### 10.6.1 微信登录流程

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ 小程序端  │      │ CRM后端   │      │ 微信服务器 │      │ 数据库    │
└────┬─────┘      └────┬─────┘      └─────┬────┘      └────┬─────┘
     │                  │                   │                │
     │  1.wx.login()    │                   │                │
     │─────────────────>│                   │                │
     │  返回code        │                   │                │
     │<─────────────────│                   │                │
     │                  │                   │                │
     │  2.POST /wx-login (code)             │                │
     │─────────────────>│                   │                │
     │                  │  3.code2session   │                │
     │                  │  (appid+secret+   │                │
     │                  │   code)           │                │
     │                  │─────────────────>│                │
     │                  │  返回openid +     │                │
     │                  │  session_key      │                │
     │                  │<─────────────────│                │
     │                  │                   │                │
     │                  │  4.查询/创建用户  │                │
     │                  │──────────────────────────────────>│
     │                  │  返回用户信息     │                │
     │                  │<──────────────────────────────────│
     │                  │                   │                │
     │                  │  5.生成JWT        │                │
     │                  │  (accessToken +   │                │
     │                  │   refreshToken)   │                │
     │                  │                   │                │
     │  6.返回token +   │                   │                │
     │    userInfo      │                   │                │
     │<─────────────────│                   │                │
     │                  │                   │                │
     │  7.存储token     │                   │                │
     │  后续请求携带    │                   │                │
     │  Authorization   │                   │                │
     │                  │                   │                │
```

**Token管理策略：**

- `accessToken` 有效期2小时，过期后自动用 `refreshToken` 静默刷新
- `refreshToken` 有效期30天，过期后需重新执行微信登录
- Token存储在 `uni.setStorageSync` 中，采用AES加密存储
- 请求拦截器统一注入 `Authorization` 头，401响应自动触发刷新流程

#### 10.6.2 数据安全

**传输安全：**

| 措施      | 说明                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| HTTPS强制 | 所有API请求强制使用HTTPS，小程序平台本身要求TLS 1.2+                                         |
| 请求签名  | 关键写操作(签到/审批)增加请求签名：`Sign = HMAC-SHA256(timestamp + nonce + body, secretKey)` |
| 防重放    | 请求携带 `timestamp` + `nonce`，服务端校验时间窗口(±5分钟)并缓存nonce防重放                  |

**本地存储安全：**

```typescript
// utils/crypto.ts
import CryptoJS from "crypto-js";

const STORAGE_KEY = "crm_storage_secret"; // 由设备ID + 用户ID派生

export class SecureStorage {
  private static getKey(): string {
    // 基于设备指纹和用户ID派生加密密钥
    const deviceId = uni.getSystemInfoSync().deviceId || "default";
    const userId = uni.getStorageSync("uid") || "anonymous";
    return CryptoJS.SHA256(deviceId + userId + STORAGE_KEY)
      .toString()
      .slice(0, 32);
  }

  static setItem(key: string, value: any): void {
    const plaintext = JSON.stringify(value);
    const encrypted = CryptoJS.AES.encrypt(plaintext, this.getKey()).toString();
    uni.setStorageSync(`sec_${key}`, encrypted);
  }

  static getItem<T>(key: string): T | null {
    try {
      const encrypted = uni.getStorageSync(`sec_${key}`);
      if (!encrypted) return null;
      const bytes = CryptoJS.AES.decrypt(encrypted, this.getKey());
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch {
      return null;
    }
  }
}
```

**敏感数据处理规则：**

| 数据类型   | 存储方式               | 展示方式                     |
| ---------- | ---------------------- | ---------------------------- |
| Token      | AES加密存储            | 不展示                       |
| 客户手机号 | 明文缓存               | 中间4位脱敏：138\*\*\*\*1234 |
| 定位信息   | 明文缓存（短期）       | 正常展示                     |
| 签到照片   | 仅存URL，不缓存图片    | 正常展示                     |
| 录音文件   | 上传后删除本地临时文件 | 在线播放                     |

#### 10.6.3 性能优化

**（1）分包加载**

```json
// pages.json 分包配置
{
  "pages": [
    {
      "path": "pages/workbench/index",
      "style": { "navigationBarTitleText": "工作台" }
    },
    {
      "path": "pages/client/list",
      "style": { "navigationBarTitleText": "客户管理" }
    },
    {
      "path": "pages/message/index",
      "style": { "navigationBarTitleText": "消息" }
    }
  ],
  "subPackages": [
    {
      "root": "pages-visit",
      "name": "visit",
      "pages": [
        {
          "path": "check-in",
          "style": { "navigationBarTitleText": "外勤签到" }
        },
        {
          "path": "route-plan",
          "style": { "navigationBarTitleText": "路线规划" }
        }
      ]
    },
    {
      "root": "pages-voice",
      "name": "voice",
      "pages": [
        { "path": "record", "style": { "navigationBarTitleText": "语音记录" } }
      ]
    },
    {
      "root": "pages-perf",
      "name": "performance",
      "pages": [
        {
          "path": "dashboard",
          "style": { "navigationBarTitleText": "业绩看板" }
        }
      ]
    }
  ],
  "preloadRule": {
    "pages/workbench/index": {
      "network": "wifi",
      "packages": ["visit", "voice"]
    }
  }
}
```

**分包规划：**

| 包名        | 内容                                 | 预估大小 |
| ----------- | ------------------------------------ | -------- |
| 主包        | 工作台、客户列表、消息中心、TabBar页 | ≤1.5MB   |
| visit       | 外勤签到、路线规划（含地图SDK）      | ≤800KB   |
| voice       | 语音记录（含录音、音频播放组件）     | ≤500KB   |
| performance | 业绩看板（含图表库）                 | ≤600KB   |

**（2）图片压缩**

```typescript
// utils/image.ts
export async function compressImage(
  src: string,
  quality: number = 80,
  maxWidth: number = 1280,
): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality,
      compressedWidth: maxWidth,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    });
  });
}

// 签到拍照后自动压缩
async function captureAndCompress(): Promise<string> {
  const photo = await WxBridge.takePhoto(false); // 先取原图
  // 超过500KB则压缩
  if (photo.size > 500 * 1024) {
    return compressImage(photo.tempPath, 70, 1280);
  }
  return photo.tempPath;
}
```

**（3）列表虚拟滚动**

```vue
<!-- components/common/VirtualList.vue -->
<template>
  <scroll-view
    scroll-y
    :style="{ height: viewportHeight + 'px' }"
    @scroll="onScroll"
    @scrolltolower="$emit('load-more')"
  >
    <view :style="{ height: totalHeight + 'px', position: 'relative' }">
      <view
        :style="{
          position: 'absolute',
          top: offsetTop + 'px',
          width: '100%',
        }"
      >
        <view
          v-for="item in visibleItems"
          :key="item._index"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item" :index="item._index" />
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  items: any[];
  itemHeight: number;
  viewportHeight: number;
  buffer?: number;
}>();

const scrollTop = ref(0);
const bufferSize = props.buffer ?? 5;

const totalHeight = computed(() => props.items.length * props.itemHeight);

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - bufferSize),
);

const endIndex = computed(() =>
  Math.min(
    props.items.length,
    Math.ceil((scrollTop.value + props.viewportHeight) / props.itemHeight) +
      bufferSize,
  ),
);

const offsetTop = computed(() => startIndex.value * props.itemHeight);

const visibleItems = computed(() =>
  props.items.slice(startIndex.value, endIndex.value).map((item, i) => ({
    ...item,
    _index: startIndex.value + i,
  })),
);

function onScroll(e: any) {
  scrollTop.value = e.detail.scrollTop;
}
</script>
```

**（4）其他性能优化措施**

| 优化项      | 实施方案                                     | 预期效果         |
| ----------- | -------------------------------------------- | ---------------- |
| 首屏渲染    | 工作台数据预取 + 骨架屏                      | 首屏时间 <1.5s   |
| 接口请求    | 工作台首页聚合接口，一次请求返回所有数据     | 减少请求数 5→1   |
| 图片懒加载  | `<image lazy-load>` + CDN缩略图参数 `?w=200` | 列表流畅滚动     |
| 数据预加载  | 从列表页进详情前预请求详情接口               | 详情页秒开       |
| 缓存复用    | `onShow` 时优先展示缓存，后台刷新后差量更新  | 页面即时可见     |
| 长列表回收  | 超出视窗的列表项用占位节点替代               | 内存占用降低60%  |
| setData优化 | 仅更新变化的数据路径，避免大对象整体传输     | 渲染性能提升     |
| 分包预下载  | WiFi环境下预下载高频子包                     | 子页面打开无延迟 |

---

以上为微信小程序的完整详细设计，涵盖技术架构、功能模块、离线支持、页面布局、接口规范以及安全与性能方案。各模块设计均遵循 uni-app + Vue 3 + TypeScript + Pinia 技术栈规范，充分利用微信小程序原生能力，并通过离线队列与本地缓存机制保障弱网及无网环境下的基本可用性。
