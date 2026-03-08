## 5. 客户管理中心详细设计

### 5.1 功能架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              客户管理中心                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ 客户信息管理  │  │ 客户分级分类  │  │  客户公海池   │  │  客户查重    │        │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤        │
│  │·企业客户建档  │  │·行业分类     │  │·公海池列表    │  │·手动查重     │        │
│  │·个人客户建档  │  │·规模分级     │  │·领取规则     │  │·自动查重     │        │
│  │·自定义字段   │  │·区域划分     │  │·分配规则     │  │·合并处理     │        │
│  │·客户详情     │  │·意向等级     │  │·回收规则     │  │·撞单检测     │        │
│  │·客户编辑     │  │·信用评级     │  │·保护期管理    │  │·匹配策略配置  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  联系人管理   │  │  跟进记录    │  │  客户标签     │  │ 客户导入导出  │        │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤        │
│  │·联系人增删改  │  │·跟进记录创建  │  │·标签分组     │  │·Excel导入    │        │
│  │·决策链标识   │  │·时间线展示    │  │·手动打标     │  │·Excel导出    │        │
│  │·角色标注     │  │·电话记录     │  │·自动打标规则  │  │·字段映射     │        │
│  │·联系人查重   │  │·拜访记录     │  │·标签统计     │  │·导入模板下载  │        │
│  │·主联系人设置  │  │·邮件记录     │  │·批量打标     │  │·数据校验     │        │
│  └──────────────┘  │·微信记录     │  └──────────────┘  │·导入日志     │        │
│                    └──────────────┘                     └──────────────┘        │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  支撑服务层                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ 权限控制  │ │ 操作日志  │ │ 消息通知  │ │ 数据校验  │ │ AI分析   │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 数据模型设计

#### 5.2.1 核心表结构

##### （1）客户主表 `customers`

| 字段名              | 类型          | 必填 | 默认值                      | 说明                                                                      |
| ------------------- | ------------- | ---- | --------------------------- | ------------------------------------------------------------------------- |
| id                  | BIGINT        | 是   | AUTO_INCREMENT              | 主键ID                                                                    |
| customer_no         | VARCHAR(32)   | 是   | -                           | 客户编号（系统生成，唯一索引）                                            |
| customer_name       | VARCHAR(200)  | 是   | -                           | 客户名称（企业名/个人姓名）                                               |
| customer_type       | TINYINT       | 是   | 1                           | 客户类型：1=企业客户 2=个人客户                                           |
| status              | VARCHAR(20)   | 是   | 'lead'                      | 客户状态：lead/potential/intention/opportunity/deal/maintain/invalid/lost |
| source              | VARCHAR(50)   | 否   | NULL                        | 客户来源：website/referral/cold_call/exhibition/ad/import/other           |
| industry_id         | BIGINT        | 否   | NULL                        | 所属行业ID（关联行业字典表）                                              |
| scale               | VARCHAR(20)   | 否   | NULL                        | 企业规模：micro/small/medium/large/enterprise                             |
| region_code         | VARCHAR(20)   | 否   | NULL                        | 区域编码（关联区域字典表）                                                |
| province            | VARCHAR(50)   | 否   | NULL                        | 省份                                                                      |
| city                | VARCHAR(50)   | 否   | NULL                        | 城市                                                                      |
| district            | VARCHAR(50)   | 否   | NULL                        | 区/县                                                                     |
| address             | VARCHAR(500)  | 否   | NULL                        | 详细地址                                                                  |
| level               | CHAR(1)       | 否   | 'C'                         | 客户等级：S/A/B/C/D                                                       |
| intention_level     | TINYINT       | 否   | 0                           | 意向等级：0=未评估 1=低 2=中 3=高 4=极高                                  |
| credit_rating       | CHAR(1)       | 否   | NULL                        | 信用评级：A/B/C/D/E                                                       |
| phone               | VARCHAR(20)   | 否   | NULL                        | 主联系电话                                                                |
| email               | VARCHAR(100)  | 否   | NULL                        | 主联系邮箱                                                                |
| website             | VARCHAR(200)  | 否   | NULL                        | 企业官网                                                                  |
| unified_credit_code | VARCHAR(18)   | 否   | NULL                        | 统一社会信用代码（企业客户）                                              |
| legal_person        | VARCHAR(50)   | 否   | NULL                        | 法定代表人（企业客户）                                                    |
| registered_capital  | DECIMAL(15,2) | 否   | NULL                        | 注册资本（万元）                                                          |
| established_date    | DATE          | 否   | NULL                        | 成立日期                                                                  |
| annual_revenue      | DECIMAL(15,2) | 否   | NULL                        | 年营收（万元）                                                            |
| employee_count      | INT           | 否   | NULL                        | 员工人数                                                                  |
| description         | TEXT          | 否   | NULL                        | 客户描述/备注                                                             |
| owner_id            | BIGINT        | 否   | NULL                        | 负责人ID（NULL表示在公海池）                                              |
| owner_name          | VARCHAR(50)   | 否   | NULL                        | 负责人姓名（冗余字段）                                                    |
| dept_id             | BIGINT        | 否   | NULL                        | 所属部门ID                                                                |
| is_in_pool          | TINYINT       | 是   | 0                           | 是否在公海池：0=否 1=是                                                   |
| pool_enter_time     | DATETIME      | 否   | NULL                        | 进入公海时间                                                              |
| pool_reason         | VARCHAR(200)  | 否   | NULL                        | 进入公海原因                                                              |
| last_follow_time    | DATETIME      | 否   | NULL                        | 最后跟进时间                                                              |
| next_follow_time    | DATETIME      | 否   | NULL                        | 下次计划跟进时间                                                          |
| follow_count        | INT           | 是   | 0                           | 累计跟进次数                                                              |
| deal_count          | INT           | 是   | 0                           | 成交次数                                                                  |
| deal_amount         | DECIMAL(15,2) | 是   | 0.00                        | 累计成交金额                                                              |
| protect_until       | DATETIME      | 否   | NULL                        | 保护期截止时间                                                            |
| claimed_at          | DATETIME      | 否   | NULL                        | 领取/分配时间                                                             |
| custom_fields       | JSON          | 否   | NULL                        | 自定义字段（JSON格式存储）                                                |
| tenant_id           | BIGINT        | 是   | -                           | 租户ID                                                                    |
| created_by          | BIGINT        | 是   | -                           | 创建人ID                                                                  |
| created_at          | DATETIME      | 是   | CURRENT_TIMESTAMP           | 创建时间                                                                  |
| updated_by          | BIGINT        | 否   | NULL                        | 最后修改人ID                                                              |
| updated_at          | DATETIME      | 是   | CURRENT_TIMESTAMP ON UPDATE | 更新时间                                                                  |
| deleted             | TINYINT       | 是   | 0                           | 逻辑删除：0=正常 1=已删除                                                 |

索引设计：

```sql
-- 唯一索引
UNIQUE INDEX uk_customer_no (customer_no)
UNIQUE INDEX uk_credit_code (tenant_id, unified_credit_code) -- 同一租户下信用代码唯一

-- 普通索引
INDEX idx_tenant_status (tenant_id, status, deleted)
INDEX idx_owner (owner_id, deleted)
INDEX idx_pool (tenant_id, is_in_pool, deleted)
INDEX idx_name (tenant_id, customer_name, deleted)
INDEX idx_phone (phone)
INDEX idx_email (email)
INDEX idx_industry (tenant_id, industry_id)
INDEX idx_region (tenant_id, region_code)
INDEX idx_level (tenant_id, level)
INDEX idx_last_follow (owner_id, last_follow_time)
INDEX idx_created (tenant_id, created_at)
```

##### （2）联系人表 `contacts`

| 字段名           | 类型         | 必填 | 默认值                      | 说明                                          |
| ---------------- | ------------ | ---- | --------------------------- | --------------------------------------------- |
| id               | BIGINT       | 是   | AUTO_INCREMENT              | 主键ID                                        |
| customer_id      | BIGINT       | 是   | -                           | 所属客户ID                                    |
| contact_name     | VARCHAR(50)  | 是   | -                           | 联系人姓名                                    |
| gender           | TINYINT      | 否   | 0                           | 性别：0=未知 1=男 2=女                        |
| phone            | VARCHAR(20)  | 否   | NULL                        | 手机号                                        |
| telephone        | VARCHAR(20)  | 否   | NULL                        | 座机                                          |
| email            | VARCHAR(100) | 否   | NULL                        | 邮箱                                          |
| wechat           | VARCHAR(50)  | 否   | NULL                        | 微信号                                        |
| department       | VARCHAR(100) | 否   | NULL                        | 部门                                          |
| position         | VARCHAR(100) | 否   | NULL                        | 职位                                          |
| role_in_decision | VARCHAR(20)  | 否   | NULL                        | 决策角色：决策者/影响者/使用者/把关者/内线    |
| influence_level  | TINYINT      | 否   | 0                           | 影响力：0=未知 1=低 2=中 3=高                 |
| is_primary       | TINYINT      | 是   | 0                           | 是否主联系人：0=否 1=是                       |
| is_key_person    | TINYINT      | 是   | 0                           | 是否关键决策人：0=否 1=是                     |
| birthday         | DATE         | 否   | NULL                        | 生日                                          |
| hobby            | VARCHAR(200) | 否   | NULL                        | 爱好                                          |
| attitude         | VARCHAR(20)  | 否   | NULL                        | 对我方态度：positive/neutral/negative/unknown |
| remark           | VARCHAR(500) | 否   | NULL                        | 备注                                          |
| tenant_id        | BIGINT       | 是   | -                           | 租户ID                                        |
| created_by       | BIGINT       | 是   | -                           | 创建人ID                                      |
| created_at       | DATETIME     | 是   | CURRENT_TIMESTAMP           | 创建时间                                      |
| updated_at       | DATETIME     | 是   | CURRENT_TIMESTAMP ON UPDATE | 更新时间                                      |
| deleted          | TINYINT      | 是   | 0                           | 逻辑删除                                      |

