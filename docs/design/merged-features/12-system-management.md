# 12 — 系统管理

> 合并来源: 本项目 Auth/User/RBAC/AuditLog 模块 + 磐销云系统管理

## 现有功能（本项目）

- [x] 用户管理（User CRUD）
- [x] JWT 认证（Access 2h / Refresh 7d）
- [x] RBAC 三级角色（Admin/Manager/Sales）
- [x] 审计日志（自动记录POST/PUT/DELETE）
- [x] 审计日志查看器
- [x] 数据字典（shared enums）
- [x] 系统设置页（Settings）
- [x] 限流（60 req/min + 登录 5/min）
- [x] Redis 缓存
- [x] 健康检查（/api/v1/health）

## 磐销云系统管理

- 用户管理
- 部门管理
- 角色管理（动态角色+权限码）
- 数据字典管理（dict type + dict data）
- 公告管理
- 微信绑定

## 合并后功能清单

### 12.1 用户管理（增强）

| 功能         | 说明                         | 状态     |
| ------------ | ---------------------------- | -------- |
| 用户 CRUD    | 创建/编辑/禁用/删除          | 已有     |
| 头像上传     | 个人头像                     | 已有增强 |
| 密码重置     | 管理员重置密码               | 已有     |
| 在线状态     | 显示用户在线/离线状态        | **新增** |
| 工作状态     | 工作中/忙碌/离开             | **新增** |
| 登录日志     | 用户登录记录（IP/时间/设备） | **新增** |
| 批量导入用户 | Excel批量创建用户            | **新增** |

### 12.2 部门管理（增强）

| 功能        | 说明               | 状态           |
| ----------- | ------------------ | -------------- |
| 部门树 CRUD | 多级部门结构       | 已有(基础)增强 |
| 部门负责人  | 设置部门主管       | **新增**       |
| 部门人员    | 查看部门下所有成员 | **新增**       |
| 部门调整    | 人员调部门         | **新增**       |

### 12.3 角色权限（增强）

| 功能       | 说明                           | 状态     |
| ---------- | ------------------------------ | -------- |
| 角色管理   | Admin/Manager/Supervisor/Sales | 已有增强 |
| 权限码管理 | 细粒度功能权限配置             | **新增** |
| 数据权限   | 全部/部门/个人 数据范围        | 已有增强 |
| 菜单权限   | 按角色配置可见菜单             | **新增** |
| 动态角色   | 自定义角色（不限于固定4种）    | **新增** |

### 12.4 数据字典（新增）

| 功能         | 说明                        | 状态     |
| ------------ | --------------------------- | -------- |
| 字典类型管理 | 管理字典分类                | **新增** |
| 字典数据管理 | 管理字典选项值              | **新增** |
| 前端动态渲染 | 下拉框/标签根据字典动态生成 | **新增** |
| 字典缓存     | Redis 缓存字典数据          | **新增** |

**预设字典类型**:

- 客户来源、客户状态、客户类型、客户等级
- 商机阶段、商机状态、优先级
- 通话结果、意向等级
- 合同类型、回款方式
- 废弃原因、黑名单原因

### 12.5 系统配置（增强）

| 功能       | 说明                     | 状态     |
| ---------- | ------------------------ | -------- |
| 基础设置   | 系统名称/Logo/主题色     | 已有增强 |
| 公海规则   | 自动回收天数/领取上限    | **新增** |
| 分配规则   | 线索分配策略配置         | **新增** |
| AI 配置    | AI 模型/API Key/分析开关 | 已有增强 |
| 通知配置   | 全局通知策略             | **新增** |
| 数据源配置 | 天眼查/企查查 API 配置   | 已有     |

### 12.6 审计日志（已有）

| 功能       | 说明                         | 状态     |
| ---------- | ---------------------------- | -------- |
| 自动记录   | POST/PUT/DELETE 操作自动记录 | 已有     |
| 日志查看器 | 前端查看+筛选+详情           | 已有     |
| 日志导出   | 导出审计日志                 | **新增** |

## 后端接口（新增部分）

| 接口                               | 方法                | 说明         |
| ---------------------------------- | ------------------- | ------------ |
| `/api/v1/users/online`             | GET                 | 在线用户列表 |
| `/api/v1/users/login-logs`         | GET                 | 登录日志     |
| `/api/v1/users/import`             | POST                | 批量导入用户 |
| `/api/v1/departments`              | GET/POST/PUT/DELETE | 部门CRUD     |
| `/api/v1/departments/tree`         | GET                 | 部门树       |
| `/api/v1/roles`                    | GET/POST/PUT/DELETE | 角色CRUD     |
| `/api/v1/roles/:id/permissions`    | GET/PUT             | 角色权限配置 |
| `/api/v1/roles/:id/menus`          | GET/PUT             | 角色菜单配置 |
| `/api/v1/dict/types`               | GET/POST/PUT/DELETE | 字典类型CRUD |
| `/api/v1/dict/data`                | GET/POST/PUT/DELETE | 字典数据CRUD |
| `/api/v1/dict/data/type/:dictType` | GET                 | 按类型查字典 |
| `/api/v1/system/config`            | GET/PUT             | 系统配置     |

## 涉及模块

- `packages/server/src/modules/user/` (增强)
- `packages/server/src/modules/auth/` (已有)
- `packages/server/src/modules/rbac/` (增强)
- `packages/server/src/modules/audit-log/` (已有)
- `packages/server/src/modules/department/` (**新建或增强**)
- `packages/server/src/modules/dict/` (**新建** — 数据字典)
- `packages/server/src/modules/system-config/` (**新建**)
- `packages/web/src/views/settings/` (增强)
- `packages/web/src/views/user/` (增强)
