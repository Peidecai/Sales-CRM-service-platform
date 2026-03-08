# AI 智能 CRM 销售管理系统 — Agent Teams 统一执行方案

> 版本：v1.0 | 日期：2026-03-03  
> 合并自：《Agent-Teams-分工方案》《Agent-Teams-组织与角色定义方案》  
> 用途：Claude Code Agent 仅需参考本文档即可完成角色定位、模块分工与执行协作

---

## 目录

1. [方案概述](#1-方案概述)
2. [组织架构与角色定义](#2-组织架构与角色定义)
3. [业务模块 Teammate 分工](#3-业务模块-teammate-分工)
4. [文件归属矩阵](#4-文件归属矩阵)
5. [接口契约与共享类型](#5-接口契约与共享类型)
6. [各 Agent 的 CLAUDE.md 定义](#6-各-agent-的-claudemd-定义)
7. [启动 Prompt 集](#7-启动-prompt-集)
8. [开发路线图](#8-开发路线图)
9. [并行开发方案](#9-并行开发方案)
10. [协作机制与冲突预防](#10-协作机制与冲突预防)
11. [完整操作指南](#11-完整操作指南)

---

## 1. 方案概述

### 1.1 目标

- 基于 Claude Code **Agent Teams** 实验功能，用**一个文档**统一：组织角色、业务模块分工、文件归属、接口契约、各 Agent 的 CLAUDE.md 与启动 Prompt、开发路线图、并行开发方式与协作机制。
- Agent 读取指令时只需参考本文档，减少上下文切换；将「角色定义」与「模块分工」融合后，每个 Agent 的 CLAUDE.md 可同时包含角色定位与模块职责。

### 1.2 技术栈基准

| 层级      | 技术                                                                     |
| --------- | ------------------------------------------------------------------------ |
| 前端 Web  | Vue 3.4+ / Vite 5 / TypeScript 5 / Element Plus 2 / Pinia / Vue Router 4 |
| 后端      | NestJS 10 / TypeORM 0.3 / Node.js 20 LTS                                 |
| 数据库    | MySQL 8.0 / Redis 6.x                                                    |
| AI / 外部 | Claude API、讯飞 ASR、阿里云语音/OSS                                     |
| 包管理    | pnpm（Monorepo）                                                         |
| 部署      | Docker、Docker Compose、阿里云 ECS/RDS/OSS/SLB                           |

### 1.3 Agent Teams 启用方式

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true
claude
```

### 1.4 设计原则

| 原则         | 说明                                             |
| ------------ | ------------------------------------------------ |
| 模块解耦     | 每个 Agent 负责明确业务模块，最小化文件冲突      |
| 全栈负责     | 业务 Teammate 负责其模块的前端 + 后端 + 数据库   |
| 共享基础层   | 公共组件与基础架构由 Team Lead（架构师）统一搭建 |
| 接口契约先行 | 模块间通过 TypeScript 接口与 API 契约通信        |
| 增量集成     | 各 Agent 完成功能后及时提交，Team Lead 持续集成  |

---

## 2. 组织架构与角色定义

### 2.1 团队与角色总览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Agent Teams 组织架构                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ① 管理团队          ② 设计团队          ③ 架构团队 = Team Lead                  │
│  · 项目经理           · UI/UX 设计大师     · 软件架构师（你）                     │
│  · 产品经理                                                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ④ 开发团队                                                                       │
│  · 前端开发工程师     · 后端开发工程师（可映射为 TM-A～D 中的前端/后端实现者）     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ⑤ 质量保障团队      ⑥ 运维团队                                                   │
│  · 代码审核员         · DevOps 工程师                                              │
│  · 测试工程师                                                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

| 团队         | 角色                       | 主要产出 / 职责摘要                             |
| ------------ | -------------------------- | ----------------------------------------------- |
| 管理团队     | 项目经理、产品经理         | 需求、排期、验收、风险                          |
| 设计团队     | UI/UX 设计大师             | 交互与视觉规范、组件与页面设计                  |
| 架构团队     | 软件架构师 = **Team Lead** | 技术方案、目录与接口契约、非功能指标、协调      |
| 开发团队     | 前端 / 后端开发            | 功能实现、接口与前端联调（对应 TM-A～E 执行者） |
| 质量保障团队 | 代码审核员、测试工程师     | 代码评审、用例与自动化、质量门禁                |
| 运维团队     | DevOps 工程师              | CI/CD、环境与发布、监控与故障处理               |

### 2.2 管理团队

#### 项目经理（Project Manager）

| 维度         | 内容                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 制定与维护项目计划（WBS、里程碑、依赖）；协调各 Agent 任务优先级与交付顺序；跟踪进度与风险，输出周报/站会纪要；组织评审与发布决策；管理文档版本与变更。 |
| **技能范围** | 敏捷/Scrum、甘特与依赖管理、风险识别与缓解、跨角色沟通、文档结构化（Markdown/表格/清单）。                                                              |
| **实用工具** | 任务列表（TodoWrite）、Markdown（排期表、风险清单、会议纪要）、Git 分支与标签策略。                                                                     |
| **技术栈**   | 不涉及编码；需理解 Monorepo 结构、分支策略（main/develop/feature）、CI 阶段含义。                                                                       |

#### 产品经理（Product Manager）

| 维度         | 内容                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 梳理与维护产品需求（用户故事、验收标准、优先级）；编写 PRD/功能说明，与设计、开发对齐；参与原型与交互评审；验收功能；管理需求 backlog 与迭代范围。 |
| **技能范围** | 需求分析与拆解、用户故事与验收标准、CRM 业务域（客户生命周期、销售漏斗、公海池、呼叫与 AI 分析）。                                                 |
| **实用工具** | PRD/功能说明（Markdown）、用户故事与验收清单、需求追溯（故事 ↔ 模块/接口）。                                                                       |
| **技术栈**   | 不涉及编码；需理解模块划分与 API 边界。                                                                                                            |

### 2.3 设计团队

#### UI/UX 设计大师（UI/UX Design Lead）

| 维度         | 内容                                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 制定并维护设计规范（色彩、字体、间距、组件样式）；输出关键页面与流程的交互说明与视觉规范；设计系统组件与业务组件的外观与状态；与前端对齐实现细节（响应式、无障碍、性能）。 |
| **技能范围** | 视觉设计、交互设计、设计系统、响应式布局、可访问性（a11y）、CRM 类后台与数据密集型界面。                                                                                   |
| **实用工具** | 设计规范文档（Markdown + 色板/字体表/间距表）、组件状态说明、与前端约定的 class/token 命名。                                                                               |
| **技术栈**   | Element Plus 组件体系、Vue 3 SFC、SCSS 变量与 Mixin、Vite 与主题注入、ECharts 与数据可视化约定。                                                                           |

### 2.4 架构团队 = Team Lead（软件架构师）

架构团队由 **Team Lead（你）** 承担，即软件架构师 + 协调者。

| 维度         | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **职责范围** | 项目初始化（Monorepo、packages/web、server、mini-app、shared）；基础架构（NestJS common/、异常过滤器、响应拦截器、日志与限流中间件）；数据库 Schema 与 Migration、BaseEntity；JWT 双 Token 认证（auth 模块）；前端脚手架（路由、布局、Axios、Pinia）；代码规范（ESLint、Prettier、Husky、commitlint）；CI/CD（Docker Compose、Dockerfile、GitHub Actions）；任务协调、代码审查、模块间冲突处理；维护 packages/shared/ 与 CLAUDE.md。 |
| **技能范围** | 分层架构、领域建模、API 设计（REST/OpenAPI）、数据库建模与索引、安全与可观测性、高可用与扩展性。                                                                                                                                                                                                                                                                                                                                     |
| **实用工具** | 架构图（Mermaid/ASCII）、OpenAPI/Swagger、TypeScript 接口与 DTO、Migration 与 ER、ADR、CLAUDE.md。                                                                                                                                                                                                                                                                                                                                   |
| **技术栈**   | 后端：NestJS、TypeORM、MySQL 8、Redis、Bull、Passport/JWT、Swagger。前端：Vue 3、Vite、Pinia、Vue Router、Element Plus。运维：Docker、Docker Compose、Nginx、阿里云。共享：TypeScript 严格模式、pnpm workspaces。                                                                                                                                                                                                                    |

**对应设计文档**：chapter01～04、chapter11～13。

### 2.5 开发团队

#### 前端开发工程师（Frontend Developer）

| 维度         | 内容                                                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 在架构与设计规范下实现 PC Web：页面与路由、业务组件、状态管理、与后端 API 联调、错误与加载态、基础性能与可访问性；遵守 ESLint/Prettier 与项目目录约定。                                                                             |
| **技能范围** | Vue 3 Composition API 与 `<script setup>`、TypeScript、Vite、Pinia、Vue Router、Element Plus、Axios、ECharts、SCSS、响应式与无障碍。                                                                                                |
| **实用工具** | VS Code、Vue DevTools、ESLint/Prettier、Git、pnpm、浏览器 DevTools、Postman/Apifox、Vite 构建分析。                                                                                                                                 |
| **技术栈**   | Vue 3 ^3.4+、Vite ^5.x、TypeScript ^5.x、Element Plus ^2.x、Pinia ^2.x、Vue Router ^4.x、Axios ^1.x、ECharts ^5.x、SCSS；ESLint、Prettier、unplugin-auto-import、unplugin-vue-components；DOMPurify、JSEncrypt、Day.js、lodash-es。 |

#### 后端开发工程师（Backend Developer）

| 维度         | 内容                                                                                                                                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 在架构与接口契约下实现 NestJS 模块：Controller/Service/Repository、DTO 校验、业务逻辑、TypeORM Entity 与查询、Redis 与 Bull、第三方 API 集成（Claude、讯飞、阿里云语音/OSS）；编写接口文档与单元测试。                                                                        |
| **技能范围** | NestJS 模块与依赖注入、TypeScript、TypeORM、REST API、JWT 与 RBAC、Redis、Bull、WebSocket、日志与异常处理、第三方 SDK 集成。                                                                                                                                                  |
| **实用工具** | VS Code、NestJS CLI、Swagger UI、Postman/Apifox、DBeaver/MySQL Workbench、Redis Insight、Git、pnpm、Jest/Vitest、.env。                                                                                                                                                       |
| **技术栈**   | Node.js ^20 LTS、NestJS ^10.x、TypeScript ^5.x、TypeORM ^0.3.x、MySQL 8、Redis 6.x、Passport+JWT、class-validator/class-transformer、@nestjs/swagger、@nestjs/bull、@nestjs/config、bcrypt；Winston/Pino、Socket.IO、@nestjs/schedule；Claude API、讯飞 ASR、阿里云语音/OSS。 |

### 2.6 质量保障团队

#### 代码审核员（Code Reviewer）

| 维度         | 内容                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 对提交代码做规范性、安全性、可维护性评审；检查是否符合架构分层与接口契约；发现潜在 bug、性能问题与重复代码；输出评审意见与改进项。 |
| **技能范围** | 代码规范（ESLint/TS 严格模式）、安全（XSS、注入、敏感信息）、设计模式与分层、可读性与命名、测试与边界情况。                        |
| **实用工具** | ESLint/Prettier 报告、Git diff/PR、架构与接口文档、安全清单（OWASP）、CLAUDE.md 与 ADR。                                           |
| **技术栈**   | 需熟悉本项目前后端技术栈以便判断实现合理性。                                                                                       |

#### 测试工程师（Test Engineer）

| 维度         | 内容                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 编写与维护测试用例（功能、边界、异常）；设计并落地自动化测试（单元、接口、E2E）；搭建与维护测试环境与数据；执行回归与发布前验证；参与需求与设计评审（可测性角度）。 |
| **技能范围** | 测试用例设计、接口测试（REST）、E2E、Mock 与 fixture、测试金字塔、CI 与质量门禁。                                                                                   |
| **实用工具** | Jest/Vitest、Supertest、Playwright/Cypress、Postman/Apifox、Git、CI 配置、测试报告与覆盖率。                                                                        |
| **技术栈**   | Jest 或 Vitest、Vue Test Utils、Supertest、NestJS 测试模块、Playwright 或 Cypress；Node、pnpm、TypeScript、Docker。                                                 |

### 2.7 运维团队

#### DevOps 工程师（DevOps Engineer）

| 维度         | 内容                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **职责范围** | 维护 CI/CD 流水线（构建、测试、镜像、部署）；管理开发/测试/预发/生产环境与配置；编写与维护 Dockerfile、Docker Compose、部署与回滚脚本；配置监控、日志与告警；参与容量规划与故障排查。 |
| **技能范围** | CI/CD 设计、Docker 与编排、Linux 与脚本、Nginx、云资源（阿里云 ECS/RDS/Redis/OSS/SLB）、监控与日志、发布与回滚。                                                                      |
| **实用工具** | Git、GitHub Actions、Docker/Docker Compose、Shell/PowerShell、Nginx 配置、阿里云控制台与 CLI、SLS/ARMS。                                                                              |
| **技术栈**   | Node.js 20、pnpm、Docker（node:20-alpine、nginx:alpine）、Docker Compose；阿里云 ECS、RDS、Redis、OSS、SLB、CDN、SSL；lint→test→build→push 镜像→部署；PM2、Nginx。                    |

---

## 3. 业务模块 Teammate 分工

### 3.1 TM-A 客户管理模块

| 范围         | 具体内容                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **后端**     | `modules/customer/`、`modules/lead/`、`modules/high-seas/`                                                                                |
| **前端**     | `views/customer/`（列表、详情、创建/编辑、公海池、导入导出）；`components/business/customer/`（客户选择器、客户卡片、联系人、跟进时间线） |
| **核心功能** | 客户 CRUD、分级分类、公海池（领取/分配/回收规则）、客户查重、联系人、跟进记录、标签、Excel 导入导出                                       |
| **数据表**   | `customer`、`customer_contact`、`customer_follow_up`、`customer_tag`、`high_seas_pool`、`high_seas_rule`                                  |
| **API**      | `/api/v1/customers/*`、`/api/v1/contacts/*`、`/api/v1/high-seas/*`、`/api/v1/follow-ups/*`                                                |
| **设计文档** | chapter05                                                                                                                                 |

**状态流转**：线索 → 潜在 → 意向 → 商机 → 成交 → 长期维护；无效/流失 → 回收至公海。

### 3.2 TM-B 销售流程模块

| 范围         | 具体内容                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **后端**     | `modules/opportunity/`、`modules/contract/`、`modules/product/`、`modules/payment/`、`modules/quotation/`、`modules/sales-target/`、`modules/approval/`           |
| **前端**     | `views/sales/`（商机列表/看板、详情、报价、合同、回款、漏斗）；`components/business/sales/`（商机卡片、漏斗图、审批流、回款时间线、业绩排行）                     |
| **核心功能** | 商机阶段推进、销售漏斗、报价、合同（创建/审批/签署/归档）、回款（计划/到账/逾期）、销售目标、业绩排行、审批流程引擎                                               |
| **数据表**   | `opportunity`、`opportunity_stage_log`、`contract`、`contract_product`、`payment_plan`、`payment_record`、`product`、`quotation`、`sales_target`、`approval_flow` |
| **API**      | `/api/v1/opportunities/*`、`/api/v1/contracts/*`、`/api/v1/products/*`、`/api/v1/payments/*`、`/api/v1/quotations/*`、`/api/v1/sales-targets/*`                   |
| **设计文档** | chapter06                                                                                                                                                         |

**商机阶段**：初步接触(10%) → 需求确认(30%) → 方案提报(50%) → 商务谈判(70%) → 赢单(100%)/丢单(0%)。

### 3.3 TM-C 呼叫中心与 AI 分析

| 范围         | 具体内容                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **后端**     | `modules/call-record/`、`modules/ai-analysis/`；Bull 队列（AI 分析、ASR 转写）                                                                                                              |
| **前端**     | `views/call-center/`（呼叫工作台、通话记录、详情含 AI 分析、坐席、外呼任务）；`views/ai-analysis/`（AI 仪表盘、客户画像、意向预测）；`components/business/call/`、`components/business/ai/` |
| **核心功能** | 阿里云语音外呼（SIP）、来电弹屏、通话录音（OSS）、讯飞 ASR 转写、Claude API 分析、客户画像、意向预测、话术建议、Bull 任务与 WebSocket 推送                                                  |
| **数据表**   | `call_record`、`call_analysis`、`ai_analysis_task`、`customer_portrait`、`agent_seat`                                                                                                       |
| **API**      | `/api/v1/calls/*`、`/api/v1/ai-analysis/*`、`/api/v1/customer-portraits/*`                                                                                                                  |
| **外部服务** | 阿里云语音、讯飞 ASR、Claude API（@anthropic-ai/sdk）                                                                                                                                       |
| **设计文档** | chapter07、chapter08                                                                                                                                                                        |

### 3.4 TM-D 信息管理与系统管理

| 范围         | 具体内容                                                                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **后端**     | `modules/knowledge/`、`modules/notification/`、`modules/system/`、`modules/user/`、`modules/dashboard/`、`modules/report/`                                                                                      |
| **前端**     | `views/info-management/`（知识库、竞品、素材、公告、培训）；`views/system/`（用户、角色、权限、系统设置、操作日志）；`views/dashboard/`（数据看板）；`components/business/system/`、`components/business/info/` |
| **核心功能** | 知识库 CRUD+全文搜索、竞品库、销售素材（版本）、公告与 WebSocket 通知、RBAC（用户-角色-权限-菜单）、数据权限（个人/部门/全部）、系统配置、操作日志、数据看板（ECharts）、统计报表                               |
| **数据表**   | `product_knowledge`、`competitor`、`sales_material`、`announcement`、`notification`、`role`、`permission`、`role_permission`、`user_role`、`menu`、`operation_log`、`system_config`、`department`               |
| **API**      | `/api/v1/knowledge/*`、`/api/v1/notifications/*`、`/api/v1/system/*`、`/api/v1/users/*`、`/api/v1/roles/*`、`/api/v1/dashboard/*`、`/api/v1/reports/*`                                                          |
| **设计文档** | chapter09、chapter12（权限部分）                                                                                                                                                                                |

### 3.5 TM-E 微信小程序

| 范围         | 具体内容                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| **整体**     | `packages/mini-app/`（uni-app）                                                                               |
| **页面**     | 工作台首页、客户列表/详情、外勤签到（LBS）、拜访记录、业绩看板、消息通知                                      |
| **核心功能** | 客户查看与编辑、LBS 签到（微信定位+腾讯地图）、拜访拍照上传、业绩展示、微信模板消息、离线队列（网络恢复同步） |
| **依赖**     | 复用 `packages/server/` API，不新增后端模块                                                                   |
| **技术栈**   | uni-app（Vue 3）、Pinia、uni.request 封装                                                                     |
| **设计文档** | chapter10                                                                                                     |

> TM-E 在第三阶段启动，后端 API 已就绪后主要做前端与联调。

---

## 4. 文件归属矩阵

| 文件/目录                                                                                                                                                         | 所有者                                 | 其他 Agent    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------- |
| `CLAUDE.md`（根）                                                                                                                                                 | Team Lead                              | 只读          |
| `packages/shared/`                                                                                                                                                | Team Lead（各 Agent 可提 PR 添加类型） | 读 + 提交请求 |
| `packages/server/src/common/`、`config/`、`modules/auth/`                                                                                                         | Team Lead                              | 只读引用      |
| `packages/server/src/modules/customer/`、`lead/`、`high-seas/`                                                                                                    | **TM-A**                               | 只读引用      |
| `packages/server/src/modules/opportunity/`、`contract/`、`product/`、`payment/`、`quotation/`、`approval/`、`sales-target/`                                       | **TM-B**                               | 只读引用      |
| `packages/server/src/modules/call-record/`、`ai-analysis/`                                                                                                        | **TM-C**                               | 只读引用      |
| `packages/server/src/modules/knowledge/`、`notification/`、`system/`、`user/`、`dashboard/`、`report/`                                                            | **TM-D**                               | 只读引用      |
| `packages/web/src/views/customer/`、`components/business/customer/`、`api/customer.ts`、`stores/customer.ts`、`types/customer.ts`                                 | **TM-A**                               | 无            |
| `packages/web/src/views/sales/`、`components/business/sales/`、相关 api/stores/types                                                                              | **TM-B**                               | 无            |
| `packages/web/src/views/call-center/`、`views/ai-analysis/`、`components/business/call/`、`components/business/ai/`、相关 api/stores/types                        | **TM-C**                               | 无            |
| `packages/web/src/views/info-management/`、`views/system/`、`views/dashboard/`、`components/business/system/`、`components/business/info/`、相关 api/stores/types | **TM-D**                               | 无            |
| `packages/web/src/layout/`、`router/`（动态路由部分与 TM-D 协作）                                                                                                 | Team Lead + TM-D                       | 只读引用      |
| `packages/mini-app/`                                                                                                                                              | **TM-E**                               | 无            |
| `docker-compose.yml`、`.github/`                                                                                                                                  | Team Lead                              | 只读          |

---

## 5. 接口契约与共享类型

- 模块间通过 **TypeScript 接口** 与 **API 契约** 松耦合；跨模块引用放在 `packages/shared/`。
- 示例（在 `packages/shared/src/types/interfaces.ts` 或等价位置）：

```typescript
// Teammate A 提供：客户基础信息
export interface CustomerBasicInfo {
  id: string;
  name: string;
  status: CustomerStatus;
  ownerUserId: string;
}

// Teammate B 提供：商机基础信息
export interface OpportunityBasicInfo {
  id: string;
  name: string;
  stage: OpportunityStage;
  amount: number;
  customerId: string;
}

// Teammate D 提供：通知发送
export interface SendNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}
```

- API 统一规范：RESTful，前缀 `/api/v1/`；响应格式 `{ code, message, data }`；分页 `{ list, total, page, pageSize }`；DTO 使用 class-validator；Swagger 注解齐全。

---

## 6. 各 Agent 的 CLAUDE.md 定义

### 6.1 项目根 CLAUDE.md（所有 Agent 共用）

**位置**：`/CLAUDE.md`

**要点**：项目概述；技术栈（Vue3、NestJS、TypeORM、MySQL、Redis、pnpm Monorepo）；Monorepo 结构（packages/web、server、mini-app、shared）；命名规范（kebab-case 文件名、PascalCase 组件、snake_case 表名、kebab-case API）；TypeScript 严格模式、禁止 any；Git 提交规范（feat/fix/docs/style/refactor/perf/test/chore）；分支策略（main、develop、feature/、fix/）；API 设计规范；后端模块结构（modules/<name>/ 下 module、controller、service、dto、entities、tests）；前端页面结构（views/<module>/、components）；性能与安全要求；禁止事项（v-html、硬编码密钥、改他人模块、跳过单测、console.log）。

> 根 CLAUDE.md 的完整可粘贴模板见原《Agent-Teams-分工方案》§4.1；各 TM 的完整 CLAUDE.md 见该文档 §4.2～§4.6。

### 6.2 TM-A～E 的 CLAUDE.md（融合角色+模块）

- **TM-A**：职责=客户管理中心全栈；文件范围=后端 customer/lead/high-seas，前端 views/customer、components/business/customer、api/customer、stores/customer、types/customer；核心逻辑=客户状态枚举、公海池规则、查重算法、数据权限；与其他模块接口=→B 客户转商机、←C 通话记录只读、←D RBAC；参考 chapter05；测试要求=Service 单测、公海池集成测试、查重边界测试。
- **TM-B**：职责=销售流程全栈；文件范围=后端 opportunity/contract/product/payment/quotation/sales-target/approval，前端 views/sales、components/business/sales 及对应 api/stores/types；核心逻辑=商机阶段、审批引擎、销售漏斗、回款；与 A/C/D 接口；参考 chapter06；ECharts 漏斗/业绩/回款；金额用 decimal.js；审批状态机测试。
- **TM-C**：职责=呼叫中心+AI 分析全栈；文件范围=后端 call-record、ai-analysis 及 Bull 配置，前端 call-center/ai-analysis 与 call/ai 组件及 api/stores/types；核心=阿里云语音、讯飞 ASR、Claude API、Bull、WebSocket；与 A/B/D 接口；参考 chapter07、08；Claude Key 环境变量、OSS 私有、AI 结果标注、缓存与 Token 监控；外部 API Mock 单测、队列集成测试。
- **TM-D**：职责=信息管理+系统管理全栈；文件范围=后端 knowledge/notification/system/user/dashboard/report，前端 info-management、system、dashboard 及 system/info 组件与 api/stores/types；核心=RBAC、动态菜单、WebSocket 通知、知识库、操作日志、数据看板；向所有模块提供权限守卫、通知服务、日志 AOP；参考 chapter09、12；权限与 WebSocket 测试。
- **TM-E**：职责=小程序完整开发；文件范围=packages/mini-app/；技术栈=uni-app Vue3、Pinia、uni.request；页面结构=index、customer、visit、performance、message、mine；LBS 签到、离线队列、API 对接；参考 chapter10；真机与分包、包体<2MB。

各模块 CLAUDE.md 建议放置位置（与原分工方案一致）：

- TM-A：`packages/server/src/modules/customer/CLAUDE.md`、`packages/web/src/views/customer/CLAUDE.md`
- TM-B：`packages/server/src/modules/opportunity/CLAUDE.md`、`packages/web/src/views/sales/CLAUDE.md`
- TM-C：`packages/server/src/modules/call-record/CLAUDE.md`、`packages/web/src/views/call-center/CLAUDE.md`
- TM-D：`packages/server/src/modules/knowledge/CLAUDE.md`、`packages/web/src/views/system/CLAUDE.md`
- TM-E：`packages/mini-app/CLAUDE.md`

---

## 7. 启动 Prompt 集

以下为各 Teammate 启动时使用的提示词摘要；完整长文本见原《Agent-Teams-分工方案》§5.2～§5.6。

- **TM-A**：你是 Teammate A，负责「客户管理中心」全栈。范围：后端 customer/lead/high-seas，前端 views/customer、components/business/customer、api/customer、stores/customer、types/customer。请按【第一冲刺】基础 CRUD（Entity、DTO、Service、Controller、Swagger、列表/详情/创建编辑、联系人），【第二冲刺】公海池、查重、标签、跟进、导入导出、数据权限，【第三冲刺】单测与集成测试、性能优化。参阅 chapter05、根 CLAUDE.md；只改己方文件；公共类型放 shared 并告知 Team Lead。
- **TM-B**：你是 Teammate B，负责「销售流程管理」全栈。范围：后端 opportunity/contract/product/payment/quotation/sales-target/approval，前端 views/sales、components/business/sales 及对应 api/stores/types。按【第一冲刺】商机+产品+看板/列表，【第二冲刺】合同、回款、审批引擎、漏斗、目标、业绩排行，【第三冲刺】单测、状态机测试、报表、逾期提醒。参阅 chapter06；商机关联 customer_id；金额用 decimal.js。
- **TM-C**：你是 Teammate C，负责「呼叫中心」和「AI 智能分析」全栈。范围：后端 call-record、ai-analysis 及 Bull，前端 call-center、ai-analysis、call/ai 组件及 api/stores/types。按【第一冲刺】通话记录+阿里云语音+OSS 录音+前端列表/详情，【第二冲刺】讯飞 ASR、Claude 分析、Bull 队列、WebSocket、AI 仪表盘与画像，【第三冲刺】缓存、Token 监控、Mock 单测、队列集成测试。参阅 chapter07、08；API Key 用环境变量；OSS 私有；AI 结果标注；幂等。
- **TM-D**：你是 Teammate D，负责「销售信息管理」和「系统管理」全栈。范围：后端 knowledge/notification/system/user/dashboard/report，前端 info-management、system、dashboard 及 system/info 组件与 api/stores/types。按【第一冲刺】用户与 RBAC、动态菜单、系统配置，【第二冲刺】知识库、通知 WebSocket、操作日志、公告，【第三冲刺】看板、报表、单测与 WebSocket 测试。参阅 chapter09；NotificationService、数据权限拦截器、日志 AOP 需设计为可被其他模块使用。
- **TM-E**：你是 Teammate E，负责「微信小程序」。范围：packages/mini-app/，复用 shared。按【第一步】uni-app 框架、Pinia、request 封装、路由与 TabBar、UI 库，【第二步】工作台、客户列表/详情、签到、拜访记录，【第三步】业绩看板、消息、个人中心、离线队列，【第四步】真机与分包、性能。参阅 chapter10；只调已有 /api/v1/\*；Token 存 Storage；域名与地图 Key 配置。

**按角色启动示例**（管理/设计/架构/质量/运维）：  
`/teams start "根据 PRD 拆解本周迭代任务与优先级" --name pm-iteration`  
`/teams start "按设计规范输出客户列表页组件状态与响应式断点" --name ui-spec`  
`/teams start "评审客户模块 API 与 DTO 是否符合 REST 与安全规范" --name architect-review`  
`/teams start "对客户模块做代码评审并列出改进项" --name code-review`  
`/teams start "编写客户模块接口测试与关键路径 E2E 用例" --name qa-automation`  
`/teams start "在 CI 中增加客户模块单元与接口测试门禁" --name devops-pipeline`

---

## 8. 开发路线图

### 8.1 四阶段总览

| 阶段     | 时间      | 角色            | 内容                                                                                                                               |
| -------- | --------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 第一阶段 | Week 1-2  | Team Lead       | 架构搭建：Monorepo、NestJS common、Vue 脚手架、Migration、JWT、Docker Compose、ESLint/Prettier、根 CLAUDE.md、shared、登录与主布局 |
| 第二阶段 | Week 3-8  | TM-A/B/C/D 并行 | 核心模块并行开发（见下表）                                                                                                         |
| 第三阶段 | Week 9-11 | TM-E + TM-A～D  | 小程序开发；TM-A～D Bug 修复、优化、E2E、API 文档                                                                                  |
| 第四阶段 | Week 12   | Team Lead       | 部署上线：阿里云资源、镜像构建推送、Nginx/SLB、Migration、SSL、灰度与验证                                                          |

### 8.2 第二阶段冲刺划分

- **Week 3-4**：TM-A 客户 CRUD+列表/详情+联系人；TM-B 商机 CRUD+看板+产品；TM-C 通话记录+阿里云语音；TM-D 用户+角色权限+系统配置。
- **Week 5-6**：TM-A 公海池+查重+标签+导入导出；TM-B 合同+回款+审批+漏斗；TM-C ASR+Claude AI+画像+队列；TM-D 知识库+竞品+素材+通知+看板。
- **Week 7-8**：TM-A/B/C/D 各自单测、优化、报表/日志等收尾。
- **Week 9-11**：TM-E 小程序框架→客户→签到→拜访→业绩→消息；TM-A～D 修 Bug、E2E、文档。

---

## 9. 并行开发方案

### 9.1 三种方式概览

| 方案                         | 适用场景         | 复杂度 | 隔离性 | 推荐度     |
| ---------------------------- | ---------------- | ------ | ------ | ---------- |
| **A：多终端 + Git Worktree** | 最直接、手动管理 | 低     | 高     | ⭐⭐⭐⭐⭐ |
| **B：Headless 脚本编排**     | 自动化、CI 友好  | 中     | 高     | ⭐⭐⭐⭐   |
| **C：SDK 程序化编排**        | 最灵活、进阶     | 高     | 高     | ⭐⭐⭐     |

### 9.2 方案 A：多终端 + Git Worktree（推荐）

- 为每个 Teammate 创建独立 **Git Worktree** + **feature 分支**，在不同终端各启动一个 Claude 实例。
- 命令示例：
  ```bash
  git checkout develop
  git worktree add ../worktree-teammate-a -b feature/customer-module develop
  git worktree add ../worktree-teammate-b -b feature/sales-module develop
  git worktree add ../worktree-teammate-c -b feature/call-ai-module develop
  git worktree add ../worktree-teammate-d -b feature/info-system-module develop
  ```
- 终端 1：Team Lead（主仓库）`claude`  
  终端 2～5：分别 `cd worktree-teammate-*` 后 `claude`，粘贴 §7 对应 TM 启动提示词。
- 冲刺结束后：各 Teammate 在己方 worktree 提交并 push feature 分支；Team Lead 在主仓库 `git merge feature/xxx` 到 develop；各 worktree 再 `git merge origin/develop` 同步。

### 9.3 方案 B：Headless 脚本编排

- 使用 `claude -p "任务描述"` 非交互执行；将 §7 的提示词存为 `scripts/prompts/teammate-a.txt` 等。
- 脚本中在各自 worktree 目录下执行 `claude -p "$(cat scripts/prompts/teammate-a.txt)"`，输出重定向到 `.claude/teammate-logs/`；可并行后台运行多个 Teammate。
- Windows 可用 PowerShell `Start-Job` 并行；Linux/macOS 用 `&` 后台 + `wait`。

### 9.4 方案 C：SDK 程序化编排

- 使用 `@anthropic-ai/claude-code`（或当前官方 SDK）在 Node 脚本中调用 `claude({ prompt, workdir })`，为每个 Teammate 指定对应 workdir 与 prompt 文件内容，`Promise.all` 并行执行，结果写入日志。

---

## 10. 协作机制与冲突预防

- **模块间依赖**：Team Lead 提供公共层；TM-D 提供权限与通知；TM-A 提供客户数据；TM-B 依赖客户；TM-C 写 AI 画像入客户、关联商机；TM-E 只消费后端 API。
- **接口契约**：跨模块仅通过 `packages/shared/` 的接口类型与 API 契约交互，不直接依赖实现。
- **冲突预防**：① 文件隔离（每人只改己方目录）；② 共享层（common/、config/）仅 Team Lead 修改；③ 接口先行（shared 先定）；④ 独立分支（每 Teammate 独立 feature）；⑤ 及时集成（冲刺结束即合并到 develop）。
- **Hooks 建议**（`.claude/settings.json`）：TeammateIdle 时执行 `npm run lint && npm run test`；TaskCompleted 时执行 `npm run test:integration`（可按需调整）。

---

## 11. 完整操作指南

### 11.1 Team Lead 启动前检查清单

- [ ] Monorepo 已初始化（pnpm-workspace、packages/web、server、mini-app、shared）
- [ ] `packages/server` 与 `packages/web` 可正常启动
- [ ] Docker Compose 中 MySQL、Redis 可连接
- [ ] 数据库 Migration 已执行
- [ ] `src/common/` 与 JWT 认证就绪
- [ ] 前端登录页与主布局完成
- [ ] ESLint、Prettier、Husky、commitlint 配置完成
- [ ] 根 CLAUDE.md 与各模块 CLAUDE.md 已放置
- [ ] `packages/shared/` 基础类型已就绪
- [ ] `.claude/settings.json` Hooks 已配置（可选）
- [ ] Git 已初始化，develop 分支已创建

### 11.2 环境变量（.env）要点

需配置：`DB_*`、`REDIS_*`、`JWT_*`、`OSS_*`、`XFYUN_*`、`CLAUDE_API_KEY`、阿里云语音等；格式见原《Agent-Teams-分工方案》附录。

### 11.3 端到端流程简述

1. **Phase 0**：安装 Node/pnpm/Docker/Git，创建项目目录，`git init`，`develop` 分支。
2. **Phase 1**：Team Lead 在主仓库执行架构搭建（见 §8.1），完成后验证后端/前端/DB/认证。
3. **Phase 2 准备**：放置根与各模块 CLAUDE.md，提交并 push develop。
4. **Phase 2 启动**：按 §9.2 创建 Worktree 与分支，5 个终端分别启动 Team Lead 与 TM-A/B/C/D，粘贴 §7 对应 Prompt。
5. **Phase 2 迭代**：按 §8.2 冲刺；每冲刺结束 Teammate 提交并 push，Team Lead 合并到 develop，各 worktree 合并 origin/develop。
6. **Phase 3**：创建 TM-E worktree，启动 Teammate E，按 §7 与 chapter10 开发小程序；TM-A～D 修 Bug、E2E、文档。
7. **Phase 4**：Team Lead 合并所有 feature 到 develop，全量测试与构建，合并到 main，打 tag，部署；最后按需清理 worktree。

### 11.4 常见问题

- **Teammate 间如何通信**：通过 Git（develop 分支）、shared 类型契约、Team Lead 协调与 CLAUDE.md 更新。
- **同文件冲突**：严格按 §4 文件归属矩阵；若需改公共文件，由 Teammate 提需求，Team Lead 在主仓库修改后合并。
- **上下文用尽**：先提交当前工作，关闭会话，重新打开并加载 CLAUDE.md，说明「继续某模块第 X 冲刺」。
- **进度监控**：`git log --oneline --all --graph`、`git diff develop..feature/xxx --stat`，或在 Team Lead 会话中让 Agent 检查各 feature 最新提交与变更概要。

---

> 本文档为 **Agent Teams 唯一执行方案**：合并了组织角色定义与业务模块分工，并包含文件归属、接口契约、CLAUDE.md 与 Prompt、路线图、并行方案与操作指南。开发时只需让 Claude Code Agent 参考本文档即可完成角色定位与模块执行。
