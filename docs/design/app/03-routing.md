# 03 — 页面路由 & 导航

## TabBar 结构

5 位 TabBar，中心为 "+" 快捷操作按钮（自定义 TabBar 组件）：

```
┌──────┬──────┬──────┬──────┬──────┐
│ 工作台│ 客户 │  ＋  │ 业绩 │ 我的 │
│ home │ list │action│perf. │ user │
└──────┴──────┴──────┴──────┴──────┘
```

| 位置 | Tab    | 页面路径                  | 图标                              |
| ---- | ------ | ------------------------- | --------------------------------- |
| 1    | 工作台 | `pages/index/index`       | home / home-active                |
| 2    | 客户   | `pages/customer/list`     | customer / customer-active        |
| 3    | ＋     | ActionSheet 弹出          | 中心圆形按钮                      |
| 4    | 业绩   | `pages/performance/index` | performance / performance-active  |
| 5    | 我的   | `pages/user/index`        | user / user-active (+ 未读 Badge) |

### 中心 "+" 按钮 ActionSheet

点击弹出四个快捷操作：

| 操作     | 跳转页面                 | 图标       |
| -------- | ------------------------ | ---------- |
| 新建跟进 | `pages/follow-up/create` | edit       |
| 外勤打卡 | `pages/check-in/index`   | location   |
| 语音记录 | `pages/voice/record`     | microphone |
| 路线规划 | `pages/route/plan`       | route      |

---

## 完整路由表

### 现有页面 (13 页)

| 路径                      | 页面名称 | 类型   | 登录 | 角色 | 导航栏标题   |
| ------------------------- | -------- | ------ | ---- | ---- | ------------ |
| `pages/index/index`       | 工作台   | TabBar | ✅   | ALL  | 工作台       |
| `pages/customer/list`     | 客户列表 | TabBar | ✅   | ALL  | 客户管理     |
| `pages/customer/detail`   | 客户详情 | 子页   | ✅   | ALL  | 客户详情     |
| `pages/performance/index` | 业绩     | TabBar | ✅   | ALL  | 业绩         |
| `pages/user/index`        | 个人中心 | TabBar | ✅   | ALL  | 我的         |
| `pages/login/index`       | 登录     | 独立   | ❌   | —    | (自定义导航) |
| `pages/follow-up/create`  | 新建跟进 | 子页   | ✅   | ALL  | 新建跟进     |
| `pages/check-in/index`    | 外勤打卡 | 子页   | ✅   | ALL  | 外勤打卡     |
| `pages/voice/record`      | 语音记录 | 子页   | ✅   | ALL  | 语音记录     |
| `pages/route/plan`        | 路线规划 | 子页   | ✅   | ALL  | 路线规划     |
| `pages/message/index`     | 消息中心 | 子页   | ✅   | ALL  | 消息中心     |
| `pages/call/after-call`   | 通话记录 | 浮层   | ✅   | ALL  | 通话记录     |

### 新增页面 (计划)

| 路径                          | 页面名称     | 类型 | 登录 | 角色 | 优先级 | 说明             |
| ----------------------------- | ------------ | ---- | ---- | ---- | ------ | ---------------- |
| `pages/customer/create`       | 新建客户     | 子页 | ✅   | ALL  | P1     | 快速录入表单     |
| `pages/customer/edit`         | 编辑客户     | 子页 | ✅   | ALL  | P1     | 复用 create 表单 |
| `pages/customer/map`          | 客户地图     | 子页 | ✅   | ALL  | P3     | 附近客户地图展示 |
| `pages/opportunity/list`      | 商机列表     | 子页 | ✅   | ALL  | P1     | 筛选/排序        |
| `pages/opportunity/detail`    | 商机详情     | 子页 | ✅   | ALL  | P1     | 信息+阶段        |
| `pages/opportunity/create`    | 新建商机     | 子页 | ✅   | ALL  | P1     | 关联客户         |
| `pages/opportunity/board`     | 商机看板     | 子页 | ✅   | M/A  | P2     | 横向看板视图     |
| `pages/call/list`             | 通话记录列表 | 子页 | ✅   | ALL  | P1     | 通话历史         |
| `pages/call/detail`           | 通话详情     | 子页 | ✅   | ALL  | P1     | AI 分析结果      |
| `pages/follow-up/list`        | 跟进列表     | 子页 | ✅   | ALL  | P1     | 按客户/时间      |
| `pages/knowledge/list`        | 知识库       | 子页 | ✅   | ALL  | P2     | 文章列表         |
| `pages/knowledge/detail`      | 文章详情     | 子页 | ✅   | ALL  | P2     | Markdown 渲染    |
| `pages/pk/ranking`            | PK 排行榜    | 子页 | ✅   | ALL  | P2     | 实时排名         |
| `pages/material/list`         | 营销素材     | 子页 | ✅   | ALL  | P2     | 素材库           |
| `pages/settings/notification` | 通知设置     | 子页 | ✅   | ALL  | P2     | 推送偏好         |
| `pages/settings/privacy`      | 隐私协议     | 子页 | ✅   | ALL  | P1     | 隐私政策         |
| `pages/scan/business-card`    | 名片扫描     | 子页 | ✅   | ALL  | P2     | OCR 名片识别     |
| `pages/scan/phone-number`     | 拍照取号     | 子页 | ✅   | ALL  | P2     | OCR 电话识别     |

