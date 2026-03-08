## 4. 数据库详细设计

### 4.1 设计原则与规范

#### 4.1.1 命名规范

| 类别          | 规范                                | 示例                                |
| ------------- | ----------------------------------- | ----------------------------------- |
| 表名          | 小写字母，下划线分隔，复数形式      | `customers`、`call_records`         |
| 字段名        | 小写字母，下划线分隔（snake_case）  | `customer_name`、`created_at`       |
| 主键          | 统一使用 `id`，BIGINT UNSIGNED 自增 | `id BIGINT UNSIGNED AUTO_INCREMENT` |
| 外键字段      | 关联表单数形式 + `_id`              | `customer_id`、`user_id`            |
| 普通索引      | `idx_表名_字段名`                   | `idx_customers_name`                |
| 唯一索引      | `uk_表名_字段名`                    | `uk_users_phone`                    |
| 联合索引      | `idx_表名_字段1_字段2`              | `idx_opportunities_customer_stage`  |
| 布尔字段      | `is_` 前缀                          | `is_active`、`is_deleted`           |
| 时间字段      | `_at` 后缀                          | `created_at`、`closed_at`           |
| 枚举/状态字段 | `_status` 或 `_type` 后缀           | `order_status`、`customer_type`     |

#### 4.1.2 第三范式遵循与合理反范式

**遵循第三范式（3NF）的场景：**

- 用户、角色、权限等基础数据严格遵循 3NF，消除传递依赖
- 客户、联系人、商机等核心业务实体独立建表，通过外键关联
- 字典数据统一存放于 `dictionaries` 表，避免硬编码

**合理反范式的场景：**

- `opportunities` 表冗余存储 `customer_name`，避免列表查询时频繁 JOIN
- `call_records` 表冗余存储 `caller_name`、`customer_name`，因通话记录为高频查询且数据不可变
- `contracts` 表冗余存储 `customer_name`，合同一旦签订客户名称不再变化
- `ai_analysis` 表冗余存储关键上下文字段，减少分析结果展示时的多表关联

#### 4.1.3 字段类型选择规范

| 数据类型           | 使用场景       | 说明                                       |
| ------------------ | -------------- | ------------------------------------------ |
| `BIGINT UNSIGNED`  | 主键、外键     | 8字节，满足大数据量需求                    |
| `VARCHAR(n)`       | 可变长度字符串 | n 根据实际业务设定，不超过 5000            |
| `CHAR(n)`          | 固定长度编码   | 如 `CHAR(6)` 存区域编码                    |
| `TEXT`             | 大段文本       | 备注、描述、文章内容                       |
| `JSON`             | 结构化扩展数据 | AI分析结果、扩展属性（MySQL 8.0 原生支持） |
| `DECIMAL(m,d)`     | 金额字段       | 如 `DECIMAL(15,2)`，禁止用 FLOAT/DOUBLE    |
| `TINYINT UNSIGNED` | 状态枚举       | 0-255，配合注释说明含义                    |
| `DATE`             | 仅日期         | 生日、签约日期                             |
| `DATETIME`         | 日期+时间      | 创建时间、操作时间，统一存储 UTC           |
| `TIMESTAMP`        | 自动更新时间戳 | `updated_at` 字段                          |

#### 4.1.4 索引设计原则

1. **主键索引**：所有表必须有自增 BIGINT 主键，InnoDB 聚簇索引自动创建
2. **外键索引**：所有外键字段必须创建索引，保证 JOIN 查询性能
3. **高频查询索引**：根据业务查询频率对 WHERE、ORDER BY、GROUP BY 涉及的字段建立索引
4. **联合索引**：遵循最左前缀原则，将区分度高的字段放在前面
5. **覆盖索引**：对高频列表查询，尽量设计覆盖索引减少回表
6. **索引数量控制**：单表索引数量不超过 6 个，避免写入性能下降
7. **软删除索引**：包含 `deleted_at` 的查询，在联合索引中加入 `deleted_at` 字段
8. **前缀索引**：对长字符串字段（如 URL、地址）使用前缀索引

---

### 4.2 ER关系图

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              AI智能CRM销售管理系统 ER关系图                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
    │  departments │1───────*│     users        │*───────1│    roles     │
    │──────────────│         │──────────────────│         │──────────────│
    │ id           │         │ id               │         │ id           │
    │ name         │         │ username         │         │ name         │
    │ parent_id    │─┐       │ department_id(FK)│         │ code         │
    │ leader_id    │ │       │ role_id(FK)      │         │ description  │
    └──────────────┘ │       └────────┬─────────┘         └──────┬───────┘
           ▲         │               │                           │
           └─────────┘(自关联)        │                           │
                                     │                    ┌──────┴───────────┐
                                     │                    │ role_permissions  │
                                     │                    │──────────────────│
                                     │                    │ role_id(FK)      │
                                     │                    │ permission_id(FK)│
                                     │                    └──────┬───────────┘
                                     │                           │
                                     │                    ┌──────┴───────┐
                                     │                    │ permissions  │
                                     │                    │──────────────│
                                     │                    │ id           │
                                     │                    │ code         │
                                     │                    │ name         │
                                     │                    │ module       │
                                     │                    └──────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────────────────────┐
         │                           │                                           │
         ▼                           ▼                                           ▼
  ┌──────────────┐          ┌────────────────┐                         ┌─────────────────┐
  │  customers   │1────────*│   contacts     │                         │ operation_logs  │
  │──────────────│          │────────────────│                         │─────────────────│
  │ id           │          │ id             │                         │ id              │
  │ name         │          │ customer_id(FK)│                         │ user_id(FK)     │
  │ owner_id(FK) │          │ name           │                         │ module          │
  │ source       │          │ phone          │                         │ action          │
  │ level        │          │ is_primary     │                         │ ip_address      │
  │ industry     │          │ position       │                         └─────────────────┘
  └──────┬───────┘          └────────────────┘
         │
         │1                                                ┌──────────────────┐
         ├──────────────────────────────────────────*─────│ customer_tags    │
         │                                                │──────────────────│
         │                                                │ id               │
         │                                                │ customer_id(FK)  │
         │                                                │ tag_name         │
         │                                                └──────────────────┘
         │1
         ├──────────────────────────────────────────*─────┌──────────────────────┐
         │                                                │ customer_follow_ups  │
         │                                                │──────────────────────│
         │                                                │ id                   │
         │                                                │ customer_id(FK)      │
         │                                                │ user_id(FK)          │
         │                                                │ follow_type          │
         │                                                │ content              │
         │                                                └──────────────────────┘
         │1
         ├───────────────*┌──────────────────┐
         │                │  opportunities   │1──────────*┌──────────────────┐
         │                │──────────────────│            │    contracts     │
         │                │ id               │            │──────────────────│
         │                │ customer_id(FK)  │            │ id               │
         │                │ name             │            │ opportunity_id(FK)│
         │                │ stage            │            │ customer_id(FK)  │
         │                │ amount           │            │ contract_no      │
         │                │ owner_id(FK)     │            │ amount           │
         │                │ expected_close   │            │ owner_id(FK)     │
         │                └──────────────────┘            └────────┬─────────┘
         │                                                         │1
         │                                                         │
         │                                                         ├──────*┌──────────────┐
         │                                                         │       │   payments   │
         │                                                         │       │──────────────│
         │                                                         │       │ id           │
         │                                                         │       │ contract_id  │
         │                                                         │       │ amount       │
         │                                                         │       │ payment_date │
         │                                                         │       └──────────────┘
         │1
         ├───────────────*┌──────────────────┐
         │                │  call_records    │
         │                │──────────────────│
         │                │ id               │
         │                │ customer_id(FK)  │
         │                │ caller_id(FK)    │
         │                │ call_type        │
         │                │ duration         │
         │                │ recording_url    │
         │                └──────────────────┘
         │1
         ├───────────────*┌──────────────────┐
         │                │  visit_records   │
         │                │──────────────────│
         │                │ id               │
         │                │ customer_id(FK)  │
         │                │ visitor_id(FK)   │
         │                │ visit_date       │
         │                │ purpose          │
         │                │ result           │
         │                └──────────────────┘
         │1
         └───────────────*┌──────────────────┐
                          │  ai_analysis     │
                          │──────────────────│
                          │ id               │
                          │ customer_id(FK)  │
                          │ analysis_type    │
                          │ result_data(JSON)│
                          │ score            │
                          └──────────────────┘


  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────────┐
  │  call_tasks      │      │  sales_targets   │      │ knowledge_articles   │
  │──────────────────│      │──────────────────│      │──────────────────────│
  │ id               │      │ id               │      │ id                   │
  │ name             │      │ user_id(FK)      │      │ title                │
  │ creator_id(FK)   │      │ target_amount    │      │ category             │
  │ status           │      │ period_type      │      │ content              │
  │ customer_ids(JSON)│     │ year / month     │      │ author_id(FK)        │
  └──────────────────┘      └──────────────────┘      └──────────────────────┘


  ┌──────────────────┐      ┌──────────────────┐
  │ system_configs   │      │  dictionaries    │
  │──────────────────│      │──────────────────│
  │ id               │      │ id               │
  │ config_key       │      │ dict_type        │
  │ config_value     │      │ dict_code        │
  │ description      │      │ dict_label       │
  └──────────────────┘      │ sort_order       │
                            └──────────────────┘

  ─────────────────────────────────────────────────
  关系说明：
  1:*  一对多     *:*  多对多（通过中间表）
  (FK) 外键引用   (自关联) 表内父子关系
