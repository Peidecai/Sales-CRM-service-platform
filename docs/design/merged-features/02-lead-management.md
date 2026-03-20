# 02 — 线索管理

> 合并来源: 本项目 Prospect 模块 + 磐销云线索管理

## 现有功能（本项目）

- [x] 天眼查/企查查 API 适配器
- [x] 数据源管理（ProspectDataSource CRUD、测试连接、AES-256-GCM 加密）
- [x] 搜索模板（per-user + shared）
- [x] 筛选配置（动态字段启停）
- [x] 线索搜索、导入、转化为客户
- [x] 线索状态流转（NEW → CONTACTED → QUALIFIED → CONVERTED / REJECTED）
- [x] 每日配额 Cron 重置

## 磐销云线索管理功能

- 线索导入/批量分配
- 公海池（回收/领取/批量转让）
- 黑名单管理
- 废弃站管理
- 文件夹式线索分组

## 合并后功能清单

### 2.1 线索导入与分配

| 功能               | 说明                       | 状态       |
| ------------------ | -------------------------- | ---------- |
| 互联网获客搜索     | 天眼查/企查查 API 搜索企业 | 已有       |
| Excel/CSV 批量导入 | 上传文件批量导入线索       | 已有(导入) |
| 手动录入           | 单条创建线索               | 已有       |
| 海量自动分配       | 按规则批量分配线索给销售   | **新增**   |
| 轮询分配           | 平均分配给团队成员         | **新增**   |
| 权重分配           | 按销售能力/KPI加权分配     | **新增**   |
| 分配记录           | 分配操作日志               | **新增**   |

### 2.2 公海池

| 功能         | 说明                     | 状态                    |
| ------------ | ------------------------ | ----------------------- |
| 公海池列表   | 被回收/释放的线索池      | 已有(customer-pool)增强 |
| 自动回收规则 | N天未跟进自动回公海      | **新增**                |
| 手动释放     | 销售主动释放到公海       | **新增**                |
| 领取         | 从公海池领取线索         | 已有增强                |
| 批量领取     | 批量领取线索             | **新增**                |
| 转让         | 公海线索直接转让给指定人 | **新增**                |
| 批量转让     | 管理员批量转让           | **新增**                |
| 领取上限     | 每人每日领取上限配置     | **新增**                |

### 2.3 黑名单

| 功能           | 说明                         | 状态     |
| -------------- | ---------------------------- | -------- |
| 加入黑名单     | 标记为黑名单（永不联系）     | **新增** |
| 黑名单列表     | 查看/搜索/筛选               | **新增** |
| 移出黑名单     | 恢复为正常线索               | **新增** |
| 导入时自动过滤 | 导入线索时自动跳过黑名单号码 | **新增** |
| 黑名单原因     | 记录拉黑原因                 | **新增** |

### 2.4 废弃站

| 功能         | 说明                    | 状态                   |
| ------------ | ----------------------- | ---------------------- |
| 废弃线索列表 | 被标记为无效的线索      | 已有(REJECTED状态)增强 |
| 恢复线索     | 从废弃站恢复到公海      | **新增**               |
| 永久删除     | 管理员永久删除(Admin)   | **新增**               |
| 废弃原因分类 | 空号/拒接/无需求/同行等 | **新增**               |
| 废弃统计     | 按原因统计废弃率        | **新增**               |

### 2.5 线索分组与标签

| 功能     | 说明                         | 状态     |
| -------- | ---------------------------- | -------- |
| 搜索模板 | 保存常用搜索条件             | 已有     |
| 线索标签 | 多标签分类管理               | **新增** |
| 智能标签 | AI自动打标（行业/规模/意向） | **新增** |
| 重复检测 | 导入时自动检测重复号码/企业  | **新增** |

## 新增枚举

```typescript
// 分配方式
enum LeadDistributionMode {
  ROUND_ROBIN = "round_robin", // 轮询
  WEIGHTED = "weighted", // 加权
  MANUAL = "manual", // 手动
}

// 黑名单原因
enum BlacklistReason {
  EMPTY_NUMBER = "empty_number",
  REJECTED = "rejected",
  NO_DEMAND = "no_demand",
  COMPETITOR = "competitor",
  FRAUD = "fraud",
  OTHER = "other",
}

// 废弃原因
enum AbandonReason {
  EMPTY_NUMBER = "empty_number",
  WRONG_NUMBER = "wrong_number",
  NO_DEMAND = "no_demand",
  COMPETITOR = "competitor",
  UNREACHABLE = "unreachable",
  OTHER = "other",
}
```

## 后端接口

| 接口                             | 方法            | 说明                      |
| -------------------------------- | --------------- | ------------------------- |
| `/api/v1/leads/distribute`       | POST            | 海量分配 (**新增**)       |
| `/api/v1/leads/distribute/rules` | GET/PUT         | 分配规则配置 (**新增**)   |
| `/api/v1/pool/list`              | GET             | 公海池列表 (增强)         |
| `/api/v1/pool/claim`             | POST            | 领取线索 (增强)           |
| `/api/v1/pool/transfer`          | POST            | 转让线索 (**新增**)       |
| `/api/v1/pool/recycle-rules`     | GET/PUT         | 自动回收规则 (**新增**)   |
| `/api/v1/blacklist`              | GET/POST/DELETE | 黑名单 CRUD (**新增**)    |
| `/api/v1/blacklist/batch`        | POST            | 批量加入黑名单 (**新增**) |
| `/api/v1/abandoned`              | GET             | 废弃站列表 (**新增**)     |
| `/api/v1/abandoned/restore`      | POST            | 恢复线索 (**新增**)       |
| `/api/v1/leads/duplicate-check`  | POST            | 重复检测 (**新增**)       |

## 涉及模块

- `packages/server/src/modules/prospect/` (增强)
- `packages/server/src/modules/customer-pool/` (增强)
- `packages/server/src/modules/blacklist/` (**新建**)
- `packages/web/src/views/prospect/` (增强)
- `packages/web/src/views/customer-pool/` (增强)
- `packages/web/src/views/blacklist/` (**新建**)