索引设计：

```sql
INDEX idx_customer (customer_id, deleted)
INDEX idx_phone (phone)
INDEX idx_email (email)
INDEX idx_tenant (tenant_id, deleted)
```

##### （3）客户跟进记录表 `customer_follow_ups`

| 字段名                 | 类型         | 必填 | 默认值                      | 说明                                                |
| ---------------------- | ------------ | ---- | --------------------------- | --------------------------------------------------- |
| id                     | BIGINT       | 是   | AUTO_INCREMENT              | 主键ID                                              |
| customer_id            | BIGINT       | 是   | -                           | 客户ID                                              |
| contact_id             | BIGINT       | 否   | NULL                        | 关联联系人ID                                        |
| follow_type            | VARCHAR(20)  | 是   | -                           | 跟进类型：phone/visit/email/wechat/qq/meeting/other |
| follow_time            | DATETIME     | 是   | -                           | 跟进时间                                            |
| content                | TEXT         | 是   | -                           | 跟进内容                                            |
| result                 | VARCHAR(500) | 否   | NULL                        | 跟进结果                                            |
| next_plan              | VARCHAR(500) | 否   | NULL                        | 下一步计划                                          |
| next_follow_time       | DATETIME     | 否   | NULL                        | 下次跟进时间                                        |
| intention_level        | TINYINT      | 否   | NULL                        | 本次评估意向等级                                    |
| attachments            | JSON         | 否   | NULL                        | 附件列表 [{"name":"xx","url":"xx","size":123}]      |
| location               | VARCHAR(200) | 否   | NULL                        | 拜访地点（拜访类型时）                              |
| duration               | INT          | 否   | NULL                        | 通话时长（秒，电话类型时）                          |
| call_recording_url     | VARCHAR(500) | 否   | NULL                        | 通话录音URL                                         |
| related_opportunity_id | BIGINT       | 否   | NULL                        | 关联商机ID                                          |
| tenant_id              | BIGINT       | 是   | -                           | 租户ID                                              |
| created_by             | BIGINT       | 是   | -                           | 创建人（跟进人）                                    |
| created_by_name        | VARCHAR(50)  | 否   | NULL                        | 创建人姓名（冗余）                                  |
| created_at             | DATETIME     | 是   | CURRENT_TIMESTAMP           | 创建时间                                            |
| updated_at             | DATETIME     | 是   | CURRENT_TIMESTAMP ON UPDATE | 更新时间                                            |
| deleted                | TINYINT      | 是   | 0                           | 逻辑删除                                            |

索引设计：

```sql
INDEX idx_customer_time (customer_id, follow_time DESC, deleted)
INDEX idx_creator_time (created_by, follow_time DESC)
INDEX idx_tenant_type (tenant_id, follow_type, deleted)
INDEX idx_opportunity (related_opportunity_id)
```

##### （4）客户标签表 `customer_tags`

| 字段名      | 类型         | 必填 | 默认值                      | 说明                            |
| ----------- | ------------ | ---- | --------------------------- | ------------------------------- |
| id          | BIGINT       | 是   | AUTO_INCREMENT              | 主键ID                          |
| tag_name    | VARCHAR(50)  | 是   | -                           | 标签名称                        |
| tag_group   | VARCHAR(50)  | 否   | 'default'                   | 标签分组                        |
| color       | VARCHAR(10)  | 否   | '#1890ff'                   | 标签颜色（Hex）                 |
| tag_type    | TINYINT      | 是   | 1                           | 标签类型：1=手动标签 2=自动标签 |
| auto_rule   | JSON         | 否   | NULL                        | 自动打标规则（仅自动标签）      |
| description | VARCHAR(200) | 否   | NULL                        | 标签说明                        |
| sort_order  | INT          | 是   | 0                           | 排序序号                        |
| usage_count | INT          | 是   | 0                           | 使用次数（冗余计数）            |
| tenant_id   | BIGINT       | 是   | -                           | 租户ID                          |
| created_by  | BIGINT       | 是   | -                           | 创建人ID                        |
| created_at  | DATETIME     | 是   | CURRENT_TIMESTAMP           | 创建时间                        |
| updated_at  | DATETIME     | 是   | CURRENT_TIMESTAMP ON UPDATE | 更新时间                        |
| deleted     | TINYINT      | 是   | 0                           | 逻辑删除                        |

##### （5）客户-标签关联表 `customer_tag_relations`

| 字段名      | 类型     | 必填 | 默认值            | 说明                    |
| ----------- | -------- | ---- | ----------------- | ----------------------- |
| id          | BIGINT   | 是   | AUTO_INCREMENT    | 主键ID                  |
| customer_id | BIGINT   | 是   | -                 | 客户ID                  |
| tag_id      | BIGINT   | 是   | -                 | 标签ID                  |
| tagged_by   | TINYINT  | 是   | 1                 | 打标方式：1=手动 2=自动 |
| tenant_id   | BIGINT   | 是   | -                 | 租户ID                  |
| created_by  | BIGINT   | 是   | -                 | 操作人ID                |
| created_at  | DATETIME | 是   | CURRENT_TIMESTAMP | 打标时间                |

```sql
UNIQUE INDEX uk_customer_tag (customer_id, tag_id)
INDEX idx_tag (tag_id)
INDEX idx_tenant (tenant_id)
```

##### （6）公海池操作日志表 `customer_pool_logs`

| 字段名        | 类型         | 必填 | 默认值            | 说明                                  |
| ------------- | ------------ | ---- | ----------------- | ------------------------------------- |
| id            | BIGINT       | 是   | AUTO_INCREMENT    | 主键ID                                |
| customer_id   | BIGINT       | 是   | -                 | 客户ID                                |
| action        | VARCHAR(20)  | 是   | -                 | 操作类型：recycle/claim/assign/return |
| from_owner_id | BIGINT       | 否   | NULL              | 原负责人ID                            |
| to_owner_id   | BIGINT       | 否   | NULL              | 新负责人ID                            |
| reason        | VARCHAR(200) | 否   | NULL              | 操作原因                              |
| tenant_id     | BIGINT       | 是   | -                 | 租户ID                                |
| created_by    | BIGINT       | 是   | -                 | 操作人ID                              |
| created_at    | DATETIME     | 是   | CURRENT_TIMESTAMP | 操作时间                              |

##### （7）客户自定义字段定义表 `customer_field_definitions`

| 字段名          | 类型         | 必填 | 默认值                      | 说明                                                                  |
| --------------- | ------------ | ---- | --------------------------- | --------------------------------------------------------------------- |
| id              | BIGINT       | 是   | AUTO_INCREMENT              | 主键ID                                                                |
| field_key       | VARCHAR(50)  | 是   | -                           | 字段标识（英文，唯一）                                                |
| field_name      | VARCHAR(50)  | 是   | -                           | 字段名称（中文显示名）                                                |
| field_type      | VARCHAR(20)  | 是   | -                           | 字段类型：text/number/date/select/multiselect/radio/checkbox/textarea |
| options         | JSON         | 否   | NULL                        | 选项值（下拉/单选/多选时使用）                                        |
| is_required     | TINYINT      | 是   | 0                           | 是否必填                                                              |
| is_searchable   | TINYINT      | 是   | 0                           | 是否可搜索                                                            |
| is_list_show    | TINYINT      | 是   | 0                           | 是否列表展示                                                          |
| placeholder     | VARCHAR(100) | 否   | NULL                        | 输入提示                                                              |
| validation_rule | VARCHAR(200) | 否   | NULL                        | 校验正则                                                              |
| sort_order      | INT          | 是   | 0                           | 排序序号                                                              |
| tenant_id       | BIGINT       | 是   | -                           | 租户ID                                                                |
| created_at      | DATETIME     | 是   | CURRENT_TIMESTAMP           | 创建时间                                                              |
| updated_at      | DATETIME     | 是   | CURRENT_TIMESTAMP ON UPDATE | 更新时间                                                              |
| deleted         | TINYINT      | 是   | 0                           | 逻辑删除                                                              |

##### （8）客户导入记录表 `customer_import_logs`

| 字段名             | 类型         | 必填 | 默认值            | 说明                                    |
| ------------------ | ------------ | ---- | ----------------- | --------------------------------------- |
| id                 | BIGINT       | 是   | AUTO_INCREMENT    | 主键ID                                  |
| file_name          | VARCHAR(200) | 是   | -                 | 文件名                                  |
| file_url           | VARCHAR(500) | 是   | -                 | 文件存储URL                             |
| total_count        | INT          | 是   | 0                 | 总记录数                                |
| success_count      | INT          | 是   | 0                 | 成功数                                  |
| fail_count         | INT          | 是   | 0                 | 失败数                                  |
| duplicate_count    | INT          | 是   | 0                 | 重复数                                  |
| status             | TINYINT      | 是   | 0                 | 状态：0=待处理 1=处理中 2=已完成 3=失败 |
| error_file_url     | VARCHAR(500) | 否   | NULL              | 错误明细文件URL                         |
| field_mapping      | JSON         | 是   | -                 | 字段映射配置                            |
| duplicate_strategy | VARCHAR(20)  | 是   | 'skip'            | 重复处理策略：skip/update/create        |
| tenant_id          | BIGINT       | 是   | -                 | 租户ID                                  |
| created_by         | BIGINT       | 是   | -                 | 导入人ID                                |
| created_at         | DATETIME     | 是   | CURRENT_TIMESTAMP | 导入时间                                |
| finished_at        | DATETIME     | 否   | NULL              | 完成时间                                |