```

**核心关系说明：**

| 关系                            | 类型   | 说明                             |
| ------------------------------- | ------ | -------------------------------- |
| departments ↔ users             | 1:N    | 一个部门有多个用户               |
| departments ↔ departments       | 自关联 | 支持多级部门树                   |
| roles ↔ users                   | 1:N    | 一个角色对应多个用户             |
| roles ↔ permissions             | M:N    | 通过 role_permissions 中间表关联 |
| customers ↔ contacts            | 1:N    | 一个客户有多个联系人             |
| customers ↔ opportunities       | 1:N    | 一个客户有多个商机               |
| customers ↔ call_records        | 1:N    | 一个客户有多条通话记录           |
| customers ↔ visit_records       | 1:N    | 一个客户有多条拜访记录           |
| customers ↔ ai_analysis         | 1:N    | 一个客户有多条AI分析             |
| customers ↔ customer_tags       | 1:N    | 一个客户有多个标签               |
| customers ↔ customer_follow_ups | 1:N    | 一个客户有多条跟进记录           |
| opportunities ↔ contracts       | 1:N    | 一个商机可产生多份合同           |
| contracts ↔ payments            | 1:N    | 一份合同有多笔回款               |
| users ↔ sales_targets           | 1:N    | 一个用户有多条销售目标           |
| users ↔ operation_logs          | 1:N    | 一个用户产生多条操作日志         |

---

### 4.3 完整建表DDL

#### 4.3.1 基础模块

#### 表1：users（用户表）

```sql
CREATE TABLE `users` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '用户ID',
  `username`        VARCHAR(50)      NOT NULL                 COMMENT '登录用户名',
  `password_hash`   VARCHAR(255)     NOT NULL                 COMMENT '密码哈希值(bcrypt)',
  `real_name`       VARCHAR(50)      NOT NULL                 COMMENT '真实姓名',
  `phone`           VARCHAR(20)      NOT NULL                 COMMENT '手机号码',
  `email`           VARCHAR(100)     DEFAULT NULL             COMMENT '电子邮箱',
  `avatar_url`      VARCHAR(500)     DEFAULT NULL             COMMENT '头像URL',
  `gender`          TINYINT UNSIGNED DEFAULT 0                COMMENT '性别: 0-未知 1-男 2-女',
  `department_id`   BIGINT UNSIGNED  DEFAULT NULL             COMMENT '所属部门ID',
  `role_id`         BIGINT UNSIGNED  DEFAULT NULL             COMMENT '角色ID',
  `position`        VARCHAR(50)      DEFAULT NULL             COMMENT '职位',
  `employee_no`     VARCHAR(30)      DEFAULT NULL             COMMENT '工号',
  `is_active`       TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '是否启用: 0-禁用 1-启用',
  `last_login_at`   DATETIME         DEFAULT NULL             COMMENT '最后登录时间',
  `last_login_ip`   VARCHAR(45)      DEFAULT NULL             COMMENT '最后登录IP',
  `password_changed_at` DATETIME     DEFAULT NULL             COMMENT '密码最后修改时间',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`, `deleted_at`),
  UNIQUE KEY `uk_users_phone` (`phone`, `deleted_at`),
  UNIQUE KEY `uk_users_employee_no` (`employee_no`, `deleted_at`),
  KEY `idx_users_department_id` (`department_id`),
  KEY `idx_users_role_id` (`role_id`),
  KEY `idx_users_is_active` (`is_active`),
  KEY `idx_users_real_name` (`real_name`),
  KEY `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

#### 表2：roles（角色表）

```sql
CREATE TABLE `roles` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '角色ID',
  `name`            VARCHAR(50)      NOT NULL                 COMMENT '角色名称',
  `code`            VARCHAR(50)      NOT NULL                 COMMENT '角色编码',
  `description`     VARCHAR(255)     DEFAULT NULL             COMMENT '角色描述',
  `is_system`       TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '是否系统内置: 0-否 1-是',
  `is_active`       TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '是否启用: 0-禁用 1-启用',
  `sort_order`      INT              NOT NULL DEFAULT 0       COMMENT '排序号',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_code` (`code`, `deleted_at`),
  KEY `idx_roles_is_active` (`is_active`),
  KEY `idx_roles_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';
```

#### 表3：departments（部门表）

```sql
CREATE TABLE `departments` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '部门ID',
  `name`            VARCHAR(100)     NOT NULL                 COMMENT '部门名称',
  `code`            VARCHAR(50)      DEFAULT NULL             COMMENT '部门编码',
  `parent_id`       BIGINT UNSIGNED  DEFAULT NULL             COMMENT '上级部门ID (NULL表示顶级)',
  `leader_id`       BIGINT UNSIGNED  DEFAULT NULL             COMMENT '部门负责人用户ID',
  `level`           TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '层级深度',
  `path`            VARCHAR(500)     NOT NULL DEFAULT ''      COMMENT '层级路径(如 /1/3/7/)',
  `sort_order`      INT              NOT NULL DEFAULT 0       COMMENT '排序号',
  `is_active`       TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '是否启用: 0-禁用 1-启用',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_departments_code` (`code`, `deleted_at`),
  KEY `idx_departments_parent_id` (`parent_id`),
  KEY `idx_departments_leader_id` (`leader_id`),
  KEY `idx_departments_path` (`path`(100)),
  KEY `idx_departments_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';
```

#### 表4：permissions（权限表）

```sql
CREATE TABLE `permissions` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '权限ID',
  `name`            VARCHAR(100)     NOT NULL                 COMMENT '权限名称',
  `code`            VARCHAR(100)     NOT NULL                 COMMENT '权限编码(如 customer:list)',
  `module`          VARCHAR(50)      NOT NULL                 COMMENT '所属模块',
  `type`            TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '权限类型: 1-菜单 2-按钮 3-接口',
  `parent_id`       BIGINT UNSIGNED  DEFAULT NULL             COMMENT '父权限ID',
  `path`            VARCHAR(255)     DEFAULT NULL             COMMENT '前端路由路径',
  `icon`            VARCHAR(100)     DEFAULT NULL             COMMENT '菜单图标',
  `sort_order`      INT              NOT NULL DEFAULT 0       COMMENT '排序号',
  `is_active`       TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '是否启用: 0-禁用 1-启用',
  `description`     VARCHAR(255)     DEFAULT NULL             COMMENT '权限描述',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_code` (`code`, `deleted_at`),
  KEY `idx_permissions_module` (`module`),
  KEY `idx_permissions_parent_id` (`parent_id`),
  KEY `idx_permissions_type` (`type`),
  KEY `idx_permissions_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';
```

#### 表5：role_permissions（角色权限关联表）

