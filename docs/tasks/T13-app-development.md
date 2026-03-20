# APP 开发任务清单

> 基于设计文档 `docs/design/app/00-12`，拆分为可执行的开发任务。

## 任务总览

| 阶段         | 任务数 | 描述                        |
| ------------ | ------ | --------------------------- |
| A: 基础设施  | 5      | 项目配置、构建、CI          |
| B: 核心页面  | 8      | 工作台+客户+跟进+个人中心   |
| C: 通话模块  | 6      | 原生外呼+云呼叫中心+录音+AI |
| D: 商机+业绩 | 4      | 商机CRUD+PK排行             |
| E: 原生能力  | 5      | Push/GPS/双卡/OCR/生物识别  |
| F: 学习+素材 | 3      | 知识库+素材+考试            |
| G: 优化+发布 | 4      | 性能+安全+监控+发布         |

---

## A: 基础设施

### A1 — APP 构建配置

- 更新 `manifest.json` 添加 APP-PLUS 配置（权限声明、SSL、图标）
- 配置 Vite 多端构建（mp-weixin / app-android / app-ios）
- 添加 `.env.production` / `.env.staging` 环境配置
- 验证 `pnpm build:app-android` 产出 APK

### A2 — 分包配置

- 将非 TabBar 页面拆分到 `pages-sub/` 分包
- 配置 `preloadRule` 预加载策略
- 验证主包 < 2MB

### A3 — 原生能力封装目录

- 创建 `src/native/` 目录结构
- 实现条件编译基础模板 (`#ifdef APP-PLUS`)
- 新建 `api/cloud-call.ts` API 文件

### A4 — CI/CD 流水线

- `.github/workflows/app-build.yml`: Android APK + 微信小程序构建
- 产物上传 Artifacts
- 版本号自动递增

### A5 — 错误监控集成

- 集成 Sentry SDK (APP + 小程序)
- 全局错误捕获 (`uni.onError`)
- API 错误上报

---

## B: 核心页面

### B1 — 工作台增强

- 数据概览卡片（今日通话/客户/跟进/业绩）
- 待办提醒列表（今日跟进+回款到期）
- PK 进展条
- AI 助理浮动入口
- 数据范围切换（个人/团队，按角色显示）

### B2 — 客户新建/编辑页面

- `pages/customer/create.vue` 快速录入表单
- 表单校验（手机号/邮箱/必填项）
- 创建后自动跳转详情

### B3 — 客户详情增强

- 360 视图 Tab（基本信息/跟进/商机/通话）
- Tab 数据懒加载
- 底部操作栏（拨号/跟进/编辑）
- 智能拨号按钮（方案B+D 选择）

### B4 — 客户列表增强

- "我的客户"/"全部客户" Tab 筛选
- 长按多选 → 批量操作（Manager/Admin）
- 左滑操作（编辑/拨号/删除）

### B5 — 跟进列表页

- `pages/follow-up/list.vue`
- 按客户/时间筛选
- 时间线展示组件

### B6 — 消息中心增强

- 通知列表分类（系统/任务/跟进/商机）
- 标记已读/全部已读
- 点击跳转对应详情

### B7 — 个人中心增强

- 业绩概览（本月/本季/本年）
- 通知设置页面
- 版本更新检测
- 双卡设置（APP）
- 外呼模式默认选择（原生/云呼）
- 隐私协议页面

### B8 — 公共组件库

- `SearchBar.vue` 搜索+筛选
- `StatusTag.vue` 状态标签（颜色映射）
- `EmptyState.vue` 空状态
- `LoadMore.vue` 加载更多
- `CustomerCard.vue` 客户卡片
- `StatsCard.vue` 统计卡片

---

## C: 通话模块 (核心)

### C1 — 外呼模式选择 UI

- 拨号时弹出模式选择（直接拨号 / 云呼录音）
- "记住我的选择" 选项
- 本地 Storage 存储默认模式
- `stores/call-state.ts` 增加 `callMode` 状态

### C2 — 后端 CloudCall 模块

- **新建** `packages/server/src/modules/cloud-call/`
- `CloudCallController`: initiate / callback / status / recording / settings
- `CloudCallService`: 适配器模式，抽象 `CloudCallProvider` 接口
- `AliyunCCCProvider`: 阿里云CCC 实现（初期可 Mock）
- Entity: `cloud_call_records` (callId, status, duration, recordingUrl, providerId)
- Migration: 创建 cloud_call_records 表
- Webhook 签名验证中间件
- Bull Queue: `cloud-call-analysis` (录音下载 → ASR → AI)
- 环境变量: `CLOUD_CALL_PROVIDER`, `CLOUD_CALL_APP_KEY`, `CLOUD_CALL_APP_SECRET`, `CLOUD_CALL_WEBHOOK_SECRET`

