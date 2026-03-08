## 11. API接口详细设计

### 11.1 API 设计规范

#### 11.1.1 RESTful 设计原则

本系统 API 严格遵循 RESTful 架构风格，核心原则如下：

| 原则     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| 资源导向 | URL 代表资源，使用名词而非动词，如 `/api/v1/customers` |
| 统一接口 | 通过 HTTP 方法区分操作语义                             |
| 无状态   | 每次请求携带完整认证信息，服务端不保存会话状态         |
| 版本控制 | URL 路径携带版本号，如 `/api/v1/`                      |
| 分层系统 | 通过网关统一入口，后端服务内部解耦                     |

#### 11.1.2 URL 命名规范

```
基础格式：https://{domain}/api/v1/{resource}

规则：
  1. 资源名使用小写英文复数名词：/api/v1/customers
  2. 子资源使用嵌套路径：/api/v1/customers/{id}/contacts
  3. 非 CRUD 操作使用动词后缀：/api/v1/customers/{id}/transfer
  4. 查询过滤使用 Query 参数：/api/v1/customers?status=active
  5. 路径层级不超过 3 层
```

#### 11.1.3 HTTP 方法语义

| 方法     | 语义                   | 幂等性 | 示例                            |
| -------- | ---------------------- | ------ | ------------------------------- |
| `GET`    | 查询资源（单个或列表） | 是     | `GET /api/v1/customers`         |
| `POST`   | 创建资源 / 触发操作    | 否     | `POST /api/v1/customers`        |
| `PUT`    | 全量更新资源           | 是     | `PUT /api/v1/customers/{id}`    |
| `PATCH`  | 部分更新资源           | 是     | `PATCH /api/v1/customers/{id}`  |
| `DELETE` | 删除资源（逻辑删除）   | 是     | `DELETE /api/v1/customers/{id}` |

#### 11.1.4 统一响应格式

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": 1709452800000
}
```

**分页响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "timestamp": 1709452800000
}
```

**错误响应：**

```json
{
  "code": 40001,
  "message": "客户名称不能为空",
  "errors": [
    {
      "field": "name",
      "message": "客户名称不能为空"
    }
  ],
  "timestamp": 1709452800000
}
```

#### 11.1.5 分页参数规范

| 参数         | 类型    | 必填 | 默认值 | 说明                 |
| ------------ | ------- | ---- | ------ | -------------------- |
| `page`       | Integer | 否   | 1      | 当前页码，从 1 开始  |
| `pageSize`   | Integer | 否   | 20     | 每页记录数，最大 100 |
| `total`      | Integer | —    | —      | 响应中返回，总记录数 |
| `totalPages` | Integer | —    | —      | 响应中返回，总页数   |

#### 11.1.6 筛选与排序参数规范

| 参数        | 类型   | 说明                     | 示例                    |
| ----------- | ------ | ------------------------ | ----------------------- |
| `keyword`   | String | 关键词模糊搜索           | `?keyword=华为`         |
| `sortField` | String | 排序字段                 | `?sortField=createdAt`  |
| `sortOrder` | String | 排序方向：`asc` / `desc` | `?sortOrder=desc`       |
| `startDate` | String | 时间范围起始（ISO 8601） | `?startDate=2026-01-01` |
| `endDate`   | String | 时间范围结束（ISO 8601） | `?endDate=2026-03-01`   |
| `status`    | String | 状态筛选                 | `?status=active`        |
| `{field}`   | String | 各模块自定义筛选字段     | `?industry=IT`          |

#### 11.1.7 错误码体系

| 错误码范围  | 模块       | 说明                 |
| ----------- | ---------- | -------------------- |
| 200         | 通用       | 操作成功             |
| 400         | 通用       | 请求参数错误         |
| 401         | 通用       | 未认证 / Token 过期  |
| 403         | 通用       | 无权限访问           |
| 404         | 通用       | 资源不存在           |
| 409         | 通用       | 资源冲突（如重复）   |
| 429         | 通用       | 请求频率超限         |
| 500         | 通用       | 服务器内部错误       |
| 10001~10999 | 认证模块   | 认证相关业务错误     |
| 20001~20999 | 客户管理   | 客户相关业务错误     |
| 21001~21999 | 联系人管理 | 联系人相关业务错误   |
| 30001~30999 | 商机管理   | 商机相关业务错误     |
| 31001~31999 | 合同管理   | 合同相关业务错误     |
| 32001~32999 | 回款管理   | 回款相关业务错误     |
| 40001~40999 | 呼叫中心   | 呼叫相关业务错误     |
| 50001~50999 | AI 分析    | AI 分析相关业务错误  |
| 60001~60999 | 拜访管理   | 拜访相关业务错误     |
| 70001~70999 | 知识库     | 知识库相关业务错误   |
| 80001~80999 | 报表       | 报表相关业务错误     |
| 90001~90999 | 系统管理   | 系统管理相关业务错误 |

**常见业务错误码明细：**

| 错误码 | 说明                       |
| ------ | -------------------------- |
| 10001  | 用户名或密码错误           |
| 10002  | 账号已被禁用               |
| 10003  | Token 已过期               |
| 10004  | Refresh Token 无效         |
| 10005  | 验证码错误或已过期         |
| 20001  | 客户名称已存在（查重命中） |
| 20002  | 客户已被锁定，无法操作     |
| 20003  | 公海池领取数量已达上限     |
| 20004  | 客户不在公海池中           |
| 30001  | 商机阶段不允许回退         |
| 30002  | 商机关联合同后不可删除     |
| 31001  | 合同审批流程中不可修改     |
| 31002  | 合同编号已存在             |
| 40001  | 呼叫线路不可用             |
| 40002  | 坐席忙，无法发起外呼       |
| 50001  | AI 分析服务不可用          |
| 50002  | 通话录音文件不存在         |

#### 11.1.8 请求头规范

| Header            | 必填                 | 说明                       |
| ----------------- | -------------------- | -------------------------- |
| `Authorization`   | 是（除登录接口）     | `Bearer {access_token}`    |
| `Content-Type`    | 是（POST/PUT/PATCH） | `application/json`         |
| `X-Request-Id`    | 否                   | 请求唯一标识，用于链路追踪 |
| `X-Tenant-Id`     | 是（多租户场景）     | 租户标识                   |
| `Accept-Language` | 否                   | 语言偏好，默认 `zh-CN`     |

#### 11.1.9 接口限流策略

| 接口类型     | 限流规则              | 说明               |
| ------------ | --------------------- | ------------------ |
| 登录接口     | 同一 IP 每分钟 10 次  | 防止暴力破解       |
| 导入接口     | 同一用户每小时 5 次   | 防止频繁大批量导入 |
| AI 分析接口  | 同一用户每分钟 20 次  | 控制 AI 资源消耗   |
| 文件上传接口 | 同一用户每分钟 30 次  | 防止资源滥用       |
| 普通接口     | 同一用户每分钟 300 次 | 通用限流           |

---

### 11.2 认证接口

#### 11.2.1 接口列表

| 序号 | 接口路径                      | 方法 | 说明               | 权限要求               |
| ---- | ----------------------------- | ---- | ------------------ | ---------------------- |
| 1    | `/api/v1/auth/login`          | POST | 用户登录           | 无需认证               |
| 2    | `/api/v1/auth/logout`         | POST | 用户登出           | 需登录                 |
| 3    | `/api/v1/auth/refresh-token`  | POST | 刷新访问令牌       | 需 Refresh Token       |
| 4    | `/api/v1/auth/password`       | PUT  | 修改密码           | 需登录                 |
| 5    | `/api/v1/auth/password/reset` | POST | 重置密码（管理员） | `system:user:resetPwd` |
| 6    | `/api/v1/auth/captcha`        | GET  | 获取图形验证码     | 无需认证               |
| 7    | `/api/v1/auth/sms-code`       | POST | 发送短信验证码     | 无需认证               |
| 8    | `/api/v1/auth/profile`        | GET  | 获取当前用户信息   | 需登录                 |
| 9    | `/api/v1/auth/profile`        | PUT  | 更新当前用户信息   | 需登录                 |

#### 11.2.2 关键接口详细说明

##### 11.2.2.1 用户登录

- **路径：** `POST /api/v1/auth/login`
- **说明：** 用户通过账号密码登录系统，返回访问令牌与刷新令牌
- **限流：** 同一 IP 每分钟 10 次

**请求体：**

```json
{
  "username": "admin",
  "password": "encrypted_password_string",
  "captchaId": "uuid-of-captcha",
  "captchaCode": "a3Kd",
  "loginType": "password"
}
```

| 字段        | 类型   | 必填 | 说明                                |
| ----------- | ------ | ---- | ----------------------------------- |
| username    | String | 是   | 用户名 / 手机号 / 邮箱              |
| password    | String | 是   | RSA 加密后的密码                    |
| captchaId   | String | 是   | 验证码 ID                           |
| captchaCode | String | 是   | 图形验证码                          |
| loginType   | String | 否   | 登录方式：`password`（默认）、`sms` |

**成功响应：**

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 7200,
    "tokenType": "Bearer",
    "user": {
      "id": "u_10001",
      "username": "admin",
      "realName": "张三",
      "avatar": "https://cdn.example.com/avatars/admin.jpg",
      "departmentId": "dept_001",
      "departmentName": "销售一部",
      "roles": ["admin", "sales_manager"],
      "permissions": [
        "customer:list",
        "customer:create",
        "customer:edit",
        "..."
      ]
    }
  },
  "timestamp": 1709452800000
}
```

**错误响应：**

```json
{
  "code": 10001,
  "message": "用户名或密码错误，剩余尝试次数：4",
  "timestamp": 1709452800000
}
```

##### 11.2.2.2 刷新令牌

- **路径：** `POST /api/v1/auth/refresh-token`
- **说明：** 使用 Refresh Token 换取新的 Access Token，实现无感续签

**请求体：**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "令牌刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 7200,
    "tokenType": "Bearer"
  },
  "timestamp": 1709452800000
}
```

