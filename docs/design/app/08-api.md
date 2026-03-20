# 08 — 后端接口对接

## 复用接口清单

APP 100% 复用现有 NestJS 后端 (`@crm/server`) 接口，无需 BFF 层。

### Auth 模块

| 方法 | 路径                      | 说明       | APP 使用            |
| ---- | ------------------------- | ---------- | ------------------- |
| POST | `/api/v1/auth/login`      | 密码登录   | ✅ deviceType='app' |
| POST | `/api/v1/auth/wx-login`   | 微信登录   | ✅ 小程序端         |
| POST | `/api/v1/auth/bind-phone` | 绑定手机号 | ✅ 小程序端         |
| POST | `/api/v1/auth/refresh`    | 刷新 Token | ✅ 自动刷新         |
| POST | `/api/v1/auth/logout`     | 登出       | ✅                  |

### Customer 模块

| 方法   | 路径                               | 说明                       | APP 使用         |
| ------ | ---------------------------------- | -------------------------- | ---------------- |
| GET    | `/api/v1/customers`                | 客户列表（分页/筛选/排序） | ✅               |
| GET    | `/api/v1/customers/:id`            | 客户详情                   | ✅               |
| POST   | `/api/v1/customers`                | 新建客户                   | ✅               |
| PUT    | `/api/v1/customers/:id`            | 编辑客户                   | ✅               |
| DELETE | `/api/v1/customers/:id`            | 删除客户                   | ✅ Manager/Admin |
| POST   | `/api/v1/customers/batch/release`  | 批量转公海                 | ✅ Manager/Admin |
| POST   | `/api/v1/customers/batch/transfer` | 批量转让                   | ✅ Manager/Admin |

### Opportunity 模块

| 方法   | 路径                        | 说明          | APP 使用         |
| ------ | --------------------------- | ------------- | ---------------- |
| GET    | `/api/v1/opportunities`     | 商机列表      | ✅               |
| GET    | `/api/v1/opportunities/:id` | 商机详情      | ✅               |
| POST   | `/api/v1/opportunities`     | 新建商机      | ✅               |
| PUT    | `/api/v1/opportunities/:id` | 编辑/阶段变更 | ✅               |
| DELETE | `/api/v1/opportunities/:id` | 删除商机      | ✅ Manager/Admin |

### CallRecord 模块

| 方法 | 路径                        | 说明               | APP 使用                   |
| ---- | --------------------------- | ------------------ | -------------------------- |
| GET  | `/api/v1/call-records`      | 通话记录列表       | ✅                         |
| GET  | `/api/v1/call-records/:id`  | 通话详情 + AI 分析 | ✅                         |
| POST | `/api/v1/call-records`      | 创建通话记录       | ✅ 通话后提交              |
| POST | `/api/v1/recordings/upload` | 上传录音(语音速记) | ✅ sourceType='voice_memo' |

### FollowUp 模块

| 方法 | 路径                     | 说明     | APP 使用        |
| ---- | ------------------------ | -------- | --------------- |
| GET  | `/api/v1/follow-ups`     | 跟进列表 | ✅              |
| POST | `/api/v1/follow-ups`     | 新建跟进 | ✅ 离线队列支持 |
| PUT  | `/api/v1/follow-ups/:id` | 编辑跟进 | ✅              |

### SalesTarget 模块

| 方法 | 路径                           | 说明     | APP 使用    |
| ---- | ------------------------------ | -------- | ----------- |
| GET  | `/api/v1/sales-target/current` | 当前目标 | ✅ 工作台PK |
| GET  | `/api/v1/sales-target/my`      | 个人业绩 | ✅ 个人中心 |
| GET  | `/api/v1/sales-target/ranking` | 排行榜   | ✅ PK排行   |

### Knowledge 模块

| 方法 | 路径                             | 说明     | APP 使用 |
| ---- | -------------------------------- | -------- | -------- |
| GET  | `/api/v1/knowledge/articles`     | 文章列表 | ✅       |
| GET  | `/api/v1/knowledge/articles/:id` | 文章详情 | ✅       |
| GET  | `/api/v1/knowledge/categories`   | 分类列表 | ✅       |

### Notification 模块

| 方法 | 路径                             | 说明               | APP 使用 |
| ---- | -------------------------------- | ------------------ | -------- |
| GET  | `/api/v1/notifications`          | 通知列表           | ✅       |
| PUT  | `/api/v1/notifications/:id/read` | 标记已读           | ✅       |
| WS   | `/ws`                            | WebSocket 实时通知 | ✅       |

### Route 模块

| 方法 | 路径                     | 说明     | APP 使用 |
| ---- | ------------------------ | -------- | -------- |
| POST | `/api/v1/route/optimize` | 路线优化 | ✅       |

### Dashboard 模块

| 方法 | 路径                      | 说明     | APP 使用      |
| ---- | ------------------------- | -------- | ------------- |
| GET  | `/api/v1/dashboard/stats` | 统计概览 | ✅ 工作台卡片 |

### AI 模块