#### 5.2.2 表间关系说明

```
┌─────────────────────────────────┐
│          customers              │
│         （客户主表）              │
├─────────────────────────────────┤
│  PK: id                        │
│  FK: owner_id → sys_users.id   │
│  FK: dept_id → sys_depts.id    │
│  FK: industry_id → dict.id     │
└───────┬──────┬──────┬──────┬───┘
        │      │      │      │
   1:N  │ 1:N  │ M:N  │ 1:N  │
        │      │      │      │
        ▼      ▼      │      ▼
┌──────────┐ ┌────────┴──┐ ┌───────────────────┐
│ contacts │ │follow_ups │ │customer_pool_logs │
│（联系人） │ │（跟进记录）│ │  （公海操作日志）   │
└──────────┘ └───────────┘ └───────────────────┘
                   │
                   ▼
        ┌──────────────────────┐          ┌──────────────┐
        │customer_tag_relations│──────────│customer_tags │
        │   （客户标签关联）     │   N:1    │  （标签定义）  │
        └──────────────────────┘          └──────────────┘

  ┌───────────────────────────┐     ┌──────────────────────┐
  │customer_field_definitions │     │customer_import_logs  │
  │     （自定义字段定义）      │     │   （导入记录日志）     │
  └───────────────────────────┘     └──────────────────────┘
```

关系说明：

| 关系                                                          | 说明                             |
| ------------------------------------------------------------- | -------------------------------- |
| customers ←→ contacts                                         | 一对多，一个客户可有多个联系人   |
| customers ←→ customer_follow_ups                              | 一对多，一个客户可有多条跟进记录 |
| customers ←→ customer_tag_relations ←→ customer_tags          | 多对多，通过关联表实现           |
| customers ←→ customer_pool_logs                               | 一对多，记录客户进出公海的历史   |
| customers.custom_fields 由 customer_field_definitions 定义    | 自定义字段采用JSON动态存储       |
| customer_follow_ups.contact_id → contacts.id                  | 跟进记录可关联特定联系人         |
| customer_follow_ups.related_opportunity_id → opportunities.id | 跟进记录可关联商机（跨模块）     |
| customers.owner_id → sys_users.id                             | 客户负责人关联系统用户           |

---

### 5.3 核心业务流程

#### 5.3.1 客户创建与查重流程

```
┌──────────┐
│ 用户发起  │
│ 创建客户  │
└────┬─────┘
     │
     ▼
┌──────────────┐
│ 填写客户信息  │
│ (名称/电话/  │
│  邮箱等)     │
└────┬─────────┘
     │
     ▼
┌──────────────────┐    ┌─────────────────────────────────────┐
│  触发自动查重     │───▶│ 查重规则引擎                         │
│  (实时)          │    │ ① 企业名称模糊匹配(相似度>=80%)      │
└────┬─────────────┘    │ ② 统一社会信用代码精确匹配            │
     │                  │ ③ 主联系电话精确匹配                  │
     │                  │ ④ 主联系邮箱精确匹配                  │
     │                  │ ⑤ 联系人手机号交叉匹配                │
     │                  └─────────────────────────────────────┘
     ▼
┌──────────────┐
│ 是否存在      │
│ 疑似重复？    │
└──┬───────┬───┘
   │       │
  是       否
   │       │
   ▼       ▼
┌────────────────┐  ┌───────────────┐
│ 展示疑似重复    │  │  数据校验      │
│ 客户列表       │  │ (必填项/格式)  │
└──┬──────┬──────┘  └───┬───────────┘
   │      │             │
   ▼      ▼             ▼
┌──────┐ ┌──────┐  ┌──────────────┐
│强制  │ │放弃  │  │ 校验通过？    │
│创建  │ │创建  │  └──┬───────┬───┘
└──┬───┘ └──┬───┘    是       否
   │        │        │        │
   │     结束        ▼        ▼
   │            ┌─────────┐ ┌──────────┐
   ▼            │保存客户  │ │返回错误   │
┌─────────────┐ │记录     │ │提示修改   │
│记录查重日志  │ └──┬──────┘ └──────────┘
│标记为人工   │    │
│确认非重复   │    ▼
└──┬──────────┘ ┌──────────────┐
   │            │ 自动分配负责人 │
   ▼            │ (按分配规则)  │
┌─────────────┐ └──┬───────────┘
│保存客户记录  │    │
└──┬──────────┘    ▼
   │            ┌──────────────┐
   └───────────▶│ 触发自动打标  │
                └──┬───────────┘
                   │
                   ▼
                ┌──────────────┐
                │ 发送通知给    │
                │ 负责人       │
                └──┬───────────┘
                   │
                   ▼
                ┌──────────────┐
                │ 记录操作日志  │
                │ 创建完成     │
                └──────────────┘
```

#### 5.3.2 客户分配与回收流程（公海池机制）

**公海池整体机制说明：**

公海池是存放无人负责（未分配或被回收）客户的公共资源池。其核心目的是确保客户资源得到及时跟进，避免客户被长期闲置浪费。

```
                    ┌─────────────────────────────┐
                    │           公海池              │
                    │   (is_in_pool = 1,           │
                    │    owner_id = NULL)           │
                    └──┬────────┬────────┬─────────┘
                       │        │        │
              ┌────────┘        │        └────────┐
              ▼                 ▼                  ▼
      ┌──────────────┐ ┌──────────────┐  ┌──────────────┐
      │  销售主动领取  │ │ 管理员分配   │  │  系统自动分配  │
      └──────┬───────┘ └──────┬───────┘  └──────┬───────┘
             │                │                  │
             ▼                ▼                  ▼
      ┌──────────────────────────────────────────────────┐
      │                  分配校验                          │
      │  ① 领取人持有客户数是否已达上限？                    │
      │  ② 该客户是否在领取冷却期（被退回后N小时内不可领取）？ │
      │  ③ 领取人今日领取次数是否已达上限？                   │
      │  ④ 该客户是否被其他人正在领取（并发锁）？             │
      └──────────────────────┬───────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
               校验通过            校验不通过
                    │                 │
                    ▼                 ▼
          ┌──────────────┐    ┌──────────────┐
          │ 更新客户归属   │    │ 返回失败原因  │
          │ owner_id=新人 │    └──────────────┘
          │ is_in_pool=0  │
          │ 设置保护期     │
          │ claimed_at=now │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │ 记录公海日志   │
          │ 发送通知      │
          └──────────────┘
```

**回收机制流程：**

```
┌───────────────────────────────────────────────────────────┐
│                   定时回收任务（每日凌晨执行）                │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │ 扫描满足回收条件的客户   │
                └───────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │超时未跟进回收  │ │超时未成交  │ │手动退回公海   │
     │              │ │回收      │ │              │
     │线索客户：     │ │意向客户： │ │负责人主动     │
     │  3天未跟进   │ │ 60天未   │ │释放客户      │
     │潜在客户：     │ │ 产生商机  │ │              │
     │  7天未跟进   │ │          │ │管理员强制     │
     │意向客户：     │ │商机客户： │ │回收          │
     │  15天未跟进  │ │ 90天未   │ └──────┬───────┘
     │成交客户：     │ │ 成交    │        │
     │  30天未跟进  │ └────┬─────┘        │
     └──────┬───────┘      │              │
            │              │              │
            └──────────────┼──────────────┘
                           │
                           ▼
                ┌───────────────────────┐
                │  是否在保护期内？       │
                └───┬───────────┬───────┘
                   是           否
                    │           │
                    ▼           ▼
               ┌─────────┐ ┌──────────────┐
               │ 跳过回收  │ │ 执行回收操作  │
               └─────────┘ │ owner=NULL   │
                           │ is_in_pool=1 │
                           │ 记录回收原因  │
                           └──────┬───────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │ 通知原负责人   │
                           │ 记录操作日志   │
                           └──────────────┘
```

**公海池核心参数配置（可由管理员在系统设置中调整）：**

| 参数名                        | 默认值 | 说明                   |
| ----------------------------- | ------ | ---------------------- |
| pool_max_hold_count           | 200    | 每人最大持有客户数     |
| pool_daily_claim_limit        | 10     | 每人每日最大领取数     |
| pool_cooldown_hours           | 24     | 退回后冷却期（小时）   |
| pool_protect_days_lead        | 7      | 线索客户保护期（天）   |
| pool_protect_days_potential   | 15     | 潜在客户保护期（天）   |
| pool_protect_days_intention   | 30     | 意向客户保护期（天）   |
| pool_protect_days_opportunity | 60     | 商机客户保护期（天）   |
| pool_protect_days_deal        | 90     | 成交客户保护期（天）   |
| pool_recycle_lead_days        | 3      | 线索客户未跟进回收天数 |
| pool_recycle_potential_days   | 7      | 潜在客户未跟进回收天数 |
| pool_recycle_intention_days   | 15     | 意向客户未跟进回收天数 |
| pool_recycle_deal_days        | 30     | 成交客户未跟进回收天数 |

#### 5.3.3 客户状态流转规则（状态机）

