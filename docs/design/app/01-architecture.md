# 01 — 系统架构

## 整体架构图

```
┌─────────────────────────────────────────────────┐
│                   用户设备                       │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ iOS APP   │  │Android APP│  │ 微信小程序    │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│        └──────────┬───┘               │          │
│            uni-app 运行时              │          │
│        ┌──────────┴───────────────────┘          │
│        │      @crm/miniapp (Vue 3 + Pinia)       │
│        │  ┌──────┬──────┬───────┬──────────┐     │
│        │  │Pages │Store │ API   │ Utils    │     │
│        │  │ (Vue)│(Pinia│Layer  │(cache,   │     │
│        │  │      │)     │       │offline)  │     │
│        │  └──────┴──────┴───┬───┴──────────┘     │
│        │                    │                    │
│        │        ┌───────────┴──────────┐         │
│        │        │  原生能力 (Plus API)  │         │
│        │        │  Push/GPS/OCR/SIM    │         │
│        │        └──────────────────────┘         │
└─────────────────────────┬───────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────┐
│              @crm/server (NestJS)                │
│  ┌──────────────────────────────────────────┐   │
│  │ API Gateway: /api/v1/*                    │   │
│  │ JWT Auth + RBAC + Rate Limit + Audit Log  │   │
│  ├──────────────────────────────────────────┤   │
│  │ Modules:                                  │   │
│  │ Auth│Customer│Opportunity│CallRecord│...  │   │
│  │ FollowUp│SalesTarget│Knowledge│Push│...  │   │
│  ├──────────────────────────────────────────┤   │
│  │ MySQL 8.0 │ Redis 7 │ Bull Queue         │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 包结构

```
crm-sales-platform/
├── packages/
│   ├── shared/          # @crm/shared — 共享类型、枚举
│   ├── server/          # @crm/server — NestJS 后端
│   ├── web/             # @crm/web — PC 管理端
│   └── miniapp/         # @crm/miniapp — APP + 小程序
│       ├── src/
│       │   ├── pages/           # 页面 (Vue SFC)
│       │   ├── components/      # 公共组件
│       │   ├── api/             # API 适配层
│       │   ├── stores/          # Pinia 状态
│       │   ├── utils/           # 工具 (缓存/离线/地理)
│       │   ├── native/          # 原生能力封装 (新增)
│       │   │   ├── push.ts      # 推送注册/处理
│       │   │   ├── camera-ocr.ts# 拍照取号
│       │   │   ├── sim-card.ts  # 双卡检测/切换
│       │   │   ├── gps.ts       # 高精度定位
│       │   │   └── biometric.ts # 生物识别
│       │   └── static/          # 图标/图片
│       ├── pages.json           # 路由配置
│       ├── manifest.json        # APP 配置
│       └── vite.config.ts       # 构建配置
```

## 分层架构

```
┌─────────────────────────────────┐
│          View Layer (Pages)      │  Vue 3 SFC + <script setup>
├─────────────────────────────────┤
│        Store Layer (Pinia)       │  user.ts / app.ts / call-state.ts
├─────────────────────────────────┤
│         API Layer (api/)         │  uni.request 封装，JWT 注入
├─────────────────────────────────┤
│       Utils Layer (utils/)       │  cache-store / offline-queue / geo
├─────────────────────────────────┤
│     Native Layer (native/)       │  Plus API 封装，平台条件编译
└─────────────────────────────────┘
```

### 各层职责

| 层     | 职责                                    | 关键约束                            |
| ------ | --------------------------------------- | ----------------------------------- |
| View   | 页面渲染、用户交互、导航                | 不直接调 `uni.request`，通过 API 层 |
| Store  | 全局状态、缓存数据、Token 管理          | 响应式，持久化到 Storage            |
| API    | HTTP 请求封装、错误统一处理、Token 注入 | baseURL 来自环境变量                |
| Utils  | 缓存 TTL、离线队列、地理计算            | 无 UI 依赖，纯函数                  |
| Native | 原生能力封装，条件编译                  | `#ifdef APP-PLUS` 隔离              |

## 后端复用策略

APP 100% 复用现有后端接口，不新建 BFF 层：

| 后端模块               | APP 使用场景                          |
| ---------------------- | ------------------------------------- |
| AuthModule             | 登录(密码/微信)、Token 刷新、设备注册 |
| CustomerModule         | 客户 CRUD、列表搜索、详情             |
| OpportunityModule      | 商机列表、阶段变更                    |
| CallRecordModule       | 通话记录、AI 分析结果                 |
| FollowUpModule         | 跟进记录 CRUD、提醒                   |
| SalesTargetModule      | 业绩数据、排行榜                      |
| KnowledgeModule        | 知识库文章、搜索                      |
| NotificationModule     | WebSocket 实时通知                    |
| RouteModule            | 路线优化                              |
| PushModule (新增)      | 设备 Token 注册、推送下发             |
| CheckInModule (新增)   | GPS 签到记录                          |
| CloudCallModule (新增) | 云呼叫中心回呼、录音、webhook 回调    |

## 构建产物

| 目标平台   | 构建命令                 | 产物路径                | 说明               |
| ---------- | ------------------------ | ----------------------- | ------------------ |
| 微信小程序 | `pnpm build:mp-weixin`   | `dist/build/mp-weixin/` | 上传微信开发者工具 |
| Android    | `pnpm build:app-android` | `dist/build/app/`       | 生成 APK/AAB       |
| iOS        | `pnpm build:app-ios`     | `dist/build/app/`       | Xcode 工程         |
| H5 (备选)  | `pnpm build:h5`          | `dist/build/h5/`        | PWA 模式           |

### 条件编译

uni-app 通过条件编译实现多端差异：

```vue
<!-- 仅 APP 端 -->
<!-- #ifdef APP-PLUS -->
<sim-card-selector v-model="selectedSim" />
<!-- #endif -->

<!-- 仅微信小程序 -->
<!-- #ifdef MP-WEIXIN -->
<button open-type="getPhoneNumber" @getphonenumber="bindPhone">
  微信一键登录
</button>
<!-- #endif -->
```

```typescript
// 原生能力条件编译
// #ifdef APP-PLUS
import { registerPush } from "@/native/push";
registerPush();
// #endif
```
