# 08 — 合同与回款

> 合并来源: 本项目 Contract/Payment/Quotation/Approval 模块 + 磐销云签单回款贷后

## 现有功能（本项目）

- [x] 合同管理（Contract CRUD + 10态流转）
- [x] 回款管理（Payment CRUD + 5态）
- [x] 报价单管理（Quotation CRUD + 8态）
- [x] 审批流（Approval 多级审批）
- [x] 回款方式（银行转账/支票/现金/信用卡等）

## 磐销云相关功能

- 签单统计
- 回款统计
- 贷后统计（金融特色）
- 回款追踪

## 合并后功能清单

### 8.1 合同管理（增强）

| 功能         | 说明                          | 状态     |
| ------------ | ----------------------------- | -------- |
| 合同 CRUD    | 创建/编辑/审批/签署           | 已有     |
| 合同状态流转 | 草稿→审批→签署→执行→完成/终止 | 已有     |
| 合同审批     | 多级审批流                    | 已有     |
| 合同模板     | 常用合同模板管理              | **新增** |
| 电子签章     | 在线电子签名                  | **新增** |
| 合同到期提醒 | 自动提醒即将到期的合同        | **新增** |
| 合同续签     | 续签流程管理                  | **新增** |

### 8.2 回款管理（增强）

| 功能     | 说明                   | 状态     |
| -------- | ---------------------- | -------- |
| 回款计划 | 按合同生成回款计划     | 已有     |
| 回款确认 | 财务确认收款           | 已有     |
| 回款追踪 | 实时追踪回款进度       | 已有增强 |
| 逾期预警 | 逾期回款自动预警通知   | **新增** |
| 回款统计 | 按人/部门/客户统计回款 | **新增** |
| 坏账管理 | 坏账标记与核销         | 已有增强 |

### 8.3 贷后管理（新增 — 金融特色）

| 功能     | 说明                           | 状态     |
| -------- | ------------------------------ | -------- |
| 贷后跟踪 | 放款后的客户跟踪管理           | **新增** |
| 还款提醒 | 还款日前自动提醒客户           | **新增** |
| 逾期管理 | 逾期客户列表与催收管理         | **新增** |
| 贷后统计 | 放款/还款/逾期率统计报表       | **新增** |
| 贷后评级 | 基于还款行为的客户信用评级更新 | **新增** |

### 8.4 报价单（已有）

| 功能        | 说明         | 状态 |
| ----------- | ------------ | ---- |
| 报价单 CRUD | 创建/编辑    | 已有 |
| 报价审批    | 折扣审批流   | 已有 |
| 报价发送    | 发送给客户   | 已有 |
| 报价转合同  | 一键转为合同 | 已有 |

## 后端接口（新增部分）

| 接口                           | 方法     | 说明         |
| ------------------------------ | -------- | ------------ |
| `/api/v1/contracts/templates`  | GET/POST | 合同模板     |
| `/api/v1/contracts/:id/renew`  | POST     | 合同续签     |
| `/api/v1/contracts/expiring`   | GET      | 即将到期合同 |
| `/api/v1/payments/overdue`     | GET      | 逾期回款列表 |
| `/api/v1/payments/statistics`  | GET      | 回款统计     |
| `/api/v1/post-loan/list`       | GET      | 贷后列表     |
| `/api/v1/post-loan/overdue`    | GET      | 逾期管理     |
| `/api/v1/post-loan/statistics` | GET      | 贷后统计     |
| `/api/v1/post-loan/remind`     | POST     | 还款提醒     |

## 涉及模块

- `packages/server/src/modules/contract/` (增强)
- `packages/server/src/modules/payment/` (增强)
- `packages/server/src/modules/quotation/` (已有)
- `packages/server/src/modules/approval/` (已有)
- `packages/server/src/modules/post-loan/` (**新建** — 贷后管理)
- `packages/web/src/views/contract/` (增强)
- `packages/web/src/views/payment/` (增强)
- `packages/web/src/views/post-loan/` (**新建**)