```
                              ┌─────────────────────────────────┐
                              │                                 │
                              │        ┌────────┐               │
            新建 ─────────────┼───────▶│  线索   │               │
                              │        │ (lead)  │               │
                              │        └───┬─────┘               │
                              │            │                     │
                              │     首次跟进且                    │
                              │     确认有效                      │
                              │            │                     │
                              │            ▼                     │
                              │        ┌─────────┐              │
                              │        │ 潜在客户  │              │
                              │        │(potential)│              │
                              │        └───┬──────┘              │
                              │            │                     │
                              │     表达明确                      │
                              │     合作意向                      │
                              │            │                     │
                              │            ▼                     │
 ┌──────────┐                 │        ┌─────────┐              │
 │  公海池   │◀── 回收/退回 ──┤        │ 意向客户  │              │
 │  (pool)  │── 领取/分配 ──▶│        │(intention)│             │
 └──────────┘                 │        └───┬──────┘              │
                              │            │                     │
                              │     创建商机                      │
                              │     (关联)                       │
                              │            │                     │
                              │            ▼                     │
                              │        ┌─────────┐              │
                              │        │ 商机客户  │              │
                              │        │(opportunity)│           │
                              │        └───┬──────┘              │
                              │            │                     │
                              │     商机赢单                      │
                              │     (签约)                       │
                              │            │                     │
                              │            ▼                     │
                              │        ┌─────────┐              │
                              │        │ 成交客户  │              │
                              │        │  (deal)  │              │
                              │        └───┬──────┘              │
                              │            │                     │
                              │     进入长期                      │
                              │     维护阶段                      │
                              │            │                     │
                              │            ▼                     │
                              │        ┌──────────┐             │
                              │        │ 长期维护   │             │
                              │        │(maintain) │             │
                              │        └──────────┘             │
                              │                                 │
                              └─────────────────────────────────┘
                                          │
                       任意状态均可标记为      │
                       ┌──────────────────┤
                       ▼                  ▼
                  ┌─────────┐       ┌──────────┐
                  │  无效    │       │   流失    │
                  │(invalid) │       │  (lost)  │
                  └─────────┘       └──────────┘
```

**状态流转规则矩阵：**

| 当前状态              | 可流转至              | 触发条件                             |
| --------------------- | --------------------- | ------------------------------------ |
| 线索(lead)            | 潜在客户(potential)   | 首次有效跟进，确认客户信息真实有效   |
| 线索(lead)            | 无效(invalid)         | 号码空号/信息虚假/明确拒绝           |
| 线索(lead)            | 公海池                | 超时未跟进自动回收                   |
| 潜在客户(potential)   | 意向客户(intention)   | 客户表达明确合作意向（意向等级>=中） |
| 潜在客户(potential)   | 无效(invalid)         | 确认无合作可能                       |
| 潜在客户(potential)   | 公海池                | 超时未跟进自动回收                   |
| 意向客户(intention)   | 商机客户(opportunity) | 创建商机并关联该客户                 |
| 意向客户(intention)   | 流失(lost)            | 客户明确选择竞品/放弃采购            |
| 意向客户(intention)   | 公海池                | 超时未产生商机自动回收               |
| 商机客户(opportunity) | 成交客户(deal)        | 关联商机赢单（签约）                 |
| 商机客户(opportunity) | 流失(lost)            | 所有商机输单                         |
| 商机客户(opportunity) | 公海池                | 超时未成交自动回收                   |
| 成交客户(deal)        | 长期维护(maintain)    | 售后交付完成，进入客户成功阶段       |
| 成交客户(deal)        | 公海池                | 超时无复购/无跟进                    |
| 长期维护(maintain)    | 意向客户(intention)   | 二次购买意向（回流）                 |
| 长期维护(maintain)    | 流失(lost)            | 停止合作/不再续费                    |
| 无效(invalid)         | 线索(lead)            | 管理员手动激活（重新评估）           |
| 流失(lost)            | 潜在客户(potential)   | 客户回流/重新接洽                    |

#### 5.3.4 客户合并流程

```
┌──────────────┐
│ 发起客户合并  │
│ 选择主客户   │
│ 选择被合并客户│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│       合并预览                │
│  展示两个客户的信息差异对比    │
│  用户选择每个字段保留哪一方    │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│       执行合并（事务内）       │
│                              │
│  ① 合并客户基本信息           │
│     (保留主客户ID)            │
│                              │
│  ② 合并联系人                │
│     (被合并方联系人迁移至主)   │
│     (联系人去重)              │
│                              │
│  ③ 合并跟进记录              │
│     (所有记录归入主客户)      │
│                              │
│  ④ 合并标签                  │
│     (取并集)                 │
│                              │
│  ⑤ 迁移关联商机              │
│     (商机归入主客户)          │
│                              │
│  ⑥ 迁移合同/订单             │
│     (关联至主客户)            │
│                              │
│  ⑦ 标记被合并客户为已删除     │
│     (保留合并日志可追溯)      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  记录合并日志                 │
│  (主客户ID, 被合并客户ID,    │
│   合并人, 合并时间, 字段选择) │
└──────────────────────────────┘
```

#### 5.3.5 客户导入流程

```
┌──────────────┐
│ 下载导入模板  │
│ (Excel)      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 填写客户数据  │
│ 上传Excel文件│
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ 文件解析与预校验       │
│ ① 文件格式校验        │
│    (.xlsx, <10MB)    │
│ ② 行数校验            │
│    (单次<=5000行)     │
│ ③ 表头匹配校验        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 字段映射配置          │
│ 系统字段 ←→ Excel列  │
│ 用户确认映射关系      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 选择重复处理策略       │
│ ① 跳过重复记录        │
│ ② 更新已有记录        │
│ ③ 仍然创建新记录      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 提交导入任务          │
│ (异步处理)           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 后台异步处理 (逐行处理)                    │
│                                          │
│  FOR EACH row:                           │
│    ├─ 数据格式校验（手机号/邮箱/必填项）    │
│    ├─ 执行查重规则                        │
│    ├─ 根据重复策略处理                     │
│    │    ├─ skip → 记录跳过原因            │
│    │    ├─ update → 更新匹配客户          │
│    │    └─ create → 创建新客户            │
│    ├─ 自动打标签                          │
│    └─ 记录处理结果                        │
│                                          │
│  更新导入进度（WebSocket推送）             │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ 导入完成              │
│ ① 展示导入结果统计    │
│    成功/失败/跳过数    │
│ ② 提供错误明细下载    │
│    (包含失败原因)     │
│ ③ 记录导入日志        │
└──────────────────────┘
```

---

### 5.4 页面设计

#### 5.4.1 客户列表页

**页面布局：**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  客户管理                                                    [我的客户] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ 搜索区域 ──────────────────────────────────────────────────────┐   │
│  │  客户名称: [____________]  联系电话: [____________]              │   │
│  │  客户状态: [▼ 全部状态  ]  客户等级: [▼ 全部等级  ]              │   │
│  │  客户来源: [▼ 全部来源  ]  所属行业: [▼ 全部行业  ]              │   │
│  │  负责人:   [▼ 全部人员  ]  所属部门: [▼ 全部部门  ]              │   │
│  │  创建时间: [____] 至 [____]  最后跟进: [____] 至 [____]         │   │
│  │  标签:     [▼ 选择标签  ]  区域:     [▼ 省/市/区  ]             │   │
│  │                                                                 │   │
│  │          [🔍 搜索]  [↻ 重置]  [▼ 更多筛选]  [保存为常用筛选]     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ 操作栏 ───────────────────────────────────────────────────────┐   │
│  │  [+ 新建客户]  [导入]  [导出]  [批量操作 ▼]                     │   │
│  │                                  ├ 批量转移                     │   │
│  │  已选择 0 项                     ├ 批量标签                     │   │
│  │                                  ├ 批量退回公海                  │   │
│  │                                  └ 批量删除                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ 数据列表 ─────────────────────────────────────────────────────┐   │
│  │ □ │客户名称    │等级│状态  │联系电话   │负责人│最后跟进 │操作    │   │
│  │───┼───────────┼───┼─────┼─────────┼─────┼───────┼───────│   │
│  │ □ │ABC科技有限 │ A │意向  │138****88│张三  │03-01  │详情    │   │
│  │   │公司        │   │客户  │         │     │10:30  │跟进    │   │
│  │   │[科技][重点]│   │      │         │     │       │更多 ▼ │   │
│  │───┼───────────┼───┼─────┼─────────┼─────┼───────┼───────│   │
│  │ □ │李四        │ B │线索  │139****66│王五  │02-28  │详情    │   │
│  │   │[个人]      │   │      │         │     │15:00  │跟进    │   │
│  │   │           │   │      │         │     │       │更多 ▼ │   │
│  │───┼───────────┼───┼─────┼─────────┼─────┼───────┼───────│   │
│  │ ... (更多数据行)                                               │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  共 1,234 条  每页 [20 ▼] 条   < 1 2 3 4 5 ... 62 >           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**搜索条件字段：**

| 字段             | 类型     | 说明                        |
| ---------------- | -------- | --------------------------- |
| customer_name    | 文本输入 | 模糊搜索，支持客户名称/编号 |
| phone            | 文本输入 | 精确或后四位搜索            |
| status           | 下拉选择 | 支持多选                    |
| level            | 下拉选择 | S/A/B/C/D                   |
| source           | 下拉选择 | 客户来源                    |
| industry_id      | 下拉选择 | 所属行业                    |
| owner_id         | 下拉选择 | 负责人（支持搜索）          |
| dept_id          | 树形选择 | 所属部门                    |
| created_at       | 日期范围 | 创建时间起止                |
| last_follow_time | 日期范围 | 最后跟进时间起止            |
| tag_ids          | 下拉多选 | 客户标签筛选                |
| region           | 级联选择 | 省/市/区                    |

**列表字段：**

| 列名         | 宽度  | 排序 | 说明                 |
| ------------ | ----- | ---- | -------------------- |
| 复选框       | 50px  | 否   | 批量操作选择         |
| 客户名称     | 200px | 是   | 含标签、客户类型图标 |
| 客户等级     | 80px  | 是   | S/A/B/C/D色标        |
| 客户状态     | 100px | 是   | 状态标签             |
| 联系电话     | 130px | 否   | 脱敏显示，点击拨打   |
| 所属行业     | 120px | 是   | 行业名称             |
| 负责人       | 100px | 是   | 姓名                 |
| 最后跟进时间 | 150px | 是   | 默认倒序             |
| 下次跟进时间 | 150px | 是   | 临近/超期高亮        |
| 创建时间     | 150px | 是   | -                    |
| 操作         | 180px | 否   | 详情/跟进/更多       |