##### 11.2.2.3 用户登出

- **路径：** `POST /api/v1/auth/logout`
- **说明：** 注销当前用户会话，将 Token 加入黑名单

**请求头：**

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**成功响应：**

```json
{
  "code": 200,
  "message": "登出成功",
  "data": null,
  "timestamp": 1709452800000
}
```

##### 11.2.2.4 获取当前用户信息

- **路径：** `GET /api/v1/auth/profile`
- **说明：** 获取当前登录用户的完整个人信息及权限列表

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "u_10001",
    "username": "admin",
    "realName": "张三",
    "phone": "138****8888",
    "email": "zhangsan@example.com",
    "avatar": "https://cdn.example.com/avatars/admin.jpg",
    "gender": 1,
    "departmentId": "dept_001",
    "departmentName": "销售一部",
    "position": "销售经理",
    "roles": [
      { "id": "role_001", "name": "admin", "label": "系统管理员" },
      { "id": "role_002", "name": "sales_manager", "label": "销售经理" }
    ],
    "permissions": ["customer:list", "customer:create", "customer:edit"],
    "lastLoginTime": "2026-03-03T08:30:00Z",
    "lastLoginIp": "192.168.1.100"
  },
  "timestamp": 1709452800000
}
```

---

### 11.3 客户管理接口

#### 11.3.1 接口列表

| 序号 | 接口路径                                           | 方法   | 说明                 | 权限要求                |
| ---- | -------------------------------------------------- | ------ | -------------------- | ----------------------- |
| 1    | `/api/v1/customers`                                | GET    | 获取客户列表（分页） | `customer:list`         |
| 2    | `/api/v1/customers`                                | POST   | 创建客户             | `customer:create`       |
| 3    | `/api/v1/customers/{id}`                           | GET    | 获取客户详情         | `customer:list`         |
| 4    | `/api/v1/customers/{id}`                           | PUT    | 更新客户信息         | `customer:edit`         |
| 5    | `/api/v1/customers/{id}`                           | DELETE | 删除客户             | `customer:delete`       |
| 6    | `/api/v1/customers/batch-delete`                   | POST   | 批量删除客户         | `customer:delete`       |
| 7    | `/api/v1/customers/check-duplicate`                | POST   | 客户查重             | `customer:list`         |
| 8    | `/api/v1/customers/import`                         | POST   | 批量导入客户         | `customer:import`       |
| 9    | `/api/v1/customers/export`                         | POST   | 导出客户数据         | `customer:export`       |
| 10   | `/api/v1/customers/import-template`                | GET    | 下载导入模板         | `customer:import`       |
| 11   | `/api/v1/customers/{id}/transfer`                  | POST   | 转移客户负责人       | `customer:transfer`     |
| 12   | `/api/v1/customers/batch-transfer`                 | POST   | 批量转移客户         | `customer:transfer`     |
| 13   | `/api/v1/customers/pool`                           | GET    | 获取公海池客户列表   | `customer:pool:list`    |
| 14   | `/api/v1/customers/{id}/release`                   | POST   | 释放客户到公海池     | `customer:pool:release` |
| 15   | `/api/v1/customers/{id}/claim`                     | POST   | 从公海池领取客户     | `customer:pool:claim`   |
| 16   | `/api/v1/customers/batch-release`                  | POST   | 批量释放至公海池     | `customer:pool:release` |
| 17   | `/api/v1/customers/{id}/tags`                      | GET    | 获取客户标签         | `customer:list`         |
| 18   | `/api/v1/customers/{id}/tags`                      | PUT    | 更新客户标签         | `customer:edit`         |
| 19   | `/api/v1/customers/{id}/follow-records`            | GET    | 获取跟进记录列表     | `customer:list`         |
| 20   | `/api/v1/customers/{id}/follow-records`            | POST   | 添加跟进记录         | `customer:follow`       |
| 21   | `/api/v1/customers/{id}/follow-records/{recordId}` | PUT    | 编辑跟进记录         | `customer:follow`       |
| 22   | `/api/v1/customers/{id}/follow-records/{recordId}` | DELETE | 删除跟进记录         | `customer:follow`       |
| 23   | `/api/v1/customers/{id}/contacts`                  | GET    | 获取客户关联联系人   | `customer:list`         |
| 24   | `/api/v1/customers/{id}/opportunities`             | GET    | 获取客户关联商机     | `customer:list`         |
| 25   | `/api/v1/customers/{id}/contracts`                 | GET    | 获取客户关联合同     | `customer:list`         |
| 26   | `/api/v1/customers/{id}/activities`                | GET    | 获取客户操作日志     | `customer:list`         |

#### 11.3.2 关键接口详细说明

##### 11.3.2.1 获取客户列表

- **路径：** `GET /api/v1/customers`
- **说明：** 分页查询客户列表，支持多条件筛选和排序

**请求参数（Query）：**

| 参数      | 类型    | 必填 | 说明                                                  |
| --------- | ------- | ---- | ----------------------------------------------------- |
| page      | Integer | 否   | 当前页码，默认 1                                      |
| pageSize  | Integer | 否   | 每页数量，默认 20                                     |
| keyword   | String  | 否   | 关键词搜索（客户名称 / 联系电话）                     |
| status    | String  | 否   | 客户状态：`potential`/`active`/`inactive`/`blacklist` |
| level     | String  | 否   | 客户等级：`A`/`B`/`C`/`D`                             |
| source    | String  | 否   | 客户来源                                              |
| industry  | String  | 否   | 所属行业                                              |
| ownerId   | String  | 否   | 负责人 ID                                             |
| tagIds    | String  | 否   | 标签 ID，逗号分隔                                     |
| startDate | String  | 否   | 创建时间起始                                          |
| endDate   | String  | 否   | 创建时间结束                                          |
| sortField | String  | 否   | 排序字段：`createdAt`/`updatedAt`/`lastFollowTime`    |
| sortOrder | String  | 否   | 排序方向：`asc`/`desc`                                |

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": "cust_10001",
        "name": "华为技术有限公司",
        "shortName": "华为",
        "level": "A",
        "status": "active",
        "source": "线上推广",
        "industry": "信息技术",
        "phone": "0755-28780808",
        "province": "广东省",
        "city": "深圳市",
        "address": "龙岗区坂田华为基地",
        "ownerId": "u_10001",
        "ownerName": "张三",
        "lastFollowTime": "2026-03-02T14:30:00Z",
        "nextFollowTime": "2026-03-05T10:00:00Z",
        "dealAmount": 1500000.0,
        "tags": [
          { "id": "tag_001", "name": "大客户", "color": "#FF5722" },
          { "id": "tag_002", "name": "战略合作", "color": "#2196F3" }
        ],
        "createdAt": "2026-01-15T09:00:00Z",
        "updatedAt": "2026-03-02T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1280,
      "totalPages": 64
    }
  },
  "timestamp": 1709452800000
}
```

##### 11.3.2.2 创建客户

- **路径：** `POST /api/v1/customers`
- **说明：** 创建新客户，自动触发查重校验

**请求体：**

```json
{
  "name": "华为技术有限公司",
  "shortName": "华为",
  "level": "A",
  "source": "线上推广",
  "industry": "信息技术",
  "scale": "10000人以上",
  "website": "https://www.huawei.com",
  "phone": "0755-28780808",
  "fax": "0755-28780800",
  "province": "广东省",
  "city": "深圳市",
  "district": "龙岗区",
  "address": "坂田华为基地",
  "remark": "全球领先的ICT基础设施和智能终端提供商",
  "tags": ["tag_001", "tag_002"],
  "contacts": [
    {
      "name": "李四",
      "position": "采购总监",
      "phone": "13800138001",
      "email": "lisi@huawei.com",
      "isPrimary": true
    }
  ]
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "客户创建成功",
  "data": {
    "id": "cust_10002",
    "name": "华为技术有限公司",
    "ownerId": "u_10001",
    "ownerName": "张三",
    "createdAt": "2026-03-03T10:00:00Z"
  },
  "timestamp": 1709452800000
}
```

**查重冲突响应：**

```json
{
  "code": 20001,
  "message": "检测到疑似重复客户",
  "data": {
    "duplicates": [
      {
        "id": "cust_00123",
        "name": "华为技术有限公司",
        "ownerName": "王五",
        "matchField": "name",
        "matchScore": 100
      }
    ]
  },
  "timestamp": 1709452800000
}
```

##### 11.3.2.3 客户查重

- **路径：** `POST /api/v1/customers/check-duplicate`
- **说明：** 根据客户名称、电话、统一社会信用代码等字段进行查重检测

**请求体：**

```json
{
  "name": "华为技术有限公司",
  "phone": "0755-28780808",
  "creditCode": "91440300708461136T"
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "hasDuplicate": true,
    "duplicates": [
      {
        "id": "cust_00123",
        "name": "华为技术有限公司",
        "phone": "0755-28780808",
        "ownerName": "王五",
        "departmentName": "销售二部",
        "matchFields": ["name", "phone"],
        "matchScore": 95
      }
    ]
  },
  "timestamp": 1709452800000
}
```

##### 11.3.2.4 批量导入客户

- **路径：** `POST /api/v1/customers/import`
- **说明：** 通过 Excel 文件批量导入客户数据，支持查重策略选择
- **Content-Type：** `multipart/form-data`

**请求参数：**

| 参数              | 类型   | 必填 | 说明                                                                          |
| ----------------- | ------ | ---- | ----------------------------------------------------------------------------- |
| file              | File   | 是   | Excel 文件（.xlsx），最大 10MB                                                |
| duplicateStrategy | String | 否   | 查重策略：`skip`（跳过）、`update`（覆盖）、`reject`（全部拒绝），默认 `skip` |
| ownerId           | String | 否   | 指定负责人，不填则为导入人                                                    |

