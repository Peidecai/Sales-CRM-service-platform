# T18 — 数据脱敏设置

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md)
> 优先级: 🟡中
> 参考设计: 03-customer-management.md §3.1 + 12-system-management.md

## 背景

磐销云有 desensitizationSet（脱敏设置）模块，控制敏感字段的显隐。本项目在 T03 中已有手机号脱敏的基本需求（`maskPhone` 函数），但缺少系统级的可配置脱敏方案。合规要求敏感数据（手机号、身份证号、邮箱、地址）需按角色/场景脱敏。本模块实现可配置的脱敏规则引擎，通过 Response Interceptor 统一应用。

## 功能需求

| #   | 功能                 | 说明                                               |
| --- | -------------------- | -------------------------------------------------- |
| 1   | 脱敏规则管理         | Admin 配置哪些字段需要脱敏                         |
| 2   | 脱敏模式             | 部分隐藏（`138****1234`）/ 完全隐藏（`***`）/ 哈希 |
| 3   | 角色豁免             | 按角色配置是否豁免脱敏（Admin 默认豁免）           |
| 4   | 字段级控制           | 精确到 entity + field 级别                         |
| 5   | 查看原文权限         | 特定权限码可查看未脱敏数据                         |
| 6   | Interceptor 自动应用 | Response 返回前自动脱敏                            |
| 7   | 脱敏日志             | 记录谁查看了未脱敏数据                             |

## 技术方案

### 后端

- **Entity**: `DataMaskingRule`
- **DTO**: `CreateMaskingRuleDto`, `UpdateMaskingRuleDto`, `QueryMaskingRuleDto`
- **Service**: `DataMaskingService` — CRUD + 规则引擎 + 缓存
- **Interceptor**: `DataMaskingInterceptor` — 读取规则缓存，在 response 中按规则脱敏字段值
- **Decorator**: `@SkipMasking()` — 标记某端点跳过脱敏（如导出 CSV 由 Manager+ 使用时）
- **Utility**: `@crm/shared` 中新增 `mask.util.ts` — `maskPhone`, `maskIdCard`, `maskEmail`, `maskAddress`, `maskByPattern`
- **Module**: `DataMaskingModule` — imports `TypeOrmModule`, `RedisModule`; exports `DataMaskingInterceptor`
- **Migration**: `1709000085000-CreateDataMaskingRule`

### 前端 (PC)

- **页面**: `views/settings/data-masking.vue`（脱敏规则管理，Admin only）
- **组件**: `MaskingRuleForm.vue`（规则创建/编辑）, `MaskingPreview.vue`（预览脱敏效果）
- **API 层**: `api/data-masking.ts`
- **路由**: `/settings/data-masking`

### 前端 (APP)

- 无管理界面，脱敏在 API 层自动生效
- 需查看原文时调用 `/unmask` 端点

## API 接口

| Method | Path                                    | Description                                | Auth     |
| ------ | --------------------------------------- | ------------------------------------------ | -------- |
| GET    | `/api/v1/data-masking/rules`            | 脱敏规则列表                               | Admin    |
| POST   | `/api/v1/data-masking/rules`            | 创建脱敏规则                               | Admin    |
| PUT    | `/api/v1/data-masking/rules/:id`        | 更新脱敏规则                               | Admin    |
| DELETE | `/api/v1/data-masking/rules/:id`        | 删除脱敏规则                               | Admin    |
| PUT    | `/api/v1/data-masking/rules/:id/status` | 启用/禁用规则                              | Admin    |
| POST   | `/api/v1/data-masking/unmask`           | 查看原文（需权限码 `data:sensitive:view`） | 特定权限 |
| GET    | `/api/v1/data-masking/preview`          | 预览脱敏效果                               | Admin    |

## 数据库设计

### data_masking_rule 表

| Column           | Type                          | Nullable | Description                                            |
| ---------------- | ----------------------------- | -------- | ------------------------------------------------------ |
| id               | int, PK, auto_increment       | NO       |                                                        |
| name             | varchar(100)                  | NO       | 规则名称                                               |
| entityName       | varchar(50)                   | NO       | 实体名（customer/contact 等）                          |
| fieldName        | varchar(50)                   | NO       | 字段名（phone/idNumber/email/address）                 |
| maskType         | enum('partial','full','hash') | NO       | 脱敏模式                                               |
| pattern          | varchar(100)                  | YES      | 自定义脱敏模式（如 `3,4,4` 表示保留前3后4隐藏中间4位） |
| exemptRoles      | json                          | YES      | 豁免角色列表 `["admin"]`                               |
| exemptPermission | varchar(100)                  | YES      | 豁免权限码                                             |
| isActive         | tinyint(1)                    | NO       | 是否启用，默认 1                                       |
| createdAt        | datetime(6)                   | NO       |                                                        |
| updatedAt        | datetime(6)                   | NO       |                                                        |

**索引**: `UQ_masking_entity_field` (entityName, fieldName), `IDX_masking_active` (isActive)

### 预设脱敏规则

| entityName | fieldName | maskType | pattern | exemptRoles |
| ---------- | --------- | -------- | ------- | ----------- |
| customer   | phone     | partial  | 3,4,4   | ["admin"]   |
| contact    | phone     | partial  | 3,4,4   | ["admin"]   |
| contact    | email     | partial  | 2,\*,0  | ["admin"]   |
| customer   | idNumber  | partial  | 4,10,4  | ["admin"]   |

## 依赖模块

| 模块           | 关系                                         |
| -------------- | -------------------------------------------- |
| RedisService   | 规则缓存 key `data-masking:rules`，TTL 10min |
| AuthModule     | 读取用户角色/权限判断豁免                    |
| AuditLogModule | 记录查看原文操作                             |
| @crm/shared    | 共享脱敏工具函数                             |

## 验收标准

- [ ] DataMaskingRule CRUD 端点可用
- [ ] `DataMaskingInterceptor` 在 response 中自动脱敏命中规则的字段
- [ ] 脱敏模式：partial（`138****1234`）、full（`***`）、hash（`sha256 前8位`）
- [ ] 角色豁免：Admin 默认可见完整数据，其他角色按规则脱敏
- [ ] `/unmask` 端点需要 `data:sensitive:view` 权限码，并写审计日志
- [ ] `@SkipMasking()` 装饰器跳过脱敏（用于 CSV 导出等场景）
- [ ] 规则缓存 Redis，更新规则时清缓存
- [ ] 预设规则通过 seed migration 插入
- [ ] 前端管理页面：规则列表 + 新增/编辑弹窗 + 启用/禁用开关 + 预览
- [ ] `@crm/shared` 的 `maskPhone/maskEmail/maskIdCard/maskAddress` 单元测试 ≥ 12 tests
- [ ] DataMaskingService + Interceptor 后端单元测试 ≥ 15 tests
- [ ] E2E 测试 ≥ 4 tests（脱敏生效验证 + 豁免验证 + 规则管理 + unmask）