**操作按钮权限：**

| 按钮         | 说明       | 所需权限             |
| ------------ | ---------- | -------------------- |
| 新建客户     | 创建新客户 | customer:create      |
| 导入         | 批量导入   | customer:import      |
| 导出         | 批量导出   | customer:export      |
| 批量转移     | 变更负责人 | customer:transfer    |
| 批量标签     | 批量打标签 | customer:tag         |
| 批量退回公海 | 退回公海池 | customer:return_pool |
| 批量删除     | 逻辑删除   | customer:delete      |

#### 5.4.2 客户详情页

**页面布局：**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← 返回列表    客户详情                            [编辑] [转移] [更多▼] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ 客户概要卡片 ──────────────────────────────────────────────────┐    │
│  │                                                                 │    │
│  │  🏢 ABC科技有限公司          等级: [★A]   状态: [意向客户]       │    │
│  │  编号: CUS202603010001       来源: 官网注册                     │    │
│  │  负责人: 张三 (销售一部)      创建时间: 2026-02-15              │    │
│  │                                                                 │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │    │
│  │  │ 跟进次数    │ │ 关联商机    │ │ 成交金额   │ │ 最后跟进    │  │    │
│  │  │    12       │ │    2       │ │  ¥0        │ │ 2天前      │  │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │    │
│  │                                                                 │    │
│  │  标签: [科技行业] [重点客户] [北京] [年度大客户]                  │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ Tab切换 ──────────────────────────────────────────────────────┐    │
│  │ [基本信息] [联系人] [跟进记录] [商机] [合同] [通话记录] [操作日志]│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ Tab内容区 ────────────────────────────────────────────────────┐    │
│  │                                                                 │    │
│  │  (根据选中Tab显示不同内容，以下为各Tab详细设计)                   │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Tab - 基本信息：**

```
┌─ 基本信息 ────────────────────────────────────────────────────┐
│                                                                │
│  ┌─ 企业信息 ────────────────────────────────────────────┐    │
│  │  客户名称:  ABC科技有限公司    客户类型:  企业客户       │    │
│  │  统一信用代码: 91110000MA12345X  法定代表人: 王建国     │    │
│  │  注册资本:  500万              成立日期:  2018-06-15   │    │
│  │  所属行业:  信息技术            企业规模:  中型(100-499)│    │
│  │  年营收:    2000万             员工人数:  260          │    │
│  │  官网:      www.abctech.com                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 联系信息 ────────────────────────────────────────────┐    │
│  │  联系电话:  010-12345678       联系邮箱: bd@abc.com    │    │
│  │  省份: 北京  城市: 北京  区: 海淀区                     │    │
│  │  详细地址:  中关村科技园区XX号XX大厦12层                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 业务信息 ────────────────────────────────────────────┐    │
│  │  客户等级:  A                  意向等级:  高            │    │
│  │  客户来源:  官网注册            信用评级:  B            │    │
│  │  客户状态:  意向客户            负责人:    张三         │    │
│  │  所属部门:  销售一部            保护期至:  2026-04-01   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 自定义字段 ──────────────────────────────────────────┐    │
│  │  (根据tenant配置动态渲染)                              │    │
│  │  合作产品线: ERP系统           预算范围: 50-100万       │    │
│  │  决策周期:   3个月             竞品情况: 用友/金蝶      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 备注 ────────────────────────────────────────────────┐    │
│  │  该客户为行业头部企业，对ERP系统有强烈替换需求，目前      │    │
│  │  使用竞品产品但不满意，预计Q2可推进签约。                 │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

**Tab - 联系人：**

```
┌─ 联系人 ──────────────────────────────────────────────────────┐
│                                                                │
│  [+ 添加联系人]                                                │
│                                                                │
│  ┌─ 决策链视图 ──────────────────────────────────────────┐    │
│  │                                                        │    │
│  │        ┌──────────┐                                   │    │
│  │        │ 王总经理  │ ← 决策者                          │    │
│  │        │ 139****88│                                   │    │
│  │        └─────┬────┘                                   │    │
│  │         ┌────┴─────┐                                  │    │
│  │    ┌────┴───┐ ┌────┴───┐                              │    │
│  │    │ 李副总  │ │ 张CTO  │ ← 影响者                     │    │
│  │    │138****66│ │137****55│                              │    │
│  │    └────────┘ └────┬───┘                              │    │
│  │                ┌───┴────┐                              │    │
│  │                │ 赵经理  │ ← 使用者/内线                │    │
│  │                │136****33│                              │    │
│  │                └────────┘                              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ 联系人列表 ──────────────────────────────────────────┐    │
│  │ 姓名    │职位    │电话      │决策角色│态度  │主联系人│操作│    │
│  │─────────┼───────┼─────────┼──────┼─────┼──────┼────│    │
│  │★王建国  │总经理  │139****88│决策者  │中立  │ ✓    │编辑│    │
│  │ 李明    │副总    │138****66│影响者  │积极  │      │编辑│    │
│  │ 张伟    │CTO    │137****55│影响者  │积极  │      │编辑│    │
│  │ 赵芳    │IT经理  │136****33│使用者  │积极  │      │编辑│    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

**Tab - 跟进记录：**

```
┌─ 跟进记录 ────────────────────────────────────────────────────┐
│                                                                │
│  [+ 写跟进]   筛选: [全部类型 ▼]  [全部人员 ▼]                 │
│                                                                │
│  ┌─ 时间线 ──────────────────────────────────────────────┐    │
│  │                                                        │    │
│  │  ● 2026-03-01 10:30  [电话]  张三                     │    │
│  │  │  与赵经理通话30分钟，沟通了产品演示时间安排。          │    │
│  │  │  客户反馈Q2有预算，希望3月中旬安排现场演示。           │    │
│  │  │  意向等级: 高                                       │    │
│  │  │  下一步: 3月15日安排产品演示                         │    │
│  │  │  📎 会议纪要.docx                                   │    │
│  │  │                                                     │    │
│  │  ● 2026-02-25 14:00  [拜访]  张三                     │    │
│  │  │  拜访客户总部，与李副总、张CTO面谈。                  │    │
│  │  │  介绍了公司产品方案，客户对AI功能很感兴趣。            │    │
│  │  │  地点: 中关村XX大厦12层                              │    │
│  │  │  意向等级: 中→高                                    │    │
│  │  │                                                     │    │
│  │  ● 2026-02-20 09:15  [微信]  张三                     │    │
│  │  │  发送产品资料给赵经理，赵经理表示会转给领导查看。      │    │
│  │  │                                                     │    │
│  │  ● 2026-02-15 16:45  [电话]  张三                     │    │
│  │  │  首次联系，客户通过官网注册。与赵经理通话了解需求。    │    │
│  │  │  客户目前使用竞品产品，存在不满意之处。               │    │
│  │  │  意向等级: 中                                       │    │
│  │  │  通话时长: 18分钟    🎙️ [播放录音]                   │    │
│  │  │                                                     │    │
│  │  ● 2026-02-15 10:00  [系统]                           │    │
│  │     客户创建，来源: 官网注册                             │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  共 5 条记录   < 1 >                                           │
└────────────────────────────────────────────────────────────────┘
```

**Tab - 商机：**

```
┌─ 关联商机 ────────────────────────────────────────────────────┐
│                                                                │
│  [+ 新建商机]                                                  │
│                                                                │
│  │商机名称        │金额      │阶段    │预计成交  │负责人│操作  │  │
│  │────────────────┼─────────┼───────┼────────┼─────┼─────│  │
│  │ERP系统采购项目  │¥80万    │方案报价 │2026-05  │张三  │详情  │  │
│  │OA协同办公升级   │¥15万    │需求确认 │2026-06  │张三  │详情  │  │
│                                                                │
│  商机总额: ¥95万   进行中: 2个                                   │
└────────────────────────────────────────────────────────────────┘
```

**Tab - 通话记录：**

```
┌─ 通话记录 ────────────────────────────────────────────────────┐
│                                                                │
│  │时间            │方向  │号码        │时长  │联系人 │录音  │    │
│  │────────────────┼─────┼───────────┼─────┼──────┼─────│    │
│  │03-01 10:30     │呼出  │136****33  │30分  │赵芳   │播放  │    │
│  │02-15 16:45     │呼出  │136****33  │18分  │赵芳   │播放  │    │
│  │02-14 11:20     │呼入  │010-1234** │ 3分  │未知   │播放  │    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### 5.4.3 公海池页面

```
┌──────────────────────────────────────────────────────────────────────────┐
│  客户公海池                                    今日已领取: 3/10         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ 搜索区域 ─────────────────────────────────────────────────────┐    │
│  │  客户名称: [___________]  行业: [▼ 全部 ]  等级: [▼ 全部 ]      │    │
│  │  进入公海时间: [____] 至 [____]   进入原因: [▼ 全部 ]            │    │
│  │  原负责人: [___________]                                        │    │
│  │                              [搜索]  [重置]                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ 数据列表 ─────────────────────────────────────────────────────┐    │
│  │ □ │客户名称   │等级│行业    │进入时间  │进入原因    │原负责人│操作 │    │
│  │───┼──────────┼──┼───────┼────────┼──────────┼──────┼─────│    │
│  │ □ │DEF贸易公司│ C │外贸    │02-28    │15天未跟进  │李四   │领取  │    │
│  │ □ │GHI电子厂  │ B │制造    │02-25    │主动退回    │王五   │领取  │    │
│  │ □ │张某某     │ D │-      │02-20    │30天未成交  │赵六   │领取  │    │
│  │ ...                                                             │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  [批量领取]  [批量分配] (管理员可见)                              │    │
│  │  共 456 条  < 1 2 3 ... 23 >                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 5.4.4 客户导入页面