**成功响应：**

```json
{
  "code": 200,
  "message": "导入任务已提交",
  "data": {
    "taskId": "import_task_001",
    "totalRows": 500,
    "status": "processing"
  },
  "timestamp": 1709452800000
}
```

##### 11.3.2.5 释放客户到公海池

- **路径：** `POST /api/v1/customers/{id}/release`
- **说明：** 将客户释放到公海池，清除负责人

**请求体：**

```json
{
  "reason": "长期未跟进，释放至公海池"
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "客户已释放至公海池",
  "data": {
    "id": "cust_10001",
    "name": "华为技术有限公司",
    "poolId": "pool_default",
    "releasedAt": "2026-03-03T10:00:00Z"
  },
  "timestamp": 1709452800000
}
```

##### 11.3.2.6 添加跟进记录

- **路径：** `POST /api/v1/customers/{id}/follow-records`
- **说明：** 为客户添加跟进记录

**请求体：**

```json
{
  "type": "phone",
  "content": "与李总沟通了新一期采购计划，对方表示下周可以安排面谈",
  "nextFollowTime": "2026-03-10T10:00:00Z",
  "contactId": "contact_001",
  "attachments": ["file_001", "file_002"]
}
```

| 字段           | 类型   | 必填 | 说明                                               |
| -------------- | ------ | ---- | -------------------------------------------------- |
| type           | String | 是   | 跟进方式：`phone`/`visit`/`email`/`wechat`/`other` |
| content        | String | 是   | 跟进内容                                           |
| nextFollowTime | String | 否   | 下次跟进时间                                       |
| contactId      | String | 否   | 关联联系人 ID                                      |
| attachments    | Array  | 否   | 附件文件 ID 列表                                   |

**成功响应：**

```json
{
  "code": 200,
  "message": "跟进记录添加成功",
  "data": {
    "id": "follow_20001",
    "customerId": "cust_10001",
    "type": "phone",
    "content": "与李总沟通了新一期采购计划，对方表示下周可以安排面谈",
    "creatorId": "u_10001",
    "creatorName": "张三",
    "createdAt": "2026-03-03T10:30:00Z"
  },
  "timestamp": 1709452800000
}
```

---

### 11.4 联系人管理接口

#### 11.4.1 接口列表

| 序号 | 接口路径                               | 方法   | 说明                   | 权限要求         |
| ---- | -------------------------------------- | ------ | ---------------------- | ---------------- |
| 1    | `/api/v1/contacts`                     | GET    | 获取联系人列表（分页） | `contact:list`   |
| 2    | `/api/v1/contacts`                     | POST   | 创建联系人             | `contact:create` |
| 3    | `/api/v1/contacts/{id}`                | GET    | 获取联系人详情         | `contact:list`   |
| 4    | `/api/v1/contacts/{id}`                | PUT    | 更新联系人信息         | `contact:edit`   |
| 5    | `/api/v1/contacts/{id}`                | DELETE | 删除联系人             | `contact:delete` |
| 6    | `/api/v1/contacts/batch-delete`        | POST   | 批量删除联系人         | `contact:delete` |
| 7    | `/api/v1/contacts/{id}/bindCustomer`   | POST   | 关联客户               | `contact:edit`   |
| 8    | `/api/v1/contacts/{id}/unbindCustomer` | POST   | 解除关联客户           | `contact:edit`   |
| 9    | `/api/v1/contacts/{id}/activities`     | GET    | 获取联系人操作日志     | `contact:list`   |
| 10   | `/api/v1/contacts/import`              | POST   | 批量导入联系人         | `contact:import` |
| 11   | `/api/v1/contacts/export`              | POST   | 导出联系人数据         | `contact:export` |

---

### 11.5 商机管理接口

#### 11.5.1 接口列表

| 序号 | 接口路径                                    | 方法   | 说明                 | 权限要求               |
| ---- | ------------------------------------------- | ------ | -------------------- | ---------------------- |
| 1    | `/api/v1/opportunities`                     | GET    | 获取商机列表（分页） | `opportunity:list`     |
| 2    | `/api/v1/opportunities`                     | POST   | 创建商机             | `opportunity:create`   |
| 3    | `/api/v1/opportunities/{id}`                | GET    | 获取商机详情         | `opportunity:list`     |
| 4    | `/api/v1/opportunities/{id}`                | PUT    | 更新商机信息         | `opportunity:edit`     |
| 5    | `/api/v1/opportunities/{id}`                | DELETE | 删除商机             | `opportunity:delete`   |
| 6    | `/api/v1/opportunities/{id}/stage`          | PUT    | 推进商机阶段         | `opportunity:edit`     |
| 7    | `/api/v1/opportunities/{id}/close-won`      | POST   | 标记商机赢单         | `opportunity:edit`     |
| 8    | `/api/v1/opportunities/{id}/close-lost`     | POST   | 标记商机输单         | `opportunity:edit`     |
| 9    | `/api/v1/opportunities/{id}/transfer`       | POST   | 转移商机负责人       | `opportunity:transfer` |
| 10   | `/api/v1/opportunities/{id}/follow-records` | GET    | 获取商机跟进记录     | `opportunity:list`     |
| 11   | `/api/v1/opportunities/{id}/follow-records` | POST   | 添加商机跟进记录     | `opportunity:follow`   |
| 12   | `/api/v1/opportunities/{id}/contacts`       | GET    | 获取商机关联联系人   | `opportunity:list`     |
| 13   | `/api/v1/opportunities/{id}/contacts`       | PUT    | 更新商机关联联系人   | `opportunity:edit`     |
| 14   | `/api/v1/opportunities/funnel`              | GET    | 获取销售漏斗统计     | `opportunity:list`     |
| 15   | `/api/v1/opportunities/forecast`            | GET    | 获取销售预测数据     | `opportunity:list`     |
| 16   | `/api/v1/opportunities/stage-config`        | GET    | 获取阶段配置         | `opportunity:list`     |

#### 11.5.2 关键接口详细说明

##### 11.5.2.1 推进商机阶段

- **路径：** `PUT /api/v1/opportunities/{id}/stage`
- **说明：** 将商机推进到下一阶段，支持阶段推进校验

**请求体：**

```json
{
  "stageId": "stage_003",
  "stageName": "方案报价",
  "winRate": 50,
  "remark": "客户已确认需求，进入报价阶段",
  "expectedAmount": 500000.0,
  "expectedCloseDate": "2026-06-30"
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "商机阶段已更新",
  "data": {
    "id": "opp_10001",
    "name": "华为云服务采购项目",
    "previousStage": "需求确认",
    "currentStage": "方案报价",
    "winRate": 50,
    "stageHistory": [
      {
        "stage": "初步接洽",
        "enterTime": "2026-01-15T09:00:00Z",
        "duration": 15
      },
      {
        "stage": "需求确认",
        "enterTime": "2026-01-30T09:00:00Z",
        "duration": 32
      },
      {
        "stage": "方案报价",
        "enterTime": "2026-03-03T10:00:00Z",
        "duration": null
      }
    ]
  },
  "timestamp": 1709452800000
}
```

##### 11.5.2.2 获取销售漏斗统计

- **路径：** `GET /api/v1/opportunities/funnel`
- **说明：** 获取当前销售漏斗各阶段商机分布统计

**请求参数（Query）：**

