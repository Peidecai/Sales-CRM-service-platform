# T15 — 权限粒度提升（功能码）

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) §五
> 优先级: 🔴高
> 参考设计: 12-system-management.md §12.3

## 背景

本项目当前使用三级角色（Admin/Manager/Sales）进行权限控制，粒度较粗。磐销云使用 `module:resource:action` 格式的功能码（如 `client:client:add`, `product:product:edit`），可以为每个角色精确配置功能权限。权限码体系是企业级 CRM 的标配，也是客户定制化部署的前提。本次升级需向后兼容现有的角色体系，在角色之上叠加功能码层。

## 功能需求

| #   | 功能                   | 说明                                                                            |
| --- | ---------------------- | ------------------------------------------------------------------------------- |
| 1   | Permission Entity      | 功能码定义：code, name, module, resource, action, description                   |
| 2   | Role-Permission 映射   | 多对多关联，角色可配置多个功能码                                                |
| 3   | 动态角色管理           | 除内置 Admin/Manager/Sales 外可自定义角色                                       |
| 4   | PermissionGuard        | 替代/增强现有 RolesGuard，支持 `@RequirePermission('customer:customer:delete')` |
| 5   | 前端 v-permission 增强 | 支持权限码和角色两种模式                                                        |
| 6   | 权限管理 UI            | Admin 可配置角色-权限映射                                                       |
| 7   | 菜单权限               | 按角色/权限码控制可见菜单                                                       |
| 8   | 预设权限种子           | 为内置角色预填权限码                                                            |

## 技术方案

### 后端

- **Entity**: `Permission`, `RolePermission`（role_permissions 多对多表）, `Role`（增强已有 UserRole enum 为 entity）
- **DTO**: `CreateRoleDto`, `UpdateRoleDto`, `AssignPermissionsDto`, `QueryPermissionDto`
- **Service**: `PermissionService`（CRUD + 按角色查询）, `RoleService`（动态角色 CRUD + 权限分配）
- **Guard**: `PermissionGuard` — 从 JWT payload 读取 role → 查询该角色的 permissions（Redis 缓存 `rbac:role-perms:{roleId}`，TTL 10min）→ 校验 `@RequirePermission()` 声明的码
- **Decorator**: `@RequirePermission(...codes: string[])` — 设置 metadata，PermissionGuard 读取
- **Module**: `RbacModule` 增强 — 新增 Permission/RolePermission entities + PermissionGuard
- **Migration**: `1709000081000-CreatePermissionTables`
- **Seed**: `1709000082000-SeedDefaultPermissions` — 为 Admin(全部), Manager(CRUD+export), Sales(CRU) 预填

### 前端 (PC)

- **页面**: `views/settings/roles.vue`（角色列表 + 权限配置）, `views/settings/permissions.vue`（权限码列表，只读）
- **组件**: `PermissionTree.vue`（树形权限选择器，按模块分组）, `RoleForm.vue`
- **Composable**: `usePermission()` 增强 — 新增 `hasPermission(code: string): boolean`
- **指令**: `v-permission` 增强 — 支持 `v-permission="'customer:customer:delete'"` 格式
- **API 层**: `api/rbac.ts` 增强
- **路由**: `/settings/roles`, `/settings/permissions`
- **Store**: `userStore` 增强 — 登录时获取权限码列表存入 state

### 前端 (APP)

- 登录后获取权限码列表缓存到本地
- 按钮级权限控制复用 `hasPermission` 逻辑

## API 接口

| Method | Path                            | Description              | Auth  |
| ------ | ------------------------------- | ------------------------ | ----- |
| GET    | `/api/v1/permissions`           | 权限码列表（按模块分组） | Admin |
| GET    | `/api/v1/permissions/tree`      | 权限码树形结构           | Admin |
| GET    | `/api/v1/roles`                 | 角色列表                 | Admin |
| POST   | `/api/v1/roles`                 | 创建自定义角色           | Admin |
| PUT    | `/api/v1/roles/:id`             | 更新角色                 | Admin |
| DELETE | `/api/v1/roles/:id`             | 删除角色（非内置角色）   | Admin |
| GET    | `/api/v1/roles/:id/permissions` | 获取角色权限列表         | Admin |
| PUT    | `/api/v1/roles/:id/permissions` | 更新角色权限             | Admin |
| GET    | `/api/v1/users/me/permissions`  | 当前用户权限码列表       | All   |

