# T19 — 服务记录模块

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md)
> 优先级: 🟡中
> 参考设计: 无（全新设计，磐销云 service:record 模块对标）

## 背景

磐销云有 service:record 模块用于售后服务记录跟踪。本项目目前没有售后服务管理能力，客户签约后的投诉、咨询、维护、退换等需求无法在系统内闭环。服务记录模块需关联客户和合同，支持状态工作流和 SLA 跟踪，确保服务质量可量化。

## 功能需求

| #   | 功能          | 说明                                     |
| --- | ------------- | ---------------------------------------- |
| 1   | 服务记录 CRUD | 创建/查看/编辑/删除服务记录              |
| 2   | 服务类型      | 投诉/咨询/维护/退换                      |
| 3   | 状态工作流    | pending → processing → resolved → closed |
| 4   | 客户/合同关联 | 服务记录关联客户和合同                   |
| 5   | SLA 跟踪      | 响应时限 + 解决时限，超时预警            |
| 6   | 服务评价      | 客户满意度评分（1-5）                    |
| 7   | CSV 导出      | 导出服务记录列表                         |
| 8   | 服务统计      | 按类型/状态/满意度/SLA 达标率统计        |

## 技术方案

### 后端

- **Entity**: `ServiceRecord`, `ServiceType`（enum）
- **DTO**: `CreateServiceRecordDto`, `UpdateServiceRecordDto`, `QueryServiceRecordDto`, `CloseServiceRecordDto`
- **Service**: `ServiceRecordService` — CRUD + 状态流转 + SLA 检查 + 统计
- **Queue**: `service-sla-check` Bull queue — 定时检查 SLA 超时
- **Controller**: `ServiceRecordController`
- **Module**: `ServiceRecordModule` — imports `TypeOrmModule`, `CustomerModule`, `BullModule`, `NotificationModule`
- **Migration**: `1709000086000-CreateServiceRecord`

### 前端 (PC)

- **页面**: `views/service/index.vue`（服务记录列表 + 统计卡片）, `views/service/detail.vue`（详情 + 处理时间线）
- **组件**: `ServiceForm.vue`（创建/编辑）, `ServiceTimeline.vue`（处理进度）, `SlaIndicator.vue`（SLA 达标指示器）, `ServiceDashboard.vue`（统计面板）
- **API 层**: `api/service-record.ts`
- **路由**: `/service` (列表), `/service/:id` (详情)

### 前端 (APP)

- 服务记录列表（我的客户关联的服务单）
- 创建服务记录
- 更新服务状态

## API 接口

| Method | Path                                    | Description                | Auth     |
| ------ | --------------------------------------- | -------------------------- | -------- |
| GET    | `/api/v1/service-records`               | 服务记录分页列表           | All      |
| POST   | `/api/v1/service-records`               | 创建服务记录               | Sales+   |
| GET    | `/api/v1/service-records/:id`           | 服务记录详情               | All      |
| PUT    | `/api/v1/service-records/:id`           | 更新服务记录               | Sales+   |
| PUT    | `/api/v1/service-records/:id/status`    | 变更状态                   | Sales+   |
| POST   | `/api/v1/service-records/:id/close`     | 关闭服务单（含满意度评分） | Sales+   |
| DELETE | `/api/v1/service-records/:id`           | 软删除                     | Manager+ |
| GET    | `/api/v1/service-records/export`        | 导出 CSV                   | Manager+ |
| GET    | `/api/v1/service-records/statistics`    | 服务统计                   | Manager+ |
| GET    | `/api/v1/service-records/sla-alerts`    | SLA 超时预警列表           | Manager+ |
| GET    | `/api/v1/customers/:id/service-records` | 客户关联的服务记录         | All      |

## 数据库设计

### service_record 表

