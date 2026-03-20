# 磐销云 CRM vs 本项目功能对比分析

> 分析日期: 2026-03-19
> 对比目标: http://crm.pxyai.com:8888/ （磐销云 AI CRM）

## 磐销云系统信息

- **产品名**: AI磐销云 — 客户互动智能体平台
- **技术栈**: Vue 2 + Element UI + webpack（前端）, Java Spring（后端, 端口8080）
- **公司**: 上海都翔实业有限公司

---

## 一、两个系统都有的模块

| 功能        | 磐销云                        | 本项目           | 差异                   |
| ----------- | ----------------------------- | ---------------- | ---------------------- |
| 客户管理    | ✅ 我的客户/团队客户          | ✅ customer      | 基本对齐               |
| 公海客户    | ✅ 公海客户(批量领取/转让)    | ✅ customer-pool | 基本对齐               |
| 通话录音    | ✅ callRecording              | ✅ call-record   | 基本对齐               |
| AI 分析     | ✅ AI通话录音/AI误判/AI再协商 | ✅ ai module     | 磐销云有更多AI场景     |
| 销售PK      | ✅ 排行PK/多人对多人PK        | ✅ sales-target  | 磐销云有更丰富的PK模式 |
| 公告通知    | ✅ notice                     | ✅ announcement  | 基本对齐               |
| 商机管理    | ✅ (客户阶段)                 | ✅ opportunity   | 本项目更完善           |
| 知识库      | ✅ (学习世界)                 | ✅ knowledge     | 本项目有RAG            |
| 互联网获客  | ✅ AIClient                   | ✅ prospect      | 基本对齐               |
| 跟进记录    | ✅ visitRecord                | ✅ follow-up     | 基本对齐               |
| 拨号/云呼叫 | ✅ 拨号功能                   | ✅ cloud-call    | 基本对齐               |
| 签到/拜访   | ✅ 拍照取号                   | ✅ check-in      | 基本对齐               |

## 二、磐销云有但本项目缺少的功能

| 功能               | 磐销云实现                                | 本项目状态                        | 优先级   |
| ------------------ | ----------------------------------------- | --------------------------------- | -------- |
| **产品管理**       | product:product (CRUD/导出/发送/贷后检查) | ❌ 无                             | 🔴 高    |
| **话术标注/管理**  | annotation (CRUD/导出)                    | ❌ 无                             | 🟡 中    |
| **协商分析**       | analysis (查询/导出/AI再协商)             | ❌ 无（部分在 AI 模块）           | 🟡 中    |
| **客户分组**       | clientGroup (add)                         | ❌ 有 customer-tag 但无分组       | 🟢 低    |
| **脱敏设置**       | desensitizationSet                        | ❌ 无                             | 🟡 中    |
| **企业论坛**       | enterpriseForum (学习世界)                | ❌ 无                             | 🟢 低    |
| **在线考试**       | examination (学习世界)                    | ❌ 无                             | 🟢 低    |
| **视频培训**       | videoTutorials (员工培训)                 | ❌ 无                             | 🟢 低    |
| **服务记录**       | service:record (CRUD/导出)                | ❌ 无                             | 🟡 中    |
| **贷后服务**       | afterLoanService                          | ❌ 无                             | 行业特定 |
| **还款提醒**       | repaymentReminderSet                      | ❌ 无                             | 行业特定 |
| **签约促成**       | signingFacilitation                       | ❌ 无                             | 🟡 中    |
| **多人PK**         | manyTomany (多人对多人PK)                 | ❌ 仅排行                         | 🟢 低    |
| **录音上传**       | recordingUpload                           | ❌ 无手动上传                     | 🟢 低    |
| **回款追踪**       | paymentTracking                           | ❌ payment 模块存在但不完善       | 🟡 中    |
| **AI商机提醒**     | aiBusinessReminder                        | ❌ follow-up-ai-reminder 部分实现 | 🟡 中    |
| **AI模型分析设置** | aIModelAnalysisSet                        | ❌ 无管理界面                     | 🟢 低    |
| **双卡切换**       | 双卡切换 (APP)                            | ❌ SimSelector 组件有但未完善     | 🟢 低    |

## 三、本项目独有功能

| 功能              | 本项目                  |
| ----------------- | ----------------------- |
| 合同管理          | contract 模块           |
| 报价单            | quotation 模块          |
| 审批流程          | approval 模块           |
| 审计日志          | audit-log（完整前后端） |
| 自定义字段        | custom-field 模块       |
| 路线规划          | route 模块              |
| 素材库            | material 模块           |
| 活动管理          | campaign 模块           |
| 联系人管理        | contact（独立模块）     |
| 智能客服/Agent    | agent 模块              |
| Swagger API 文档  | 完整文档化              |
| E2E 测试          | Playwright 46 tests     |
| Redis Sentinel HA | 完整配置                |

## 四、关键架构差异

| 方面     | 磐销云              | 本项目                     |
| -------- | ------------------- | -------------------------- |
| 后端语言 | Java Spring         | NestJS (TypeScript)        |
| 前端框架 | Vue 2 + Element UI  | Vue 3 + Element Plus       |
| 认证方式 | JWT HS512           | JWT HS256 (Access+Refresh) |
| 权限模型 | RBAC + 精细权限码   | RBAC 3角色                 |
| 数据库   | 未确认（可能MySQL） | MySQL 8 + Redis 7          |
| 加密     | 标题字段加密传输    | AES-256-GCM (数据源Key)    |

## 五、权限粒度差异

磐销云使用 **功能码** 权限（如 `client:client:add`, `product:product:edit`），本项目仅使用 **角色级** 权限（Admin/Manager/Sales）。这是一个重要的架构差距。

---

## 建议优先改进方向

1. **产品管理模块** — CRM 核心功能，磐销云有完整 CRUD
2. **权限粒度提升** — 从角色级提升到功能码级别
3. **话术/脚本管理** — 销售团队核心工具
4. **数据脱敏** — 合规要求
5. **服务记录** — 售后服务跟踪
6. **学习培训体系** — 企业论坛 + 考试 + 视频（如业务需要）

## 验证方法

- `POST http://crm.pxyai.com:8080/login` 成功登录
- `GET /getInfo` 获取完整权限列表和用户信息
- `GET /getRouters` 获取完整菜单路由结构