```sql
CREATE TABLE `role_permissions` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '主键ID',
  `role_id`         BIGINT UNSIGNED  NOT NULL                 COMMENT '角色ID',
  `permission_id`   BIGINT UNSIGNED  NOT NULL                 COMMENT '权限ID',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permissions_role_perm` (`role_id`, `permission_id`),
  KEY `idx_role_permissions_permission_id` (`permission_id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';
```

#### 表6：operation_logs（操作日志表）

```sql
CREATE TABLE `operation_logs` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '日志ID',
  `user_id`         BIGINT UNSIGNED  DEFAULT NULL             COMMENT '操作用户ID',
  `user_name`       VARCHAR(50)      DEFAULT NULL             COMMENT '操作用户姓名(冗余)',
  `module`          VARCHAR(50)      NOT NULL                 COMMENT '操作模块',
  `action`          VARCHAR(50)      NOT NULL                 COMMENT '操作类型: CREATE/UPDATE/DELETE/QUERY/LOGIN/EXPORT',
  `target_type`     VARCHAR(50)      DEFAULT NULL             COMMENT '操作对象类型(表名)',
  `target_id`       BIGINT UNSIGNED  DEFAULT NULL             COMMENT '操作对象ID',
  `description`     VARCHAR(500)     DEFAULT NULL             COMMENT '操作描述',
  `request_method`  VARCHAR(10)      DEFAULT NULL             COMMENT '请求方法: GET/POST/PUT/DELETE',
  `request_url`     VARCHAR(500)     DEFAULT NULL             COMMENT '请求URL',
  `request_params`  JSON             DEFAULT NULL             COMMENT '请求参数(脱敏)',
  `response_code`   INT              DEFAULT NULL             COMMENT '响应状态码',
  `ip_address`      VARCHAR(45)      NOT NULL                 COMMENT '操作IP地址',
  `user_agent`      VARCHAR(500)     DEFAULT NULL             COMMENT '浏览器UA',
  `duration_ms`     INT UNSIGNED     DEFAULT NULL             COMMENT '请求耗时(毫秒)',
  `is_success`      TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '是否成功: 0-失败 1-成功',
  `error_msg`       TEXT             DEFAULT NULL             COMMENT '错误信息',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_operation_logs_user_id` (`user_id`),
  KEY `idx_operation_logs_module_action` (`module`, `action`),
  KEY `idx_operation_logs_target` (`target_type`, `target_id`),
  KEY `idx_operation_logs_created_at` (`created_at`),
  KEY `idx_operation_logs_is_success` (`is_success`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';
```

> **说明：** 操作日志为追加写入型数据，不设置 `updated_at` 和 `deleted_at` 字段，不做逻辑删除。建议按月份进行分区或归档。

#### 表7：system_configs（系统配置表）

```sql
CREATE TABLE `system_configs` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '配置ID',
  `config_group`    VARCHAR(50)      NOT NULL DEFAULT 'system' COMMENT '配置分组',
  `config_key`      VARCHAR(100)     NOT NULL                 COMMENT '配置键名',
  `config_value`    TEXT             DEFAULT NULL             COMMENT '配置值',
  `value_type`      VARCHAR(20)      NOT NULL DEFAULT 'string' COMMENT '值类型: string/number/boolean/json',
  `description`     VARCHAR(255)     DEFAULT NULL             COMMENT '配置描述',
  `is_public`       TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '是否前端可见: 0-否 1-是',
  `is_system`       TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '是否系统内置: 0-否 1-是(不可删除)',
  `sort_order`      INT              NOT NULL DEFAULT 0       COMMENT '排序号',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_system_configs_group_key` (`config_group`, `config_key`, `deleted_at`),
  KEY `idx_system_configs_group` (`config_group`),
  KEY `idx_system_configs_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';
```

#### 表8：dictionaries（数据字典表）

```sql
CREATE TABLE `dictionaries` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '字典ID',
  `dict_type`       VARCHAR(50)      NOT NULL                 COMMENT '字典类型编码(如 customer_level)',
  `dict_type_name`  VARCHAR(100)     NOT NULL                 COMMENT '字典类型名称(如 客户等级)',
  `dict_code`       VARCHAR(50)      NOT NULL                 COMMENT '字典项编码',
  `dict_label`      VARCHAR(100)     NOT NULL                 COMMENT '字典项显示标签',
  `dict_value`      VARCHAR(200)     DEFAULT NULL             COMMENT '字典项值',
  `parent_id`       BIGINT UNSIGNED  DEFAULT NULL             COMMENT '父字典项ID(支持级联)',
  `sort_order`      INT              NOT NULL DEFAULT 0       COMMENT '排序号',
  `css_class`       VARCHAR(100)     DEFAULT NULL             COMMENT '前端样式类名',
  `color`           VARCHAR(20)      DEFAULT NULL             COMMENT '标签颜色值',
  `is_default`      TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '是否默认选项: 0-否 1-是',
  `is_active`       TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '是否启用: 0-禁用 1-启用',
  `remark`          VARCHAR(255)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dictionaries_type_code` (`dict_type`, `dict_code`, `deleted_at`),
  KEY `idx_dictionaries_dict_type` (`dict_type`),
  KEY `idx_dictionaries_parent_id` (`parent_id`),
  KEY `idx_dictionaries_is_active` (`is_active`),
  KEY `idx_dictionaries_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据字典表';
```

---

#### 4.3.2 客户管理模块

#### 表9：customers（客户主表）

```sql
CREATE TABLE `customers` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '客户ID',
  `customer_no`     VARCHAR(30)      NOT NULL                 COMMENT '客户编号(自动生成)',
  `name`            VARCHAR(200)     NOT NULL                 COMMENT '客户名称(公司名)',
  `short_name`      VARCHAR(100)     DEFAULT NULL             COMMENT '客户简称',
  `customer_type`   TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '客户类型: 1-企业客户 2-个人客户',
  `level`           TINYINT UNSIGNED NOT NULL DEFAULT 3       COMMENT '客户等级: 1-S级 2-A级 3-B级 4-C级 5-D级',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '客户状态: 1-潜在客户 2-意向客户 3-成交客户 4-流失客户 5-黑名单',
  `source`          VARCHAR(30)      DEFAULT NULL             COMMENT '客户来源: 广告/转介绍/电话营销/网络/展会/其他',
  `industry`        VARCHAR(50)      DEFAULT NULL             COMMENT '所属行业',
  `scale`           VARCHAR(30)      DEFAULT NULL             COMMENT '企业规模',
  `annual_revenue`  DECIMAL(15,2)    DEFAULT NULL             COMMENT '年营收(万元)',
  `website`         VARCHAR(255)     DEFAULT NULL             COMMENT '公司网站',
  `province`        VARCHAR(30)      DEFAULT NULL             COMMENT '省份',
  `city`            VARCHAR(30)      DEFAULT NULL             COMMENT '城市',
  `district`        VARCHAR(30)      DEFAULT NULL             COMMENT '区县',
  `address`         VARCHAR(500)     DEFAULT NULL             COMMENT '详细地址',
  `owner_id`        BIGINT UNSIGNED  DEFAULT NULL             COMMENT '归属销售ID',
  `owner_name`      VARCHAR(50)      DEFAULT NULL             COMMENT '归属销售姓名(冗余)',
  `department_id`   BIGINT UNSIGNED  DEFAULT NULL             COMMENT '归属部门ID',
  `last_follow_at`  DATETIME         DEFAULT NULL             COMMENT '最后跟进时间',
  `next_follow_at`  DATETIME         DEFAULT NULL             COMMENT '下次跟进时间',
  `deal_amount`     DECIMAL(15,2)    DEFAULT 0.00             COMMENT '累计成交金额',
  `deal_count`      INT UNSIGNED     DEFAULT 0                COMMENT '累计成交次数',
  `remark`          TEXT             DEFAULT NULL             COMMENT '备注',
  `extra_fields`    JSON             DEFAULT NULL             COMMENT '扩展字段(自定义字段存储)',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customers_customer_no` (`customer_no`),
  KEY `idx_customers_name` (`name`(50)),
  KEY `idx_customers_owner_id` (`owner_id`),
  KEY `idx_customers_department_id` (`department_id`),
  KEY `idx_customers_level` (`level`),
  KEY `idx_customers_status` (`status`),
  KEY `idx_customers_source` (`source`),
  KEY `idx_customers_industry` (`industry`),
  KEY `idx_customers_province_city` (`province`, `city`),
  KEY `idx_customers_last_follow_at` (`last_follow_at`),
  KEY `idx_customers_created_at` (`created_at`),
  KEY `idx_customers_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户主表';
```

#### 表10：contacts（联系人表）

```sql
CREATE TABLE `contacts` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '联系人ID',
  `customer_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '所属客户ID',
  `name`            VARCHAR(50)      NOT NULL                 COMMENT '联系人姓名',
  `gender`          TINYINT UNSIGNED DEFAULT 0                COMMENT '性别: 0-未知 1-男 2-女',
  `phone`           VARCHAR(20)      DEFAULT NULL             COMMENT '手机号码',
  `telephone`       VARCHAR(20)      DEFAULT NULL             COMMENT '座机号码',
  `email`           VARCHAR(100)     DEFAULT NULL             COMMENT '电子邮箱',
  `position`        VARCHAR(50)      DEFAULT NULL             COMMENT '职务',
  `department`      VARCHAR(50)      DEFAULT NULL             COMMENT '部门',
  `is_primary`      TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '是否主要联系人: 0-否 1-是',
  `is_decision_maker` TINYINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '是否决策人: 0-否 1-是',
  `wechat`          VARCHAR(50)      DEFAULT NULL             COMMENT '微信号',
  `qq`              VARCHAR(20)      DEFAULT NULL             COMMENT 'QQ号',
  `birthday`        DATE             DEFAULT NULL             COMMENT '生日',
  `hobby`           VARCHAR(255)     DEFAULT NULL             COMMENT '兴趣爱好',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_contacts_customer_id` (`customer_id`),
  KEY `idx_contacts_name` (`name`),
  KEY `idx_contacts_phone` (`phone`),
  KEY `idx_contacts_is_primary` (`customer_id`, `is_primary`),
  KEY `idx_contacts_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_contacts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联系人表';
```

#### 表11：customer_follow_ups（客户跟进记录表）

```sql
CREATE TABLE `customer_follow_ups` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '跟进ID',
  `customer_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '客户ID',
  `contact_id`      BIGINT UNSIGNED  DEFAULT NULL             COMMENT '联系人ID',
  `user_id`         BIGINT UNSIGNED  NOT NULL                 COMMENT '跟进人ID',
  `user_name`       VARCHAR(50)      DEFAULT NULL             COMMENT '跟进人姓名(冗余)',
  `follow_type`     TINYINT UNSIGNED NOT NULL                 COMMENT '跟进方式: 1-电话 2-微信 3-邮件 4-拜访 5-会议 6-其他',
  `content`         TEXT             NOT NULL                 COMMENT '跟进内容',
  `follow_at`       DATETIME         NOT NULL                 COMMENT '跟进时间',
  `next_follow_at`  DATETIME         DEFAULT NULL             COMMENT '下次跟进时间',
  `next_follow_note` VARCHAR(500)    DEFAULT NULL             COMMENT '下次跟进备忘',
  `customer_feedback` VARCHAR(500)   DEFAULT NULL             COMMENT '客户反馈',
  `attachments`     JSON             DEFAULT NULL             COMMENT '附件列表(JSON数组)',
  `opportunity_id`  BIGINT UNSIGNED  DEFAULT NULL             COMMENT '关联商机ID',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_follow_ups_customer_id` (`customer_id`),
  KEY `idx_follow_ups_user_id` (`user_id`),
  KEY `idx_follow_ups_follow_at` (`follow_at`),
  KEY `idx_follow_ups_next_follow_at` (`next_follow_at`),
  KEY `idx_follow_ups_opportunity_id` (`opportunity_id`),
  KEY `idx_follow_ups_customer_follow_at` (`customer_id`, `follow_at`),
  KEY `idx_follow_ups_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_follow_ups_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_follow_ups_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表';
```

#### 表12：customer_tags（客户标签表）

```sql
CREATE TABLE `customer_tags` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '标签ID',
  `customer_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '客户ID',
  `tag_name`        VARCHAR(50)      NOT NULL                 COMMENT '标签名称',
  `tag_color`       VARCHAR(20)      DEFAULT '#1890ff'        COMMENT '标签颜色',
  `tag_category`    VARCHAR(50)      DEFAULT NULL             COMMENT '标签分类: 行业/规模/意向/自定义',
  `source`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '标签来源: 1-手动 2-AI自动',
  `created_by`      BIGINT UNSIGNED  DEFAULT NULL             COMMENT '创建人ID',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_tags_customer_tag` (`customer_id`, `tag_name`, `deleted_at`),
  KEY `idx_customer_tags_tag_name` (`tag_name`),
  KEY `idx_customer_tags_tag_category` (`tag_category`),
  KEY `idx_customer_tags_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_customer_tags_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户标签表';
```

---

#### 4.3.3 销售流程模块

#### 表13：opportunities（商机表）

```sql
CREATE TABLE `opportunities` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '商机ID',
  `opportunity_no`  VARCHAR(30)      NOT NULL                 COMMENT '商机编号(自动生成)',
  `name`            VARCHAR(200)     NOT NULL                 COMMENT '商机名称',
  `customer_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '客户ID',
  `customer_name`   VARCHAR(200)     DEFAULT NULL             COMMENT '客户名称(冗余)',
  `contact_id`      BIGINT UNSIGNED  DEFAULT NULL             COMMENT '主要联系人ID',
  `stage`           TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '商机阶段: 1-初步接触 2-需求确认 3-方案报价 4-商务谈判 5-合同签订 6-赢单 7-输单 8-无效',
  `stage_changed_at` DATETIME        DEFAULT NULL             COMMENT '阶段最后变更时间',
  `amount`          DECIMAL(15,2)    DEFAULT 0.00             COMMENT '预计金额(元)',
  `probability`     TINYINT UNSIGNED DEFAULT 0                COMMENT '赢单概率(%)',
  `expected_close_date` DATE         DEFAULT NULL             COMMENT '预计成交日期',
  `actual_close_date`   DATE         DEFAULT NULL             COMMENT '实际成交日期',
  `owner_id`        BIGINT UNSIGNED  NOT NULL                 COMMENT '负责销售ID',
  `owner_name`      VARCHAR(50)      DEFAULT NULL             COMMENT '负责销售姓名(冗余)',
  `department_id`   BIGINT UNSIGNED  DEFAULT NULL             COMMENT '归属部门ID',
  `source`          VARCHAR(30)      DEFAULT NULL             COMMENT '商机来源',
  `competitor`      VARCHAR(255)     DEFAULT NULL             COMMENT '竞争对手',
  `win_reason`      VARCHAR(500)     DEFAULT NULL             COMMENT '赢单原因',
  `lose_reason`     VARCHAR(500)     DEFAULT NULL             COMMENT '输单原因',
  `description`     TEXT             DEFAULT NULL             COMMENT '商机描述',
  `remark`          TEXT             DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_opportunities_no` (`opportunity_no`),
  KEY `idx_opportunities_customer_id` (`customer_id`),
  KEY `idx_opportunities_owner_id` (`owner_id`),
  KEY `idx_opportunities_department_id` (`department_id`),
  KEY `idx_opportunities_stage` (`stage`),
  KEY `idx_opportunities_expected_close` (`expected_close_date`),
  KEY `idx_opportunities_customer_stage` (`customer_id`, `stage`),
  KEY `idx_opportunities_owner_stage` (`owner_id`, `stage`),
  KEY `idx_opportunities_created_at` (`created_at`),
  KEY `idx_opportunities_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_opportunities_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_opportunities_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商机表';
```

#### 表14：contracts（合同表）

```sql
CREATE TABLE `contracts` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '合同ID',
  `contract_no`     VARCHAR(30)      NOT NULL                 COMMENT '合同编号(自动生成)',
  `name`            VARCHAR(200)     NOT NULL                 COMMENT '合同名称',
  `opportunity_id`  BIGINT UNSIGNED  DEFAULT NULL             COMMENT '关联商机ID',
  `customer_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '客户ID',
  `customer_name`   VARCHAR(200)     DEFAULT NULL             COMMENT '客户名称(冗余)',
  `contact_id`      BIGINT UNSIGNED  DEFAULT NULL             COMMENT '客户方签约联系人ID',
  `amount`          DECIMAL(15,2)    NOT NULL DEFAULT 0.00    COMMENT '合同总金额(元)',
  `paid_amount`     DECIMAL(15,2)    NOT NULL DEFAULT 0.00    COMMENT '已回款金额(元)',
  `unpaid_amount`   DECIMAL(15,2) GENERATED ALWAYS AS (`amount` - `paid_amount`) STORED COMMENT '未回款金额(元)',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '合同状态: 1-待审批 2-审批中 3-已签订 4-执行中 5-已完结 6-已终止 7-已作废',
  `contract_type`   TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '合同类型: 1-销售合同 2-服务合同 3-框架协议',
  `sign_date`       DATE             DEFAULT NULL             COMMENT '签订日期',
  `start_date`      DATE             DEFAULT NULL             COMMENT '合同开始日期',
  `end_date`        DATE             DEFAULT NULL             COMMENT '合同结束日期',
  `owner_id`        BIGINT UNSIGNED  NOT NULL                 COMMENT '负责销售ID',
  `owner_name`      VARCHAR(50)      DEFAULT NULL             COMMENT '负责销售姓名(冗余)',
  `department_id`   BIGINT UNSIGNED  DEFAULT NULL             COMMENT '归属部门ID',
  `our_signer`      VARCHAR(50)      DEFAULT NULL             COMMENT '我方签约人',
  `their_signer`    VARCHAR(50)      DEFAULT NULL             COMMENT '对方签约人',
  `discount_rate`   DECIMAL(5,2)     DEFAULT NULL             COMMENT '折扣率(%)',
  `attachment_urls`  JSON            DEFAULT NULL             COMMENT '合同附件URL列表(JSON)',
  `remark`          TEXT             DEFAULT NULL             COMMENT '备注',
  `approved_at`     DATETIME         DEFAULT NULL             COMMENT '审批通过时间',
  `approved_by`     BIGINT UNSIGNED  DEFAULT NULL             COMMENT '审批人ID',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contracts_no` (`contract_no`),
  KEY `idx_contracts_opportunity_id` (`opportunity_id`),
  KEY `idx_contracts_customer_id` (`customer_id`),
  KEY `idx_contracts_owner_id` (`owner_id`),
  KEY `idx_contracts_department_id` (`department_id`),
  KEY `idx_contracts_status` (`status`),
  KEY `idx_contracts_sign_date` (`sign_date`),
  KEY `idx_contracts_end_date` (`end_date`),
  KEY `idx_contracts_created_at` (`created_at`),
  KEY `idx_contracts_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_contracts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contracts_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_contracts_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同表';
```

#### 表15：payments（回款记录表）

```sql
CREATE TABLE `payments` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '回款ID',
  `payment_no`      VARCHAR(30)      NOT NULL                 COMMENT '回款编号(自动生成)',
  `contract_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '合同ID',
  `contract_no`     VARCHAR(30)      DEFAULT NULL             COMMENT '合同编号(冗余)',
  `customer_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '客户ID',
  `customer_name`   VARCHAR(200)     DEFAULT NULL             COMMENT '客户名称(冗余)',
  `opportunity_id`  BIGINT UNSIGNED  DEFAULT NULL             COMMENT '关联商机ID',
  `amount`          DECIMAL(15,2)    NOT NULL                 COMMENT '回款金额(元)',
  `payment_date`    DATE             NOT NULL                 COMMENT '回款日期',
  `payment_method`  TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '付款方式: 1-银行转账 2-支票 3-现金 4-支付宝 5-微信 6-其他',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '回款状态: 1-待确认 2-已确认 3-已驳回',
  `plan_date`       DATE             DEFAULT NULL             COMMENT '计划回款日期',
  `owner_id`        BIGINT UNSIGNED  NOT NULL                 COMMENT '负责销售ID',
  `confirmed_by`    BIGINT UNSIGNED  DEFAULT NULL             COMMENT '确认人ID',
  `confirmed_at`    DATETIME         DEFAULT NULL             COMMENT '确认时间',
  `bank_account`    VARCHAR(50)      DEFAULT NULL             COMMENT '收款银行账号',
  `bank_name`       VARCHAR(100)     DEFAULT NULL             COMMENT '收款银行名称',
  `transaction_no`  VARCHAR(100)     DEFAULT NULL             COMMENT '银行交易流水号',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `attachment_urls`  JSON            DEFAULT NULL             COMMENT '凭证附件(JSON)',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_no` (`payment_no`),
  KEY `idx_payments_contract_id` (`contract_id`),
  KEY `idx_payments_customer_id` (`customer_id`),
  KEY `idx_payments_owner_id` (`owner_id`),
  KEY `idx_payments_payment_date` (`payment_date`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_plan_date` (`plan_date`),
  KEY `idx_payments_created_at` (`created_at`),
  KEY `idx_payments_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_payments_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='回款记录表';
```

#### 表16：sales_targets（销售目标表）

```sql
CREATE TABLE `sales_targets` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '目标ID',
  `user_id`         BIGINT UNSIGNED  DEFAULT NULL             COMMENT '销售人员ID(NULL表示团队目标)',
  `user_name`       VARCHAR(50)      DEFAULT NULL             COMMENT '销售姓名(冗余)',
  `department_id`   BIGINT UNSIGNED  DEFAULT NULL             COMMENT '部门ID',
  `period_type`     TINYINT UNSIGNED NOT NULL                 COMMENT '周期类型: 1-月度 2-季度 3-年度',
  `year`            SMALLINT UNSIGNED NOT NULL                COMMENT '目标年份',
  `month`           TINYINT UNSIGNED DEFAULT NULL             COMMENT '目标月份(月度目标时必填)',
  `quarter`         TINYINT UNSIGNED DEFAULT NULL             COMMENT '目标季度(季度目标时必填): 1-4',
  `target_amount`   DECIMAL(15,2)    NOT NULL DEFAULT 0.00    COMMENT '目标金额(元)',
  `actual_amount`   DECIMAL(15,2)    NOT NULL DEFAULT 0.00    COMMENT '实际完成金额(元)',
  `completion_rate` DECIMAL(5,2)     DEFAULT 0.00             COMMENT '完成率(%)',
  `target_deals`    INT UNSIGNED     DEFAULT 0                COMMENT '目标成交数',
  `actual_deals`    INT UNSIGNED     DEFAULT 0                COMMENT '实际成交数',
  `target_new_customers` INT UNSIGNED DEFAULT 0               COMMENT '目标新增客户数',
  `actual_new_customers` INT UNSIGNED DEFAULT 0               COMMENT '实际新增客户数',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_targets_user_period` (`user_id`, `period_type`, `year`, `month`, `quarter`, `deleted_at`),
  KEY `idx_sales_targets_user_id` (`user_id`),
  KEY `idx_sales_targets_department_id` (`department_id`),
  KEY `idx_sales_targets_year_month` (`year`, `month`),
  KEY `idx_sales_targets_period_type` (`period_type`),
  KEY `idx_sales_targets_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_sales_targets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='销售目标表';
```

---

#### 4.3.4 呼叫中心模块

#### 表17：call_records（通话记录表）

```sql
CREATE TABLE `call_records` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '通话记录ID',
  `call_uuid`       VARCHAR(64)      NOT NULL                 COMMENT '通话唯一标识(对接CTI系统)',
  `call_type`       TINYINT UNSIGNED NOT NULL                 COMMENT '通话类型: 1-呼出 2-呼入',
  `caller_id`       BIGINT UNSIGNED  DEFAULT NULL             COMMENT '呼叫人ID(销售)',
  `caller_name`     VARCHAR(50)      DEFAULT NULL             COMMENT '呼叫人姓名(冗余)',
  `caller_number`   VARCHAR(20)      DEFAULT NULL             COMMENT '主叫号码',
  `callee_number`   VARCHAR(20)      NOT NULL                 COMMENT '被叫号码',
  `customer_id`     BIGINT UNSIGNED  DEFAULT NULL             COMMENT '客户ID',
  `customer_name`   VARCHAR(200)     DEFAULT NULL             COMMENT '客户名称(冗余)',
  `contact_id`      BIGINT UNSIGNED  DEFAULT NULL             COMMENT '联系人ID',
  `contact_name`    VARCHAR(50)      DEFAULT NULL             COMMENT '联系人姓名(冗余)',
  `call_task_id`    BIGINT UNSIGNED  DEFAULT NULL             COMMENT '外呼任务ID',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '通话状态: 1-振铃中 2-通话中 3-已完成 4-未接通 5-占线 6-关机 7-空号',
  `start_time`      DATETIME         NOT NULL                 COMMENT '通话开始时间',
  `answer_time`     DATETIME         DEFAULT NULL             COMMENT '接听时间',
  `end_time`        DATETIME         DEFAULT NULL             COMMENT '通话结束时间',
  `duration`        INT UNSIGNED     DEFAULT 0                COMMENT '通话时长(秒)',
  `ring_duration`   INT UNSIGNED     DEFAULT 0                COMMENT '振铃时长(秒)',
  `recording_url`   VARCHAR(500)     DEFAULT NULL             COMMENT '录音文件URL',
  `recording_size`  INT UNSIGNED     DEFAULT NULL             COMMENT '录音文件大小(字节)',
  `satisfaction`    TINYINT UNSIGNED DEFAULT NULL             COMMENT '客户满意度: 1-非常不满 2-不满意 3-一般 4-满意 5-非常满意',
  `summary`         TEXT             DEFAULT NULL             COMMENT '通话小结(人工填写)',
  `ai_summary`      TEXT             DEFAULT NULL             COMMENT 'AI通话摘要(自动生成)',
  `ai_sentiment`    VARCHAR(20)      DEFAULT NULL             COMMENT 'AI情感分析结果: positive/negative/neutral',
  `ai_keywords`     JSON             DEFAULT NULL             COMMENT 'AI提取关键词(JSON)',
  `next_action`     VARCHAR(500)     DEFAULT NULL             COMMENT '下一步行动',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_call_records_uuid` (`call_uuid`),
  KEY `idx_call_records_caller_id` (`caller_id`),
  KEY `idx_call_records_customer_id` (`customer_id`),
  KEY `idx_call_records_contact_id` (`contact_id`),
  KEY `idx_call_records_call_task_id` (`call_task_id`),
  KEY `idx_call_records_callee_number` (`callee_number`),
  KEY `idx_call_records_status` (`status`),
  KEY `idx_call_records_start_time` (`start_time`),
  KEY `idx_call_records_call_type_start` (`call_type`, `start_time`),
  KEY `idx_call_records_caller_start` (`caller_id`, `start_time`),
  KEY `idx_call_records_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_call_records_caller` FOREIGN KEY (`caller_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_call_records_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通话记录表';
```

#### 表18：call_tasks（外呼任务表）

```sql
CREATE TABLE `call_tasks` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '任务ID',
  `name`            VARCHAR(200)     NOT NULL                 COMMENT '任务名称',
  `description`     TEXT             DEFAULT NULL             COMMENT '任务描述',
  `creator_id`      BIGINT UNSIGNED  NOT NULL                 COMMENT '创建人ID',
  `creator_name`    VARCHAR(50)      DEFAULT NULL             COMMENT '创建人姓名(冗余)',
  `assignee_ids`    JSON             DEFAULT NULL             COMMENT '分配销售ID列表(JSON)',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '任务状态: 1-待开始 2-进行中 3-已暂停 4-已完成 5-已取消',
  `priority`        TINYINT UNSIGNED NOT NULL DEFAULT 2       COMMENT '优先级: 1-高 2-中 3-低',
  `task_type`       TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '任务类型: 1-手动外呼 2-预览式外呼 3-预测式外呼',
  `customer_filter` JSON             DEFAULT NULL             COMMENT '客户筛选条件(JSON)',
  `total_count`     INT UNSIGNED     NOT NULL DEFAULT 0       COMMENT '总客户数',
  `completed_count` INT UNSIGNED     NOT NULL DEFAULT 0       COMMENT '已完成数',
  `connected_count` INT UNSIGNED     NOT NULL DEFAULT 0       COMMENT '已接通数',
  `start_time`      DATETIME         DEFAULT NULL             COMMENT '任务开始时间',
  `end_time`        DATETIME         DEFAULT NULL             COMMENT '任务结束时间',
  `scheduled_start` DATETIME         DEFAULT NULL             COMMENT '计划开始时间',
  `scheduled_end`   DATETIME         DEFAULT NULL             COMMENT '计划结束时间',
  `call_script`     TEXT             DEFAULT NULL             COMMENT '话术脚本',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_call_tasks_creator_id` (`creator_id`),
  KEY `idx_call_tasks_status` (`status`),
  KEY `idx_call_tasks_priority` (`priority`),
  KEY `idx_call_tasks_scheduled_start` (`scheduled_start`),
  KEY `idx_call_tasks_created_at` (`created_at`),
  KEY `idx_call_tasks_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_call_tasks_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外呼任务表';
```

---

#### 4.3.5 AI分析模块

#### 表19：ai_analysis（AI分析结果表）

```sql
CREATE TABLE `ai_analysis` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '分析ID',
  `analysis_no`     VARCHAR(30)      NOT NULL                 COMMENT '分析编号(自动生成)',
  `analysis_type`   TINYINT UNSIGNED NOT NULL                 COMMENT '分析类型: 1-客户画像 2-成交预测 3-流失预警 4-通话分析 5-销售建议 6-市场趋势 7-情感分析',
  `target_type`     VARCHAR(30)      NOT NULL                 COMMENT '分析对象类型: customer/opportunity/call_record/user',
  `target_id`       BIGINT UNSIGNED  NOT NULL                 COMMENT '分析对象ID',
  `customer_id`     BIGINT UNSIGNED  DEFAULT NULL             COMMENT '关联客户ID(方便按客户查询)',
  `model_name`      VARCHAR(50)      DEFAULT NULL             COMMENT 'AI模型名称',
  `model_version`   VARCHAR(20)      DEFAULT NULL             COMMENT 'AI模型版本',
  `input_data`      JSON             DEFAULT NULL             COMMENT '输入数据摘要(JSON)',
  `result_data`     JSON             NOT NULL                 COMMENT '分析结果(JSON)',
  `score`           DECIMAL(5,2)     DEFAULT NULL             COMMENT '综合评分(0-100)',
  `confidence`      DECIMAL(5,4)     DEFAULT NULL             COMMENT '置信度(0-1)',
  `risk_level`      TINYINT UNSIGNED DEFAULT NULL             COMMENT '风险等级: 1-低 2-中 3-高 4-极高',
  `summary`         TEXT             DEFAULT NULL             COMMENT '分析结论文本摘要',
  `recommendations` JSON             DEFAULT NULL             COMMENT 'AI建议列表(JSON)',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '状态: 1-分析中 2-已完成 3-已失败 4-已过期',
  `error_msg`       TEXT             DEFAULT NULL             COMMENT '失败原因',
  `analyzed_at`     DATETIME         DEFAULT NULL             COMMENT '分析完成时间',
  `expires_at`      DATETIME         DEFAULT NULL             COMMENT '结果过期时间',
  `triggered_by`    TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '触发方式: 1-手动 2-定时 3-事件驱动',
  `triggered_user_id` BIGINT UNSIGNED DEFAULT NULL            COMMENT '触发用户ID(手动触发时)',
  `execution_ms`    INT UNSIGNED     DEFAULT NULL             COMMENT '执行耗时(毫秒)',
  `token_usage`     INT UNSIGNED     DEFAULT NULL             COMMENT 'AI Token消耗量',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ai_analysis_no` (`analysis_no`),
  KEY `idx_ai_analysis_type` (`analysis_type`),
  KEY `idx_ai_analysis_target` (`target_type`, `target_id`),
  KEY `idx_ai_analysis_customer_id` (`customer_id`),
  KEY `idx_ai_analysis_status` (`status`),
  KEY `idx_ai_analysis_score` (`score`),
  KEY `idx_ai_analysis_risk_level` (`risk_level`),
  KEY `idx_ai_analysis_analyzed_at` (`analyzed_at`),
  KEY `idx_ai_analysis_type_target_date` (`analysis_type`, `target_type`, `analyzed_at`),
  KEY `idx_ai_analysis_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_ai_analysis_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI分析结果表';
```

---

#### 4.3.6 信息管理模块

#### 表20：knowledge_articles（知识库文章表）

```sql
CREATE TABLE `knowledge_articles` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '文章ID',
  `title`           VARCHAR(200)     NOT NULL                 COMMENT '文章标题',
  `category`        VARCHAR(50)      NOT NULL                 COMMENT '分类: 产品知识/销售话术/常见问题/行业资讯/培训材料/公司规范',
  `sub_category`    VARCHAR(50)      DEFAULT NULL             COMMENT '子分类',
  `content`         LONGTEXT         NOT NULL                 COMMENT '文章内容(富文本/Markdown)',
  `content_type`    TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '内容格式: 1-富文本 2-Markdown',
  `summary`         VARCHAR(500)     DEFAULT NULL             COMMENT '文章摘要',
  `tags`            JSON             DEFAULT NULL             COMMENT '文章标签(JSON)',
  `cover_image_url` VARCHAR(500)     DEFAULT NULL             COMMENT '封面图URL',
  `attachment_urls`  JSON            DEFAULT NULL             COMMENT '附件列表(JSON)',
  `author_id`       BIGINT UNSIGNED  NOT NULL                 COMMENT '作者ID',
  `author_name`     VARCHAR(50)      DEFAULT NULL             COMMENT '作者姓名(冗余)',
  `reviewer_id`     BIGINT UNSIGNED  DEFAULT NULL             COMMENT '审核人ID',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '状态: 1-草稿 2-待审核 3-已发布 4-已下架',
  `is_top`          TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '是否置顶: 0-否 1-是',
  `is_recommend`    TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '是否推荐: 0-否 1-是',
  `view_count`      INT UNSIGNED     NOT NULL DEFAULT 0       COMMENT '浏览次数',
  `like_count`      INT UNSIGNED     NOT NULL DEFAULT 0       COMMENT '点赞次数',
  `published_at`    DATETIME         DEFAULT NULL             COMMENT '发布时间',
  `sort_order`      INT              NOT NULL DEFAULT 0       COMMENT '排序号',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_knowledge_articles_category` (`category`, `sub_category`),
  KEY `idx_knowledge_articles_author_id` (`author_id`),
  KEY `idx_knowledge_articles_status` (`status`),
  KEY `idx_knowledge_articles_is_top` (`is_top`, `sort_order`),
  KEY `idx_knowledge_articles_published_at` (`published_at`),
  KEY `idx_knowledge_articles_created_at` (`created_at`),
  KEY `idx_knowledge_articles_deleted_at` (`deleted_at`),
  FULLTEXT KEY `ft_knowledge_articles_title_content` (`title`, `content`) WITH PARSER ngram,
  CONSTRAINT `fk_knowledge_articles_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库文章表';
```

---

#### 4.3.7 拜访管理

#### 表21：visit_records（拜访记录表）

```sql
CREATE TABLE `visit_records` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT  COMMENT '拜访ID',
  `visit_no`        VARCHAR(30)      NOT NULL                 COMMENT '拜访编号(自动生成)',
  `customer_id`     BIGINT UNSIGNED  NOT NULL                 COMMENT '客户ID',
  `customer_name`   VARCHAR(200)     DEFAULT NULL             COMMENT '客户名称(冗余)',
  `contact_id`      BIGINT UNSIGNED  DEFAULT NULL             COMMENT '对接联系人ID',
  `contact_name`    VARCHAR(50)      DEFAULT NULL             COMMENT '联系人姓名(冗余)',
  `visitor_id`      BIGINT UNSIGNED  NOT NULL                 COMMENT '拜访人ID(销售)',
  `visitor_name`    VARCHAR(50)      DEFAULT NULL             COMMENT '拜访人姓名(冗余)',
  `companions`      JSON             DEFAULT NULL             COMMENT '同行人员(JSON: [{id, name}])',
  `visit_type`      TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '拜访类型: 1-初次拜访 2-日常拜访 3-商务拜访 4-售后拜访 5-技术交流',
  `visit_date`      DATE             NOT NULL                 COMMENT '拜访日期',
  `start_time`      TIME             DEFAULT NULL             COMMENT '拜访开始时间',
  `end_time`        TIME             DEFAULT NULL             COMMENT '拜访结束时间',
  `address`         VARCHAR(500)     DEFAULT NULL             COMMENT '拜访地点',
  `longitude`       DECIMAL(10,7)    DEFAULT NULL             COMMENT '签到经度',
  `latitude`        DECIMAL(10,7)    DEFAULT NULL             COMMENT '签到纬度',
  `check_in_at`     DATETIME         DEFAULT NULL             COMMENT '签到时间',
  `check_in_address` VARCHAR(500)    DEFAULT NULL             COMMENT '签到地址(GPS反解析)',
  `check_in_photo`  VARCHAR(500)     DEFAULT NULL             COMMENT '签到照片URL',
  `purpose`         VARCHAR(500)     NOT NULL                 COMMENT '拜访目的',
  `content`         TEXT             DEFAULT NULL             COMMENT '拜访内容/纪要',
  `result`          TEXT             DEFAULT NULL             COMMENT '拜访结果',
  `customer_feedback` TEXT           DEFAULT NULL             COMMENT '客户反馈',
  `next_plan`       VARCHAR(500)     DEFAULT NULL             COMMENT '下一步计划',
  `next_visit_date` DATE             DEFAULT NULL             COMMENT '下次拜访日期',
  `opportunity_id`  BIGINT UNSIGNED  DEFAULT NULL             COMMENT '关联商机ID',
  `status`          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '拜访状态: 1-已计划 2-进行中 3-已完成 4-已取消',
  `approval_status` TINYINT UNSIGNED NOT NULL DEFAULT 0       COMMENT '审批状态: 0-无需审批 1-待审批 2-已通过 3-已驳回',
  `approved_by`     BIGINT UNSIGNED  DEFAULT NULL             COMMENT '审批人ID',
  `approved_at`     DATETIME         DEFAULT NULL             COMMENT '审批时间',
  `photo_urls`      JSON             DEFAULT NULL             COMMENT '现场照片(JSON)',
  `attachment_urls`  JSON            DEFAULT NULL             COMMENT '附件列表(JSON)',
  `remark`          VARCHAR(500)     DEFAULT NULL             COMMENT '备注',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP              COMMENT '创建时间',
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at`      DATETIME         DEFAULT NULL             COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_visit_records_no` (`visit_no`),
  KEY `idx_visit_records_customer_id` (`customer_id`),
  KEY `idx_visit_records_visitor_id` (`visitor_id`),
  KEY `idx_visit_records_visit_date` (`visit_date`),
  KEY `idx_visit_records_status` (`status`),
  KEY `idx_visit_records_opportunity_id` (`opportunity_id`),
  KEY `idx_visit_records_visitor_date` (`visitor_id`, `visit_date`),
  KEY `idx_visit_records_customer_date` (`customer_id`, `visit_date`),
  KEY `idx_visit_records_created_at` (`created_at`),
  KEY `idx_visit_records_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_visit_records_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_visit_records_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='拜访记录表';
```

---

### 4.4 索引设计

#### 4.4.1 各表核心索引一览

| 表名                    | 索引名                              | 索引类型  | 涉及字段                                | 业务场景           |
| ----------------------- | ----------------------------------- | --------- | --------------------------------------- | ------------------ |
| **users**               | uk_users_username                   | UNIQUE    | username, deleted_at                    | 登录查询           |
|                         | uk_users_phone                      | UNIQUE    | phone, deleted_at                       | 手机号唯一性       |
|                         | idx_users_department_id             | NORMAL    | department_id                           | 按部门查人         |
|                         | idx_users_role_id                   | NORMAL    | role_id                                 | 按角色查人         |
| **roles**               | uk_roles_code                       | UNIQUE    | code, deleted_at                        | 角色编码唯一性     |
| **departments**         | idx_departments_path                | PREFIX    | path(100)                               | 部门树查询         |
|                         | idx_departments_parent_id           | NORMAL    | parent_id                               | 子部门查询         |
| **permissions**         | uk_permissions_code                 | UNIQUE    | code, deleted_at                        | 权限编码唯一性     |
|                         | idx_permissions_module              | NORMAL    | module                                  | 按模块查权限       |
| **role_permissions**    | uk_role_permissions_role_perm       | UNIQUE    | role_id, permission_id                  | 防止重复授权       |
| **operation_logs**      | idx_operation_logs_module_action    | COMPOSITE | module, action                          | 按模块统计         |
|                         | idx_operation_logs_created_at       | NORMAL    | created_at                              | 时间范围查询       |
|                         | idx_operation_logs_target           | COMPOSITE | target_type, target_id                  | 查对象操作历史     |
| **customers**           | uk_customers_customer_no            | UNIQUE    | customer_no                             | 客户编号查询       |
|                         | idx_customers_owner_id              | NORMAL    | owner_id                                | 我的客户列表       |
|                         | idx_customers_province_city         | COMPOSITE | province, city                          | 按地区筛选         |
|                         | idx_customers_level                 | NORMAL    | level                                   | 按等级筛选         |
|                         | idx_customers_status                | NORMAL    | status                                  | 按状态筛选         |
|                         | idx_customers_last_follow_at        | NORMAL    | last_follow_at                          | 未跟进预警         |
| **contacts**            | idx_contacts_customer_id            | NORMAL    | customer_id                             | 查客户联系人       |
|                         | idx_contacts_is_primary             | COMPOSITE | customer_id, is_primary                 | 查主要联系人       |
| **customer_follow_ups** | idx_follow_ups_customer_follow_at   | COMPOSITE | customer_id, follow_at                  | 客户跟进时间线     |
|                         | idx_follow_ups_next_follow_at       | NORMAL    | next_follow_at                          | 跟进提醒           |
| **opportunities**       | idx_opportunities_customer_stage    | COMPOSITE | customer_id, stage                      | 客户商机管线       |
|                         | idx_opportunities_owner_stage       | COMPOSITE | owner_id, stage                         | 我的商机管线       |
|                         | idx_opportunities_expected_close    | NORMAL    | expected_close_date                     | 预计成交排序       |
| **contracts**           | uk_contracts_no                     | UNIQUE    | contract_no                             | 合同编号查询       |
|                         | idx_contracts_customer_id           | NORMAL    | customer_id                             | 客户合同列表       |
|                         | idx_contracts_end_date              | NORMAL    | end_date                                | 到期预警           |
| **payments**            | idx_payments_contract_id            | NORMAL    | contract_id                             | 合同回款明细       |
|                         | idx_payments_payment_date           | NORMAL    | payment_date                            | 回款日报/月报      |
| **call_records**        | uk_call_records_uuid                | UNIQUE    | call_uuid                               | CTI系统对接        |
|                         | idx_call_records_call_type_start    | COMPOSITE | call_type, start_time                   | 呼入/呼出统计      |
|                         | idx_call_records_caller_start       | COMPOSITE | caller_id, start_time                   | 销售通话统计       |
| **ai_analysis**         | idx_ai_analysis_type_target_date    | COMPOSITE | analysis_type, target_type, analyzed_at | 分析结果时间线查询 |
|                         | idx_ai_analysis_risk_level          | NORMAL    | risk_level                              | 风险预警查询       |
| **visit_records**       | idx_visit_records_visitor_date      | COMPOSITE | visitor_id, visit_date                  | 我的拜访日历       |
|                         | idx_visit_records_customer_date     | COMPOSITE | customer_id, visit_date                 | 客户拜访历史       |
| **knowledge_articles**  | ft_knowledge_articles_title_content | FULLTEXT  | title, content                          | 全文搜索           |

#### 4.4.2 联合索引设计说明

**1. 覆盖高频列表查询**

```sql
-- 商机看板: 按销售+阶段分组统计
-- 联合索引 idx_opportunities_owner_stage (owner_id, stage)
-- 查询可直接在索引上完成分组计数，无需回表
SELECT stage, COUNT(*) FROM opportunities
WHERE owner_id = ? AND deleted_at IS NULL GROUP BY stage;
```

**2. 最左前缀原则应用**

```sql
-- idx_customers_province_city (province, city)
-- 以下查询均可命中该索引:
SELECT * FROM customers WHERE province = '浙江省';                     -- 命中
SELECT * FROM customers WHERE province = '浙江省' AND city = '杭州市'; -- 命中
SELECT * FROM customers WHERE city = '杭州市';                         -- 不命中(缺少最左前缀)
```

**3. 时间范围 + 状态的联合索引**

```sql
-- idx_call_records_call_type_start (call_type, start_time)
-- 将等值条件(call_type)放在前面，范围条件(start_time)放在后面
SELECT * FROM call_records
WHERE call_type = 1 AND start_time BETWEEN '2026-03-01' AND '2026-03-31';
```

**4. 软删除字段在唯一索引中的作用**

```sql
-- uk_users_username (username, deleted_at)
-- 加入 deleted_at 允许同一 username 被软删除后重新注册
-- 未删除记录 deleted_at = NULL, 每个 username 仅一条 NULL 记录(MySQL 中 NULL 不等于 NULL)
```

#### 4.4.3 索引使用注意事项

1. **避免在索引列上使用函数或运算**

   ```sql
   -- 错误: 无法命中 idx_customers_created_at
   SELECT * FROM customers WHERE YEAR(created_at) = 2026;
   -- 正确: 转换为范围查询
   SELECT * FROM customers WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
   ```

2. **避免隐式类型转换**

   ```sql
   -- 错误: phone 为 VARCHAR，传入数字导致全表扫描
   SELECT * FROM contacts WHERE phone = 13800138000;
   -- 正确: 保持类型一致
   SELECT * FROM contacts WHERE phone = '13800138000';
   ```

3. **LIKE 前缀匹配才走索引**

   ```sql
   -- 命中索引
   SELECT * FROM customers WHERE name LIKE '阿里%';
   -- 不命中索引(全表扫描)
   SELECT * FROM customers WHERE name LIKE '%阿里%';
   -- 模糊搜索建议使用 FULLTEXT 索引或 Elasticsearch
   ```

4. **JSON 字段索引策略**
   - MySQL 8.0 支持在 JSON 字段上创建虚拟生成列并建立索引
   - 对于高频查询的 JSON 内部字段，推荐使用此方案：

   ```sql
   -- 示例: 对 ai_analysis.result_data 中的 risk_score 创建索引
   ALTER TABLE ai_analysis
     ADD COLUMN risk_score_virtual DECIMAL(5,2)
     GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(result_data, '$.risk_score'))) VIRTUAL,
     ADD KEY idx_ai_analysis_risk_score (risk_score_virtual);
   ```

5. **大表分页优化**

   ```sql
   -- 深分页性能差
   SELECT * FROM operation_logs ORDER BY id DESC LIMIT 100000, 20;
   -- 推荐使用游标分页(基于上一页最后一条记录的ID)
   SELECT * FROM operation_logs WHERE id < 900000 ORDER BY id DESC LIMIT 20;
   ```

6. **定期审查索引使用情况**
   ```sql
   -- 查询未使用的索引(MySQL 8.0 performance_schema)
   SELECT object_schema, object_name, index_name
   FROM performance_schema.table_io_waits_summary_by_index_usage
   WHERE index_name IS NOT NULL AND count_star = 0
     AND object_schema = 'crm_db';
   ```

---

### 4.5 数据库迁移策略

#### 4.5.1 TypeORM Migration 使用规范

**1. 项目配置（ormconfig / DataSource）**

```typescript
// src/config/database.config.ts
import { DataSource, DataSourceOptions } from "typeorm";

export const dataSourceOptions: DataSourceOptions = {
  type: "mysql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || "ai_crm",
  charset: "utf8mb4",
  timezone: "+08:00",
  entities: ["dist/modules/**/*.entity.{js,ts}"],
  migrations: ["dist/database/migrations/*.{js,ts}"],
  migrationsTableName: "typeorm_migrations",
  synchronize: false, // 生产环境必须为 false
  logging:
    process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  extra: {
    connectionLimit: 20, // 连接池大小
    waitForConnections: true,
    queueLimit: 0,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
```

**2. Entity 定义规范**

```typescript
// src/modules/customer/entities/customer.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("customers")
@Index("idx_customers_owner_id", ["ownerId"])
@Index("idx_customers_province_city", ["province", "city"])
export class Customer {
  @PrimaryGeneratedColumn({ type: "bigint", unsigned: true, comment: "客户ID" })
  id: string; // bigint 在 TypeORM 中映射为 string

  @Column({
    name: "customer_no",
    type: "varchar",
    length: 30,
    unique: true,
    comment: "客户编号",
  })
  customerNo: string;

  @Column({ type: "varchar", length: 200, comment: "客户名称" })
  name: string;

  @Column({
    name: "customer_type",
    type: "tinyint",
    unsigned: true,
    default: 1,
    comment: "客户类型",
  })
  customerType: number;

  @Column({ type: "tinyint", unsigned: true, default: 3, comment: "客户等级" })
  level: number;

  @Column({ type: "tinyint", unsigned: true, default: 1, comment: "客户状态" })
  status: number;

  @Column({
    name: "owner_id",
    type: "bigint",
    unsigned: true,
    nullable: true,
    comment: "归属销售ID",
  })
  ownerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @OneToMany(() => Contact, (contact) => contact.customer)
  contacts: Contact[];

  @OneToMany(() => Opportunity, (opp) => opp.customer)
  opportunities: Opportunity[];

  // ... 其他字段省略

  @CreateDateColumn({ name: "created_at", comment: "创建时间" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", comment: "更新时间" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", comment: "软删除时间" })
  deletedAt: Date;
}
```

**3. Migration 生成与执行命令**

```bash
# 根据 Entity 变更自动生成迁移文件
npx typeorm migration:generate -d src/config/database.config.ts src/database/migrations/AddCustomerFields

# 手动创建空迁移文件（用于数据迁移、索引调整等）
npx typeorm migration:create src/database/migrations/SeedInitialDictionaries

# 执行所有未运行的迁移
npx typeorm migration:run -d src/config/database.config.ts

# 回滚最近一次迁移
npx typeorm migration:revert -d src/config/database.config.ts

# 查看已运行的迁移列表
npx typeorm migration:show -d src/config/database.config.ts
```

**4. Migration 文件编写规范**

```typescript
// src/database/migrations/1709500000000-CreateCustomersTable.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomersTable1709500000000 implements MigrationInterface {
  name = "CreateCustomersTable1709500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`customers\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '客户ID',
        \`customer_no\` VARCHAR(30) NOT NULL COMMENT '客户编号',
        \`name\` VARCHAR(200) NOT NULL COMMENT '客户名称',
        -- ... 完整建表语句 ...
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_customers_customer_no\` (\`customer_no\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户主表';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`customers\``);
  }
}
```

#### 4.5.2 迁移文件命名规范

**命名格式：** `{timestamp}-{操作描述}.ts`

| 操作类型   | 命名示例                                      | 说明       |
| ---------- | --------------------------------------------- | ---------- |
| 建表       | `1709500000000-CreateCustomersTable.ts`       | 新建数据表 |
| 修改表结构 | `1709500100000-AddPhoneColumnToCustomers.ts`  | 添加字段   |
| 删除字段   | `1709500200000-DropObsoleteFieldFromUsers.ts` | 删除字段   |
| 创建索引   | `1709500300000-AddIndexOnCustomersLevel.ts`   | 新建索引   |
| 数据迁移   | `1709500400000-MigrateCustomerLevelData.ts`   | 数据转换   |
| 初始化数据 | `1709500500000-SeedRolesAndPermissions.ts`    | 种子数据   |
| 修改索引   | `1709500600000-OptimizeCallRecordsIndexes.ts` | 索引优化   |

**命名规则说明：**

- 时间戳由 TypeORM 自动生成（Unix 毫秒时间戳），保证执行顺序
- 操作描述使用大驼峰命名（PascalCase）
- 描述中包含操作动词：`Create`、`Add`、`Drop`、`Alter`、`Seed`、`Migrate`、`Optimize`
- 描述中包含目标表名，便于快速识别影响范围

#### 4.5.3 版本管理与回滚方案

**1. 分环境迁移策略**

| 环境                 | 策略                                | 说明                              |
| -------------------- | ----------------------------------- | --------------------------------- |
| 开发环境 (dev)       | 可使用 `synchronize: true` 快速迭代 | 仅限个人开发库，禁止用于共享环境  |
| 测试环境 (test)      | 执行 migration                      | 验证迁移脚本的正确性和可回滚性    |
| 预发布环境 (staging) | 执行 migration                      | 与生产环境完全一致的验证          |
| 生产环境 (prod)      | 执行 migration + 人工审批           | 必须经过 DBA 审核，选择低峰期执行 |

**2. 迁移执行流程**

```
开发人员编写 Migration
       ↓