| 参数         | 类型   | 必填 | 说明                  |
| ------------ | ------ | ---- | --------------------- |
| ownerId      | String | 否   | 负责人 ID，不填为全部 |
| departmentId | String | 否   | 部门 ID               |
| startDate    | String | 否   | 时间范围起始          |
| endDate      | String | 否   | 时间范围结束          |

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "stages": [
      {
        "stageId": "stage_001",
        "stageName": "初步接洽",
        "count": 85,
        "amount": 12500000.0
      },
      {
        "stageId": "stage_002",
        "stageName": "需求确认",
        "count": 62,
        "amount": 9800000.0
      },
      {
        "stageId": "stage_003",
        "stageName": "方案报价",
        "count": 41,
        "amount": 7200000.0
      },
      {
        "stageId": "stage_004",
        "stageName": "商务谈判",
        "count": 28,
        "amount": 5100000.0
      },
      {
        "stageId": "stage_005",
        "stageName": "合同签约",
        "count": 15,
        "amount": 3200000.0
      }
    ],
    "totalCount": 231,
    "totalAmount": 37800000.0,
    "conversionRate": 17.6,
    "avgCycleDays": 45
  },
  "timestamp": 1709452800000
}
```

---

### 11.6 合同管理接口

#### 11.6.1 接口列表

| 序号 | 接口路径                                  | 方法   | 说明                  | 权限要求           |
| ---- | ----------------------------------------- | ------ | --------------------- | ------------------ |
| 1    | `/api/v1/contracts`                       | GET    | 获取合同列表（分页）  | `contract:list`    |
| 2    | `/api/v1/contracts`                       | POST   | 创建合同              | `contract:create`  |
| 3    | `/api/v1/contracts/{id}`                  | GET    | 获取合同详情          | `contract:list`    |
| 4    | `/api/v1/contracts/{id}`                  | PUT    | 更新合同信息          | `contract:edit`    |
| 5    | `/api/v1/contracts/{id}`                  | DELETE | 删除合同              | `contract:delete`  |
| 6    | `/api/v1/contracts/{id}/submit`           | POST   | 提交合同审批          | `contract:submit`  |
| 7    | `/api/v1/contracts/{id}/approve`          | POST   | 审批合同（通过/驳回） | `contract:approve` |
| 8    | `/api/v1/contracts/{id}/revoke`           | POST   | 撤回合同审批          | `contract:submit`  |
| 9    | `/api/v1/contracts/{id}/void`             | POST   | 合同作废              | `contract:void`    |
| 10   | `/api/v1/contracts/{id}/approval-records` | GET    | 获取合同审批记录      | `contract:list`    |
| 11   | `/api/v1/contracts/{id}/payments`         | GET    | 获取合同关联回款      | `contract:list`    |
| 12   | `/api/v1/contracts/{id}/attachments`      | GET    | 获取合同附件列表      | `contract:list`    |
| 13   | `/api/v1/contracts/{id}/attachments`      | POST   | 上传合同附件          | `contract:edit`    |
| 14   | `/api/v1/contracts/export`                | POST   | 导出合同数据          | `contract:export`  |
| 15   | `/api/v1/contracts/statistics`            | GET    | 合同统计概览          | `contract:list`    |

#### 11.6.2 关键接口详细说明

##### 11.6.2.1 提交合同审批

- **路径：** `POST /api/v1/contracts/{id}/submit`
- **说明：** 将合同提交至审批流程，触发审批工作流

**请求体：**

```json
{
  "approverIds": ["u_10002", "u_10003"],
  "remark": "请审批该合同，客户方已确认合同条款"
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "合同已提交审批",
  "data": {
    "id": "contract_10001",
    "contractNo": "HT-2026-0301",
    "status": "pending_approval",
    "approvalFlowId": "flow_50001",
    "currentApprover": {
      "id": "u_10002",
      "name": "李经理",
      "step": 1
    },
    "submittedAt": "2026-03-03T10:00:00Z"
  },
  "timestamp": 1709452800000
}
```

##### 11.6.2.2 审批合同

- **路径：** `POST /api/v1/contracts/{id}/approve`
- **说明：** 审批人对合同进行通过或驳回操作

**请求体：**

```json
{
  "action": "approve",
  "comment": "合同条款审核通过，同意签约"
}
```

| 字段    | 类型   | 必填 | 说明                                |
| ------- | ------ | ---- | ----------------------------------- |
| action  | String | 是   | `approve`（通过）/ `reject`（驳回） |
| comment | String | 是   | 审批意见                            |

---

### 11.7 回款管理接口

#### 11.7.1 接口列表

| 序号 | 接口路径                          | 方法   | 说明                     | 权限要求              |
| ---- | --------------------------------- | ------ | ------------------------ | --------------------- |
| 1    | `/api/v1/payments`                | GET    | 获取回款记录列表（分页） | `payment:list`        |
| 2    | `/api/v1/payments`                | POST   | 创建回款记录             | `payment:create`      |
| 3    | `/api/v1/payments/{id}`           | GET    | 获取回款记录详情         | `payment:list`        |
| 4    | `/api/v1/payments/{id}`           | PUT    | 更新回款记录             | `payment:edit`        |
| 5    | `/api/v1/payments/{id}`           | DELETE | 删除回款记录             | `payment:delete`      |
| 6    | `/api/v1/payments/{id}/confirm`   | POST   | 确认回款到账             | `payment:confirm`     |
| 7    | `/api/v1/payments/{id}/revoke`    | POST   | 撤销回款确认             | `payment:confirm`     |
| 8    | `/api/v1/payment-plans`           | GET    | 获取回款计划列表         | `payment:plan:list`   |
| 9    | `/api/v1/payment-plans`           | POST   | 创建回款计划             | `payment:plan:create` |
| 10   | `/api/v1/payment-plans/{id}`      | GET    | 获取回款计划详情         | `payment:plan:list`   |
| 11   | `/api/v1/payment-plans/{id}`      | PUT    | 更新回款计划             | `payment:plan:edit`   |
| 12   | `/api/v1/payment-plans/{id}`      | DELETE | 删除回款计划             | `payment:plan:delete` |
| 13   | `/api/v1/payments/statistics`     | GET    | 回款统计概览             | `payment:list`        |
| 14   | `/api/v1/payments/export`         | POST   | 导出回款数据             | `payment:export`      |
| 15   | `/api/v1/payment-plans/reminders` | GET    | 获取回款提醒列表         | `payment:plan:list`   |

#### 11.7.2 关键接口详细说明

##### 11.7.2.1 确认回款到账

- **路径：** `POST /api/v1/payments/{id}/confirm`
- **说明：** 财务人员确认回款已到账

**请求体：**

```json
{
  "actualAmount": 250000.0,
  "actualDate": "2026-03-02",
  "bankAccount": "招商银行 6226****8888",
  "remark": "第一期款项已到账",
  "voucherFileId": "file_003"
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "回款确认成功",
  "data": {
    "id": "pay_10001",
    "contractId": "contract_10001",
    "contractNo": "HT-2026-0301",
    "planAmount": 250000.0,
    "actualAmount": 250000.0,
    "status": "confirmed",
    "confirmedBy": "u_10005",
    "confirmedAt": "2026-03-03T10:00:00Z",
    "contractTotalAmount": 1000000.0,
    "contractPaidAmount": 250000.0,
    "contractUnpaidAmount": 750000.0
  },
  "timestamp": 1709452800000
}
```

---

### 11.8 呼叫中心接口

#### 11.8.1 接口列表

| 序号 | 接口路径                                              | 方法   | 说明                     | 权限要求               |
| ---- | ----------------------------------------------------- | ------ | ------------------------ | ---------------------- |
| 1    | `/api/v1/call-center/dial`                            | POST   | 发起外呼                 | `call:dial`            |
| 2    | `/api/v1/call-center/hangup`                          | POST   | 挂断通话                 | `call:dial`            |
| 3    | `/api/v1/call-center/hold`                            | POST   | 保持通话                 | `call:dial`            |
| 4    | `/api/v1/call-center/unhold`                          | POST   | 恢复通话                 | `call:dial`            |
| 5    | `/api/v1/call-center/transfer`                        | POST   | 转接通话                 | `call:dial`            |
| 6    | `/api/v1/call-center/agent/status`                    | PUT    | 更新坐席状态             | `call:agent`           |
| 7    | `/api/v1/call-center/agent/status`                    | GET    | 获取坐席当前状态         | `call:agent`           |
| 8    | `/api/v1/call-center/records`                         | GET    | 获取通话记录列表（分页） | `call:record:list`     |
| 9    | `/api/v1/call-center/records/{id}`                    | GET    | 获取通话记录详情         | `call:record:list`     |
| 10   | `/api/v1/call-center/records/{id}/recording`          | GET    | 获取通话录音文件         | `call:record:listen`   |
| 11   | `/api/v1/call-center/records/{id}/recording/download` | GET    | 下载通话录音             | `call:record:download` |
| 12   | `/api/v1/call-center/records/export`                  | POST   | 导出通话记录             | `call:record:export`   |
| 13   | `/api/v1/call-center/tasks`                           | GET    | 获取外呼任务列表         | `call:task:list`       |
| 14   | `/api/v1/call-center/tasks`                           | POST   | 创建外呼任务             | `call:task:create`     |
| 15   | `/api/v1/call-center/tasks/{id}`                      | GET    | 获取外呼任务详情         | `call:task:list`       |
| 16   | `/api/v1/call-center/tasks/{id}`                      | PUT    | 更新外呼任务             | `call:task:edit`       |
| 17   | `/api/v1/call-center/tasks/{id}`                      | DELETE | 删除外呼任务             | `call:task:delete`     |
| 18   | `/api/v1/call-center/tasks/{id}/start`                | POST   | 启动外呼任务             | `call:task:execute`    |
| 19   | `/api/v1/call-center/tasks/{id}/pause`                | POST   | 暂停外呼任务             | `call:task:execute`    |
| 20   | `/api/v1/call-center/tasks/{id}/stop`                 | POST   | 停止外呼任务             | `call:task:execute`    |
| 21   | `/api/v1/call-center/tasks/{id}/members`              | GET    | 获取任务成员列表         | `call:task:list`       |
| 22   | `/api/v1/call-center/tasks/{id}/members`              | PUT    | 更新任务成员             | `call:task:edit`       |
| 23   | `/api/v1/call-center/tasks/{id}/statistics`           | GET    | 获取任务执行统计         | `call:task:list`       |
| 24   | `/api/v1/call-center/lines`                           | GET    | 获取可用线路列表         | `call:dial`            |
| 25   | `/api/v1/call-center/statistics/realtime`             | GET    | 实时呼叫统计             | `call:statistics`      |
| 26   | `/api/v1/call-center/blacklist`                       | GET    | 获取号码黑名单           | `call:blacklist`       |
| 27   | `/api/v1/call-center/blacklist`                       | POST   | 添加号码到黑名单         | `call:blacklist`       |
| 28   | `/api/v1/call-center/blacklist/{id}`                  | DELETE | 从黑名单移除号码         | `call:blacklist`       |

#### 11.8.2 关键接口详细说明

##### 11.8.2.1 发起外呼

- **路径：** `POST /api/v1/call-center/dial`
- **说明：** 坐席发起外呼，系统通过 SIP 线路呼出并回拨坐席

**请求体：**

```json
{
  "calledNumber": "13800138000",
  "lineId": "line_001",
  "customerId": "cust_10001",
  "contactId": "contact_001",
  "taskId": "task_001",
  "callerDisplay": "021-55559999"
}
```

| 字段          | 类型   | 必填 | 说明                      |
| ------------- | ------ | ---- | ------------------------- |
| calledNumber  | String | 是   | 被叫号码                  |
| lineId        | String | 否   | 指定线路 ID，不填自动分配 |
| customerId    | String | 否   | 关联客户 ID               |
| contactId     | String | 否   | 关联联系人 ID             |
| taskId        | String | 否   | 关联外呼任务 ID           |
| callerDisplay | String | 否   | 主叫显号                  |

**成功响应：**

```json
{
  "code": 200,
  "message": "外呼发起成功",
  "data": {
    "callId": "call_20260303_10001",
    "sessionId": "sess_abcdef123456",
    "calledNumber": "13800138000",
    "lineId": "line_001",
    "status": "dialing",
    "startTime": "2026-03-03T10:30:00Z"
  },
  "timestamp": 1709452800000
}
```

##### 11.8.2.2 获取通话记录详情

- **路径：** `GET /api/v1/call-center/records/{id}`
- **说明：** 获取单条通话记录的完整详情

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "record_30001",
    "callId": "call_20260303_10001",
    "direction": "outbound",
    "callerNumber": "021-55559999",
    "calledNumber": "13800138000",
    "agentId": "u_10001",
    "agentName": "张三",
    "customerId": "cust_10001",
    "customerName": "华为技术有限公司",
    "contactId": "contact_001",
    "contactName": "李四",
    "lineId": "line_001",
    "lineName": "上海线路1",
    "status": "answered",
    "startTime": "2026-03-03T10:30:00Z",
    "answerTime": "2026-03-03T10:30:12Z",
    "endTime": "2026-03-03T10:45:30Z",
    "ringDuration": 12,
    "talkDuration": 918,
    "totalDuration": 930,
    "hangupBy": "agent",
    "hasRecording": true,
    "recordingUrl": "/api/v1/call-center/records/record_30001/recording",
    "recordingDuration": 918,
    "aiAnalysis": {
      "status": "completed",
      "sentiment": "positive",
      "keywords": ["采购计划", "报价", "合作"],
      "summary": "客户对产品感兴趣，要求提供详细报价方案"
    },
    "remark": "客户反馈积极，约定下周面谈",
    "createdAt": "2026-03-03T10:45:30Z"
  },
  "timestamp": 1709452800000
}
```