### C3 — APP 云呼集成

- `api/cloud-call.ts`: initiate / status / recording API
- 发起回呼流程（Loading → 等待接通 → 通话中状态展示）
- 通话状态轮询/WebSocket 监听
- 通话结束后自动刷新通话记录

### C4 — 通话录音播放

- 通话详情页录音播放器组件
- 录音进度条 + 播放/暂停
- AI 分析结果展示（摘要/评分/意向）
- 签名 URL 处理（15min 时效）

### C5 — 通话记录列表页

- `pages/call/list.vue`: 通话记录列表
- `pages/call/detail.vue`: 通话详情（录音+AI 分析）
- 区分标记: 原生拨号(无录音) vs 云呼(有录音)

### C6 — 云呼管理后台 (PC Web)

- `packages/web/src/views/cloud-call/settings.vue` (Admin)
- 云呼服务商配置（AppKey/Secret）
- 线路余额查询
- 通话费用统计

---

## D: 商机+业绩

### D1 — 商机列表+详情

- `pages/opportunity/list.vue`
- `pages/opportunity/detail.vue`
- 阶段快速推进按钮

### D2 — 商机创建

- `pages/opportunity/create.vue`
- 关联客户选择器
- 阶段/金额/预计成交日期

### D3 — 商机看板

- `pages/opportunity/board.vue` (P2)
- 横向滚动看板视图
- 拖拽推进阶段（移动端适配）

### D4 — PK 排行榜

- `pages/pk/ranking.vue`
- 实时排名列表
- 个人进度条

---

## E: 原生能力

### E1 — Push 推送

- `native/push.ts`: 设备 Token 注册
- 后端 PushModule: 设备管理 + 推送下发
- 推送点击跳转处理
- 通知设置页偏好管理

### E2 — GPS 签到

- `native/gps.ts`: 高精度定位封装
- 后端 CheckInModule: 签到 CRUD
- 签到页面增强（附近客户推荐、拍照）
- 签到位置验证（与客户地址距离 < 500m）

### E3 — 双卡检测

- `native/sim-card.ts`: SIM 卡信息读取
- `SimSelector.vue`: SIM 卡选择组件
- Android 指定 SIM 卡拨号 Intent
- 个人中心双卡设置

### E4 — OCR 识别

- `native/camera-ocr.ts`: 拍照取号 + 名片扫描
- 后端 OCR 接口 (或本地 OCR 插件)
- 名片扫描 → 新建客户预填

### E5 — 生物识别

- `native/biometric.ts`: 指纹/面容验证
- 登录页增加生物识别快捷登录
- 个人中心开关设置

---

## F: 学习+素材

### F1 — 知识库

- `pages/knowledge/list.vue`: 分类+搜索
- `pages/knowledge/detail.vue`: Markdown 渲染

### F2 — 营销素材

- `pages/material/list.vue`: 素材列表
- 查看/复制文案/分享功能

### F3 — 在线考试 (P3)

- 移动端答题页面
- 后期扩展

---

## G: 优化+发布

### G1 — 性能优化

- 虚拟滚动（长列表 > 100 项）
- 图片懒加载
- 内存+Storage 两级缓存
- 骨架屏

### G2 — 安全加固

- 生产包移除 console.log + Source Map
- 按钮防重复提交
- 数据脱敏工具函数
- 云呼 webhook 签名验证

### G3 — 热更新

- wgt 热更新机制
- 版本检查+强制更新逻辑
- 后端版本接口

### G4 — 应用发布

- Android 签名 + 应用商店提审
- iOS Xcode Archive + App Store 提审
- 微信小程序提审
- 灰度发布策略

---

## 开发顺序建议

```
Phase 1 (MVP):  A1 → A3 → B8 → B1 → B2 → B3 → B4 → C1 → C2 → C3 → C5 → B5 → B7
Phase 2 (通话):  C4 → C6 → E1 → E2 → E3 → B6
Phase 3 (补齐):  D1 → D2 → D4 → F1 → F2 → A2 → G1
Phase 4 (增强):  D3 → E4 → E5 → F3 → A4 → A5 → G2 → G3 → G4
```

## 后端新增模块汇总

| 模块             | 路径                              | 开发任务 | 依赖           |
| ---------------- | --------------------------------- | -------- | -------------- |
| CloudCallModule  | `server/src/modules/cloud-call/`  | C2       | 云呼服务商 SDK |
| PushModule       | `server/src/modules/push/`        | E1       | FCM/APNs SDK   |
| CheckInModule    | `server/src/modules/check-in/`    | E2       | —              |
| AppVersionModule | `server/src/modules/app-version/` | G3       | —              |