代码审查 (Code Review)
       ↓
合并到 develop 分支
       ↓
测试环境自动执行迁移 (CI/CD)
       ↓
QA 验证功能 + 数据完整性
       ↓
合并到 release 分支
       ↓
预发布环境执行迁移
       ↓
DBA 审核生产迁移脚本
       ↓
选择低峰期执行生产迁移
       ↓
监控验证 + 回滚准备
```

**3. 回滚方案**

```typescript
// 每个 migration 必须实现 down() 方法，确保可回滚
export class AddColumnExample implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN wechat VARCHAR(50) COMMENT '微信号'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN wechat`);
  }
}
```

**回滚注意事项：**

- 所有 migration 的 `down()` 方法必须经过测试验证
- 涉及数据删除的回滚需要提前做好数据备份
- 不可逆操作（如删除列）在 `down()` 中应给出明确警告注释
- 生产环境回滚前必须先在 staging 环境验证

**4. 大表DDL变更方案**

对于数据量超过 100 万行的大表，直接 `ALTER TABLE` 可能导致长时间锁表。推荐使用以下方案：

```bash
# 方案一: 使用 pt-online-schema-change (Percona Toolkit)
pt-online-schema-change \
  --alter "ADD COLUMN wechat VARCHAR(50) COMMENT '微信号'" \
  --host=127.0.0.1 --port=3306 --user=root \
  --ask-pass \
  D=ai_crm,t=customers \
  --execute

# 方案二: 使用 gh-ost (GitHub Online Schema Change)
gh-ost \
  --host=127.0.0.1 --port=3306 --user=root --ask-pass \
  --database=ai_crm --table=customers \
  --alter="ADD COLUMN wechat VARCHAR(50) COMMENT '微信号'" \
  --execute
```