---

### 11.9 AI 分析接口

#### 11.9.1 接口列表

| 序号 | 接口路径                                                   | 方法 | 说明               | 权限要求                 |
| ---- | ---------------------------------------------------------- | ---- | ------------------ | ------------------------ |
| 1    | `/api/v1/ai/call-analysis/{callRecordId}`                  | POST | 发起通话分析       | `ai:call:analyze`        |
| 2    | `/api/v1/ai/call-analysis/{callRecordId}`                  | GET  | 获取通话分析结果   | `ai:call:analyze`        |
| 3    | `/api/v1/ai/call-analysis/{callRecordId}/transcript`       | GET  | 获取通话转写文本   | `ai:call:analyze`        |
| 4    | `/api/v1/ai/call-analysis/{callRecordId}/quality-score`    | GET  | 获取通话质检评分   | `ai:call:quality`        |
| 5    | `/api/v1/ai/call-analysis/batch`                           | POST | 批量发起通话分析   | `ai:call:analyze`        |
| 6    | `/api/v1/ai/customer-profile/{customerId}`                 | GET  | 获取客户智能画像   | `ai:profile:view`        |
| 7    | `/api/v1/ai/customer-profile/{customerId}/refresh`         | POST | 刷新客户画像       | `ai:profile:view`        |
| 8    | `/api/v1/ai/prediction/churn`                              | GET  | 获取客户流失预测   | `ai:predict:view`        |
| 9    | `/api/v1/ai/prediction/deal-close`                         | GET  | 获取商机成交预测   | `ai:predict:view`        |
| 10   | `/api/v1/ai/prediction/revenue`                            | GET  | 获取收入预测       | `ai:predict:view`        |
| 11   | `/api/v1/ai/recommendation/next-action/{customerId}`       | GET  | 获取下一步行动推荐 | `ai:recommend:view`      |
| 12   | `/api/v1/ai/recommendation/similar-customers/{customerId}` | GET  | 获取相似客户推荐   | `ai:recommend:view`      |
| 13   | `/api/v1/ai/recommendation/cross-sell/{customerId}`        | GET  | 获取交叉销售推荐   | `ai:recommend:view`      |
| 14   | `/api/v1/ai/assistant/chat`                                | POST | AI 销售助手对话    | `ai:assistant:chat`      |
| 15   | `/api/v1/ai/assistant/email-draft`                         | POST | AI 邮件草稿生成    | `ai:assistant:chat`      |
| 16   | `/api/v1/ai/quality/rules`                                 | GET  | 获取质检规则列表   | `ai:call:quality`        |
| 17   | `/api/v1/ai/quality/rules`                                 | POST | 创建质检规则       | `ai:call:quality:config` |
| 18   | `/api/v1/ai/quality/rules/{id}`                            | PUT  | 更新质检规则       | `ai:call:quality:config` |

#### 11.9.2 关键接口详细说明

##### 11.9.2.1 发起通话分析

- **路径：** `POST /api/v1/ai/call-analysis/{callRecordId}`
- **说明：** 对指定通话录音发起 AI 分析，包括语音转写、情感分析、关键词提取、话术评分等

**请求体：**

```json
{
  "analysisTypes": [
    "transcript",
    "sentiment",
    "keywords",
    "summary",
    "quality_score"
  ],
  "language": "zh-CN",
  "speakerSeparation": true,
  "qualityRuleId": "rule_001"
}
```

| 字段              | 类型    | 必填 | 说明                        |
| ----------------- | ------- | ---- | --------------------------- |
| analysisTypes     | Array   | 否   | 分析类型，默认全部          |
| language          | String  | 否   | 语言，默认 `zh-CN`          |
| speakerSeparation | Boolean | 否   | 是否区分说话人，默认 `true` |
| qualityRuleId     | String  | 否   | 质检规则 ID                 |

**成功响应：**

```json
{
  "code": 200,
  "message": "分析任务已提交",
  "data": {
    "taskId": "ai_task_001",
    "callRecordId": "record_30001",
    "status": "processing",
    "estimatedDuration": 120,
    "createdAt": "2026-03-03T10:50:00Z"
  },
  "timestamp": 1709452800000
}
```

##### 11.9.2.2 获取通话分析结果

- **路径：** `GET /api/v1/ai/call-analysis/{callRecordId}`
- **说明：** 获取通话的完整 AI 分析结果

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "callRecordId": "record_30001",
    "status": "completed",
    "analyzedAt": "2026-03-03T10:52:00Z",
    "transcript": {
      "totalSegments": 28,
      "segments": [
        {
          "speaker": "agent",
          "startTime": 0.5,
          "endTime": 5.2,
          "text": "您好，我是XX公司的张三，请问是李总吗？"
        },
        {
          "speaker": "customer",
          "startTime": 5.8,
          "endTime": 8.1,
          "text": "是的，您好，请问有什么事？"
        }
      ]
    },
    "sentiment": {
      "overall": "positive",
      "score": 0.78,
      "timeline": [
        { "timeRange": "0-60s", "sentiment": "neutral", "score": 0.5 },
        { "timeRange": "60-300s", "sentiment": "positive", "score": 0.72 },
        { "timeRange": "300-918s", "sentiment": "positive", "score": 0.85 }
      ]
    },
    "keywords": [
      { "word": "采购计划", "count": 5, "importance": 0.95 },
      { "word": "报价方案", "count": 3, "importance": 0.88 },
      { "word": "售后服务", "count": 2, "importance": 0.72 }
    ],
    "summary": "客户李总对公司产品表达了明确的采购意向，询问了产品报价和售后服务细节。张三详细介绍了产品优势和价格方案。双方约定下周进行线下面谈，进一步讨论合作细节。",
    "qualityScore": {
      "totalScore": 88,
      "dimensions": [
        { "name": "开场白规范", "score": 95, "maxScore": 100 },
        { "name": "需求挖掘", "score": 85, "maxScore": 100 },
        { "name": "产品介绍", "score": 90, "maxScore": 100 },
        { "name": "异议处理", "score": 80, "maxScore": 100 },
        { "name": "促成技巧", "score": 85, "maxScore": 100 },
        { "name": "礼貌用语", "score": 92, "maxScore": 100 }
      ],
      "suggestions": [
        "建议在异议处理环节增加更多客户案例引用",
        "可以更主动地引导客户明确下一步时间节点"
      ]
    },
    "agentTalkRatio": 0.55,
    "customerTalkRatio": 0.4,
    "silenceRatio": 0.05,
    "avgResponseTime": 1.2
  },
  "timestamp": 1709452800000
}
```

##### 11.9.2.3 获取客户智能画像

- **路径：** `GET /api/v1/ai/customer-profile/{customerId}`
- **说明：** 获取基于 AI 分析的客户 360 度画像

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "customerId": "cust_10001",
    "customerName": "华为技术有限公司",
    "generatedAt": "2026-03-03T08:00:00Z",
    "basicProfile": {
      "industry": "信息技术",
      "scale": "大型企业",
      "region": "华南",
      "cooperationYears": 2.5
    },
    "behaviorProfile": {
      "activityLevel": "high",
      "preferredContactMethod": "phone",
      "bestContactTime": "14:00-16:00",
      "avgResponseTime": "2小时",
      "meetingFrequency": "每月2次"
    },
    "valueProfile": {
      "customerValue": "high",
      "lifetimeValue": 5200000.0,
      "avgDealAmount": 520000.0,
      "totalDeals": 10,
      "paymentCreditScore": 95
    },
    "riskProfile": {
      "churnProbability": 0.08,
      "riskLevel": "low",
      "riskFactors": [],
      "lastWarning": null
    },
    "interestTags": ["云服务", "数据安全", "AI解决方案"],
    "relationshipMap": {
      "keyContacts": [
        {
          "name": "李四",
          "position": "采购总监",
          "influence": "high",
          "attitude": "supportive"
        },
        {
          "name": "王五",
          "position": "技术总监",
          "influence": "medium",
          "attitude": "neutral"
        }
      ],
      "decisionChain": "技术评估 → 采购审批 → 总经理签批"
    },
    "recommendedActions": [
      {
        "action": "安排技术方案演示",
        "priority": "high",
        "reason": "客户近期对AI解决方案关注度提升"
      },
      {
        "action": "发送行业白皮书",
        "priority": "medium",
        "reason": "增强客户对公司专业能力的认知"
      }
    ]
  },
  "timestamp": 1709452800000
}
```