## 数据库设计

### permission 表

| Column      | Type                    | Nullable | Description                                 |
| ----------- | ----------------------- | -------- | ------------------------------------------- |
| id          | int, PK, auto_increment | NO       |                                             |
| code        | varchar(100), unique    | NO       | 权限码，格式 `module:resource:action`       |
| name        | varchar(100)            | NO       | 权限名称（中文）                            |
| module      | varchar(50)             | NO       | 所属模块（customer/opportunity/product 等） |
| resource    | varchar(50)             | NO       | 资源（customer/contact/product 等）         |
| action      | varchar(20)             | NO       | 操作（list/add/edit/delete/export/import）  |
| description | varchar(500)            | YES      | 描述                                        |
| sort        | int                     | NO       | 排序，默认 0                                |
| createdAt   | datetime(6)             | NO       |                                             |

**索引**: `UQ_permission_code` (code), `IDX_permission_module` (module)

### role 表

| Column      | Type                      | Nullable | Description                          |
| ----------- | ------------------------- | -------- | ------------------------------------ |
| id          | int, PK, auto_increment   | NO       |                                      |
| name        | varchar(50), unique       | NO       | 角色名（admin/manager/sales/自定义） |
| label       | varchar(100)              | NO       | 显示名称                             |
| description | varchar(500)              | YES      | 角色描述                             |
| isBuiltin   | tinyint(1)                | NO       | 是否内置角色，默认 0                 |
| status      | enum('active','disabled') | NO       | 默认 active                          |
| createdAt   | datetime(6)               | NO       |                                      |
| updatedAt   | datetime(6)               | NO       |                                      |
| deletedAt   | datetime(6)               | YES      | 软删除                               |

### role_permission 表

| Column       | Type                    | Nullable | Description |
| ------------ | ----------------------- | -------- | ----------- |
| id           | int, PK, auto_increment | NO       |             |
| roleId       | int, FK → role.id       | NO       |             |
| permissionId | int, FK → permission.id | NO       |             |

**索引**: `UQ_role_permission` (roleId, permissionId), `IDX_rp_role` (roleId)

### 预设权限码

```
customer:customer:list    客户列表
customer:customer:add     创建客户
customer:customer:edit    编辑客户
customer:customer:delete  删除客户
customer:customer:export  导出客户
customer:customer:import  导入客户
customer:contact:list     联系人列表
customer:contact:add      创建联系人
opportunity:opportunity:list/add/edit/delete/export
product:product:list/add/edit/delete/export
call-record:record:list/detail/export
knowledge:article:list/add/edit/delete/publish
system:user:list/add/edit/delete
system:role:list/add/edit/delete
system:audit-log:list/export
```

## 依赖模块

| 模块                | 关系                                         |
| ------------------- | -------------------------------------------- |
| RbacModule          | 核心增强模块                                 |
| AuthModule          | JWT payload 需包含 roleId                    |
| UserModule          | 用户-角色关联调整                            |
| RedisService        | 角色权限缓存                                 |
| 所有业务 Controller | 逐步迁移 `@Roles()` → `@RequirePermission()` |

## 验收标准

- [ ] Permission/Role/RolePermission entities + migration 创建成功
- [ ] Seed migration 为 Admin/Manager/Sales 预填权限码（Admin 全部，Manager 含 CRUD+export，Sales 含 CRU）
- [ ] `@RequirePermission('customer:customer:delete')` 装饰器 + PermissionGuard 正确拦截
- [ ] 旧 `@Roles(UserRole.ADMIN)` 装饰器继续兼容，PermissionGuard 同时检查角色和权限码
- [ ] 角色权限缓存 Redis key `rbac:role-perms:{roleId}`，TTL 10min，更新权限时清缓存
- [ ] 前端 `usePermission().hasPermission('customer:customer:delete')` 正常工作
- [ ] `v-permission="'customer:customer:delete'"` 指令正确隐藏/显示元素
- [ ] 权限管理 UI：角色列表 → 点击配置 → 树形权限选择器 → 保存
- [ ] 删除内置角色时返回 400 错误
- [ ] 后端单元测试 ≥ 25 tests（PermissionGuard + RoleService + PermissionService + seed 验证）
- [ ] E2E 测试 ≥ 5 tests（角色列表 + 权限配置 + 新角色创建 + 权限拦截验证）
