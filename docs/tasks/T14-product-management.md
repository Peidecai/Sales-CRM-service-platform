# T14 — 产品管理模块

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md)
> 优先级: 🔴高
> 参考设计: 无（全新设计，磐销云 product:product 模块对标）

## 背景

产品管理是 CRM 核心功能之一。磐销云已有完整的产品 CRUD + 导出 + 产品发送 + 贷后检查功能。本项目目前没有产品模块，销售人员无法将产品与商机/合同关联，影响报价单生成和合同管理的完整性。产品模块需支持分类管理（树形结构）、产品与商机的多对多关联、CSV 导出。

## 功能需求

| #   | 功能             | 说明                                         |
| --- | ---------------- | -------------------------------------------- |
| 1   | 产品 CRUD        | 创建/查看/编辑/软删除产品                    |
| 2   | 产品列表         | 分页、搜索（名称/编码/分类）、排序、状态筛选 |
| 3   | 产品分类（树形） | 多级分类树，支持 CRUD                        |
| 4   | 产品-商机关联    | 一个商机可关联多个产品（含数量、折扣）       |
| 5   | CSV 导出         | Manager+ 可导出产品列表                      |
| 6   | 产品状态管理     | 上架/下架/停产                               |
| 7   | 产品规格         | JSON 格式存储自定义规格参数                  |

## 技术方案

### 后端

- **Entity**: `Product`, `ProductCategory`, `OpportunityProduct`（关联表）
- **DTO**: `CreateProductDto`, `UpdateProductDto`, `QueryProductDto`, `CreateProductCategoryDto`, `LinkProductDto`
- **Service**: `ProductService` (CRUD + export), `ProductCategoryService` (树形 CRUD)
- **Controller**: `ProductController` (14 endpoints), `ProductCategoryController` (5 endpoints)
- **Module**: `ProductModule` — imports `TypeOrmModule`, `OpportunityModule`; exports `TypeOrmModule`
- **Migration**: `1709000080000-CreateProductTables`

### 前端 (PC)

- **页面**: `views/product/index.vue`（列表）, `views/product/detail.vue`（详情）
- **组件**: `ProductForm.vue`（创建/编辑表单）, `CategoryTree.vue`（分类树侧边栏）, `ProductSelector.vue`（商机关联时选择产品弹窗）
- **API 层**: `api/product.ts`
- **路由**: `/product` (列表), `/product/:id` (详情)

### 前端 (APP)

- 产品列表（只读，供销售人员查看产品信息）
- 商机详情页中展示关联产品

## API 接口

| Method | Path                                            | Description                    | Auth     |
| ------ | ----------------------------------------------- | ------------------------------ | -------- |
| GET    | `/api/v1/products`                              | 产品分页列表                   | All      |
| POST   | `/api/v1/products`                              | 创建产品                       | Manager+ |
| GET    | `/api/v1/products/:id`                          | 产品详情                       | All      |
| PUT    | `/api/v1/products/:id`                          | 更新产品                       | Manager+ |
| DELETE | `/api/v1/products/:id`                          | 软删除产品                     | Manager+ |
| PUT    | `/api/v1/products/:id/status`                   | 更新产品状态（上架/下架/停产） | Manager+ |
| GET    | `/api/v1/products/export`                       | 导出 CSV                       | Manager+ |
| GET    | `/api/v1/product-categories`                    | 分类树                         | All      |
| POST   | `/api/v1/product-categories`                    | 创建分类                       | Manager+ |
| PUT    | `/api/v1/product-categories/:id`                | 更新分类                       | Manager+ |
| DELETE | `/api/v1/product-categories/:id`                | 删除分类（无子级/产品时）      | Manager+ |
| GET    | `/api/v1/product-categories/:id/products`       | 按分类查产品                   | All      |
| POST   | `/api/v1/opportunities/:id/products`            | 关联产品到商机                 | Sales+   |
| DELETE | `/api/v1/opportunities/:id/products/:productId` | 移除商机产品关联               | Sales+   |