##### 11.9.2.4 AI 销售助手对话

- **路径：** `POST /api/v1/ai/assistant/chat`
- **说明：** 与 AI 销售助手进行对话，获取销售建议、话术推荐等（支持 SSE 流式输出）

**请求体：**

```json
{
  "message": "我下午要拜访华为的李总，帮我准备一下谈话要点",
  "conversationId": "conv_001",
  "context": {
    "customerId": "cust_10001",
    "opportunityId": "opp_10001"
  },
  "stream": true
}
```

**成功响应（非流式）：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "conversationId": "conv_001",
    "messageId": "msg_001",
    "reply": "根据华为李总的历史沟通记录和当前商机阶段，建议您从以下几个方面准备：\n\n1. **开场寒暄**：上次通话中李总提到了近期的数字化转型计划，可以以此作为切入点...\n2. **核心议题**：...\n3. **注意事项**：...",
    "references": [
      {
        "type": "follow_record",
        "id": "follow_20001",
        "title": "3月2日通话记录"
      },
      {
        "type": "opportunity",
        "id": "opp_10001",
        "title": "华为云服务采购项目"
      }
    ],
    "createdAt": "2026-03-03T11:00:00Z"
  },
  "timestamp": 1709452800000
}
```

---

### 11.10 拜访管理接口

#### 11.10.1 接口列表

| 序号 | 接口路径                            | 方法   | 说明                     | 权限要求             |
| ---- | ----------------------------------- | ------ | ------------------------ | -------------------- |
| 1    | `/api/v1/visits`                    | GET    | 获取拜访记录列表（分页） | `visit:list`         |
| 2    | `/api/v1/visits`                    | POST   | 创建拜访记录             | `visit:create`       |
| 3    | `/api/v1/visits/{id}`               | GET    | 获取拜访记录详情         | `visit:list`         |
| 4    | `/api/v1/visits/{id}`               | PUT    | 更新拜访记录             | `visit:edit`         |
| 5    | `/api/v1/visits/{id}`               | DELETE | 删除拜访记录             | `visit:delete`       |
| 6    | `/api/v1/visits/{id}/check-in`      | POST   | 拜访签到                 | `visit:checkin`      |
| 7    | `/api/v1/visits/{id}/check-out`     | POST   | 拜访签退                 | `visit:checkin`      |
| 8    | `/api/v1/visits/plans`              | GET    | 获取拜访计划列表         | `visit:plan:list`    |
| 9    | `/api/v1/visits/plans`              | POST   | 创建拜访计划             | `visit:plan:create`  |
| 10   | `/api/v1/visits/plans/{id}`         | GET    | 获取拜访计划详情         | `visit:plan:list`    |
| 11   | `/api/v1/visits/plans/{id}`         | PUT    | 更新拜访计划             | `visit:plan:edit`    |
| 12   | `/api/v1/visits/plans/{id}`         | DELETE | 删除拜访计划             | `visit:plan:delete`  |
| 13   | `/api/v1/visits/plans/{id}/approve` | POST   | 审批拜访计划             | `visit:plan:approve` |
| 14   | `/api/v1/visits/map-view`           | GET    | 获取地图视图数据         | `visit:list`         |
| 15   | `/api/v1/visits/statistics`         | GET    | 拜访统计                 | `visit:list`         |
| 16   | `/api/v1/visits/{id}/photos`        | POST   | 上传拜访照片             | `visit:create`       |

#### 11.10.2 关键接口详细说明

##### 11.10.2.1 拜访签到

- **路径：** `POST /api/v1/visits/{id}/check-in`
- **说明：** 销售人员到达客户现场后进行签到，需提供定位信息

**请求体：**

```json
{
  "latitude": 22.5431,
  "longitude": 114.0579,
  "address": "广东省深圳市龙岗区坂田华为基地",
  "accuracy": 15.5,
  "photos": ["file_010", "file_011"],
  "remark": "已到达客户前台"
}
```

| 字段      | 类型   | 必填 | 说明            |
| --------- | ------ | ---- | --------------- |
| latitude  | Double | 是   | 纬度            |
| longitude | Double | 是   | 经度            |
| address   | String | 是   | 定位地址        |
| accuracy  | Double | 否   | 定位精度（米）  |
| photos    | Array  | 否   | 签到照片文件 ID |
| remark    | String | 否   | 签到备注        |

**成功响应：**

```json
{
  "code": 200,
  "message": "签到成功",
  "data": {
    "visitId": "visit_10001",
    "checkInTime": "2026-03-03T14:00:00Z",
    "checkInLocation": {
      "latitude": 22.5431,
      "longitude": 114.0579,
      "address": "广东省深圳市龙岗区坂田华为基地"
    },
    "distanceToCustomer": 120,
    "isWithinRange": true
  },
  "timestamp": 1709452800000
}
```

---

### 11.11 知识库接口

#### 11.11.1 接口列表

| 序号 | 接口路径                                    | 方法   | 说明                 | 权限要求                    |
| ---- | ------------------------------------------- | ------ | -------------------- | --------------------------- |
| 1    | `/api/v1/knowledge/articles`                | GET    | 获取文章列表（分页） | `knowledge:list`            |
| 2    | `/api/v1/knowledge/articles`                | POST   | 创建文章             | `knowledge:create`          |
| 3    | `/api/v1/knowledge/articles/{id}`           | GET    | 获取文章详情         | `knowledge:list`            |
| 4    | `/api/v1/knowledge/articles/{id}`           | PUT    | 更新文章             | `knowledge:edit`            |
| 5    | `/api/v1/knowledge/articles/{id}`           | DELETE | 删除文章             | `knowledge:delete`          |
| 6    | `/api/v1/knowledge/articles/{id}/publish`   | POST   | 发布文章             | `knowledge:publish`         |
| 7    | `/api/v1/knowledge/articles/{id}/unpublish` | POST   | 撤销发布             | `knowledge:publish`         |
| 8    | `/api/v1/knowledge/categories`              | GET    | 获取分类列表（树形） | `knowledge:list`            |
| 9    | `/api/v1/knowledge/categories`              | POST   | 创建分类             | `knowledge:category:manage` |
| 10   | `/api/v1/knowledge/categories/{id}`         | PUT    | 更新分类             | `knowledge:category:manage` |
| 11   | `/api/v1/knowledge/categories/{id}`         | DELETE | 删除分类             | `knowledge:category:manage` |
| 12   | `/api/v1/knowledge/search`                  | GET    | 全文搜索文章         | `knowledge:list`            |
| 13   | `/api/v1/knowledge/articles/{id}/like`      | POST   | 点赞文章             | `knowledge:list`            |
| 14   | `/api/v1/knowledge/articles/{id}/collect`   | POST   | 收藏文章             | `knowledge:list`            |
| 15   | `/api/v1/knowledge/articles/collections`    | GET    | 获取我的收藏         | `knowledge:list`            |
| 16   | `/api/v1/knowledge/articles/hot`            | GET    | 获取热门文章         | `knowledge:list`            |
| 17   | `/api/v1/knowledge/articles/{id}/views`     | POST   | 记录阅读量           | `knowledge:list`            |

---

### 11.12 报表接口

#### 11.12.1 接口列表

| 序号 | 接口路径                              | 方法 | 说明               | 权限要求             |
| ---- | ------------------------------------- | ---- | ------------------ | -------------------- |
| 1    | `/api/v1/reports/sales-funnel`        | GET  | 销售漏斗报表       | `report:funnel`      |
| 2    | `/api/v1/reports/sales-performance`   | GET  | 销售业绩报表       | `report:performance` |
| 3    | `/api/v1/reports/sales-ranking`       | GET  | 销售排行榜         | `report:performance` |
| 4    | `/api/v1/reports/sales-trend`         | GET  | 销售趋势分析       | `report:performance` |
| 5    | `/api/v1/reports/call-statistics`     | GET  | 通话统计报表       | `report:call`        |
| 6    | `/api/v1/reports/call-quality`        | GET  | 通话质量报表       | `report:call`        |
| 7    | `/api/v1/reports/customer-analysis`   | GET  | 客户分析报表       | `report:customer`    |
| 8    | `/api/v1/reports/customer-conversion` | GET  | 客户转化率分析     | `report:customer`    |
| 9    | `/api/v1/reports/customer-source`     | GET  | 客户来源分析       | `report:customer`    |
| 10   | `/api/v1/reports/payment-summary`     | GET  | 回款汇总报表       | `report:payment`     |
| 11   | `/api/v1/reports/contract-summary`    | GET  | 合同汇总报表       | `report:contract`    |
| 12   | `/api/v1/reports/visit-statistics`    | GET  | 拜访统计报表       | `report:visit`       |
| 13   | `/api/v1/reports/team-overview`       | GET  | 团队概览面板       | `report:team`        |
| 14   | `/api/v1/reports/dashboard`           | GET  | 首页仪表盘数据     | 需登录               |
| 15   | `/api/v1/reports/export`              | POST | 导出报表           | `report:export`      |
| 16   | `/api/v1/reports/custom`              | GET  | 自定义报表查询     | `report:custom`      |
| 17   | `/api/v1/reports/custom/templates`    | GET  | 获取报表模板列表   | `report:custom`      |
| 18   | `/api/v1/reports/custom/templates`    | POST | 保存自定义报表模板 | `report:custom`      |

#### 11.12.2 关键接口详细说明

##### 11.12.2.1 销售业绩报表

- **路径：** `GET /api/v1/reports/sales-performance`
- **说明：** 查询指定时间范围内的销售业绩数据

**请求参数（Query）：**

| 参数         | 类型   | 必填 | 说明                                                          |
| ------------ | ------ | ---- | ------------------------------------------------------------- |
| period       | String | 否   | 时间周期：`day`/`week`/`month`/`quarter`/`year`，默认 `month` |
| startDate    | String | 否   | 起始日期                                                      |
| endDate      | String | 否   | 结束日期                                                      |
| departmentId | String | 否   | 部门 ID                                                       |
| userId       | String | 否   | 指定销售人员 ID                                               |

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "summary": {
      "totalTarget": 10000000.0,
      "totalActual": 7580000.0,
      "completionRate": 75.8,
      "newCustomers": 128,
      "newOpportunities": 95,
      "wonDeals": 32,
      "totalCalls": 4520,
      "totalVisits": 380
    },
    "details": [
      {
        "userId": "u_10001",
        "userName": "张三",
        "departmentName": "销售一部",
        "target": 500000.0,
        "actual": 420000.0,
        "completionRate": 84.0,
        "newCustomers": 12,
        "newOpportunities": 8,
        "wonDeals": 3,
        "callCount": 380,
        "visitCount": 28,
        "avgDealCycle": 35
      }
    ],
    "trend": [
      { "date": "2026-01", "amount": 2100000.0 },
      { "date": "2026-02", "amount": 2680000.0 },
      { "date": "2026-03", "amount": 2800000.0 }
    ]
  },
  "timestamp": 1709452800000
}
```