| Column              | Type                                                    | Nullable | Description      |
| ------------------- | ------------------------------------------------------- | -------- | ---------------- |
| id                  | int, PK, auto_increment                                 | NO       |                  |
| title               | varchar(200)                                            | NO       | 服务标题         |
| description         | text                                                    | NO       | 问题描述         |
| type                | enum('complaint','consultation','maintenance','return') | NO       | 服务类型         |
| status              | enum('pending','processing','resolved','closed')        | NO       | 默认 pending     |
| priority            | enum('low','medium','high','urgent')                    | NO       | 默认 medium      |
| customerId          | int, FK → customer.id                                   | NO       | 关联客户         |
| contractId          | int, FK → contract.id                                   | YES      | 关联合同（可选） |
| assigneeId          | int, FK → user.id                                       | YES      | 处理人           |
| createdBy           | int, FK → user.id                                       | NO       | 创建者           |
| resolution          | text                                                    | YES      | 解决方案         |
| satisfactionScore   | int                                                     | YES      | 满意度 1-5       |
| satisfactionComment | varchar(500)                                            | YES      | 评价备注         |
| slaResponseDeadline | datetime                                                | YES      | 响应时限         |
| slaResolveDeadline  | datetime                                                | YES      | 解决时限         |
| respondedAt         | datetime                                                | YES      | 首次响应时间     |
| resolvedAt          | datetime                                                | YES      | 解决时间         |
| closedAt            | datetime                                                | YES      | 关闭时间         |
| createdAt           | datetime(6)                                             | NO       |                  |
| updatedAt           | datetime(6)                                             | NO       |                  |
| deletedAt           | datetime(6)                                             | YES      | 软删除           |

**索引**: `IDX_service_customer` (customerId), `IDX_service_assignee` (assigneeId), `IDX_service_status` (status), `IDX_service_type` (type), `IDX_service_priority` (priority), `IDX_service_sla_response` (slaResponseDeadline), `IDX_service_sla_resolve` (slaResolveDeadline)

### SLA 默认配置

| 优先级 | 响应时限 | 解决时限  |
| ------ | -------- | --------- |
| urgent | 1h       | 4h        |
| high   | 4h       | 24h       |
| medium | 8h       | 72h       |
| low    | 24h      | 168h (7d) |

### 状态流转规则

```
pending → processing (分配处理人 / 开始处理)
processing → resolved (填写解决方案)
resolved → closed (客户确认 + 满意度评分)
resolved → processing (重新打开)
any → closed (Manager+ 强制关闭)
```

## 依赖模块

| 模块               | 关系                        |
| ------------------ | --------------------------- |
| CustomerModule     | 关联客户                    |
| ContractModule     | 关联合同（可选）            |
| UserModule         | 处理人分配                  |
| NotificationModule | SLA 超时通知 + 状态变更通知 |
| BullModule         | SLA 定时检查 queue          |
| AuditLogModule     | 操作审计                    |
| AuthModule         | JWT + RBAC 守卫             |

## 验收标准

- [ ] ServiceRecord CRUD 全部端点可用，支持分页/搜索/状态筛选/类型筛选
- [ ] 状态流转严格遵循规则，非法流转返回 400
- [ ] SLA 时限在创建时根据 priority 自动计算并填入
- [ ] Bull queue 每 15 分钟检查 SLA 超时，触发通知
- [ ] `/sla-alerts` 返回已超时或即将超时（<1h）的服务记录
- [ ] 关闭服务单时必须填写 satisfactionScore (1-5)
- [ ] 数据所有权：Sales 只能看到自己客户的服务记录
- [ ] CSV 导出包含所有字段，中文表头
- [ ] 统计接口返回：按类型分布/按状态分布/平均响应时间/平均解决时间/SLA 达标率/平均满意度
- [ ] 客户详情 360 视图中新增服务记录 Tab
- [ ] 后端单元测试 ≥ 20 tests（CRUD + 状态流转 + SLA 计算 + 统计 + 数据所有权）
- [ ] E2E 测试 ≥ 5 tests（列表 + 创建 + 状态变更 + 关闭评价 + 统计）
