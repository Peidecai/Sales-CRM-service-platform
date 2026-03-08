# AI 智能 CRM 销售管理系统 — Agent Teams 分工方案

> 版本：v1.0 | 日期：2026-03-03

---

## 目录

1. [方案概述](#1-方案概述)
2. [Agent 角色定义与分工](#2-agent-角色定义与分工)
3. [开发阶段规划](#3-开发阶段规划)
4. [各 Agent 的 CLAUDE.md 设计](#4-各-agent-的-claudemd-设计)
5. [各 Agent 启动提示词](#5-各-agent-启动提示词)
6. [协作机制与质量保障](#6-协作机制与质量保障)
7. [文件所有权边界](#7-文件所有权边界)

---

## 1. 方案概述

### 1.1 什么是 Agent Teams

Agent Teams 是 AI assistant 的实验性功能，允许启动多个并行的 AI 开发代理（Teammate），在 Team Lead 的协调下同时开发不同模块。每个 Teammate 拥有独立的上下文窗口，通过共享任务列表和消息传递进行协作。

### 1.2 启用方式

```bash
# 设置环境变量启用 Agent Teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true

# 启动 AI assistant
claude
```

### 1.3 设计原则

| 原则             | 说明                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| **模块解耦**     | 每个 Agent 负责明确的业务模块，最小化文件冲突                          |
| **全栈负责**     | 每个业务 Agent 同时负责其模块的前端 + 后端 + 数据库，减少跨 Agent 依赖 |
| **共享基础层**   | 公共组件、基础架构由 Team Lead 统一搭建，所有 Agent 共用               |
| **接口契约先行** | 模块间通过 TypeScript 接口类型和 API 契约通信，避免直接耦合            |
| **增量集成**     | 每个 Agent 完成功能后及时提交，Team Lead 持续集成                      |

---

## 2. Agent 角色定义与分工

### 2.1 角色总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Agent Teams 角色架构                            │
│                                                                      │
│                    ┌──────────────────┐                              │
│                    │   Team Lead (你)  │                              │
│                    │   架构师 + 协调者  │                              │
│                    └────────┬─────────┘                              │
│                             │                                        │
│         ┌───────────┬───────┼───────┬───────────┬──────────┐        │
│         ▼           ▼       ▼       ▼           ▼          ▼        │
│    ┌─────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐    │
│    │  TM-A   │ │  TM-B   │ │ TM-C   │ │  TM-D   │ │   TM-E   │    │
│    │ 客户管理 │ │ 销售流程 │ │呼叫+AI │ │信息+系统 │ │ 小程序    │    │
│    │         │ │         │ │        │ │         │ │          │    │
│    │ 前端+后端│ │ 前端+后端│ │前端+后端│ │ 前端+后端│ │ uni-app  │    │
│    └─────────┘ └─────────┘ └────────┘ └─────────┘ └──────────┘    │
│                                                                      │
│    第二阶段并行开发（4-6周）                     第三阶段（2-3周）     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 详细角色定义

#### 🏗️ Team Lead — 架构师 & 协调者（你自己）

**职责范围：**

| 职责          | 详细说明                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 项目初始化    | 搭建 Monorepo 项目结构（pnpm workspaces），配置 `packages/web`、`packages/server`、`packages/mini-app`、`packages/shared` |
| 基础架构      | 编写 NestJS 公共模块（`src/common/`）：异常过滤器、响应拦截器、日志中间件、限流中间件等                                   |
| 数据库 Schema | 创建所有数据库 Migration 文件，定义基础 Entity 基类（`BaseEntity`）                                                       |
| 认证系统      | 实现 JWT 双 Token 认证机制（`auth` 模块 + `jwt-auth.guard` + `roles.guard`）                                              |
| 前端脚手架    | 搭建 Vue 3 项目骨架：路由框架、布局组件、Axios 封装、Pinia Store 基础配置                                                 |
| 代码规范      | 配置 ESLint + Prettier + Husky + lint-staged + commitlint                                                                 |
| CI/CD         | 配置 Docker Compose（本地开发）、Dockerfile、GitHub Actions                                                               |
| 任务协调      | 分配任务、审查代码、处理模块间冲突、合并集成                                                                              |
| 共享类型      | 维护 `packages/shared/` 中的公共类型定义和工具函数                                                                        |

**对应设计文档：** chapter01（总体设计）、chapter02（前端规范）、chapter03（后端规范）、chapter04（数据库设计）、chapter11（API 接口设计）、chapter12（安全设计）、chapter13（部署运维）

---

#### 👤 Teammate A — 客户管理中心

**负责模块：** 客户管理中心（对应 chapter05）

| 范围         | 具体内容                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **后端模块** | `modules/customer/`、`modules/lead/`、`modules/high-seas/`                                                              |
| **前端页面** | `views/customer/` — 客户列表、客户详情、客户创建/编辑、公海池、客户导入导出                                             |
| **前端组件** | `components/business/customer/` — 客户选择器、客户卡片、联系人管理、跟进记录时间线                                      |
| **核心功能** | 客户 CRUD、客户分级分类、客户公海池（领取/分配/回收规则）、客户查重算法、联系人管理、跟进记录、客户标签、Excel 导入导出 |
| **数据表**   | `customer`、`customer_contact`、`customer_follow_up`、`customer_tag`、`high_seas_pool`、`high_seas_rule`                |
| **API 端点** | `/api/v1/customers/*`、`/api/v1/contacts/*`、`/api/v1/high-seas/*`、`/api/v1/follow-ups/*`                              |

**状态流转逻辑：**

```
线索 → 潜在客户 → 意向客户 → 商机客户 → 成交客户 → 长期维护
  │                                              │
  └──────── 无效/流失 ← 回收至公海 ←──────────────┘
```

---

#### 💰 Teammate B — 销售流程管理

**负责模块：** 销售流程管理（对应 chapter06）

| 范围         | 具体内容                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **后端模块** | `modules/opportunity/`、`modules/contract/`、`modules/product/`、`modules/payment/`（回款）                                                                       |
| **前端页面** | `views/sales/` — 商机列表/看板、商机详情、报价管理、合同管理、回款管理、销售漏斗                                                                                  |
| **前端组件** | `components/business/sales/` — 商机卡片、销售漏斗图、合同审批流、回款时间线、业绩排行榜                                                                           |
| **核心功能** | 商机管理（阶段推进）、销售漏斗可视化、报价单生成、合同管理（创建/审批/签署/归档）、回款管理（计划/到账/逾期）、销售目标设定与追踪、业绩排行、审批流程引擎         |
| **数据表**   | `opportunity`、`opportunity_stage_log`、`contract`、`contract_product`、`payment_plan`、`payment_record`、`product`、`quotation`、`sales_target`、`approval_flow` |
| **API 端点** | `/api/v1/opportunities/*`、`/api/v1/contracts/*`、`/api/v1/products/*`、`/api/v1/payments/*`、`/api/v1/quotations/*`、`/api/v1/sales-targets/*`                   |

**商机阶段：**

```
初步接触(10%) → 需求确认(30%) → 方案提报(50%) → 商务谈判(70%) → 赢单(100%)/丢单(0%)
```

---

#### 📞 Teammate C — 呼叫中心 + AI 智能分析

**负责模块：** 呼叫中心（chapter07）+ AI 智能分析（chapter08）

| 范围         | 具体内容                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **后端模块** | `modules/call-record/`、`modules/ai-analysis/`                                                                                                                           |
| **前端页面** | `views/call-center/` — 呼叫工作台、通话记录列表、通话详情（含 AI 分析结果）、坐席管理、外呼任务；`views/ai-analysis/` — AI 分析仪表盘、客户画像、意向预测                |
| **前端组件** | `components/business/call/` — 拨号盘、通话状态条、录音播放器、ASR 文字展示、AI 分析卡片                                                                                  |
| **核心功能** | 阿里云语音外呼集成（SIP）、来电弹屏、通话录音（存储至 OSS）、讯飞 ASR 语音转文字、Claude API 通话分析、客户画像自动生成、购买意向预测、话术建议、AI 分析任务队列（Bull） |
| **数据表**   | `call_record`、`call_analysis`、`ai_analysis_task`、`customer_portrait`、`agent_seat`                                                                                    |
| **API 端点** | `/api/v1/calls/*`、`/api/v1/ai-analysis/*`、`/api/v1/customer-portraits/*`                                                                                               |
| **外部服务** | 阿里云语音服务 SDK、讯飞 ASR SDK、Claude API（@anthropic-ai/sdk）                                                                                                        |

**通话处理流程：**

```
发起外呼/接收来电 → 自动匹配客户 → 通话中(自动录音) → 录音存储至 OSS
    → 讯飞 ASR 转文字 → Claude AI 分析 → 生成摘要 + 跟进建议
```

---

#### 📚 Teammate D — 销售信息管理 + 系统管理

**负责模块：** 销售信息管理（chapter09）+ 系统管理（RBAC 权限）

| 范围         | 具体内容                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **后端模块** | `modules/knowledge/`（知识库）、`modules/notification/`、`modules/system/`、`modules/user/`、`modules/dashboard/`、`modules/report/`                                                                                           |
| **前端页面** | `views/info-management/` — 产品知识库、竞品数据库、销售素材、公告通知、培训资源；`views/system/` — 用户管理、角色管理、权限配置、系统设置、操作日志；`views/dashboard/` — 数据看板                                             |
| **前端组件** | `components/business/system/` — 权限树组件、角色选择器、菜单配置、日志查看器、通知铃铛                                                                                                                                         |
| **核心功能** | 产品知识库 CRUD + 全文搜索、竞品数据库、销售素材（版本管理）、公告通知（WebSocket 推送）、RBAC 权限系统（用户-角色-权限-菜单）、数据权限隔离（个人/部门/全部）、系统参数配置、操作日志审计、数据看板（ECharts 图表）、统计报表 |
| **数据表**   | `product_knowledge`、`competitor`、`sales_material`、`announcement`、`notification`、`role`、`permission`、`role_permission`、`user_role`、`menu`、`operation_log`、`system_config`、`department`                              |
| **API 端点** | `/api/v1/knowledge/*`、`/api/v1/notifications/*`、`/api/v1/system/*`、`/api/v1/users/*`、`/api/v1/roles/*`、`/api/v1/dashboard/*`、`/api/v1/reports/*`                                                                         |

---

#### 📱 Teammate E — 微信小程序

**负责模块：** 微信小程序（chapter10）

| 范围           | 具体内容                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **整体包**     | `packages/mini-app/` — uni-app 项目                                                                                                                         |
| **小程序页面** | 工作台首页、客户列表/详情、外勤签到（LBS 定位）、拜访记录、业绩看板、消息通知                                                                               |
| **核心功能**   | 客户信息查看与编辑、LBS 定位签到（微信定位 API + 腾讯地图）、拜访记录拍照上传、业绩数据同步展示、消息推送（微信模板消息）、离线队列支持（网络恢复自动同步） |
| **依赖关系**   | 复用 `packages/server/` 提供的 API 接口，不新增后端模块                                                                                                     |
| **技术栈**     | uni-app（Vue 3 语法）、Pinia 状态管理、uni.request 封装                                                                                                     |

> ⚠️ **注意**：Teammate E 在第三阶段启动，此时后端 API 已基本就绪，小程序主要是调用现有接口。

---

## 3. 开发阶段规划

### 3.1 四阶段路线图

```
时间线：  Week1-2          Week3-8                Week9-11        Week12
          ──────           ──────────             ────────        ──────
阶段：    第一阶段          第二阶段                 第三阶段        第四阶段
          架构搭建          核心模块并行开发          小程序+测试     部署上线

角色：    Team Lead        TM-A + TM-B             TM-E            Team Lead
                           + TM-C + TM-D           (小程序)
                           (并行)                   + TM-A~D
                                                    (Bug修复+优化)
```

### 3.2 各阶段详细任务

#### 第一阶段：架构搭建（1-2 周）— Team Lead 主导

| 序号 | 任务                     | 产出物                                                 |
| ---- | ------------------------ | ------------------------------------------------------ |
| 1    | 初始化 Monorepo 项目结构 | `pnpm-workspace.yaml`、各 package 的 `package.json`    |
| 2    | 搭建后端 NestJS 框架     | `src/main.ts`、`app.module.ts`、`common/` 全部公共模块 |
| 3    | 搭建前端 Vue 3 框架      | Vite 配置、路由框架、布局组件、Axios 封装、Pinia 配置  |
| 4    | 数据库 Migration         | 所有数据表的 TypeORM Migration 文件                    |
| 5    | 认证模块完整实现         | JWT 双 Token、登录/注册/刷新/登出 API                  |
| 6    | Docker Compose 开发环境  | `docker-compose.yml`（MySQL + Redis）                  |
| 7    | 代码规范配置             | ESLint、Prettier、Husky、commitlint、`.editorconfig`   |
| 8    | 编写项目根 CLAUDE.md     | 全局项目规范文件                                       |
| 9    | 配置 `packages/shared/`  | 公共类型定义、工具函数、枚举常量                       |
| 10   | 前端基础页面             | 登录页、主布局（侧边栏+顶部导航+内容区）、404页        |

#### 第二阶段：核心模块并行开发（4-6 周）— Agent Teams 并行

```
Week 3-4（第一冲刺）：
  TM-A: 客户 CRUD + 列表/详情页 + 联系人管理
  TM-B: 商机 CRUD + 看板视图 + 产品管理
  TM-C: 通话记录模块 + 阿里云语音集成
  TM-D: 用户管理 + 角色权限 + 系统配置

Week 5-6（第二冲刺）：
  TM-A: 公海池逻辑 + 客户查重 + 标签 + 导入导出
  TM-B: 合同管理 + 回款管理 + 审批流程 + 销售漏斗
  TM-C: ASR 集成 + Claude AI 分析 + 客户画像 + 分析队列
  TM-D: 知识库 + 竞品库 + 通知推送 + 数据看板

Week 7-8（第三冲刺）：
  TM-A: 单元测试 + 客户模块优化
  TM-B: 单元测试 + 销售报表 + 业绩排行
  TM-C: 单元测试 + AI 分析优化 + 性能调优
  TM-D: 单元测试 + 操作日志 + 统计报表
```

#### 第三阶段：小程序 + 集成测试（2-3 周）

```
TM-E: 小程序框架搭建 → 客户查看 → 签到定位 → 拜访记录 → 业绩看板
TM-A~D: Bug 修复、性能优化、端到端测试、API 文档完善
```

#### 第四阶段：部署上线（1 周）— Team Lead 主导

```
Team Lead:
  ├── 阿里云资源创建与配置（ECS、RDS、Redis、OSS、SLB、CDN）
  ├── Docker 镜像构建与推送（阿里云 ACR）
  ├── Nginx + SLB 配置
  ├── 数据库初始化（生产环境 Migration）
  ├── SSL 证书配置 + HTTPS
  └── 灰度发布 + 上线验证
```

---

## 4. 各 Agent 的 CLAUDE.md 设计

### 4.1 项目根目录 CLAUDE.md（所有 Agent 共用）

> 文件位置：`/CLAUDE.md`（项目根目录）

```markdown
# CRM 销售管理系统 — 项目规范

## 项目概述

AI 驱动的智能 CRM 销售管理系统，包含客户管理、销售流程、呼叫中心、AI 分析和销售信息管理五大核心模块。

## 技术栈

- **前端**：Vue 3.4+ / Vite 5 / TypeScript 5 / Element Plus 2 / Pinia / Vue Router 4
- **后端**：NestJS 10 / TypeORM 0.3 / Node.js 20 LTS
- **数据库**：MySQL 8.0 / Redis 6.x
- **AI**：Claude API (@anthropic-ai/sdk)
- **包管理**：pnpm（Monorepo）

## Monorepo 结构
```

crm-sales-platform/
├── packages/
│ ├── web/ # Vue 3 前端
│ ├── server/ # NestJS 后端
│ ├── mini-app/ # 微信小程序（uni-app）
│ └── shared/ # 共享类型与工具
├── pnpm-workspace.yaml
├── docker-compose.yml
└── CLAUDE.md

```

## 代码规范

### 命名规范
- 文件名：`kebab-case`（如 `customer-list.vue`、`create-customer.dto.ts`）
- 组件名：`PascalCase`（如 `CustomerList`、`SalesFunnel`）
- 变量/函数：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 数据库表名：`snake_case`（如 `customer_follow_up`）
- API 路径：`kebab-case`（如 `/api/v1/high-seas`）

### TypeScript 严格模式
- `strict: true` 必须开启
- 禁止使用 `any`，必须定义明确类型
- 使用接口（interface）定义 API 响应格式

### Git 提交规范
```

feat: 新功能
fix: 修复 Bug
docs: 文档变更
style: 代码格式（不影响逻辑）
refactor: 重构
perf: 性能优化
test: 测试
chore: 构建/工具变更

```
- 提交信息使用中文
- 格式：`<type>(scope): <description>`
- 示例：`feat(customer): 实现客户公海池领取功能`

### 分支策略
- `main`：生产分支（保护分支）
- `develop`：开发集成分支
- `feature/<module>-<feature>`：功能分支
- `fix/<module>-<issue>`：修复分支

## API 设计规范
- RESTful 风格，统一前缀 `/api/v1/`
- 响应格式：`{ code: number, message: string, data: T }`
- 分页格式：`{ list: T[], total: number, page: number, pageSize: number }`
- 使用 `class-validator` 进行 DTO 校验
- 所有接口需要 Swagger 文档注解

## 后端模块结构（每个业务模块）
```

modules/<module-name>/
├── <name>.module.ts # 模块定义
├── <name>.controller.ts # 控制器
├── <name>.service.ts # 服务层
├── <name>.repository.ts # 仓储层（可选）
├── entities/
│ └── <name>.entity.ts # TypeORM Entity
├── dto/
│ ├── create-<name>.dto.ts # 创建 DTO
│ ├── update-<name>.dto.ts # 更新 DTO
│ └── query-<name>.dto.ts # 查询 DTO
└── tests/
└── <name>.service.spec.ts # 单元测试

```

## 前端页面结构（每个模块）
```

views/<module-name>/
├── index.vue # 列表页
├── detail.vue # 详情页
├── create.vue # 创建页
└── components/ # 页面级组件
├── <Name>Table.vue
├── <Name>Form.vue
└── <Name>Filter.vue

```

## 性能要求
- API 平均响应时间 ≤ 200ms（P95）
- 页面首屏加载 ≤ 1.5s
- 并发支持 ≥ 500 用户
- QPS ≥ 2000

## 安全要求
- JWT 双 Token：Access Token 2h + Refresh Token 7d
- 密码 bcrypt 哈希存储
- TypeORM 参数化查询，禁止原生 SQL 拼接
- 全表使用 `deleted` 字段软删除

## ⚠️ 禁止事项
- 禁止在 `.vue` 文件中使用 `v-html`（XSS 风险）
- 禁止在后端代码中硬编码密钥/密码
- 禁止直接修改其他 Agent 负责的模块文件（参见文件所有权边界）
- 禁止跳过单元测试直接提交
- 禁止使用 `console.log` 调试（使用 Logger）
```

---

### 4.2 Teammate A — 客户管理中心 CLAUDE.md

> 文件位置：`/packages/server/src/modules/customer/CLAUDE.md` 和 `/packages/web/src/views/customer/CLAUDE.md`

````markdown
# Teammate A — 客户管理中心开发指南

## 我的职责

负责客户管理中心的全栈开发，包括客户全生命周期管理功能。

## 我负责的文件范围

### 后端（packages/server/src/）

- `modules/customer/` — 客户主模块
- `modules/lead/` — 线索模块（可选，合并到 customer）
- `modules/high-seas/` — 公海池模块

### 前端（packages/web/src/）

- `views/customer/` — 客户管理所有页面
- `components/business/customer/` — 客户业务组件
- `api/customer.ts` — 客户相关 API 调用
- `stores/customer.ts` — 客户状态管理
- `types/customer.ts` — 客户类型定义

## 核心业务逻辑

### 客户状态枚举

```typescript
enum CustomerStatus {
  LEAD = "lead", // 线索
  POTENTIAL = "potential", // 潜在客户
  INTENDED = "intended", // 意向客户
  OPPORTUNITY = "opportunity", // 商机客户
  CLOSED_WON = "closed_won", // 成交客户
  MAINTAINED = "maintained", // 长期维护
  INVALID = "invalid", // 无效
  CHURNED = "churned", // 流失
}
```
````

### 公海池规则

- 超过 N 天未跟进的客户自动回收到公海
- 公海池客户可以被销售人员领取（有每日领取上限）
- 管理员可以手动分配公海客户
- 回收规则支持按客户等级差异化配置

### 客户查重算法

- 基于公司名称模糊匹配（Levenshtein 距离）
- 基于手机号/邮箱精确匹配
- 查重接口在创建客户前自动调用

### 数据权限

- 销售人员只能看到自己负责的客户
- 销售经理可以看到团队所有客户
- 管理员可以看到全部客户
- 通过 TypeORM QueryBuilder 动态拼接数据权限条件

## 与其他模块的接口

- **→ Teammate B（销售流程）**：客户转商机时，调用商机创建接口
- **→ Teammate C（呼叫中心）**：客户详情页显示通话记录（只读引用）
- **→ Teammate D（系统管理）**：使用 RBAC 权限守卫，数据权限过滤

## 参考设计文档

- `chapters/chapter05.md` — 客户管理中心详细设计

## 测试要求

- 每个 Service 方法编写单元测试
- 公海池回收逻辑必须有完整的集成测试
- 客户查重算法需要边界条件测试

````

---

### 4.3 Teammate B — 销售流程管理 CLAUDE.md

```markdown
# Teammate B — 销售流程管理开发指南

## 我的职责
负责销售流程管理的全栈开发，包括商机、合同、回款的全链路管理。

## 我负责的文件范围

### 后端（packages/server/src/）
- `modules/opportunity/` — 商机模块
- `modules/contract/` — 合同模块
- `modules/product/` — 产品模块
- `modules/payment/` — 回款模块
- `modules/quotation/` — 报价模块
- `modules/sales-target/` — 销售目标模块
- `modules/approval/` — 审批流程引擎

### 前端（packages/web/src/）
- `views/sales/` — 销售流程所有页面
- `components/business/sales/` — 销售业务组件（漏斗图、看板等）
- `api/sales.ts`、`api/contract.ts`、`api/payment.ts`
- `stores/sales.ts`
- `types/sales.ts`

## 核心业务逻辑

### 商机阶段管理
```typescript
enum OpportunityStage {
  INITIAL_CONTACT = 'initial_contact',    // 初步接触 10%
  REQUIREMENT = 'requirement',            // 需求确认 30%
  PROPOSAL = 'proposal',                  // 方案提报 50%
  NEGOTIATION = 'negotiation',            // 商务谈判 70%
  CLOSED_WON = 'closed_won',             // 赢单 100%
  CLOSED_LOST = 'closed_lost',           // 丢单 0%
}
````

### 审批流程引擎

- 支持自定义审批流程模板（折扣审批、合同审批等）
- 审批节点支持：单人审批、会签（全部通过）、或签（一人通过）
- 审批状态：待审批 → 审批中 → 已通过/已拒绝/已撤回
- 支持审批代理人设置

### 销售漏斗计算

- 根据商机阶段和金额计算加权金额
- 支持按时间段、团队、个人筛选
- 阶段转化率 = 进入下一阶段数 / 当前阶段总数

### 回款管理

- 一个合同可以有多期回款计划
- 支持到账确认和逾期提醒（定时任务）
- 回款率 = 已回款金额 / 合同总金额

## 与其他模块的接口

- **← Teammate A（客户管理）**：商机关联客户（customer_id 外键）
- **→ Teammate D（通知系统）**：审批流程触发通知推送
- **→ Teammate C（AI 分析）**：商机赢率可调用 AI 预测接口

## 参考设计文档

- `chapters/chapter06.md` — 销售流程管理详细设计

## ECharts 图表

- 销售漏斗图（funnel chart）
- 业绩柱状图 + 目标线
- 回款趋势折线图
- 合同金额饼图（按状态分布）

## 测试要求

- 审批流程引擎需要完整的状态机测试
- 商机阶段转换的边界条件测试
- 回款计算精度测试（注意浮点数处理，使用 decimal.js）

````

---

### 4.4 Teammate C — 呼叫中心 + AI 分析 CLAUDE.md

```markdown
# Teammate C — 呼叫中心 + AI 智能分析开发指南

## 我的职责
负责呼叫中心和 AI 智能分析的全栈开发，是系统的核心技术亮点模块。

## 我负责的文件范围

### 后端（packages/server/src/）
- `modules/call-record/` — 通话记录模块
- `modules/ai-analysis/` — AI 分析模块
- 涉及 Bull 队列配置（`config/bull.config.ts` 中的 AI 队列部分）

### 前端（packages/web/src/）
- `views/call-center/` — 呼叫中心所有页面
- `views/ai-analysis/` — AI 分析仪表盘
- `components/business/call/` — 通话相关组件（拨号盘、录音播放器等）
- `components/business/ai/` — AI 分析展示组件
- `api/call.ts`、`api/ai-analysis.ts`
- `stores/call.ts`
- `types/call.ts`、`types/ai-analysis.ts`

## 核心技术集成

### 1. 阿里云语音服务（呼叫中心）
- 使用阿里云语音通话 SDK 实现 SIP 外呼
- WebRTC / SIP.js 实现浏览器端软电话
- 通话事件回调：振铃、接通、挂断、录音完成
- 录音文件上传至阿里云 OSS

### 2. 讯飞 ASR 语音识别
- 通话结束后，提交录音文件至讯飞 ASR 异步转写
- 支持实时流式识别（可选）
- 转写结果存储到 `call_record.transcript` 字段

### 3. Claude API 智能分析
```typescript
// AI 分析服务核心接口
interface AiAnalysisService {
  // 通话内容分析
  analyzeCallContent(transcript: string): Promise<CallAnalysisResult>;
  // 客户画像生成
  generateCustomerPortrait(customerId: string): Promise<CustomerPortrait>;
  // 购买意向预测
  predictPurchaseIntent(customerId: string): Promise<IntentPrediction>;
  // 话术建议
  suggestSalesScript(context: SalesContext): Promise<SalesSuggestion>;
}
````

### 4. Bull 任务队列

- 队列名称：`ai-analysis`、`asr-transcription`
- AI 分析任务异步处理，避免阻塞 API 响应
- 支持重试机制（最多 3 次）和死信队列
- 任务状态通过 WebSocket 推送前端

## Claude API 调用规范

- 使用 `@anthropic-ai/sdk` 官方 SDK
- 严格控制 Token 使用量，设置 `max_tokens` 上限
- 实现请求缓存（相同输入在 24h 内复用结果）
- 错误处理：API 限流时自动退避重试
- 环境变量：`CLAUDE_API_KEY`（不要硬编码！）

## 与其他模块的接口

- **← Teammate A（客户管理）**：通话记录关联客户（customer_id 外键），AI 画像写入客户模块
- **← Teammate B（销售流程）**：AI 意向预测关联商机
- **→ Teammate D（通知系统）**：AI 分析完成后推送通知

## 参考设计文档

- `chapters/chapter07.md` — 呼叫中心详细设计
- `chapters/chapter08.md` — AI 智能分析详细设计

## ⚠️ 特别注意

- Claude API Key 通过环境变量注入，绝对不能硬编码
- 录音文件属于敏感数据，OSS 存储需要设置私有读写权限
- AI 分析结果要标注为 "AI 生成"，不能让用户误认为是人工分析
- 控制 AI 调用成本：实现分析结果缓存 + Token 用量监控

## 测试要求

- 外部 API（阿里云、讯飞、Claude）使用 Mock 进行单元测试
- Bull 队列处理流程需要集成测试
- AI 分析结果的格式校验测试

````

---

### 4.5 Teammate D — 销售信息管理 + 系统管理 CLAUDE.md

```markdown
# Teammate D — 销售信息管理 + 系统管理开发指南

## 我的职责
负责销售信息管理和系统管理的全栈开发，提供系统基础设施能力。

## 我负责的文件范围

### 后端（packages/server/src/）
- `modules/knowledge/` — 知识库模块（产品知识、竞品、素材）
- `modules/notification/` — 通知模块
- `modules/system/` — 系统管理模块（配置、日志）
- `modules/user/` — 用户管理模块（注意：auth 模块由 Team Lead 搭建）
- `modules/dashboard/` — 数据看板模块
- `modules/report/` — 报表模块

### 前端（packages/web/src/）
- `views/info-management/` — 销售信息管理所有页面
- `views/system/` — 系统管理所有页面
- `views/dashboard/` — 数据看板
- `components/business/system/` — 系统管理组件
- `components/business/info/` — 信息管理组件
- `api/system.ts`、`api/knowledge.ts`、`api/notification.ts`、`api/dashboard.ts`
- `stores/system.ts`、`stores/notification.ts`
- `types/system.ts`

## 核心业务逻辑

### RBAC 权限系统
````

用户(User) ──M:N──> 角色(Role) ──M:N──> 权限(Permission)
│
└──M:N──> 菜单(Menu)

数据权限范围：

- SELF: 仅本人数据
- DEPARTMENT: 本部门数据
- DEPARTMENT_AND_BELOW: 本部门及下级部门
- ALL: 全部数据

```

### 动态菜单路由
- 前端根据用户角色动态生成路由和菜单
- 菜单数据从后端 API 获取，缓存在 Pinia Store
- 支持菜单图标、排序、显隐控制

### 通知推送
- 使用 WebSocket（Socket.IO）实现实时通知
- 通知类型：系统公告、审批通知、客户分配通知、AI 分析完成通知
- 支持已读/未读状态管理

### 知识库
- 支持富文本编辑（集成 WangEditor 或 TinyMCE）
- 文件附件上传至 OSS
- 版本管理：每次编辑生成新版本，支持版本对比和回滚
- 全文搜索：基于 MySQL FULLTEXT 索引（MVP 阶段），后续可切换 ElasticSearch

### 数据看板
- ECharts 图表：销售业绩趋势、客户增长、转化漏斗、通话统计
- 支持日/周/月时间维度切换
- 数据缓存（Redis）+ 定时预计算（@nestjs/schedule）

## 与其他模块的接口
- **→ 所有模块**：提供 RBAC 权限守卫（其他模块通过装饰器引用）
- **→ 所有模块**：提供通知推送服务（NotificationService 可被其他模块注入）
- **→ 所有模块**：提供操作日志记录（通过 AOP 拦截器自动记录）
- **← Teammate B（销售流程）**：看板数据聚合销售指标
- **← Teammate A（客户管理）**：看板数据聚合客户指标

## 参考设计文档
- `chapters/chapter09.md` — 销售信息管理详细设计
- 涉及 chapter12（安全设计）中的权限部分

## 测试要求
- RBAC 权限逻辑：覆盖所有角色组合的权限测试
- WebSocket 通知：使用 socket.io-client 进行集成测试
- 数据看板：统计计算准确性测试
```

---

### 4.6 Teammate E — 微信小程序 CLAUDE.md

```markdown
# Teammate E — 微信小程序开发指南

## 我的职责

负责微信小程序（packages/mini-app/）的完整开发，为外勤销售人员提供移动办公能力。

## 我负责的文件范围

- `packages/mini-app/` — 整个小程序项目目录

## 技术栈

- 框架：uni-app（Vue 3 Composition API 语法）
- UI 库：uView UI 或 uni-ui
- 状态管理：Pinia
- HTTP：uni.request 封装
- 地图：腾讯地图 SDK（wx.getLocation + 逆地理编码）
- 构建：HBuilderX 或 CLI

## 小程序页面结构
```

pages/
├── index/ # 工作台首页（今日待办、业绩概览）
├── customer/
│ ├── list.vue # 客户列表
│ └── detail.vue # 客户详情
├── visit/
│ ├── sign-in.vue # 外勤签到（LBS 定位 + 拍照）
│ └── record.vue # 拜访记录
├── performance/
│ └── dashboard.vue # 业绩看板
├── message/
│ └── list.vue # 消息通知列表
└── mine/
└── profile.vue # 我的（个人信息、设置）

```

## 核心功能

### LBS 签到
- 使用 `wx.getLocation` 获取经纬度
- 腾讯地图逆地理编码获取地址信息
- 签到时拍照上传（调用 `wx.chooseMedia`）
- 签到记录关联客户和拜访计划
- 地理围栏校验（可选）：判断是否在客户公司附近

### 离线队列
- 网络断开时，操作存入本地离线队列（uni.setStorageSync）
- 网络恢复后自动同步（`uni.onNetworkStatusChange` 监听）
- 冲突解决策略：时间戳优先

### API 对接
- 复用后端已有的 RESTful API（`/api/v1/*`）
- Token 存储在小程序 Storage
- 刷新 Token 机制与 Web 端一致

## ⚠️ 小程序特殊限制
- 小程序包大小限制 2MB（主包），使用分包加载
- 域名需要在微信后台配置白名单
- 不支持 Cookie，使用 Header Bearer Token
- 部分 H5 API 在小程序中不可用，需使用 uni-app 适配层

## 与其他模块的接口
- **← packages/server/**：调用所有后端 API，不新增后端模块
- **← packages/shared/**：复用公共类型定义

## 参考设计文档
- `chapters/chapter10.md` — 微信小程序详细设计

## 测试要求
- 使用微信开发者工具进行真机调试
- 签到定位功能需要实地测试
- 离线队列同步逻辑需要模拟弱网环境测试
```

---

## 5. 各 Agent 启动提示词

### 5.1 启动命令总览

```bash
# 在 AI assistant 中使用 Agent Teams 启动 Teammate

# Teammate A — 客户管理中心
/teams start "<Teammate A 提示词>" --name customer-module

# Teammate B — 销售流程管理
/teams start "<Teammate B 提示词>" --name sales-module

# Teammate C — 呼叫中心 + AI 分析
/teams start "<Teammate C 提示词>" --name call-ai-module

# Teammate D — 销售信息管理 + 系统管理
/teams start "<Teammate D 提示词>" --name info-system-module

# Teammate E — 微信小程序（第三阶段启动）
/teams start "<Teammate E 提示词>" --name mini-app-module
```

### 5.2 Teammate A 启动提示词

```
你是 Teammate A，负责「客户管理中心」模块的全栈开发。

你的工作范围：
- 后端：packages/server/src/modules/customer/、modules/lead/、modules/high-seas/
- 前端：packages/web/src/views/customer/、components/business/customer/
- API：packages/web/src/api/customer.ts
- Store：packages/web/src/stores/customer.ts
- 类型：packages/web/src/types/customer.ts 和 packages/shared/src/types/customer.ts

请严格按照以下顺序开发：

【第一冲刺 — 基础 CRUD】
1. 创建后端 Customer Entity（参考 chapter05.md 数据库设计）
2. 创建 CreateCustomerDto、UpdateCustomerDto、QueryCustomerDto
3. 实现 CustomerService：增删改查 + 分页查询
4. 实现 CustomerController：RESTful API（/api/v1/customers）
5. 编写 Swagger 文档注解
6. 创建前端客户列表页（views/customer/index.vue）— 使用 Element Plus Table
7. 创建前端客户详情页（views/customer/detail.vue）
8. 创建前端客户创建/编辑表单
9. 实现联系人管理（CustomerContact）CRUD

【第二冲刺 — 高级功能】
10. 实现客户公海池模块（HighSeasService）：领取、分配、回收规则
11. 实现客户查重算法（基于公司名/手机号/邮箱）
12. 实现客户标签系统
13. 实现跟进记录功能（时间线组件）
14. 实现 Excel 导入导出功能
15. 实现数据权限过滤（根据用户角色过滤数据）

【第三冲刺 — 测试与优化】
16. 编写 CustomerService 单元测试（覆盖率 ≥ 80%）
17. 编写公海池逻辑集成测试
18. 性能优化：列表查询增加索引、缓存

请参阅 chapters/chapter05.md 获取完整的功能设计细节。
始终遵循项目根目录 CLAUDE.md 的编码规范。
只修改你负责范围内的文件，不要修改 common/ 或其他模块的文件。
如果需要公共类型或工具，在 packages/shared/ 中添加，并通知 Team Lead。
```

### 5.3 Teammate B 启动提示词

```
你是 Teammate B，负责「销售流程管理」模块的全栈开发。

你的工作范围：
- 后端：packages/server/src/modules/opportunity/、modules/contract/、modules/product/、modules/payment/、modules/quotation/、modules/sales-target/、modules/approval/
- 前端：packages/web/src/views/sales/、components/business/sales/
- API：packages/web/src/api/sales.ts、api/contract.ts、api/payment.ts
- Store：packages/web/src/stores/sales.ts
- 类型：packages/web/src/types/sales.ts 和 packages/shared/src/types/sales.ts

请严格按照以下顺序开发：

【第一冲刺 — 商机与产品】
1. 创建 Opportunity Entity（含阶段、预计金额、赢率等字段）
2. 创建商机相关 DTO
3. 实现 OpportunityService：CRUD + 阶段推进逻辑 + 阶段日志记录
4. 实现 OpportunityController
5. 创建 Product Entity 和 ProductService（产品管理）
6. 创建前端商机列表页（支持看板视图和列表视图切换）
7. 创建前端商机详情页（含阶段时间线）
8. 创建前端产品管理页

【第二冲刺 — 合同、回款与审批】
9. 实现合同管理模块（ContractService）：创建、审批、签署、归档
10. 实现回款管理模块（PaymentService）：回款计划、到账确认
11. 实现审批流程引擎（ApprovalService）：模板、节点、流转
12. 创建前端合同管理页面（含合同审批流程展示）
13. 创建前端回款管理页面（含回款计划日历视图）
14. 实现销售漏斗可视化（ECharts funnel chart）
15. 实现销售目标设定与达成追踪
16. 实现业绩排行榜

【第三冲刺 — 测试与报表】
17. 编写单元测试（覆盖率 ≥ 80%）
18. 审批流程状态机测试
19. 销售报表生成功能
20. 回款逾期提醒定时任务

请参阅 chapters/chapter06.md 获取完整的功能设计细节。
商机必须关联客户（customer_id），使用 Teammate A 定义的 Customer Entity 的 ID。
金额计算使用 decimal.js 避免浮点精度问题。
审批流程是重要的业务组件，请特别注意状态机的完备性。
```

### 5.4 Teammate C 启动提示词

```
你是 Teammate C，负责「呼叫中心」和「AI 智能分析」两个模块的全栈开发。
这是系统最具技术特色的模块，涉及多个外部服务集成。

你的工作范围：
- 后端：packages/server/src/modules/call-record/、modules/ai-analysis/
- 前端：packages/web/src/views/call-center/、views/ai-analysis/、components/business/call/、components/business/ai/
- API：packages/web/src/api/call.ts、api/ai-analysis.ts
- Store：packages/web/src/stores/call.ts
- 类型：packages/web/src/types/call.ts、types/ai-analysis.ts

请严格按照以下顺序开发：

【第一冲刺 — 通话记录基础】
1. 创建 CallRecord Entity（通话类型、状态、时长、录音URL、转写文本等）
2. 创建通话相关 DTO
3. 实现 CallRecordService：CRUD + 通话统计
4. 实现 CallRecordController
5. 阿里云语音服务集成：封装外呼SDK、通话事件回调处理
6. 录音文件 OSS 上传服务
7. 创建前端通话记录列表页
8. 创建前端通话详情页（含录音播放器组件）

【第二冲刺 — ASR + AI 分析】
9. 讯飞 ASR 集成：封装语音转写 SDK、异步回调处理
10. Claude AI 分析集成：
    - 封装 @anthropic-ai/sdk 调用
    - 实现 analyzeCallContent（通话内容分析）
    - 实现 generateCustomerPortrait（客户画像）
    - 实现 predictPurchaseIntent（意向预测）
11. Bull 队列配置：
    - `asr-transcription` 队列（录音转写任务）
    - `ai-analysis` 队列（AI 分析任务）
    - 任务状态通过 WebSocket 推送前端
12. 创建前端 AI 分析仪表盘
13. 创建前端客户画像展示组件
14. 创建前端通话分析结果展示组件

【第三冲刺 — 优化与测试】
15. 实现 AI 分析结果缓存（Redis，24h 有效期）
16. Claude API Token 用量监控和成本控制
17. 编写单元测试（外部 API 使用 Mock）
18. 编写 Bull 队列处理流程集成测试

请参阅 chapters/chapter07.md（呼叫中心）和 chapters/chapter08.md（AI 分析）获取完整设计细节。

⚠️ 重要提醒：
- Claude API Key 通过 process.env.CLAUDE_API_KEY 获取，绝不硬编码
- 所有外部 API 调用都要有超时设置和错误重试机制
- AI 生成的内容需要标注"AI 生成"标识
- 录音文件是敏感数据，OSS Bucket 设置为私有读写
- Bull 队列的任务要有幂等性保证（同一录音不重复分析）
```

### 5.5 Teammate D 启动提示词

```
你是 Teammate D，负责「销售信息管理」和「系统管理」两个模块的全栈开发。
你的模块为整个系统提供基础设施支撑（权限、通知、日志）。

你的工作范围：
- 后端：packages/server/src/modules/knowledge/、modules/notification/、modules/system/、modules/user/、modules/dashboard/、modules/report/
- 前端：packages/web/src/views/info-management/、views/system/、views/dashboard/、components/business/system/、components/business/info/
- API：packages/web/src/api/system.ts、api/knowledge.ts、api/notification.ts、api/dashboard.ts
- Store：packages/web/src/stores/system.ts、stores/notification.ts
- 类型：packages/web/src/types/system.ts

请严格按照以下顺序开发：

【第一冲刺 — 用户与权限】
1. 完善 User Entity（Team Lead 已创建基础版本）
2. 实现 UserService：用户 CRUD + 密码重置 + 状态管理
3. 创建 Role Entity、Permission Entity、Menu Entity
4. 实现 RBAC 权限系统：
   - RoleService：角色 CRUD + 权限分配
   - PermissionService：权限管理
   - MenuService：菜单管理 + 动态菜单树生成
5. 实现数据权限拦截器（DataPermissionInterceptor）
6. 创建前端用户管理页面（列表、创建、编辑）
7. 创建前端角色管理页面（含权限树勾选组件）
8. 创建前端菜单管理页面
9. 实现前端动态路由生成（根据菜单数据动态添加路由）
10. 创建前端系统配置页面

【第二冲刺 — 信息管理与通知】
11. 实现知识库模块（KnowledgeService）：
    - 产品知识 CRUD + 富文本编辑
    - 竞品数据库管理
    - 销售素材管理（文件上传 OSS + 版本管理）
12. 实现通知模块（NotificationService）：
    - WebSocket 实时推送（Socket.IO）
    - 通知类型管理
    - 已读/未读状态
    - 通知铃铛组件（前端全局）
13. 实现操作日志模块：
    - AOP 日志拦截器（自动记录增删改操作）
    - 日志查看页面（支持时间、用户、操作类型筛选）
14. 实现公告管理功能

【第三冲刺 — 看板、报表与测试】
15. 实现数据看板：
    - 聚合各模块统计数据（客户数、商机数、通话数、业绩等）
    - ECharts 图表：折线图、柱状图、饼图、雷达图
    - 缓存预计算（Redis + 定时任务）
16. 实现统计报表功能（支持导出 Excel）
17. 编写单元测试（覆盖率 ≥ 80%）
18. WebSocket 通知集成测试

请参阅 chapters/chapter09.md（信息管理）获取完整设计细节。
RBAC 权限是系统核心基础设施，请优先保证其稳定性和正确性。

⚠️ 重要提醒：
- NotificationService 会被其他模块注入调用，请设计好公共接口并 export
- 数据权限拦截器要足够通用，其他模块可以通过 @DataPermission() 装饰器使用
- 操作日志拦截器通过 AOP 实现，其他模块无需手动调用
- 动态菜单路由是前端核心功能，请确保与 Vue Router 动态路由无缝集成
```

### 5.6 Teammate E 启动提示词

```
你是 Teammate E，负责「微信小程序」的完整开发。
小程序为外勤销售人员提供移动办公能力。

⚠️ 你在第三阶段启动，此时后端 API 已基本就绪。
你只需要开发前端（packages/mini-app/），不需要新增后端模块。

你的工作范围：
- packages/mini-app/ — 整个小程序项目目录
- 复用 packages/shared/ 中的公共类型

请按照以下顺序开发：

【第一步 — 框架搭建】
1. 初始化 uni-app 项目（Vue 3 Composition API）
2. 配置 Pinia 状态管理
3. 封装 uni.request HTTP 工具类（含 Token 管理、拦截器）
4. 配置页面路由和 TabBar（工作台、客户、签到、我的）
5. 选择并集成 UI 库（uView UI 或 uni-ui）

【第二步 — 核心页面】
6. 工作台首页：今日待办事项 + 业绩概览卡片
7. 客户列表页：搜索、筛选、按状态分类
8. 客户详情页：基本信息 + 跟进记录 + 联系人
9. 外勤签到页：
   - wx.getLocation 获取定位
   - 腾讯地图逆地理编码获取地址
   - 拍照上传（wx.chooseMedia）
   - 签到记录提交
10. 拜访记录页：创建拜访记录 + 关联客户

【第三步 — 扩展功能】
11. 业绩看板页：ECharts 图表（使用 echarts-for-weixin）
12. 消息通知页：消息列表 + 已读未读标记
13. 个人中心页：个人信息、密码修改、退出登录
14. 离线队列机制：
    - 网络断开时操作暂存本地
    - 网络恢复自动同步
    - uni.onNetworkStatusChange 监听

【第四步 — 测试与优化】
15. 微信开发者工具调试
16. 真机测试（Android + iOS）
17. 分包加载优化（主包 < 2MB）
18. 性能优化（列表虚拟滚动、图片懒加载）

请参阅 chapters/chapter10.md 获取完整设计细节。

⚠️ 重要提醒：
- 所有 API 调用复用后端已有接口（/api/v1/*），不要自己造新接口
- Token 存储使用 uni.setStorageSync('token', ...)
- 小程序包大小限制 2MB（主包），注意分包加载
- 域名需要在微信后台配置 request 合法域名
- 地图相关功能需要申请腾讯地图 Key
```

---

## 6. 协作机制与质量保障

### 6.1 模块间依赖关系图

```
                    ┌─────────────┐
                    │  Team Lead  │
                    │  公共基础层  │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
      ┌───────────┐ ┌───────────┐ ┌───────────┐
      │  TM-D     │ │  TM-A     │ │  TM-C     │
      │ 权限+通知  │ │ 客户管理   │ │ 呼叫+AI   │
      └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
            │              │              │
  ┌─────────┼──────────────┼──────────────┤
  │  提供权限守卫    客户数据引用   AI画像写入客户
  │  提供通知服务    客户→商机转换  AI关联商机
  │         │              │              │
  │         ▼              ▼              ▼
  │   ┌───────────┐ ┌───────────┐ ┌───────────┐
  │   │  TM-B     │ │  TM-E     │ │  看板数据  │
  │   │ 销售流程   │ │ 小程序     │ │ 聚合展示   │
  │   └───────────┘ └───────────┘ └───────────┘
  │         │                            │
  └─────────┴────────────────────────────┘
            审批触发通知
```

### 6.2 接口契约规范

各模块间通过 TypeScript 接口类型进行松耦合：

```typescript
// packages/shared/src/types/interfaces.ts

// Teammate A 提供给其他模块引用的客户基础信息
export interface CustomerBasicInfo {
  id: string;
  name: string;
  status: CustomerStatus;
  ownerUserId: string;
}

// Teammate B 提供给其他模块引用的商机基础信息
export interface OpportunityBasicInfo {
  id: string;
  name: string;
  stage: OpportunityStage;
  amount: number;
  customerId: string;
}

// Teammate D 提供给所有模块使用的通知发送接口
export interface SendNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}
```

### 6.3 Hooks 配置（质量保障）

```jsonc
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "echo '请确保只修改你负责范围内的文件'",
      },
    ],
    "TeammateIdle": {
      "command": "cd packages/server && npm run lint && npm run test",
    },
    "TaskCompleted": {
      "command": "cd packages/server && npm run test:integration",
    },
  },
}
```

### 6.4 冲突预防策略

| 策略           | 说明                                               |
| -------------- | -------------------------------------------------- |
| **文件隔离**   | 每个 Teammate 只修改自己负责的模块目录             |
| **共享层只读** | `common/`、`config/` 目录只有 Team Lead 可以修改   |
| **接口先行**   | 模块间依赖通过 `packages/shared/` 中的接口类型定义 |
| **独立分支**   | 每个 Teammate 在独立的 `feature/` 分支工作         |
| **及时集成**   | 每个冲刺完成后，Team Lead 合并到 `develop` 分支    |

---

## 7. 文件所有权边界

### 7.1 文件所有权矩阵

| 文件路径                                    | 所有者                                     | 其他 Agent 权限        |
| ------------------------------------------- | ------------------------------------------ | ---------------------- |
| `CLAUDE.md`                                 | Team Lead                                  | 只读                   |
| `packages/shared/`                          | Team Lead（各 Agent 可提 PR 添加类型）     | 读 + 提交请求          |
| `packages/server/src/common/`               | Team Lead                                  | 只读引用               |
| `packages/server/src/config/`               | Team Lead                                  | 只读引用               |
| `packages/server/src/modules/auth/`         | Team Lead                                  | 只读引用               |
| `packages/server/src/modules/customer/`     | **Teammate A**                             | 只读引用               |
| `packages/server/src/modules/lead/`         | **Teammate A**                             | 只读引用               |
| `packages/server/src/modules/high-seas/`    | **Teammate A**                             | 只读引用               |
| `packages/server/src/modules/opportunity/`  | **Teammate B**                             | 只读引用               |
| `packages/server/src/modules/contract/`     | **Teammate B**                             | 只读引用               |
| `packages/server/src/modules/product/`      | **Teammate B**                             | 只读引用               |
| `packages/server/src/modules/payment/`      | **Teammate B**                             | 只读引用               |
| `packages/server/src/modules/quotation/`    | **Teammate B**                             | 只读引用               |
| `packages/server/src/modules/approval/`     | **Teammate B**                             | 只读引用               |
| `packages/server/src/modules/sales-target/` | **Teammate B**                             | 只读引用               |
| `packages/server/src/modules/call-record/`  | **Teammate C**                             | 只读引用               |
| `packages/server/src/modules/ai-analysis/`  | **Teammate C**                             | 只读引用               |
| `packages/server/src/modules/knowledge/`    | **Teammate D**                             | 只读引用               |
| `packages/server/src/modules/notification/` | **Teammate D**                             | 只读引用（可注入调用） |
| `packages/server/src/modules/system/`       | **Teammate D**                             | 只读引用               |
| `packages/server/src/modules/user/`         | **Teammate D**                             | 只读引用               |
| `packages/server/src/modules/dashboard/`    | **Teammate D**                             | 只读引用               |
| `packages/server/src/modules/report/`       | **Teammate D**                             | 只读引用               |
| `packages/web/src/views/customer/`          | **Teammate A**                             | 无权限                 |
| `packages/web/src/views/sales/`             | **Teammate B**                             | 无权限                 |
| `packages/web/src/views/call-center/`       | **Teammate C**                             | 无权限                 |
| `packages/web/src/views/ai-analysis/`       | **Teammate C**                             | 无权限                 |
| `packages/web/src/views/info-management/`   | **Teammate D**                             | 无权限                 |
| `packages/web/src/views/system/`            | **Teammate D**                             | 无权限                 |
| `packages/web/src/views/dashboard/`         | **Teammate D**                             | 无权限                 |
| `packages/web/src/layout/`                  | Team Lead                                  | 只读引用               |
| `packages/web/src/router/`                  | Team Lead + **Teammate D**（动态路由部分） | 只读引用               |
| `packages/mini-app/`                        | **Teammate E**                             | 无权限                 |
| `docker-compose.yml`                        | Team Lead                                  | 只读                   |
| `.github/`                                  | Team Lead                                  | 只读                   |

---

## 附录：快速启动检查清单

### Team Lead 在启动 Agent Teams 前需要完成的准备工作：

- [ ] 项目 Monorepo 结构已初始化
- [ ] `packages/server/` NestJS 项目可以正常启动
- [ ] `packages/web/` Vue 3 项目可以正常启动
- [ ] Docker Compose 中的 MySQL 和 Redis 可以正常连接
- [ ] 数据库 Migration 已全部执行
- [ ] `src/common/` 公共模块已编写完成
- [ ] JWT 认证模块可以正常工作
- [ ] 前端登录页和主布局已完成
- [ ] ESLint + Prettier 配置完成
- [ ] 项目根 CLAUDE.md 已编写
- [ ] `packages/shared/` 基础类型定义已完成
- [ ] `.claude/settings.json` Hooks 已配置
- [ ] 各 Teammate 的 CLAUDE.md 已放置在对应目录
- [ ] Git 仓库已初始化，develop 分支已创建

### 环境变量准备（.env）：

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=crm_sales

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRATION=2h
JWT_REFRESH_EXPIRATION=7d

# 阿里云 OSS
OSS_ACCESS_KEY_ID=your_key
OSS_ACCESS_KEY_SECRET=your_secret
OSS_BUCKET=your_bucket
OSS_REGION=oss-cn-hangzhou

# 讯飞 ASR
XFYUN_APP_ID=your_app_id
XFYUN_API_KEY=your_api_key
XFYUN_API_SECRET=your_api_secret

# Claude API
CLAUDE_API_KEY=your_claude_api_key

# 阿里云语音服务
ALICLOUD_VOICE_ACCESS_KEY=your_key
ALICLOUD_VOICE_SECRET_KEY=your_secret
```

---

## 8. AI assistant 多 Agent 并行开发 — 实际使用步骤指南

> ⚠️ **说明**：AI assistant 的 "Agent Teams" 目前属于实验性 / 正在演进中的功能，官方公开文档较少。
> 以下基于 AI assistant 已确认可用的核心能力（Headless 模式、SDK、Git Worktree、CLAUDE.md、Hooks、Subagent）
> 设计了 **三种可行的多 Agent 并行开发方案**，您可以根据实际环境选择最适合的方式。

---

### 8.1 方案总览：三种多 Agent 并行开发方式

| 方案                              | 适用场景              | 复杂度      | 隔离性 | 推荐度              |
| --------------------------------- | --------------------- | ----------- | ------ | ------------------- |
| **方案 A：多终端 + Git Worktree** | 最简单直接，手动管理  | ⭐ 低       | ✅ 高  | ⭐⭐⭐⭐⭐ 强烈推荐 |
| **方案 B：Headless 模式脚本编排** | 自动化程度高，适合 CI | ⭐⭐⭐ 中   | ✅ 高  | ⭐⭐⭐⭐ 推荐       |
| **方案 C：SDK 程序化编排**        | 最灵活，适合高级用户  | ⭐⭐⭐⭐ 高 | ✅ 高  | ⭐⭐⭐ 进阶         |

---

### 8.2 方案 A：多终端 + Git Worktree（⭐ 强烈推荐）

这是最简单、最实用的方式：为每个 Teammate 创建独立的 Git Worktree，在不同终端窗口中运行独立的 AI assistant 实例。

#### 步骤 1：准备项目和 CLAUDE.md 文件

```bash
# 确保已在主项目目录中
cd D:\Develop\Sales-CRM-service-platform\crm-sales-platform

# 确认项目结构
ls packages/
# 应该看到：web/  server/  mini-app/  shared/

# 确认根 CLAUDE.md 已就位
cat CLAUDE.md
```

**放置各模块 CLAUDE.md 文件：**

```bash
# 1. 项目根目录 CLAUDE.md（第 4.1 节内容 → 已就位）

# 2. Teammate A 的 CLAUDE.md
mkdir -p packages/server/src/modules/customer
cp docs/teammate-a-claude.md packages/server/src/modules/customer/CLAUDE.md

mkdir -p packages/web/src/views/customer
cp docs/teammate-a-claude.md packages/web/src/views/customer/CLAUDE.md

# 3. Teammate B 的 CLAUDE.md
mkdir -p packages/server/src/modules/opportunity
cp docs/teammate-b-claude.md packages/server/src/modules/opportunity/CLAUDE.md

mkdir -p packages/web/src/views/sales
cp docs/teammate-b-claude.md packages/web/src/views/sales/CLAUDE.md

# 4. Teammate C 的 CLAUDE.md
mkdir -p packages/server/src/modules/call-record
cp docs/teammate-c-claude.md packages/server/src/modules/call-record/CLAUDE.md

mkdir -p packages/web/src/views/call-center
cp docs/teammate-c-claude.md packages/web/src/views/call-center/CLAUDE.md

# 5. Teammate D 的 CLAUDE.md
mkdir -p packages/server/src/modules/knowledge
cp docs/teammate-d-claude.md packages/server/src/modules/knowledge/CLAUDE.md

mkdir -p packages/web/src/views/system
cp docs/teammate-d-claude.md packages/web/src/views/system/CLAUDE.md
```

#### 步骤 2：创建 Git Worktree（每个 Teammate 一个隔离副本）

```bash
# 确保在主仓库根目录，且 develop 分支存在
git checkout develop

# 为每个 Teammate 创建独立的 worktree + feature 分支
git worktree add ../worktree-teammate-a -b feature/customer-module develop
git worktree add ../worktree-teammate-b -b feature/sales-module develop
git worktree add ../worktree-teammate-c -b feature/call-ai-module develop
git worktree add ../worktree-teammate-d -b feature/info-system-module develop

# 验证 worktree 列表
git worktree list
# 输出示例：
# D:/Develop/.../crm-sales-platform           abc1234 [develop]
# D:/Develop/.../worktree-teammate-a           abc1234 [feature/customer-module]
# D:/Develop/.../worktree-teammate-b           abc1234 [feature/sales-module]
# D:/Develop/.../worktree-teammate-c           abc1234 [feature/call-ai-module]
# D:/Develop/.../worktree-teammate-d           abc1234 [feature/info-system-module]
```

#### 步骤 3：在每个终端中启动 AI assistant

打开 **5 个终端窗口**（Windows Terminal 支持多标签页），每个窗口启动一个 AI assistant 实例：

**终端 1 — Team Lead（主仓库，你自己操作）：**

```bash
cd D:\Develop\Sales-CRM-service-platform\crm-sales-platform
claude
# 你作为 Team Lead，在主仓库中协调、审查、合并
```

**终端 2 — Teammate A（客户管理）：**

```bash
cd D:\Develop\Sales-CRM-service-platform\worktree-teammate-a
claude
```

启动后，将第 5.2 节的 Teammate A 启动提示词 **粘贴到对话中**。

**终端 3 — Teammate B（销售流程）：**

```bash
cd D:\Develop\Sales-CRM-service-platform\worktree-teammate-b
claude
```

启动后，粘贴第 5.3 节的 Teammate B 启动提示词。

**终端 4 — Teammate C（呼叫中心 + AI）：**

```bash
cd D:\Develop\Sales-CRM-service-platform\worktree-teammate-c
claude
```

启动后，粘贴第 5.4 节的 Teammate C 启动提示词。

**终端 5 — Teammate D（信息管理 + 系统）：**

```bash
cd D:\Develop\Sales-CRM-service-platform\worktree-teammate-d
claude
```

启动后，粘贴第 5.5 节的 Teammate D 启动提示词。

#### 步骤 4：日常开发流程

```
每个 Teammate 独立工作
         │
         │  每个冲刺完成后
         ▼
┌─────────────────────────────┐
│  Teammate 提交代码到自己分支  │
│  git add . && git commit    │
│  git push origin feature/xx │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Team Lead 合并到 develop   │
│  git checkout develop       │
│  git merge feature/xx       │
│  解决冲突（如有）             │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  各 Worktree 同步 develop 更新  │
│  cd worktree-teammate-x        │
│  git merge develop              │
└─────────────────────────────────┘
```

**具体操作示例：**

```bash
# === Teammate A 完成一个冲刺后 ===

# 在 Teammate A 的终端中（或让 AI assistant 执行）：
cd D:\Develop\Sales-CRM-service-platform\worktree-teammate-a
git add packages/server/src/modules/customer/ packages/web/src/views/customer/
git commit -m "feat(customer): 实现客户 CRUD + 列表页 + 详情页"
git push origin feature/customer-module

# === Team Lead 合并到 develop ===

# 在 Team Lead 终端：
cd D:\Develop\Sales-CRM-service-platform\crm-sales-platform
git checkout develop
git merge feature/customer-module --no-ff -m "merge: 合并客户管理模块第一冲刺"
git push origin develop

# === 通知其他 Teammate 同步 ===

# 在各 Teammate 的 worktree 中：
git fetch origin
git merge origin/develop
# 如有冲突，在 AI assistant 中处理
```

#### 步骤 5：合并完成后清理 Worktree

```bash
# 当某个 Teammate 的工作全部完成后
git worktree remove ../worktree-teammate-a
git branch -d feature/customer-module  # 分支已合并可删除

# 查看剩余 worktree
git worktree list
```

---

### 8.3 方案 B：Headless 模式脚本编排

使用 AI assistant 的 `--print`（`-p`）标志以非交互模式运行，适合自动化批量任务。

#### 核心原理

```bash
# --print 模式：输入提示词 → 执行任务 → 输出结果 → 退出
# 不会进入交互式 REPL，适合脚本编排

claude -p "你的任务描述"
```

#### 步骤 1：创建编排脚本

在项目根目录创建 `scripts/run-teammates.sh`（或 `.ps1` for Windows PowerShell）：

**Linux/macOS (Bash)：**

```bash
#!/bin/bash
# scripts/run-teammates.sh — Agent Teams 并行启动脚本

PROJECT_ROOT="$(pwd)"
LOG_DIR="$PROJECT_ROOT/.claude/teammate-logs"
mkdir -p "$LOG_DIR"

echo "========================================="
echo "  CRM 销售管理系统 — Agent Teams 并行启动"
echo "========================================="
echo ""

# 读取各 Teammate 的提示词文件
PROMPT_A=$(cat scripts/prompts/teammate-a.txt)
PROMPT_B=$(cat scripts/prompts/teammate-b.txt)
PROMPT_C=$(cat scripts/prompts/teammate-c.txt)
PROMPT_D=$(cat scripts/prompts/teammate-d.txt)

# 并行启动 4 个 Teammate，各自在独立 worktree 中工作
echo "[$(date)] 启动 Teammate A — 客户管理中心..."
cd "$PROJECT_ROOT/../worktree-teammate-a" && \
  claude -p "$PROMPT_A" > "$LOG_DIR/teammate-a.log" 2>&1 &
PID_A=$!

echo "[$(date)] 启动 Teammate B — 销售流程管理..."
cd "$PROJECT_ROOT/../worktree-teammate-b" && \
  claude -p "$PROMPT_B" > "$LOG_DIR/teammate-b.log" 2>&1 &
PID_B=$!

echo "[$(date)] 启动 Teammate C — 呼叫中心 + AI..."
cd "$PROJECT_ROOT/../worktree-teammate-c" && \
  claude -p "$PROMPT_C" > "$LOG_DIR/teammate-c.log" 2>&1 &
PID_C=$!

echo "[$(date)] 启动 Teammate D — 信息管理 + 系统..."
cd "$PROJECT_ROOT/../worktree-teammate-d" && \
  claude -p "$PROMPT_D" > "$LOG_DIR/teammate-d.log" 2>&1 &
PID_D=$!

echo ""
echo "所有 Teammate 已启动！"
echo "  Teammate A PID: $PID_A"
echo "  Teammate B PID: $PID_B"
echo "  Teammate C PID: $PID_C"
echo "  Teammate D PID: $PID_D"
echo ""
echo "查看日志："
echo "  tail -f $LOG_DIR/teammate-a.log"
echo "  tail -f $LOG_DIR/teammate-b.log"
echo "  tail -f $LOG_DIR/teammate-c.log"
echo "  tail -f $LOG_DIR/teammate-d.log"
echo ""

# 等待所有 Teammate 完成
wait $PID_A $PID_B $PID_C $PID_D

echo ""
echo "[$(date)] 所有 Teammate 已完成！"
echo "请检查各 worktree 中的代码变更。"
```

**Windows PowerShell：**

```powershell
# scripts/run-teammates.ps1 — Agent Teams 并行启动脚本（Windows 版）

$ProjectRoot = Get-Location
$LogDir = "$ProjectRoot\.claude\teammate-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  CRM 销售管理系统 — Agent Teams 并行启动" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 读取各 Teammate 的提示词
$PromptA = Get-Content "scripts\prompts\teammate-a.txt" -Raw
$PromptB = Get-Content "scripts\prompts\teammate-b.txt" -Raw
$PromptC = Get-Content "scripts\prompts\teammate-c.txt" -Raw
$PromptD = Get-Content "scripts\prompts\teammate-d.txt" -Raw

# 并行启动 4 个 Teammate
$jobs = @()

$jobs += Start-Job -Name "Teammate-A" -ScriptBlock {
    param($dir, $prompt, $log)
    Set-Location $dir
    claude -p $prompt | Out-File $log -Encoding utf8
} -ArgumentList "$ProjectRoot\..\worktree-teammate-a", $PromptA, "$LogDir\teammate-a.log"

$jobs += Start-Job -Name "Teammate-B" -ScriptBlock {
    param($dir, $prompt, $log)
    Set-Location $dir
    claude -p $prompt | Out-File $log -Encoding utf8
} -ArgumentList "$ProjectRoot\..\worktree-teammate-b", $PromptB, "$LogDir\teammate-b.log"

$jobs += Start-Job -Name "Teammate-C" -ScriptBlock {
    param($dir, $prompt, $log)
    Set-Location $dir
    claude -p $prompt | Out-File $log -Encoding utf8
} -ArgumentList "$ProjectRoot\..\worktree-teammate-c", $PromptC, "$LogDir\teammate-c.log"

$jobs += Start-Job -Name "Teammate-D" -ScriptBlock {
    param($dir, $prompt, $log)
    Set-Location $dir
    claude -p $prompt | Out-File $log -Encoding utf8
} -ArgumentList "$ProjectRoot\..\worktree-teammate-d", $PromptD, "$LogDir\teammate-d.log"

Write-Host ""
Write-Host "所有 Teammate 已启动！" -ForegroundColor Green
Write-Host "等待完成中..." -ForegroundColor Yellow

# 等待所有任务完成
$jobs | Wait-Job | Receive-Job

Write-Host ""
Write-Host "所有 Teammate 已完成！请检查各 worktree 中的代码变更。" -ForegroundColor Green
```

#### 步骤 2：准备提示词文件

将第 5 节的各 Teammate 启动提示词分别保存为文件：

```
scripts/
└── prompts/
    ├── teammate-a.txt    # 第 5.2 节内容
    ├── teammate-b.txt    # 第 5.3 节内容
    ├── teammate-c.txt    # 第 5.4 节内容
    ├── teammate-d.txt    # 第 5.5 节内容
    └── teammate-e.txt    # 第 5.6 节内容
```

#### 步骤 3：运行

```bash
# Linux/macOS
chmod +x scripts/run-teammates.sh
./scripts/run-teammates.sh

# Windows PowerShell
.\scripts\run-teammates.ps1
```

---

### 8.4 方案 C：SDK 程序化编排（进阶）

使用 `@anthropic-ai/claude-code` npm SDK 在 Node.js 脚本中编排多个 Agent。

#### 步骤 1：安装 SDK

```bash
npm install @anthropic-ai/claude-code
```

#### 步骤 2：创建编排脚本

```typescript
// scripts/orchestrator.ts — Agent Teams SDK 编排器

import { claude } from "@anthropic-ai/claude-code";
import * as fs from "fs";
import * as path from "path";

interface TeammateConfig {
  name: string;
  workdir: string;
  promptFile: string;
  branch: string;
}

const PROJECT_ROOT = process.cwd();

const teammates: TeammateConfig[] = [
  {
    name: "Teammate-A（客户管理）",
    workdir: path.resolve(PROJECT_ROOT, "../worktree-teammate-a"),
    promptFile: "scripts/prompts/teammate-a.txt",
    branch: "feature/customer-module",
  },
  {
    name: "Teammate-B（销售流程）",
    workdir: path.resolve(PROJECT_ROOT, "../worktree-teammate-b"),
    promptFile: "scripts/prompts/teammate-b.txt",
    branch: "feature/sales-module",
  },
  {
    name: "Teammate-C（呼叫+AI）",
    workdir: path.resolve(PROJECT_ROOT, "../worktree-teammate-c"),
    promptFile: "scripts/prompts/teammate-c.txt",
    branch: "feature/call-ai-module",
  },
  {
    name: "Teammate-D（信息+系统）",
    workdir: path.resolve(PROJECT_ROOT, "../worktree-teammate-d"),
    promptFile: "scripts/prompts/teammate-d.txt",
    branch: "feature/info-system-module",
  },
];

async function runTeammate(config: TeammateConfig): Promise<void> {
  const prompt = fs.readFileSync(config.promptFile, "utf-8");

  console.log(`\n🚀 启动 ${config.name}...`);
  console.log(`   工作目录: ${config.workdir}`);
  console.log(`   分支: ${config.branch}`);

  try {
    const result = await claude({
      prompt,
      workdir: config.workdir,
      // 可选参数
      // maxTurns: 50,        // 最大交互轮次
      // allowedTools: [...], // 允许使用的工具
    });

    console.log(`\n✅ ${config.name} 完成！`);
    console.log(`   结果摘要: ${result.substring(0, 200)}...`);

    // 保存完整输出日志
    const logPath = path.join(
      PROJECT_ROOT,
      `.claude/teammate-logs/${config.branch}.log`,
    );
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, result, "utf-8");
  } catch (error) {
    console.error(`\n❌ ${config.name} 出错:`, error);
  }
}

async function main() {
  console.log("=========================================");
  console.log("  CRM 销售管理系统 — SDK Agent 编排器");
  console.log("=========================================\n");

  // 并行启动所有 Teammate
  const tasks = teammates.map((tm) => runTeammate(tm));
  await Promise.all(tasks);

  console.log("\n\n=========================================");
  console.log("  所有 Teammate 已完成！");
  console.log("  请使用 Team Lead 检查各分支的代码变更。");
  console.log("=========================================");
}

main().catch(console.error);
```

#### 步骤 3：运行编排器

```bash
npx ts-node scripts/orchestrator.ts
```

---

### 8.5 完整操作流程（以方案 A 为例的端到端指南）

以下是从零开始使用 Agent Teams 开发本 CRM 项目的完整操作流程：

#### 🔸 Phase 0：环境准备（一次性）

```bash
# 1. 确保已安装 AI assistant
npm install -g @anthropic-ai/claude-code
# 或检查版本
claude --version

# 2. 确保已安装 pnpm
npm install -g pnpm

# 3. 确保已安装 Docker Desktop（用于 MySQL + Redis）
docker --version
docker compose version

# 4. 确保已安装 Git
git --version

# 5. 创建项目目录
mkdir -p "D:\Develop\Sales-CRM-service-platform\crm-sales-platform"
cd "D:\Develop\Sales-CRM-service-platform\crm-sales-platform"

# 6. 初始化 Git 仓库
git init
git checkout -b main
git checkout -b develop
```

#### 🔸 Phase 1：架构搭建（Team Lead 独立完成，1-2 周）

```bash
# 在项目根目录启动 AI assistant
cd "D:\Develop\Sales-CRM-service-platform\crm-sales-platform"
claude
```

在 AI assistant 中输入以下指令：

```
请帮我搭建 AI 智能 CRM 销售管理系统的项目基础架构。

项目结构为 pnpm Monorepo：
- packages/web/ — Vue 3 + Vite + TypeScript + Element Plus
- packages/server/ — NestJS 10 + TypeORM + MySQL 8.0 + Redis
- packages/mini-app/ — uni-app 微信小程序
- packages/shared/ — 公共类型和工具

请完成以下任务：
1. 初始化 Monorepo 结构（pnpm-workspace.yaml）
2. 搭建 NestJS 后端框架（含 common/ 公共模块：异常过滤器、响应拦截器、日志中间件）
3. 搭建 Vue 3 前端框架（Vite 配置、路由、布局组件、Axios 封装、Pinia）
4. 配置 Docker Compose（MySQL 8.0 + Redis 6.x）
5. 实现 JWT 双 Token 认证（Access 2h + Refresh 7d）
6. 配置 ESLint + Prettier + Husky + commitlint
7. 创建数据库 Migration（所有表）
8. 前端登录页 + 主布局
9. packages/shared/ 基础类型定义

参考设计文档在 chapters/ 目录下。
```

**Phase 1 完成后的检查清单：**

```bash
# 验证后端可以启动
cd packages/server && npm run start:dev

# 验证前端可以启动
cd packages/web && npm run dev

# 验证数据库连接
docker compose up -d  # MySQL + Redis 启动
npm run migration:run  # 数据库迁移

# 验证认证功能
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### 🔸 Phase 2-准备：创建 CLAUDE.md 文件

```bash
# 创建项目根目录 CLAUDE.md
# 内容 = 本文档第 4.1 节的代码块内容

# 创建各模块目录的 CLAUDE.md
# Teammate A
mkdir -p packages/server/src/modules/customer
# 将第 4.2 节内容写入 packages/server/src/modules/customer/CLAUDE.md

# Teammate B
mkdir -p packages/server/src/modules/opportunity
# 将第 4.3 节内容写入 packages/server/src/modules/opportunity/CLAUDE.md

# Teammate C
mkdir -p packages/server/src/modules/call-record
# 将第 4.4 节内容写入 packages/server/src/modules/call-record/CLAUDE.md

# Teammate D
mkdir -p packages/server/src/modules/knowledge
# 将第 4.5 节内容写入 packages/server/src/modules/knowledge/CLAUDE.md

# 提交所有 CLAUDE.md
git add -A
git commit -m "docs: 添加各模块 CLAUDE.md 开发指南"
git push origin develop
```

#### 🔸 Phase 2-启动：创建 Worktree 并启动 Agent Teams

```bash
# 确保在主仓库 develop 分支
cd "D:\Develop\Sales-CRM-service-platform\crm-sales-platform"
git checkout develop

# 创建 4 个 Worktree
git worktree add ..\worktree-teammate-a -b feature/customer-module develop
git worktree add ..\worktree-teammate-b -b feature/sales-module develop
git worktree add ..\worktree-teammate-c -b feature/call-ai-module develop
git worktree add ..\worktree-teammate-d -b feature/info-system-module develop
```

**打开 5 个终端标签页，分别执行：**

| 终端 # | 角色       | 命令                                                     |
| ------ | ---------- | -------------------------------------------------------- |
| 1      | Team Lead  | `cd crm-sales-platform && claude`                        |
| 2      | Teammate A | `cd worktree-teammate-a && claude`，然后粘贴 §5.2 提示词 |
| 3      | Teammate B | `cd worktree-teammate-b && claude`，然后粘贴 §5.3 提示词 |
| 4      | Teammate C | `cd worktree-teammate-c && claude`，然后粘贴 §5.4 提示词 |
| 5      | Teammate D | `cd worktree-teammate-d && claude`，然后粘贴 §5.5 提示词 |

#### 🔸 Phase 2-迭代：冲刺周期管理

**每个冲刺（约 2 周）结束时的操作：**

```bash
# ============================================
# Step 1: 每个 Teammate 提交代码（在各自终端中）
# ============================================

# 在 Teammate A 的 AI assistant 中说：
# "请将所有已完成的代码提交到 Git"
# AI assistant 会自动执行 git add + git commit

# 或手动在终端中：
cd ..\worktree-teammate-a
git add -A
git commit -m "feat(customer): 完成客户CRUD + 列表页 + 详情页 + 联系人管理"
git push origin feature/customer-module

# ============================================
# Step 2: Team Lead 合并各分支到 develop
# ============================================

cd "D:\Develop\Sales-CRM-service-platform\crm-sales-platform"
git checkout develop

# 合并 Teammate A
git merge feature/customer-module --no-ff
# 如有冲突 → 在 Team Lead 的 AI assistant 中解决

# 合并 Teammate B
git merge feature/sales-module --no-ff

# 合并 Teammate C
git merge feature/call-ai-module --no-ff

# 合并 Teammate D
git merge feature/info-system-module --no-ff

# 推送 develop
git push origin develop

# ============================================
# Step 3: 各 Worktree 同步最新 develop
# ============================================

# 在 Teammate A 的终端中
cd ..\worktree-teammate-a
git fetch origin
git merge origin/develop
# 在 AI assistant 中说："develop 分支已同步，请继续下一个冲刺的开发"

# 对 B、C、D 重复相同操作
```

#### 🔸 Phase 3：启动小程序开发

```bash
# 创建 Teammate E 的 worktree
cd "D:\Develop\Sales-CRM-service-platform\crm-sales-platform"
git worktree add ..\worktree-teammate-e -b feature/mini-app develop

# 新开终端
cd ..\worktree-teammate-e
claude
# 粘贴 §5.6 Teammate E 提示词
```

#### 🔸 Phase 4：最终集成与部署

```bash
# 合并所有 feature 分支到 develop
git checkout develop
git merge feature/customer-module --no-ff
git merge feature/sales-module --no-ff
git merge feature/call-ai-module --no-ff
git merge feature/info-system-module --no-ff
git merge feature/mini-app --no-ff

# 运行全量测试
cd packages/server && npm run test
cd packages/web && npm run test
npm run build

# 发布到 main
git checkout main
git merge develop --no-ff
git tag v1.0.0
git push origin main --tags

# 清理所有 worktree
cd "D:\Develop\Sales-CRM-service-platform\crm-sales-platform"
git worktree remove ..\worktree-teammate-a
git worktree remove ..\worktree-teammate-b
git worktree remove ..\worktree-teammate-c
git worktree remove ..\worktree-teammate-d
git worktree remove ..\worktree-teammate-e
```

---

### 8.6 AI assistant 核心功能速查表

| 功能               | 说明                     | 用法                                                 |
| ------------------ | ------------------------ | ---------------------------------------------------- |
| **交互模式**       | 默认模式，启动 REPL 对话 | `claude`                                             |
| **Headless 模式**  | 非交互式，执行完退出     | `claude -p "任务描述"`                               |
| **CLAUDE.md**      | 项目级记忆文件，自动加载 | 放置在项目根目录或子目录                             |
| **Git Worktree**   | 创建仓库的隔离副本       | `git worktree add <path> -b <branch>`                |
| **SDK**            | Node.js 编程接口         | `import { claude } from "@anthropic-ai/claude-code"` |
| **Hooks**          | 生命周期钩子             | `.claude/settings.json` 中配置                       |
| **Subagent**       | 会话内子代理             | AI assistant 内部自动调度                            |
| **Context Window** | 每个实例独立上下文       | 约 200K tokens                                       |

---

### 8.7 常见问题与解决方案

#### Q1：Teammate 之间如何通信？

**A**：通过以下机制实现间接通信：

- **Git**：通过共享的 `develop` 分支传递代码变更
- **packages/shared/**：公共类型定义作为模块间契约
- **Team Lead 协调**：在 Team Lead 的 AI assistant 中审查和转达跨模块需求
- **CLAUDE.md 更新**：Team Lead 更新 CLAUDE.md 传达全局变更

#### Q2：多个 Teammate 修改了同一个文件怎么办？

**A**：按照文件所有权矩阵（第 7 节），每个 Teammate 只修改自己负责的文件。如果确实需要修改公共文件：

1. Teammate 在自己的 AI assistant 中提出需求
2. Team Lead 审查后在主仓库中统一修改
3. 通过 `git merge develop` 同步到所有 Worktree

#### Q3：Teammate 的 AI assistant 上下文用完了怎么办？

**A**：

1. 让 AI assistant 先提交当前已完成的工作
2. 关闭当前 AI assistant 会话
3. 重新启动 AI assistant（会自动加载 CLAUDE.md）
4. 告诉它："请继续 [模块名] 第 X 冲刺的开发，已完成的部分请查看现有代码"

#### Q4：能否用 VS Code 的 Claude 扩展替代终端？

**A**：可以！在 VS Code 中：

1. 打开不同的 VS Code 窗口，每个窗口打开一个 Worktree 目录
2. 在每个窗口中使用 AI assistant 扩展
3. 效果等同于方案 A 的多终端方式，且有更好的代码编辑体验

#### Q5：如何监控各 Teammate 的进度？

**A**：

- **查看 Git 日志**：`git log --oneline --all --graph`
- **查看分支差异**：`git diff develop..feature/customer-module --stat`
- **在 Team Lead 的 AI assistant 中**：`"请检查所有 feature 分支的最新提交和变更概要"`

---

### 8.8 最佳实践总结

| #   | 最佳实践                              | 说明                                                       |
| --- | ------------------------------------- | ---------------------------------------------------------- |
| 1   | **Phase 1 必须由 Team Lead 独立完成** | 基础架构不稳定会导致所有 Teammate 都出问题                 |
| 2   | **每个 Teammate 使用独立 Worktree**   | 避免文件冲突，保证隔离性                                   |
| 3   | **及时提交，频繁合并**                | 不要等积累大量变更再合并，冲突越早解决越简单               |
| 4   | **CLAUDE.md 要保持更新**              | 新增公共接口、修改规范时同步更新                           |
| 5   | **先定接口后写实现**                  | 模块间依赖的接口类型先在 shared/ 中定义好                  |
| 6   | **Team Lead 每日检查各分支**          | 及时发现偏离设计的代码                                     |
| 7   | **单元测试不能跳过**                  | 每个冲刺结束前确保测试通过                                 |
| 8   | **保存提示词文件**                    | 便于重新启动 Teammate 时快速恢复上下文                     |
| 9   | **使用 Windows Terminal 多标签页**    | 方便在不同 Teammate 之间切换                               |
| 10  | **遇到困难及时与 Team Lead 沟通**     | 在 Teammate 的 AI assistant 中描述问题，截图发给 Team Lead |

---

> 📋 **使用此文档的完整流程**：
>
> 1. ✅ 阅读本文档，理解角色分工和开发阶段
> 2. ✅ Team Lead 完成第一阶段（架构搭建）
> 3. ✅ 将各 CLAUDE.md 放置到对应目录
> 4. ✅ 创建 Git Worktree（每个 Teammate 一个）
> 5. ✅ 在多个终端中启动 AI assistant 实例
> 6. ✅ 使用启动提示词初始化 Teammate A ~ D
> 7. ✅ 每个冲刺完成后 Team Lead 合并集成
> 8. ✅ 第二阶段完成后，启动 Teammate E（小程序）
> 9. ✅ 最终由 Team Lead 完成部署上线
> 10. ✅ 清理 Worktree，合并到 main 分支