## 数据库设计

### product 表

| Column      | Type                                     | Nullable | Description           |
| ----------- | ---------------------------------------- | -------- | --------------------- |
| id          | int, PK, auto_increment                  | NO       |                       |
| name        | varchar(200)                             | NO       | 产品名称              |
| code        | varchar(50), unique                      | NO       | 产品编码              |
| categoryId  | int, FK → product_category.id            | YES      | 所属分类              |
| price       | decimal(12,2)                            | NO       | 标准单价              |
| unit        | varchar(20)                              | NO       | 单位（件/套/个/年等） |
| status      | enum('active','inactive','discontinued') | NO       | 状态，默认 active     |
| description | text                                     | YES      | 产品描述              |
| specs       | json                                     | YES      | 规格参数 JSON         |
| createdAt   | datetime(6)                              | NO       |                       |
| updatedAt   | datetime(6)                              | NO       |                       |
| deletedAt   | datetime(6)                              | YES      | 软删除                |

**索引**: `IDX_product_code` (code), `IDX_product_category` (categoryId), `IDX_product_status` (status)

### product_category 表

| Column    | Type                          | Nullable | Description      |
| --------- | ----------------------------- | -------- | ---------------- |
| id        | int, PK, auto_increment       | NO       |                  |
| name      | varchar(100)                  | NO       | 分类名称         |
| parentId  | int, FK → product_category.id | YES      | 父分类（树形）   |
| sort      | int                           | NO       | 排序序号，默认 0 |
| createdAt | datetime(6)                   | NO       |                  |
| updatedAt | datetime(6)                   | NO       |                  |
| deletedAt | datetime(6)                   | YES      | 软删除           |

### opportunity_product 表（关联表）

| Column        | Type                     | Nullable | Description  |
| ------------- | ------------------------ | -------- | ------------ |
| id            | int, PK, auto_increment  | NO       |              |
| opportunityId | int, FK → opportunity.id | NO       |              |
| productId     | int, FK → product.id     | NO       |              |
| quantity      | int                      | NO       | 数量，默认 1 |
| unitPrice     | decimal(12,2)            | NO       | 成交单价     |
| discount      | decimal(5,2)             | YES      | 折扣百分比   |
| subtotal      | decimal(12,2)            | NO       | 小计金额     |
| createdAt     | datetime(6)              | NO       |              |

**索引**: `UQ_opp_product` (opportunityId, productId), `IDX_opp_product_opp` (opportunityId)

## 依赖模块

| 模块              | 关系            |
| ----------------- | --------------- |
| OpportunityModule | 产品-商机关联   |
| AuditLogModule    | 操作审计        |
| AuthModule        | JWT + RBAC 守卫 |

## 验收标准

- [ ] Product CRUD 全部端点可用，支持分页/搜索/排序
- [ ] ProductCategory 树形 CRUD，删除时校验无子级和关联产品
- [ ] OpportunityProduct 关联：创建时自动计算 subtotal = quantity _ unitPrice _ (1 - discount/100)
- [ ] CSV 导出包含所有字段，中文表头
- [ ] 产品状态流转：active ↔ inactive, active → discontinued
- [ ] 前端列表页：分类树侧边栏 + 右侧产品表格联动
- [ ] 前端详情页：基本信息 + 关联商机列表
- [ ] 商机详情页中可添加/移除产品，展示产品明细和金额合计
- [ ] 后端单元测试 ≥ 20 tests（ProductService CRUD + export + 状态流转 + 关联）
- [ ] E2E 测试 ≥ 5 tests（列表 + 创建 + 详情 + 分类筛选 + 导出）
- [ ] `@UseGuards(JwtAuthGuard, RolesGuard)` + `@UseInterceptors(AuditLogInterceptor)` 已应用