##### 11.12.2.2 首页仪表盘数据

- **路径：** `GET /api/v1/reports/dashboard`
- **说明：** 获取当前用户首页仪表盘所需的全部汇总数据

**成功响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "today": {
      "newCustomers": 5,
      "newOpportunities": 3,
      "callCount": 28,
      "callDuration": 14520,
      "visitCount": 2,
      "paymentAmount": 150000.0
    },
    "thisMonth": {
      "target": 500000.0,
      "actual": 320000.0,
      "completionRate": 64.0,
      "newCustomers": 35,
      "wonDeals": 5
    },
    "pendingTasks": {
      "followUps": 8,
      "pendingApprovals": 3,
      "overduePayments": 2,
      "todayVisits": 2
    },
    "announcements": [
      {
        "id": "ann_001",
        "title": "3月销售冲刺通知",
        "createdAt": "2026-03-01T09:00:00Z"
      }
    ]
  },
  "timestamp": 1709452800000
}
```

---

### 11.13 系统管理接口

#### 11.13.1 用户管理接口

| 序号 | 接口路径                                   | 方法   | 说明                 | 权限要求                 |
| ---- | ------------------------------------------ | ------ | -------------------- | ------------------------ |
| 1    | `/api/v1/system/users`                     | GET    | 获取用户列表（分页） | `system:user:list`       |
| 2    | `/api/v1/system/users`                     | POST   | 创建用户             | `system:user:create`     |
| 3    | `/api/v1/system/users/{id}`                | GET    | 获取用户详情         | `system:user:list`       |
| 4    | `/api/v1/system/users/{id}`                | PUT    | 更新用户信息         | `system:user:edit`       |
| 5    | `/api/v1/system/users/{id}`                | DELETE | 删除用户             | `system:user:delete`     |
| 6    | `/api/v1/system/users/{id}/status`         | PATCH  | 启用/禁用用户        | `system:user:edit`       |
| 7    | `/api/v1/system/users/{id}/reset-password` | POST   | 重置用户密码         | `system:user:resetPwd`   |
| 8    | `/api/v1/system/users/{id}/roles`          | PUT    | 分配用户角色         | `system:user:assignRole` |
| 9    | `/api/v1/system/users/import`              | POST   | 批量导入用户         | `system:user:import`     |
| 10   | `/api/v1/system/users/export`              | POST   | 导出用户数据         | `system:user:export`     |

#### 11.13.2 角色管理接口

| 序号 | 接口路径                                | 方法   | 说明             | 权限要求                 |
| ---- | --------------------------------------- | ------ | ---------------- | ------------------------ |
| 1    | `/api/v1/system/roles`                  | GET    | 获取角色列表     | `system:role:list`       |
| 2    | `/api/v1/system/roles`                  | POST   | 创建角色         | `system:role:create`     |
| 3    | `/api/v1/system/roles/{id}`             | GET    | 获取角色详情     | `system:role:list`       |
| 4    | `/api/v1/system/roles/{id}`             | PUT    | 更新角色信息     | `system:role:edit`       |
| 5    | `/api/v1/system/roles/{id}`             | DELETE | 删除角色         | `system:role:delete`     |
| 6    | `/api/v1/system/roles/{id}/permissions` | GET    | 获取角色权限列表 | `system:role:list`       |
| 7    | `/api/v1/system/roles/{id}/permissions` | PUT    | 分配角色权限     | `system:role:assignPerm` |
| 8    | `/api/v1/system/roles/{id}/data-scope`  | PUT    | 设置数据权限范围 | `system:role:assignPerm` |

#### 11.13.3 部门管理接口

| 序号 | 接口路径                                  | 方法   | 说明             | 权限要求             |
| ---- | ----------------------------------------- | ------ | ---------------- | -------------------- |
| 1    | `/api/v1/system/departments`              | GET    | 获取部门树       | `system:dept:list`   |
| 2    | `/api/v1/system/departments`              | POST   | 创建部门         | `system:dept:create` |
| 3    | `/api/v1/system/departments/{id}`         | GET    | 获取部门详情     | `system:dept:list`   |
| 4    | `/api/v1/system/departments/{id}`         | PUT    | 更新部门信息     | `system:dept:edit`   |
| 5    | `/api/v1/system/departments/{id}`         | DELETE | 删除部门         | `system:dept:delete` |
| 6    | `/api/v1/system/departments/{id}/members` | GET    | 获取部门成员列表 | `system:dept:list`   |
| 7    | `/api/v1/system/departments/tree-select`  | GET    | 获取部门下拉树   | 需登录               |

#### 11.13.4 系统配置接口

| 序号 | 接口路径                                   | 方法   | 说明               | 权限要求             |
| ---- | ------------------------------------------ | ------ | ------------------ | -------------------- |
| 1    | `/api/v1/system/config`                    | GET    | 获取系统配置列表   | `system:config:list` |
| 2    | `/api/v1/system/config`                    | PUT    | 更新系统配置       | `system:config:edit` |
| 3    | `/api/v1/system/config/{key}`              | GET    | 获取指定配置项     | `system:config:list` |
| 4    | `/api/v1/system/config/customer-pool`      | GET    | 获取公海池规则配置 | `system:config:list` |
| 5    | `/api/v1/system/config/customer-pool`      | PUT    | 更新公海池规则配置 | `system:config:edit` |
| 6    | `/api/v1/system/config/approval-flow`      | GET    | 获取审批流程配置   | `system:config:list` |
| 7    | `/api/v1/system/config/approval-flow`      | PUT    | 更新审批流程配置   | `system:config:edit` |
| 8    | `/api/v1/system/config/notification`       | GET    | 获取通知配置       | `system:config:list` |
| 9    | `/api/v1/system/config/notification`       | PUT    | 更新通知配置       | `system:config:edit` |
| 10   | `/api/v1/system/dictionaries`              | GET    | 获取字典列表       | `system:dict:list`   |
| 11   | `/api/v1/system/dictionaries`              | POST   | 创建字典           | `system:dict:create` |
| 12   | `/api/v1/system/dictionaries/{id}`         | PUT    | 更新字典           | `system:dict:edit`   |
| 13   | `/api/v1/system/dictionaries/{id}`         | DELETE | 删除字典           | `system:dict:delete` |
| 14   | `/api/v1/system/dictionaries/{type}/items` | GET    | 获取字典项列表     | `system:dict:list`   |

#### 11.13.5 操作日志接口

| 序号 | 接口路径                               | 方法   | 说明                     | 权限要求            |
| ---- | -------------------------------------- | ------ | ------------------------ | ------------------- |
| 1    | `/api/v1/system/logs/operation`        | GET    | 获取操作日志列表（分页） | `system:log:list`   |
| 2    | `/api/v1/system/logs/operation/{id}`   | GET    | 获取操作日志详情         | `system:log:list`   |
| 3    | `/api/v1/system/logs/operation/export` | POST   | 导出操作日志             | `system:log:export` |
| 4    | `/api/v1/system/logs/login`            | GET    | 获取登录日志列表（分页） | `system:log:list`   |
| 5    | `/api/v1/system/logs/login/export`     | POST   | 导出登录日志             | `system:log:export` |
| 6    | `/api/v1/system/logs/clean`            | DELETE | 清理过期日志             | `system:log:clean`  |

#### 11.13.6 消息通知接口

| 序号 | 接口路径                                    | 方法   | 说明                 | 权限要求                     |
| ---- | ------------------------------------------- | ------ | -------------------- | ---------------------------- |
| 1    | `/api/v1/system/notifications`              | GET    | 获取通知列表（分页） | 需登录                       |
| 2    | `/api/v1/system/notifications/{id}`         | GET    | 获取通知详情         | 需登录                       |
| 3    | `/api/v1/system/notifications/{id}/read`    | POST   | 标记通知已读         | 需登录                       |
| 4    | `/api/v1/system/notifications/read-all`     | POST   | 全部标记已读         | 需登录                       |
| 5    | `/api/v1/system/notifications/unread-count` | GET    | 获取未读通知数量     | 需登录                       |
| 6    | `/api/v1/system/announcements`              | GET    | 获取系统公告列表     | 需登录                       |
| 7    | `/api/v1/system/announcements`              | POST   | 发布系统公告         | `system:announcement:create` |
| 8    | `/api/v1/system/announcements/{id}`         | PUT    | 更新系统公告         | `system:announcement:edit`   |
| 9    | `/api/v1/system/announcements/{id}`         | DELETE | 删除系统公告         | `system:announcement:delete` |

---

### 11.14 文件上传接口

#### 11.14.1 接口列表

| 序号 | 接口路径                      | 方法   | 说明               | 权限要求 |
| ---- | ----------------------------- | ------ | ------------------ | -------- |
| 1    | `/api/v1/files/upload`        | POST   | 通用文件上传       | 需登录   |
| 2    | `/api/v1/files/upload/image`  | POST   | 图片上传（带压缩） | 需登录   |
| 3    | `/api/v1/files/upload/batch`  | POST   | 批量文件上传       | 需登录   |
| 4    | `/api/v1/files/{id}`          | GET    | 获取文件信息       | 需登录   |
| 5    | `/api/v1/files/{id}/download` | GET    | 下载文件           | 需登录   |
| 6    | `/api/v1/files/{id}/preview`  | GET    | 预览文件           | 需登录   |
| 7    | `/api/v1/files/{id}`          | DELETE | 删除文件           | 需登录   |

#### 11.14.2 关键接口详细说明

##### 11.14.2.1 通用文件上传

- **路径：** `POST /api/v1/files/upload`
- **说明：** 上传文件到服务器，返回文件 ID 和访问地址
- **Content-Type：** `multipart/form-data`
- **限制：** 单文件最大 50MB

**请求参数：**

| 参数   | 类型   | 必填 | 说明                                                         |
| ------ | ------ | ---- | ------------------------------------------------------------ |
| file   | File   | 是   | 上传的文件                                                   |
| module | String | 是   | 所属模块：`customer`/`contract`/`visit`/`knowledge`/`avatar` |
| bizId  | String | 否   | 关联的业务记录 ID                                            |

**成功响应：**

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "id": "file_20001",
    "fileName": "合同扫描件.pdf",
    "originalName": "合同扫描件.pdf",
    "fileSize": 2048576,
    "fileSizeDisplay": "2.0 MB",
    "mimeType": "application/pdf",
    "extension": "pdf",
    "url": "https://cdn.example.com/files/2026/03/03/contract_scan.pdf",
    "thumbnailUrl": null,
    "module": "contract",
    "uploaderId": "u_10001",
    "uploaderName": "张三",
    "createdAt": "2026-03-03T11:00:00Z"
  },
  "timestamp": 1709452800000
}
```

