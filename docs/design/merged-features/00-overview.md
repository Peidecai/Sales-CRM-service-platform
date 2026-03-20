# CRM Sales Platform — 功能合并总览

> 本项目基础框架 + AI磐销云目标功能 → 合并后的完整产品规划
>
> 生成日期: 2026-03-18

## 一、合并策略

| 维度          | 决策                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| 后端框架      | **保留** NestJS 10 + TypeORM + MySQL + Redis + Bull                           |
| 前端框架 (PC) | **保留** Vue 3 + Vite + Element Plus + Pinia                                  |
| 移动端        | **改为 APP**（uni-app → 原生 APP，React Native 或 Flutter）                   |
| AI 能力       | **保留+增强** 现有 RAG/Chat/通话摘要 + 新增磐销云的意向分析/话术评估/员工画像 |
| 权限体系      | **保留** RBAC 三级角色，扩展主管(Supervisor)角色                              |
| 数据字典      | **新增** 系统字典管理模块（参考磐销云 dict 体系）                             |

## 二、模块合并清单

| 序号 | 模块大类         | 文档                                                           | 来源       | 状态     |
| ---- | ---------------- | -------------------------------------------------------------- | ---------- | -------- |
| 01   | 工作台/Dashboard | [01-dashboard.md](./01-dashboard.md)                           | 双方合并   | 增强     |
| 02   | 线索管理         | [02-lead-management.md](./02-lead-management.md)               | 双方合并   | 增强     |
| 03   | 客户管理         | [03-customer-management.md](./03-customer-management.md)       | 双方合并   | 增强     |
| 04   | 商机管理         | [04-opportunity-management.md](./04-opportunity-management.md) | 双方合并   | 增强     |
| 05   | 通话与录音       | [05-call-recording.md](./05-call-recording.md)                 | 双方合并   | 增强     |
| 06   | AI 智能中心      | [06-ai-center.md](./06-ai-center.md)                           | 双方合并   | 核心增强 |
| 07   | 智能报表         | [07-smart-reports.md](./07-smart-reports.md)                   | 磐销云为主 | 新增为主 |
| 08   | 合同与回款       | [08-contract-payment.md](./08-contract-payment.md)             | 本项目为主 | 增强     |
| 09   | 销售PK与目标     | [09-sales-pk-target.md](./09-sales-pk-target.md)               | 双方合并   | 增强     |
| 10   | 学习与培训       | [10-learning-training.md](./10-learning-training.md)           | 双方合并   | 增强     |
| 11   | 业务助手         | [11-sales-assistant.md](./11-sales-assistant.md)               | 双方合并   | 增强     |
| 12   | 系统管理         | [12-system-management.md](./12-system-management.md)           | 双方合并   | 增强     |
| 13   | 移动端 APP       | [13-mobile-app.md](./13-mobile-app.md)                         | 重构       | 全新     |

## 三、技术栈总览

```
crm-sales-platform/
├── packages/
│   ├── shared/          # @crm/shared — 共享类型、枚举、DTO
│   ├── server/          # @crm/server — NestJS 后端
│   ├── web/             # @crm/web — Vue 3 PC 端
│   └── app/             # @crm/app — 移动端 APP（替代 miniapp）
├── docker/
├── docker-compose.yml
└── docs/design/merged-features/  # 本文档集
```

| 层            | 技术                                                 |
| ------------- | ---------------------------------------------------- |
| Backend       | NestJS 10 + TypeORM 0.3 + MySQL 8.0 + Redis 7 + Bull |
| Frontend (PC) | Vue 3.4 + Vite 5 + Element Plus 2 + Pinia + ECharts  |
| Mobile (APP)  | React Native / Flutter（待定）                       |
| AI Engine     | OpenAI API + 向量数据库 + RAG Pipeline               |
| 实时通信      | WebSocket (Socket.IO)                                |
| 文件存储      | OSS (阿里云/MinIO)                                   |
| 搜索引擎      | Elasticsearch（报表/全文检索，可选）                 |

## 四、角色权限矩阵（合并后）

| 角色       | 说明       | 权限范围                                             |
| ---------- | ---------- | ---------------------------------------------------- |
| Admin      | 系统管理员 | 全部功能 + 系统设置 + 用户管理                       |
| Manager    | 部门主管   | 团队数据 + 业务CRUD + 删除/导入/导出 + PK管理 + 报表 |
| Supervisor | 组长/主管  | 小组数据 + 员工考核 + 批注 + 培训管理                |
| Sales      | 销售人员   | 个人数据 + 基础CRUD + APP端全功能                    |

## 五、实施优先级建议

| 阶段      | 模块                                                   | 说明                   |
| --------- | ------------------------------------------------------ | ---------------------- |
| P1 (核心) | 线索管理增强、客户管理增强、通话AI增强、智能报表(基础) | 补齐与磐销云的核心差距 |
| P2 (增强) | 销售PK、学习培训、业务助手、报表(高级)                 | 提升团队管理能力       |
| P3 (移动) | APP 端重构                                             | 替代小程序，原生体验   |
| P4 (进阶) | 员工画像AI、微信营销、数据大屏                         | 差异化竞争             |