```
┌──────────────────────────────────────────────────────────────────────────┐
│  导入客户                                                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ 步骤条 ──────────────────────────────────────────────────────┐    │
│  │  ① 上传文件  ──→  ② 字段映射  ──→  ③ 导入预览  ──→  ④ 导入结果 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ═══ 步骤一：上传文件 ═══                                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │                                                         │            │
│  │         📄 点击或拖拽文件到此处上传                       │            │
│  │                                                         │            │
│  │         支持 .xlsx 格式，文件大小不超过10MB               │            │
│  │         单次导入不超过5000条记录                          │            │
│  │                                                         │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
│  📥 下载导入模板                                                         │
│                                                                          │
│  ═══ 步骤二：字段映射 ═══                                                │
│                                                                          │
│  │ 系统字段        │ Excel列          │ 示例数据              │          │
│  │─────────────────┼─────────────────┼──────────────────────│          │
│  │ *客户名称       │ [▼ A列-公司名称 ] │ ABC科技有限公司       │          │
│  │ *联系电话       │ [▼ C列-电话     ] │ 13812345678          │          │
│  │  联系邮箱       │ [▼ D列-邮箱     ] │ info@abc.com         │          │
│  │  所属行业       │ [▼ E列-行业     ] │ 信息技术              │          │
│  │  客户来源       │ [▼ --不导入--   ] │                      │          │
│  │  ...           │                  │                      │          │
│  │                                                                      │
│  重复处理策略:                                                            │
│  (●) 跳过重复记录   ( ) 更新已有记录   ( ) 仍然创建                       │
│                                                                          │
│  ═══ 步骤三：导入预览 ═══                                                │
│                                                                          │
│  解析完成：共 500 条记录                                                  │
│  其中：有效 485 条  |  格式错误 8 条  |  疑似重复 7 条                     │
│                                                                          │
│  [查看错误明细]   [查看重复明细]                                           │
│                                                                          │
│                                    [上一步]  [确认导入]                   │
│                                                                          │
│  ═══ 步骤四：导入结果 ═══                                                │
│                                                                          │
│  ✅ 导入完成                                                             │
│  成功: 478 条  |  跳过(重复): 7 条  |  失败: 15 条                        │
│                                                                          │
│  [下载失败明细]   [返回客户列表]                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 5.5 接口设计

#### 5.5.1 完整API列表

| 序号               | 接口路径                            | 方法   | 说明                 | 权限要求          |
| ------------------ | ----------------------------------- | ------ | -------------------- | ----------------- |
| **客户基础操作**   |                                     |        |                      |                   |
| 1                  | /api/v1/customers                   | POST   | 创建客户             | customer:create   |
| 2                  | /api/v1/customers                   | GET    | 查询客户列表（分页） | customer:list     |
| 3                  | /api/v1/customers/{id}              | GET    | 获取客户详情         | customer:detail   |
| 4                  | /api/v1/customers/{id}              | PUT    | 更新客户信息         | customer:update   |
| 5                  | /api/v1/customers/{id}              | DELETE | 删除客户（逻辑删除） | customer:delete   |
| 6                  | /api/v1/customers/batch-delete      | POST   | 批量删除客户         | customer:delete   |
| 7                  | /api/v1/customers/{id}/status       | PUT    | 变更客户状态         | customer:update   |
| **客户查重与合并** |                                     |        |                      |                   |
| 8                  | /api/v1/customers/check-duplicate   | POST   | 客户查重检测         | customer:create   |
| 9                  | /api/v1/customers/merge             | POST   | 合并客户             | customer:merge    |
| 10                 | /api/v1/customers/merge/preview     | POST   | 合并预览（对比差异） | customer:merge    |
| **公海池操作**     |                                     |        |                      |                   |
| 11                 | /api/v1/customer-pool               | GET    | 查询公海池列表       | pool:list         |
| 12                 | /api/v1/customer-pool/claim         | POST   | 领取客户             | pool:claim        |
| 13                 | /api/v1/customer-pool/batch-claim   | POST   | 批量领取客户         | pool:claim        |
| 14                 | /api/v1/customer-pool/assign        | POST   | 分配客户（管理员）   | pool:assign       |
| 15                 | /api/v1/customer-pool/return        | POST   | 退回公海             | pool:return       |
| 16                 | /api/v1/customer-pool/batch-return  | POST   | 批量退回公海         | pool:return       |
| 17                 | /api/v1/customer-pool/logs          | GET    | 公海操作日志查询     | pool:log          |
| **客户转移**       |                                     |        |                      |                   |
| 18                 | /api/v1/customers/transfer          | POST   | 转移客户负责人       | customer:transfer |
| 19                 | /api/v1/customers/batch-transfer    | POST   | 批量转移             | customer:transfer |
| **联系人管理**     |                                     |        |                      |                   |
| 20                 | /api/v1/customers/{id}/contacts     | GET    | 查询客户联系人列表   | contact:list      |
| 21                 | /api/v1/customers/{id}/contacts     | POST   | 添加联系人           | contact:create    |
| 22                 | /api/v1/contacts/{id}               | PUT    | 更新联系人           | contact:update    |
| 23                 | /api/v1/contacts/{id}               | DELETE | 删除联系人           | contact:delete    |
| **跟进记录**       |                                     |        |                      |                   |
| 24                 | /api/v1/customers/{id}/follow-ups   | GET    | 查询跟进记录列表     | follow:list       |
| 25                 | /api/v1/customers/{id}/follow-ups   | POST   | 添加跟进记录         | follow:create     |
| 26                 | /api/v1/follow-ups/{id}             | PUT    | 更新跟进记录         | follow:update     |
| 27                 | /api/v1/follow-ups/{id}             | DELETE | 删除跟进记录         | follow:delete     |
| **客户标签**       |                                     |        |                      |                   |
| 28                 | /api/v1/customer-tags               | GET    | 查询标签列表         | tag:list          |
| 29                 | /api/v1/customer-tags               | POST   | 创建标签             | tag:create        |
| 30                 | /api/v1/customer-tags/{id}          | PUT    | 更新标签             | tag:update        |
| 31                 | /api/v1/customer-tags/{id}          | DELETE | 删除标签             | tag:delete        |
| 32                 | /api/v1/customers/{id}/tags         | POST   | 为客户打标签         | customer:tag      |
| 33                 | /api/v1/customers/{id}/tags/{tagId} | DELETE | 移除客户标签         | customer:tag      |
| 34                 | /api/v1/customers/batch-tag         | POST   | 批量打标签           | customer:tag      |
| **导入导出**       |                                     |        |                      |                   |
| 35                 | /api/v1/customers/import/template   | GET    | 下载导入模板         | customer:import   |
| 36                 | /api/v1/customers/import/upload     | POST   | 上传导入文件         | customer:import   |
| 37                 | /api/v1/customers/import/preview    | POST   | 导入预览（解析校验） | customer:import   |
| 38                 | /api/v1/customers/import/execute    | POST   | 执行导入             | customer:import   |
| 39                 | /api/v1/customers/import/logs       | GET    | 导入记录列表         | customer:import   |
| 40                 | /api/v1/customers/import/logs/{id}  | GET    | 导入记录详情         | customer:import   |
| 41                 | /api/v1/customers/export            | POST   | 导出客户数据         | customer:export   |
| **自定义字段**     |                                     |        |                      |                   |
| 42                 | /api/v1/customer-fields             | GET    | 查询自定义字段列表   | field:list        |
| 43                 | /api/v1/customer-fields             | POST   | 创建自定义字段       | field:manage      |
| 44                 | /api/v1/customer-fields/{id}        | PUT    | 更新自定义字段       | field:manage      |
| 45                 | /api/v1/customer-fields/{id}        | DELETE | 删除自定义字段       | field:manage      |

#### 5.5.2 关键接口请求/响应示例

##### （1）创建客户 `POST /api/v1/customers`

**请求体：**

```json
{
  "customerName": "ABC科技有限公司",
  "customerType": 1,
  "source": "website",
  "industryId": 1001,
  "scale": "medium",
  "province": "北京",
  "city": "北京",
  "district": "海淀区",
  "address": "中关村科技园区XX号XX大厦12层",
  "level": "B",
  "intentionLevel": 2,
  "phone": "010-12345678",
  "email": "info@abctech.com",
  "website": "www.abctech.com",
  "unifiedCreditCode": "91110000MA12345X",
  "legalPerson": "王建国",
  "registeredCapital": 500.0,
  "establishedDate": "2018-06-15",
  "employeeCount": 260,
  "description": "行业头部企业，对ERP系统有替换需求",
  "customFields": {
    "cooperation_product": "ERP系统",
    "budget_range": "50-100万"
  },
  "contacts": [
    {
      "contactName": "赵芳",
      "phone": "13612345678",
      "position": "IT经理",
      "roleInDecision": "使用者",
      "isPrimary": 1
    }
  ],
  "tagIds": [101, 205],
  "skipDuplicateCheck": false
}
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 10086,
    "customerNo": "CUS202603030001",
    "customerName": "ABC科技有限公司",
    "status": "lead",
    "ownerId": 1001,
    "ownerName": "张三",
    "createdAt": "2026-03-03T10:30:00"
  }
}
```

**查重拦截响应 (409)：**

```json
{
  "code": 409,
  "message": "检测到疑似重复客户",
  "data": {
    "duplicates": [
      {
        "id": 8001,
        "customerNo": "CUS202601150023",
        "customerName": "ABC科技有限责任公司",
        "phone": "010-12345678",
        "ownerId": 1002,
        "ownerName": "李四",
        "matchReason": "企业名称相似度92%，联系电话完全匹配",
        "matchFields": ["customerName", "phone"]
      }
    ],
    "allowForceCreate": true
  }
}
```

##### （2）查询客户列表 `GET /api/v1/customers`

**请求参数：**

| 参数名          | 类型   | 必填 | 说明                         |
| --------------- | ------ | ---- | ---------------------------- |
| page            | int    | 否   | 页码，默认1                  |
| pageSize        | int    | 否   | 每页条数，默认20，最大100    |
| keyword         | string | 否   | 关键字搜索（名称/编号/电话） |
| status          | string | 否   | 状态筛选（逗号分隔多选）     |
| level           | string | 否   | 等级筛选                     |
| source          | string | 否   | 来源筛选                     |
| industryId      | long   | 否   | 行业筛选                     |
| ownerId         | long   | 否   | 负责人筛选                   |
| deptId          | long   | 否   | 部门筛选（含下级）           |
| tagIds          | string | 否   | 标签ID（逗号分隔）           |
| createdAtStart  | string | 否   | 创建时间起 (yyyy-MM-dd)      |
| createdAtEnd    | string | 否   | 创建时间止                   |
| lastFollowStart | string | 否   | 最后跟进时间起               |
| lastFollowEnd   | string | 否   | 最后跟进时间止               |
| sortField       | string | 否   | 排序字段，默认created_at     |
| sortOrder       | string | 否   | asc/desc，默认desc           |

**成功响应：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1234,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "id": 10086,
        "customerNo": "CUS202603030001",
        "customerName": "ABC科技有限公司",
        "customerType": 1,
        "status": "intention",
        "statusName": "意向客户",
        "level": "A",
        "source": "website",
        "sourceName": "官网注册",
        "industryName": "信息技术",
        "phone": "010-****5678",
        "ownerId": 1001,
        "ownerName": "张三",
        "deptName": "销售一部",
        "lastFollowTime": "2026-03-01T10:30:00",
        "nextFollowTime": "2026-03-15T10:00:00",
        "followCount": 12,
        "dealAmount": 0,
        "tags": [
          { "id": 101, "tagName": "科技行业", "color": "#1890ff" },
          { "id": 205, "tagName": "重点客户", "color": "#f5222d" }
        ],
        "createdAt": "2026-02-15T10:00:00"
      }
    ]
  }
}
```

