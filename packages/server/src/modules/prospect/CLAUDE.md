# 互联网获客模块 (Prospect) CLAUDE.md

## 模块信息

**模块**: 互联网获客 (Prospect / Lead Mining)
**路径**: `packages/server/src/modules/prospect/`
**前端路由**: `/prospect` (搜索页), `/settings` (数据源管理, Admin)

## 功能范围

1. 企业工商数据搜索（天眼查/企查查 API）
2. 数据源配置管理（API Key、配额、启停）
3. 搜索条件模板（保存/加载常用搜索组合）
4. 动态筛选字段配置（管理员可启停搜索维度）
5. 搜索结果一键转化为客户
6. 每日配额控制 + 自动重置

## 架构

```
prospect/
├── prospect.module.ts
├── prospect.controller.ts          # 搜索/导入/转化 + 配置管理 API
├── prospect.service.ts             # 搜索编排、导入、批量转化
├── prospect-config.service.ts      # 数据源/模板/筛选配置 CRUD
├── entities/
│   ├── prospect-data-source.entity.ts    # API 账号配置
│   ├── prospect-search-template.entity.ts # 搜索模板
│   └── prospect-filter-config.entity.ts   # 筛选字段配置 (单行)
├── dto/
│   ├── create-data-source.dto.ts
│   ├── update-data-source.dto.ts
│   ├── create-search-template.dto.ts
│   └── update-filter-config.dto.ts
└── adapters/
    ├── prospect-adapter.interface.ts   # IProspectAdapter 接口
    ├── tianyancha.adapter.ts           # 天眼查 API
    └── qichacha.adapter.ts            # 企查查 API
```

## 适配器模式

**Stateless 设计**: credentials 每次调用传入，不存储在 adapter 单例上。

```typescript
interface IProspectAdapter {
  channel: ProspectChannel
  isAvailable(): boolean
  search(query, credentials?): Promise<ProspectSearchResponse>
  getDetail(companyName, credentials?): Promise<ProspectSearchResult | null>
  testConnection?(credentials): Promise<boolean>
}
```

### 天眼查

- API: `GET https://open.api.tianyancha.com/services/open/search/2.0`
- 认证: `Authorization: <apiKey>` Header
- 参数: `word`, `pageNum`, `pageSize`

### 企查查

- API: `GET https://api.qichacha.com/ECIV4/Search`
- 签名: `Token = MD5(Key + Timespan + SecretKey).toUpperCase()`
- Header: `Key`, `Timespan`, `Token`
- 参数: `keyword`, `pageIndex`, `pageSize`

### 错误处理

- 401/403 → 抛出认证失败错误
- 429 → 抛出频率超限错误
- 其他 → 返回空结果 `{ results: [], total: 0, cost: 0 }`

## 数据源安全

- API Key/Secret 使用 `EncryptionService.columnTransformer()` AES-256-GCM 加密存储
- 响应使用 `DataSourceVO` 掩码：`apiKeyMasked = '****' + last4`，`hasApiSecret: boolean`
- **禁止缓存解密后的凭证到 Redis**

## API 端点

| 方法   | 路径                               | 权限          | 说明         |
| ------ | ---------------------------------- | ------------- | ------------ |
| GET    | `/prospects/search`                | All           | 搜索企业     |
| POST   | `/prospects/import`                | Admin+Manager | 导入为潜客   |
| POST   | `/prospects/batch-convert`         | Admin+Manager | 批量转化客户 |
| GET    | `/prospects/data-sources`          | Admin         | 数据源列表   |
| POST   | `/prospects/data-sources`          | Admin         | 创建数据源   |
| PUT    | `/prospects/data-sources/:id`      | Admin         | 更新数据源   |
| DELETE | `/prospects/data-sources/:id`      | Admin         | 删除数据源   |
| POST   | `/prospects/data-sources/:id/test` | Admin         | 测试连接     |
| GET    | `/prospects/search-templates`      | All           | 搜索模板     |
| POST   | `/prospects/search-templates`      | All           | 创建模板     |
| PUT    | `/prospects/search-templates/:id`  | All           | 更新模板     |
| DELETE | `/prospects/search-templates/:id`  | All           | 删除模板     |
| GET    | `/prospects/filter-config`         | All           | 筛选配置     |
| PUT    | `/prospects/filter-config`         | Admin         | 更新筛选     |

## 数据表

### prospect_data_sources

- `channel` (UNIQUE) — tianyancha / qichacha
- `apiKey` / `apiSecret` (AES 加密)
- `isEnabled`, `dailyQuota`, `usedToday`, `totalUsed`
- 每日凌晨 Cron 重置 `usedToday`

### prospect_search_templates

- `userId` (INDEX) — 创建者
- `conditions` (JSON) — 搜索条件
- `isShared` — 是否共享

### prospect_filter_configs

- 单行表 (id=1, 无自增)
- `enabledFilters` / `customFilters` (JSON)

## 前端

- `views/prospect/search.vue` — 搜索页（模板选择、数据源选择、动态筛选字段）
- `views/settings/index.vue` — 系统设置（数据源管理 Tab + 筛选配置 Tab, Admin）
- `api/prospect-config.ts` — 配置管理 API 层

## 缓存

| Key                                  | TTL  |
| ------------------------------------ | ---- |
| `cache:prospects:data-sources`       | 300s |
| `cache:prospects:filter-config`      | 300s |
| `cache:prospects:templates:{userId}` | 120s |

## Skill 规范

- **backend-patterns** — 适配器模式、Service 分层
- **security-review** — API Key 加密存储、掩码返回
- **database-migrations** — 迁移幂等 (INSERT IGNORE)
- **coding-standards** — TypeScript 严格模式