| 方法 | 路径              | 说明        | APP 使用 |
| ---- | ----------------- | ----------- | -------- |
| POST | `/api/v1/ai/chat` | AI 助理对话 | ✅       |

---

## 新增后端模块

### Push 推送模块 (新建)

| 方法   | 路径                      | 说明             |
| ------ | ------------------------- | ---------------- |
| POST   | `/api/v1/push/register`   | 注册设备 Token   |
| DELETE | `/api/v1/push/unregister` | 注销设备         |
| POST   | `/api/v1/push/send`       | 下发推送 (Admin) |
| GET    | `/api/v1/push/settings`   | 推送偏好         |
| PUT    | `/api/v1/push/settings`   | 更新推送偏好     |

### CheckIn 签到模块 (新建)

| 方法 | 路径                   | 说明         |
| ---- | ---------------------- | ------------ |
| POST | `/api/v1/check-in`     | 创建签到记录 |
| GET  | `/api/v1/check-in`     | 签到记录列表 |
| GET  | `/api/v1/check-in/:id` | 签到详情     |

### CloudCall 云呼叫中心模块 (新建)

| 方法 | 路径                               | 说明                             |
| ---- | ---------------------------------- | -------------------------------- |
| POST | `/api/v1/cloud-call/initiate`      | 发起回呼 (销售手机→客户)         |
| GET  | `/api/v1/cloud-call/:id/status`    | 查询通话状态                     |
| GET  | `/api/v1/cloud-call/:id/recording` | 获取录音文件 URL                 |
| POST | `/api/v1/cloud-call/callback`      | 云端通话结束回调 (webhook, 内部) |
| GET  | `/api/v1/cloud-call/balance`       | 查询线路余额 (Admin)             |
| PUT  | `/api/v1/cloud-call/settings`      | 云呼配置 (服务商/线路, Admin)    |
| GET  | `/api/v1/cloud-call/settings`      | 获取云呼配置                     |

#### 发起回呼 Request

```json
POST /api/v1/cloud-call/initiate
{
  "customerId": "uuid",
  "customerPhone": "13812345678",
  "callerPhone": "13987654321"
}
```

#### 发起回呼 Response

```json
{
  "code": 0,
  "data": {
    "callId": "cloud-call-uuid",
    "status": "initiating",
    "estimatedWaitSeconds": 5
  }
}
```

#### 云端回调 Webhook

```json
POST /api/v1/cloud-call/callback
{
  "callId": "cloud-call-uuid",
  "status": "ended",
  "duration": 185,
  "recordingUrl": "https://oss.example.com/recordings/xxx.mp3",
  "callerDuration": 190,
  "calleeDuration": 185,
  "hangupSide": "callee",
  "timestamp": 1710000000
}
```

回调触发异步处理 (Bull Queue):

1. 下载录音文件到 OSS
2. ASR 语音转写
3. AI 分析 (摘要/评分/意向)
4. 更新 CallRecord + Push 通知 APP

### APP 版本模块 (新建)

| 方法 | 路径                        | 说明             |
| ---- | --------------------------- | ---------------- |
| GET  | `/api/v1/app/version`       | 获取最新版本信息 |
| GET  | `/api/v1/app/version/check` | 检查更新         |

---

## 响应格式

所有接口统一响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 分页响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 错误响应

```json
{
  "code": 40001,
  "message": "参数错误: phone 格式不正确",
  "data": null
}
```

### 错误码

| 范围  | 含义                       |
| ----- | -------------------------- |
| 0     | 成功                       |
| 400xx | 参数错误                   |
| 401xx | 认证错误 (Token 过期/无效) |
| 403xx | 权限错误 (角色不足)        |
| 404xx | 资源不存在                 |
| 500xx | 服务器内部错误             |

---

## 请求配置

### 基础配置 (api/request.ts)

```typescript
const baseURL = import.meta.env.VITE_API_BASE_URL;

// 请求拦截
function requestInterceptor(config) {
  const token = uni.getStorageSync("crm_token");
  if (token) {
    config.header.Authorization = `Bearer ${token}`;
  }
  return config;
}

// 响应拦截
function responseInterceptor(response) {
  if (response.statusCode === 401) {
    // 尝试刷新 Token，失败则跳转登录
    return refreshAndRetry(response);
  }
  if (response.data.code !== 0) {
    uni.showToast({ title: response.data.message, icon: "none" });
    return Promise.reject(response.data);
  }
  return response.data.data;
}
```

### 超时配置

| 请求类型 | 超时时间 | 说明           |
| -------- | -------- | -------------- |
| 普通请求 | 15s      | 列表/详情/CRUD |
| 文件上传 | 60s      | 录音/图片上传  |
| AI 请求  | 30s      | AI 对话/分析   |

### 环境变量

| 环境        | VITE_API_BASE_URL                     |
| ----------- | ------------------------------------- |
| development | `http://localhost:3000`               |
| staging     | `https://api-staging.crm.example.com` |
| production  | `https://api.crm.example.com`         |