##### （3）领取公海客户 `POST /api/v1/customer-pool/claim`

**请求体：**

```json
{
  "customerIds": [2001]
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "领取成功",
  "data": {
    "claimedCount": 1,
    "todayClaimedCount": 4,
    "todayRemaining": 6,
    "protectUntil": "2026-03-18T00:00:00"
  }
}
```

**失败响应：**

```json
{
  "code": 400,
  "message": "领取失败：您今日领取已达上限(10个/天)",
  "data": {
    "reason": "DAILY_LIMIT_EXCEEDED",
    "todayClaimedCount": 10,
    "dailyLimit": 10
  }
}
```

##### （4）添加跟进记录 `POST /api/v1/customers/{id}/follow-ups`

**请求体：**

```json
{
  "followType": "phone",
  "followTime": "2026-03-03T10:30:00",
  "contactId": 5001,
  "content": "与赵经理通话30分钟，沟通了产品演示时间安排。客户反馈Q2有预算，希望3月中旬安排现场演示。",
  "result": "客户同意3月15日安排现场演示",
  "nextPlan": "准备演示方案，预约3月15日拜访",
  "nextFollowTime": "2026-03-15T10:00:00",
  "intentionLevel": 3,
  "duration": 1800,
  "relatedOpportunityId": 3001,
  "attachments": [
    {
      "name": "会议纪要.docx",
      "url": "/files/2026/03/meeting_notes_001.docx",
      "size": 25600
    }
  ]
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "添加成功",
  "data": {
    "id": 80001,
    "customerId": 10086,
    "followType": "phone",
    "followTime": "2026-03-03T10:30:00",
    "createdByName": "张三",
    "createdAt": "2026-03-03T10:35:00"
  }
}
```

##### （5）执行导入 `POST /api/v1/customers/import/execute`

**请求体：**

```json
{
  "importFileId": "file_20260303_001",
  "fieldMapping": {
    "A": "customerName",
    "B": "customerType",
    "C": "phone",
    "D": "email",
    "E": "industryId",
    "F": "province",
    "G": "city",
    "H": "address",
    "I": "source"
  },
  "duplicateStrategy": "skip",
  "defaultValues": {
    "level": "C",
    "status": "lead"
  }
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "导入任务已提交",
  "data": {
    "importLogId": 9001,
    "status": "processing",
    "totalCount": 500,
    "wsChannel": "/ws/import/9001"
  }
}
```

**WebSocket推送消息（进度）：**

```json
{
  "importLogId": 9001,
  "status": "processing",
  "progress": 65,
  "processedCount": 325,
  "successCount": 310,
  "failCount": 10,
  "duplicateCount": 5
}
```

**WebSocket推送消息（完成）：**

```json
{
  "importLogId": 9001,
  "status": "completed",
  "progress": 100,
  "totalCount": 500,
  "successCount": 478,
  "failCount": 15,
  "duplicateCount": 7,
  "errorFileUrl": "/files/import/error_9001.xlsx",
  "finishedAt": "2026-03-03T10:42:30"
}
```

##### （6）分配公海客户 `POST /api/v1/customer-pool/assign`

**请求体：**

```json
{
  "assignments": [
    { "customerId": 2001, "toOwnerId": 1001 },
    { "customerId": 2002, "toOwnerId": 1001 },
    { "customerId": 2003, "toOwnerId": 1002 }
  ],
  "reason": "按区域重新分配"
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "分配成功",
  "data": {
    "totalCount": 3,
    "successCount": 3,
    "failCount": 0,
    "details": [
      { "customerId": 2001, "success": true, "ownerName": "张三" },
      { "customerId": 2002, "success": true, "ownerName": "张三" },
      { "customerId": 2003, "success": true, "ownerName": "李四" }
    ]
  }
}
```

---

### 5.6 业务规则

#### 5.6.1 客户查重规则

查重规则采用多维度匹配策略，按优先级从高到低执行：

| 优先级 | 匹配维度         | 匹配方式               | 判定     | 说明                                     |
| ------ | ---------------- | ---------------------- | -------- | ---------------------------------------- |
| P0     | 统一社会信用代码 | 精确匹配               | 确认重复 | 18位信用代码完全一致                     |
| P1     | 主联系电话       | 精确匹配               | 确认重复 | 去除区号、空格后比对                     |
| P2     | 主联系邮箱       | 精确匹配（忽略大小写） | 确认重复 | 标准化后比对                             |
| P3     | 企业名称         | 模糊匹配               | 疑似重复 | 相似度>=80%触发预警                      |
| P4     | 联系人手机号     | 交叉匹配               | 疑似重复 | 新客户联系人手机号在已有客户联系人中存在 |

**企业名称模糊匹配算法说明：**

1. **预处理**: 去除公司后缀词（有限公司、有限责任公司、股份有限公司、集团等）
2. **预处理**: 去除括号及内容、空格、特殊字符
3. **算法**: 采用编辑距离(Levenshtein Distance)结合Jaccard相似系数
4. **阈值**: 相似度 >= 80% 判定为疑似重复
5. **示例**:
   - "ABC科技有限公司" vs "ABC科技有限责任公司" → 相似度: 100%（去后缀后完全一致）
   - "北京ABC科技" vs "ABC科技" → 相似度: 85%（疑似重复）
   - "ABC科技" vs "ABC教育" → 相似度: 50%（不判定重复）

**查重执行时机：**

| 场景                | 方式         | 行为                                           |
| ------------------- | ------------ | ---------------------------------------------- |
| 新建客户-填写表单时 | 实时异步查重 | 输入客户名称/电话/邮箱后自动触发，提示疑似重复 |
| 新建客户-提交时     | 同步查重     | 提交前强制查重，有重复需确认处理               |
| 批量导入时          | 异步批量查重 | 每行数据逐一查重，按配置策略处理               |
| 手动查重            | 用户主动触发 | 选择已有客户执行全量查重扫描                   |

#### 5.6.2 公海池规则

##### 回收条件

| 条件类型   | 客户状态              | 触发条件               | 说明       |
| ---------- | --------------------- | ---------------------- | ---------- |
| 超时未跟进 | 线索(lead)            | 分配后3天内无跟进记录  | 可配置     |
| 超时未跟进 | 潜在客户(potential)   | 最后跟进后7天无新跟进  | 可配置     |
| 超时未跟进 | 意向客户(intention)   | 最后跟进后15天无新跟进 | 可配置     |
| 超时未跟进 | 成交客户(deal)        | 最后跟进后30天无新跟进 | 可配置     |
| 超时未推进 | 意向客户(intention)   | 60天未产生商机         | 可配置     |
| 超时未推进 | 商机客户(opportunity) | 90天未成交             | 可配置     |
| 手动退回   | 任意                  | 负责人主动退回         | 需填写原因 |
| 管理员回收 | 任意                  | 管理员强制回收         | 需填写原因 |

##### 领取限制

| 限制类型   | 规则                              | 默认值 | 说明         |
| ---------- | --------------------------------- | ------ | ------------ |
| 持有上限   | 单人持有客户数不超过N个           | 200    | 超过无法领取 |
| 日领取上限 | 单人每日领取数不超过N个           | 10     | 0点重置      |
| 冷却期     | 被退回客户N小时内不可被同一人领取 | 24h    | 防止"洗数据" |
| 回退冷却   | 领取后N小时内退回不计入领取次数   | 2h     | 误领取保护   |

##### 保护期规则

客户被领取/分配后进入保护期，保护期内不会被系统自动回收：

