# WeChat Mini Program Module CLAUDE.md

## 模块信息

**Package**: `@crm/miniapp`
**路径**: `packages/miniapp/`
**技术栈**: uni-app (Vue 3 + TypeScript + Pinia + Vite)
**目标平台**: 微信小程序 (mp-weixin)

## 架构概览

```
packages/miniapp/
├── package.json          # @crm/miniapp, depends on @crm/shared
├── manifest.json         # WeChat appId, permissions
├── pages.json            # Routes, custom tabBar
├── vite.config.ts        # uni-app vite plugin
├── tsconfig.json         # Strict mode, @/* paths
├── index.html            # Entry HTML
└── src/
    ├── main.ts           # createSSRApp + Pinia
    ├── App.vue           # Root component + auth guard
    ├── env.d.ts          # Type declarations
    ├── api/              # API adapter layer (uni.request)
    │   ├── request.ts    # Base request wrapper with JWT
    │   ├── auth.ts       # WeChat login, password login
    │   ├── customer.ts   # Customer CRUD
    │   ├── follow-up.ts  # Follow-up records
    │   ├── opportunity.ts# Opportunities
    │   ├── sales-target.ts# Performance targets
    │   ├── notification.ts# Messages
    │   ├── check-in.ts   # Field check-in (stub)
    │   └── route.ts      # Route optimization
    ├── stores/           # Pinia stores
    │   ├── user.ts       # Auth state, wx login, token mgmt
    │   └── app.ts        # Unread badge, network status
    ├── utils/
    │   ├── cache-store.ts# Storage with TTL (15min/30min/24h)
    │   ├── offline-queue.ts# Offline request queue (max 50)
    │   └── geo.ts        # Haversine distance calculation
    ├── components/
    │   └── TabBar.vue    # Custom tabBar with center "+" button
    ├── pages/
    │   ├── index/index.vue     # 工作台 (Workbench)
    │   ├── login/index.vue     # 登录页 (Login)
    │   ├── customer/list.vue   # 客户列表 (Customer list)
    │   ├── customer/detail.vue # 客户详情 (Customer detail)
    │   ├── follow-up/create.vue# 新建跟进 (Create follow-up)
    │   ├── check-in/index.vue  # 外勤打卡 (Field check-in)
    │   ├── voice/record.vue    # 语音记录 (Voice recording)
    │   ├── route/plan.vue      # 路线规划 (Route planning)
    │   ├── performance/index.vue# 业绩 (Performance dashboard)
    │   ├── message/index.vue   # 消息中心 (Messages)
    │   └── user/index.vue      # 我的 (Profile/Settings)
    └── static/
        └── tabbar/             # Tab bar icons
```

## 关键技术决策

| 项目     | 决策                                           |
| -------- | ---------------------------------------------- |
| 框架     | uni-app Vue 3 (SSR app)                        |
| 状态管理 | Pinia                                          |
| HTTP     | `uni.request` 封装 (非 axios)                  |
| 缓存     | `uni.setStorageSync` + TTL 过期策略            |
| 离线队列 | 最多 50 条，网络恢复自动 flush                 |
| 登录方式 | 微信一键登录 (wx.login) + 开发者密码登录       |
| Token    | JWT (deviceType='miniapp')，复用后端 Auth 模块 |
| 导航     | 自定义 tabBar (5 tab + 中心 "+" 按钮)          |
| 路线优化 | 后端贪心最近邻算法 (RouteModule)               |

## TabBar 结构

| 位置 | 页面                         | 图标                  |
| ---- | ---------------------------- | --------------------- |
| 1    | 工作台 pages/index/index     | home                  |
| 2    | 客户 pages/customer/list     | customer              |
| 3    | + 快捷操作 (ActionSheet)     | center "+" button     |
| 4    | 业绩 pages/performance/index | performance           |
| 5    | 我的 pages/user/index        | user (+ unread badge) |

中心 "+" 按钮弹出 ActionSheet: 新建跟进、外勤打卡、语音记录、路线规划

## API 适配层

所有 API 请求通过 `src/api/request.ts` 统一处理：

- `baseURL`: `http://localhost:3000/api/v1`
- JWT 从 `uni.getStorageSync('crm_token')` 读取
- 401 → 清除 token → 跳转登录页
- 错误 → `uni.showToast` 提示

## 缓存策略

| 前缀                   | TTL   | 用途     |
| ---------------------- | ----- | -------- |
| `crm_cache_user:`      | 30min | 用户信息 |
| `crm_cache_customers:` | 15min | 客户列表 |
| `crm_cache_dict:`      | 24h   | 字典数据 |

## 离线队列

- 存储 key: `crm_offline_queue`
- 最大容量: 50 条
- 自动 flush: 网络恢复时 (`uni.onNetworkStatusChange`)
- 重试: 最多 3 次，超过则丢弃
- 用于: 跟进记录创建等写操作

## 后端新增

### Auth 模块扩展

- `POST /api/v1/auth/wx-login` — 微信小程序登录
- `POST /api/v1/auth/bind-phone` — 绑定手机号
- Entity: `miniapp_users` (Migration: `1709000054000`)
- 环境变量: `WX_MINIAPP_APPID`, `WX_MINIAPP_SECRET`

### Route 模块 (新)

- `POST /api/v1/route/optimize` — 路线优化
- 贪心最近邻 TSP 算法
- 无独立数据表 (基于 Customer 地址计算)

### Stub APIs (后端 TODO)

- `POST /api/v1/attendance/check-in` — 外勤打卡
- `POST /api/v1/recordings/upload` — 录音上传 + ASR

## 开发命令

```bash
# 安装依赖
cd crm-sales-platform && pnpm install

# 开发模式 (微信小程序)
pnpm dev:miniapp
# 或
cd packages/miniapp && pnpm dev:mp-weixin

# 构建
pnpm build:miniapp

# 编译产物
dist/dev/mp-weixin/  → 用微信开发者工具打开此目录
```

## 依赖关系

- **依赖**: `@crm/shared` (types, enums)
- **后端依赖**: AuthModule, RouteModule, CustomerModule, FollowUpModule 等
- **被依赖**: 无

## 注意事项

1. 微信小程序需要在公众平台配置服务器域名 (合法请求域名)
2. 定位功能需要在 `manifest.json` 声明 `scope.userLocation` 权限
3. 录音功能需要声明 `scope.record` 权限
4. tabBar 图标为占位文件，实际使用时需替换为设计稿图标 (PNG 81×81)
5. `WX_MINIAPP_APPID` 和 `WX_MINIAPP_SECRET` 需在 `.env` 中配置