**允许的文件类型：**

| 模块      | 允许类型                                                | 大小限制 |
| --------- | ------------------------------------------------------- | -------- |
| customer  | xlsx, xls, csv, pdf, doc, docx, jpg, png                | 10MB     |
| contract  | pdf, doc, docx, jpg, png                                | 50MB     |
| visit     | jpg, jpeg, png                                          | 5MB      |
| knowledge | pdf, doc, docx, ppt, pptx, xls, xlsx, md, txt, jpg, png | 20MB     |
| avatar    | jpg, jpeg, png, gif                                     | 2MB      |

##### 11.14.2.2 批量文件上传

- **路径：** `POST /api/v1/files/upload/batch`
- **说明：** 同时上传多个文件，最多 10 个
- **Content-Type：** `multipart/form-data`

**请求参数：**

| 参数   | 类型   | 必填 | 说明                 |
| ------ | ------ | ---- | -------------------- |
| files  | File[] | 是   | 文件数组，最多 10 个 |
| module | String | 是   | 所属模块             |
| bizId  | String | 否   | 关联的业务记录 ID    |

**成功响应：**

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "successCount": 3,
    "failCount": 0,
    "files": [
      {
        "id": "file_20001",
        "fileName": "photo_1.jpg",
        "url": "https://cdn.example.com/files/2026/03/03/photo_1.jpg",
        "fileSize": 1024000,
        "status": "success"
      },
      {
        "id": "file_20002",
        "fileName": "photo_2.jpg",
        "url": "https://cdn.example.com/files/2026/03/03/photo_2.jpg",
        "fileSize": 2048000,
        "status": "success"
      },
      {
        "id": "file_20003",
        "fileName": "photo_3.jpg",
        "url": "https://cdn.example.com/files/2026/03/03/photo_3.jpg",
        "fileSize": 1536000,
        "status": "success"
      }
    ]
  },
  "timestamp": 1709452800000
}
```

---

### 11.15 接口汇总

#### 11.15.1 各模块接口数量统计

| 序号 | 模块          | 路径前缀                                                       | 接口数量 | 说明                                           |
| ---- | ------------- | -------------------------------------------------------------- | -------- | ---------------------------------------------- |
| 1    | 认证模块      | `/api/v1/auth`                                                 | 9        | 登录、登出、Token 刷新、密码管理等             |
| 2    | 客户管理      | `/api/v1/customers`                                            | 26       | CRUD、公海池、查重、导入导出、标签、跟进记录等 |
| 3    | 联系人管理    | `/api/v1/contacts`                                             | 11       | CRUD、客户关联、导入导出等                     |
| 4    | 商机管理      | `/api/v1/opportunities`                                        | 16       | CRUD、阶段推进、漏斗统计、预测等               |
| 5    | 合同管理      | `/api/v1/contracts`                                            | 15       | CRUD、审批流程、附件管理等                     |
| 6    | 回款管理      | `/api/v1/payments`、`/api/v1/payment-plans`                    | 15       | 回款 CRUD、回款计划、确认等                    |
| 7    | 呼叫中心      | `/api/v1/call-center`                                          | 28       | 外呼、通话记录、录音、任务管理、黑名单等       |
| 8    | AI 分析       | `/api/v1/ai`                                                   | 18       | 通话分析、客户画像、预测、推荐、AI 助手等      |
| 9    | 拜访管理      | `/api/v1/visits`                                               | 16       | 拜访 CRUD、签到签退、计划管理等                |
| 10   | 知识库        | `/api/v1/knowledge`                                            | 17       | 文章 CRUD、分类管理、搜索、收藏等              |
| 11   | 报表          | `/api/v1/reports`                                              | 18       | 漏斗、业绩、通话统计、仪表盘、自定义报表等     |
| 12   | 系统管理-用户 | `/api/v1/system/users`                                         | 10       | 用户 CRUD、状态管理、角色分配等                |
| 13   | 系统管理-角色 | `/api/v1/system/roles`                                         | 8        | 角色 CRUD、权限分配、数据权限等                |
| 14   | 系统管理-部门 | `/api/v1/system/departments`                                   | 7        | 部门树 CRUD、成员查询等                        |
| 15   | 系统管理-配置 | `/api/v1/system/config`、`/api/v1/system/dictionaries`         | 14       | 系统配置、公海池规则、审批流程、字典管理等     |
| 16   | 系统管理-日志 | `/api/v1/system/logs`                                          | 6        | 操作日志、登录日志查询导出等                   |
| 17   | 系统管理-通知 | `/api/v1/system/notifications`、`/api/v1/system/announcements` | 9        | 通知管理、系统公告等                           |
| 18   | 文件管理      | `/api/v1/files`                                                | 7        | 文件上传、下载、预览、删除等                   |
|      | **合计**      |                                                                | **250**  |                                                |

#### 11.15.2 接口分类统计

| 操作类型    | HTTP 方法 | 数量    | 占比     |
| ----------- | --------- | ------- | -------- |
| 查询类      | GET       | 107     | 42.8%    |
| 创建/操作类 | POST      | 88      | 35.2%    |
| 更新类      | PUT       | 38      | 15.2%    |
| 部分更新类  | PATCH     | 2       | 0.8%     |
| 删除类      | DELETE    | 15      | 6.0%     |
| **合计**    |           | **250** | **100%** |

#### 11.15.3 接口认证与权限分布

| 认证要求   | 数量 | 说明                               |
| ---------- | ---- | ---------------------------------- |
| 无需认证   | 4    | 登录、获取验证码、发送短信验证码   |
| 仅需登录   | 23   | 个人信息、通知、仪表盘、文件管理等 |
| 需特定权限 | 223  | 各业务模块需对应权限点             |

#### 11.15.4 WebSocket 接口补充

除上述 RESTful 接口外，系统还提供以下 WebSocket 接口用于实时通信：

| 序号 | 路径                             | 说明                                                         |
| ---- | -------------------------------- | ------------------------------------------------------------ |
| 1    | `ws://{domain}/ws/call-center`   | 呼叫中心实时状态推送（来电弹屏、通话状态变更、坐席状态同步） |
| 2    | `ws://{domain}/ws/notifications` | 系统通知实时推送（审批提醒、回款提醒、跟进提醒）             |
| 3    | `ws://{domain}/ws/ai-assistant`  | AI 助手流式对话响应                                          |
| 4    | `ws://{domain}/ws/dashboard`     | 仪表盘数据实时刷新                                           |

**WebSocket 连接认证方式：**

```
ws://{domain}/ws/notifications?token={access_token}
```

**WebSocket 消息格式：**

```json
{
  "type": "NOTIFICATION",
  "event": "NEW_MESSAGE",
  "data": {
    "id": "notif_001",
    "title": "您有一条新的审批待处理",
    "content": "合同 HT-2026-0301 需要您审批",
    "createdAt": "2026-03-03T11:30:00Z"
  },
  "timestamp": 1709452800000
}
```

#### 11.15.5 API 版本演进策略

| 版本 | 状态             | 说明                   |
| ---- | ---------------- | ---------------------- |
| v1   | 当前版本（活跃） | 本文档所述全部接口     |
| v2   | 规划中           | 预留用于未来不兼容变更 |

**版本兼容性承诺：**

1. 同一大版本内仅做向后兼容的变更（新增字段、新增接口）
2. 废弃字段至少保留 2 个版本周期，通过响应头 `X-Deprecated-Fields` 提示
3. 大版本升级时，旧版本并行维护至少 6 个月
4. 所有接口变更通过变更日志（Changelog）记录并提前通知

---

以上为 AI 智能 CRM 销售管理系统全部 API 接口的详细设计，共涵盖 18 个模块、250 个 RESTful 接口以及 4 个 WebSocket 实时通道。每个接口均明确了路径、HTTP 方法、功能说明及权限要求，关键接口附带了完整的请求体与响应体示例。该设计遵循 RESTful 规范，采用统一的响应格式、错误码体系和分页规范，确保前后端协作高效、接口语义清晰。