### 角色说明

| 缩写 | 角色                    | 说明         |
| ---- | ----------------------- | ------------ |
| ALL  | Admin + Manager + Sales | 所有登录用户 |
| M/A  | Manager + Admin         | 管理角色     |
| A    | Admin                   | 仅管理员     |

---

## 导航栈管理

### uni-app 导航 API

| API                | 用途                 | 场景                    |
| ------------------ | -------------------- | ----------------------- |
| `uni.switchTab`    | 切换 TabBar          | TabBar 间跳转           |
| `uni.navigateTo`   | 保留当前页，跳转     | 进入子页面（详情/创建） |
| `uni.navigateBack` | 返回上一页           | 子页面返回              |
| `uni.redirectTo`   | 关闭当前页，跳转     | 登录后替换登录页        |
| `uni.reLaunch`     | 关闭所有页，打开新页 | Token 过期强制登录      |

### 典型导航流

```
工作台 → 客户列表 (switchTab)
  → 客户详情 (navigateTo)
    → 新建跟进 (navigateTo)
      → 返回详情 (navigateBack)
    → 拨号 → 通话后浮层 (navigateTo)
      → 返回详情 (navigateBack)
  → 返回列表 (navigateBack)
```

```
登录页 → 登录成功 → 工作台 (reLaunch)
```

```
任意页面 → Token 过期 → 401 → 登录页 (reLaunch)
```

---

## pages.json 配置

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": { "navigationBarTitleText": "工作台" }
    },
    {
      "path": "pages/customer/list",
      "style": { "navigationBarTitleText": "客户管理" }
    },
    {
      "path": "pages/customer/detail",
      "style": { "navigationBarTitleText": "客户详情" }
    },
    {
      "path": "pages/customer/create",
      "style": { "navigationBarTitleText": "新建客户" }
    },
    {
      "path": "pages/performance/index",
      "style": { "navigationBarTitleText": "业绩" }
    },
    {
      "path": "pages/user/index",
      "style": { "navigationBarTitleText": "我的" }
    },
    {
      "path": "pages/login/index",
      "style": { "navigationBarTitleText": "登录", "navigationStyle": "custom" }
    },
    {
      "path": "pages/follow-up/create",
      "style": { "navigationBarTitleText": "新建跟进" }
    },
    {
      "path": "pages/follow-up/list",
      "style": { "navigationBarTitleText": "跟进记录" }
    },
    {
      "path": "pages/check-in/index",
      "style": { "navigationBarTitleText": "外勤打卡" }
    },
    {
      "path": "pages/voice/record",
      "style": { "navigationBarTitleText": "语音记录" }
    },
    {
      "path": "pages/route/plan",
      "style": { "navigationBarTitleText": "路线规划" }
    },
    {
      "path": "pages/message/index",
      "style": { "navigationBarTitleText": "消息中心" }
    },
    {
      "path": "pages/call/after-call",
      "style": { "navigationBarTitleText": "通话记录" }
    },
    {
      "path": "pages/call/list",
      "style": { "navigationBarTitleText": "通话记录" }
    },
    {
      "path": "pages/call/detail",
      "style": { "navigationBarTitleText": "通话详情" }
    },
    {
      "path": "pages/opportunity/list",
      "style": { "navigationBarTitleText": "商机列表" }
    },
    {
      "path": "pages/opportunity/detail",
      "style": { "navigationBarTitleText": "商机详情" }
    },
    {
      "path": "pages/opportunity/create",
      "style": { "navigationBarTitleText": "新建商机" }
    },
    {
      "path": "pages/knowledge/list",
      "style": { "navigationBarTitleText": "知识库" }
    },
    {
      "path": "pages/knowledge/detail",
      "style": { "navigationBarTitleText": "文章详情" }
    },
    {
      "path": "pages/pk/ranking",
      "style": { "navigationBarTitleText": "PK排行榜" }
    },
    {
      "path": "pages/settings/notification",
      "style": { "navigationBarTitleText": "通知设置" }
    },
    {
      "path": "pages/settings/privacy",
      "style": { "navigationBarTitleText": "隐私协议" }
    }
  ],
  "tabBar": {
    "custom": true,
    "color": "#999999",
    "selectedColor": "#409EFF",
    "list": [
      { "pagePath": "pages/index/index", "text": "工作台" },
      { "pagePath": "pages/customer/list", "text": "客户" },
      { "pagePath": "pages/performance/index", "text": "业绩" },
      { "pagePath": "pages/user/index", "text": "我的" }
    ]
  }
}
```

---

## 分包策略 (APP 体积优化)

```json
{
  "subPackages": [
    {
      "root": "pages-sub/knowledge",
      "pages": [
        { "path": "list", "style": { "navigationBarTitleText": "知识库" } },
        { "path": "detail", "style": { "navigationBarTitleText": "文章详情" } }
      ]
    },
    {
      "root": "pages-sub/scan",
      "pages": [
        {
          "path": "business-card",
          "style": { "navigationBarTitleText": "名片扫描" }
        },
        {
          "path": "phone-number",
          "style": { "navigationBarTitleText": "拍照取号" }
        }
      ]
    }
  ],
  "preloadRule": {
    "pages/customer/list": {
      "network": "all",
      "packages": ["pages-sub/scan"]
    }
  }
}
```