| 客户状态              | 保护期 | 说明               |
| --------------------- | ------ | ------------------ |
| 线索(lead)            | 7天    | 新线索基本跟进时间 |
| 潜在客户(potential)   | 15天   | 需要持续培育       |
| 意向客户(intention)   | 30天   | 有明确意向，需推进 |
| 商机客户(opportunity) | 60天   | 已有商机跟进中     |
| 成交客户(deal)        | 90天   | 售后服务期         |

**保护期延长机制：** 每产生一次有效跟进记录（非系统自动记录），保护期自动延长至"当前时间 + 当前状态保护期天数"。

#### 5.6.3 客户分配规则

系统支持以下分配方式，管理员可在系统设置中配置默认分配策略：

| 分配方式 | 触发场景           | 规则说明                                    |
| -------- | ------------------ | ------------------------------------------- |
| 手动分配 | 管理员在公海池操作 | 管理员指定客户分配给特定销售人员            |
| 自动轮询 | 新线索进入/导入    | 按部门内销售人员顺序轮流分配（Round-Robin） |
| 权重分配 | 新线索进入/导入    | 按销售人员配置权重比例分配                  |
| 区域匹配 | 新线索进入/导入    | 根据客户区域自动分配给对应区域负责人        |
| 行业匹配 | 新线索进入/导入    | 根据客户行业自动分配给对应行业线负责人      |
| 自行领取 | 公海池操作         | 销售人员从公海池主动领取                    |

**自动分配优先级（依次匹配）：**

```
① 区域+行业精确匹配 → 找到对应销售人员
② 仅区域匹配 → 该区域下轮询分配
③ 仅行业匹配 → 该行业线下轮询分配
④ 均无匹配 → 全部门内按权重轮询分配
⑤ 分配失败（所有人已满员）→ 留在公海池
```

#### 5.6.4 自动打标规则

系统支持配置自动打标规则，在客户创建、更新、导入时自动为客户打上对应标签：

| 规则类型 | 匹配条件示例                    | 自动标签     | 触发时机  |
| -------- | ------------------------------- | ------------ | --------- |
| 行业匹配 | industry_id IN (1001,1002,1003) | "科技行业"   | 创建/更新 |
| 规模匹配 | scale = 'enterprise'            | "大型企业"   | 创建/更新 |
| 区域匹配 | province = '北京'               | "北京客户"   | 创建/更新 |
| 来源匹配 | source = 'exhibition'           | "展会线索"   | 创建      |
| 金额匹配 | deal_amount >= 1000000          | "百万级客户" | 成交后    |
| 复购匹配 | deal_count >= 2                 | "复购客户"   | 成交后    |
| 活跃度   | 30天内follow_count >= 5         | "活跃客户"   | 跟进后    |
| 沉默预警 | 最后跟进距今 > 15天             | "沉默预警"   | 定时任务  |
| 高意向   | intention_level >= 3            | "高意向"     | 跟进后    |

**自动打标规则配置结构（存储在 customer_tags.auto_rule 字段中）：**

```json
{
  "conditions": [
    {
      "field": "industry_id",
      "operator": "in",
      "value": [1001, 1002, 1003]
    },
    {
      "field": "scale",
      "operator": "eq",
      "value": "enterprise"
    }
  ],
  "logic": "AND",
  "triggerOn": ["create", "update"]
}
```

支持的操作符：`eq`(等于), `ne`(不等于), `gt`(大于), `lt`(小于), `gte`(大于等于), `lte`(小于等于), `in`(包含于), `not_in`(不包含于), `like`(模糊匹配), `between`(区间)。

条件组合逻辑：`AND`(全部满足), `OR`(满足任一)。

#### 5.6.5 RBAC权限矩阵

以下矩阵定义了各角色在客户管理中心的操作权限：

| 操作           | 权限标识          | 超级管理员 | 销售总监 | 销售主管 | 销售人员 | 客服人员 | 只读用户 |
| -------------- | ----------------- | :--------: | :------: | :------: | :------: | :------: | :------: |
| **客户基础**   |                   |            |          |          |          |          |          |
| 查看客户列表   | customer:list     |    全部    |   全部   |  本部门  |   本人   | 本人关联 | 本人关联 |
| 查看客户详情   | customer:detail   |    全部    |   全部   |  本部门  |   本人   | 本人关联 | 本人关联 |
| 创建客户       | customer:create   |     Y      |    Y     |    Y     |    Y     |    N     |    N     |
| 编辑客户       | customer:update   |    全部    |   全部   |  本部门  |   本人   |    N     |    N     |
| 删除客户       | customer:delete   |     Y      |    Y     |    N     |    N     |    N     |    N     |
| 变更客户状态   | customer:status   |    全部    |   全部   |  本部门  |   本人   |    N     |    N     |
| **联系人**     |                   |            |          |          |          |          |          |
| 查看联系人     | contact:list      |    全部    |   全部   |  本部门  |   本人   | 本人关联 | 本人关联 |
| 添加联系人     | contact:create    |     Y      |    Y     |    Y     |    Y     |    N     |    N     |
| 编辑联系人     | contact:update    |    全部    |   全部   |  本部门  |   本人   |    N     |    N     |
| 删除联系人     | contact:delete    |     Y      |    Y     |    Y     |   本人   |    N     |    N     |
| **跟进记录**   |                   |            |          |          |          |          |          |
| 查看跟进记录   | follow:list       |    全部    |   全部   |  本部门  |   本人   | 本人关联 | 本人关联 |
| 添加跟进记录   | follow:create     |     Y      |    Y     |    Y     |    Y     |    Y     |    N     |
| 编辑跟进记录   | follow:update     |    全部    |   全部   |   本人   |   本人   |   本人   |    N     |
| 删除跟进记录   | follow:delete     |     Y      |    Y     |    N     |    N     |    N     |    N     |
| **公海池**     |                   |            |          |          |          |          |          |
| 查看公海池     | pool:list         |     Y      |    Y     |    Y     |    Y     |    N     |    N     |
| 领取客户       | pool:claim        |     Y      |    Y     |    Y     |    Y     |    N     |    N     |
| 分配客户       | pool:assign       |     Y      |    Y     |    Y     |    N     |    N     |    N     |
| 退回公海       | pool:return       |    全部    |   全部   |  本部门  |   本人   |    N     |    N     |
| 查看公海日志   | pool:log          |     Y      |    Y     |    Y     |    N     |    N     |    N     |
| **转移与合并** |                   |            |          |          |          |          |          |
| 转移客户       | customer:transfer |     Y      |    Y     |  本部门  |    N     |    N     |    N     |
| 合并客户       | customer:merge    |     Y      |    Y     |    N     |    N     |    N     |    N     |
| **标签**       |                   |            |          |          |          |          |          |
| 管理标签(CRUD) | tag:manage        |     Y      |    Y     |    N     |    N     |    N     |    N     |
| 为客户打标签   | customer:tag      |     Y      |    Y     |    Y     |    Y     |    N     |    N     |
| **导入导出**   |                   |            |          |          |          |          |          |
| 导入客户       | customer:import   |     Y      |    Y     |    Y     |    N     |    N     |    N     |
| 导出客户       | customer:export   |     Y      |    Y     |    Y     |    N     |    N     |    N     |
| **自定义字段** |                   |            |          |          |          |          |          |
| 管理自定义字段 | field:manage      |     Y      |    Y     |    N     |    N     |    N     |    N     |
| **系统配置**   |                   |            |          |          |          |          |          |
| 配置公海规则   | pool:config       |     Y      |    N     |    N     |    N     |    N     |    N     |
| 配置分配规则   | assign:config     |     Y      |    N     |    N     |    N     |    N     |    N     |
| 配置查重规则   | dedup:config      |     Y      |    N     |    N     |    N     |    N     |    N     |

**数据权限说明：**

| 数据范围 | 说明                                               |
| -------- | -------------------------------------------------- |
| 全部     | 可查看/操作所有客户数据（不受部门和个人限制）      |
| 本部门   | 可查看/操作本部门及下级部门所有成员的客户数据      |
| 本人     | 仅可查看/操作自己负责的客户数据                    |
| 本人关联 | 仅可查看与自己有业务关联的客户（如客服分配的客户） |

**数据权限实现机制：**

```
查询SQL动态拼接数据过滤条件：

超级管理员/销售总监:  无额外过滤
销售主管:            WHERE dept_id IN (本人部门及子部门ID集合)
销售人员:            WHERE owner_id = 当前用户ID
客服人员:            WHERE id IN (SELECT customer_id FROM customer_service_bindings
                                  WHERE service_user_id = 当前用户ID)
只读用户:            WHERE id IN (SELECT customer_id FROM customer_share_records
                                  WHERE shared_to_user_id = 当前用户ID)
```

**特殊权限规则：**

1. **越级查看**: 当销售人员通过系统内链接（如商机详情中的客户链接）跳转到非自己负责的客户时，记录访问日志但允许查看基本信息（隐藏电话、邮箱等敏感字段）。
2. **离职交接**: 员工离职时，其名下所有客户自动转入公海池或指定继任者，由管理员在"员工离职交接"流程中操作。
3. **临时授权**: 管理员可为特定用户授予"临时查看"某客户的权限，设定有效期（如3天），到期自动收回。
4. **敏感字段脱敏**: 对于手机号、邮箱等敏感字段，非客户负责人查看时默认脱敏显示（如138\*\*\*\*5678），需申请"查看完整信息"权限。

---

以上为客户管理中心的完整详细设计，涵盖功能架构、数据模型、核心流程、页面设计、接口设计和业务规则六个维度。该设计支持多租户架构，具备灵活的自定义字段能力、完善的公海池机制、多维度查重策略以及细粒度的RBAC权限控制，能够满足中大型销售团队的客户管理需求。