**5. 数据备份策略**

| 备份类型           | 频率            | 保留周期       | 工具                   |
| ------------------ | --------------- | -------------- | ---------------------- |
| 全量备份           | 每日凌晨 2:00   | 30 天          | 阿里云 RDS 自动备份    |
| 增量备份（Binlog） | 实时            | 7 天           | 阿里云 RDS 自动备份    |
| 迁移前手动备份     | 每次 DDL 变更前 | 至迁移验证通过 | mysqldump / xtrabackup |
| 跨区域备份         | 每日            | 15 天          | 阿里云 RDS 跨区域备份  |

```bash
# 迁移前手动备份示例
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS \
  --single-transaction --routines --triggers \
  ai_crm > backup_ai_crm_$(date +%Y%m%d_%H%M%S).sql
```

---

以上即为 AI 智能 CRM 销售管理系统数据库详细设计的完整第 4 章内容。全部 21 张表的 DDL 覆盖了基础模块（用户/角色/部门/权限/日志/配置/字典）、客户管理模块（客户/联系人/跟进/标签）、销售流程模块（商机/合同/回款/目标）、呼叫中心模块（通话记录/外呼任务）、AI 分析模块、信息管理模块（知识库）、以及拜访管理模块。所有 DDL 语句均适用于 MySQL 8.0，字段类型、索引设计、外键约束、软删除机制、审计字段均已完整定义。TypeORM 迁移策略部分提供了从开发到生产的全流程规范，配合阿里云 RDS 的备份能力，确保数据库变更的安全性与可追溯性。
