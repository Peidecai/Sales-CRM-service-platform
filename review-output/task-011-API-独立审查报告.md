# Task 11 — API 接口规范 独立审查报告

**依据文档**: `docs/chapters/chapter11.md`《API接口详细设计》  
**审查范围**: `packages/server/src` 下 Controller、`response.interceptor.ts`、`http-exception.filter.ts`  
**审查时间**: 独立人工审查（补原 task-011 超时未产出结论）

---

## 一、总体结论

| 维度           | 结论 | 说明                                                                     |
| -------------- | ---- | ------------------------------------------------------------------------ |
| URL 与全局前缀 | PASS | 使用 `/api/v1`，资源名复数、小写                                         |
| HTTP 方法语义  | PASS | GET/POST/PUT/DELETE 使用正确                                             |
| 统一响应格式   | WARN | 成功码与时间戳与设计不一致；分页结构缺少 `pagination` 与 `totalPages`    |
| 错误响应       | FAIL | 错误码体系与设计不一致；`errors` 为字符串数组而非 `{ field, message }[]` |
| 分页结构       | FAIL | 未按设计返回 `data.pagination` 与 `totalPages`                           |
| 鉴权与权限     | PASS | JwtAuthGuard + RolesGuard，需登录接口已保护                              |
| 对外开放适用性 | WARN | 需先统一响应/错误格式与错误码后再对外开放                                |

---

## 二、逐项对照

### 2.1 成功响应格式（与设计不一致）

**设计 (chapter11)：**

```json
{ "code": 200, "message": "操作成功", "data": {}, "timestamp": 1709452800000 }
```

**当前实现** — `common/interceptors/response.interceptor.ts`：

- `code`: 使用 **0**，设计为 **200**。
- `message`: 使用 **"success"**，设计为 **"操作成功"**（或可接受英文，但 code 必须一致）。
- `timestamp`: 使用 **ISO 字符串**（`new Date().toISOString()`），设计为 **毫秒时间戳数字**。

| 项目      | 设计     | 实际    | 建议                            |
| --------- | -------- | ------- | ------------------------------- |
| code      | 200      | 0       | 改为 200，与设计及前端约定一致  |
| message   | 操作成功 | success | 建议改为 "操作成功" 或通过 i18n |
| timestamp | number   | string  | 改为 `Date.now()`               |

---

### 2.2 分页响应格式（与设计不一致）

**设计 (chapter11)：**

```json
"data": {
  "list": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**当前实现** — 各列表接口（如 `customer.controller.ts`、`opportunity.service.ts`、`call-record.service.ts`、`knowledge.controller.ts`、`material.controller.ts`、`announcement.controller.ts`）均直接返回：

```ts
{
  (list, total, page, pageSize);
}
```

经 `ResponseInterceptor` 后变为：

```json
"data": { "list": [], "total": 150, "page": 1, "pageSize": 20 }
```

**问题：**

1. 缺少 **`pagination`** 嵌套对象。
2. 缺少 **`totalPages`**（应为 `Math.ceil(total / pageSize)`）。

**建议：** 在公共层（如拦截器或封装函数）统一将 `{ list, total, page, pageSize }` 转为 `{ list, pagination: { page, pageSize, total, totalPages } }`，或要求各 Service 统一返回该结构。

---

### 2.3 错误响应格式与错误码

**设计 (chapter11)：**

- 错误码：200 成功；400/401/403/404/409/429/500 通用；10001–10999 认证；20001–20999 客户；30001–30999 商机；40001–40999 呼叫中心；50001–50999 AI；70001–70999 知识库等。
- 错误体：`code`、`message`、**`errors`** 为 `[{ "field": "name", "message": "客户名称不能为空" }]`，`timestamp` 为毫秒数。

**当前实现** — `common/filters/http-exception.filter.ts`：

- 成功：未在此处理（见拦截器）。
- 错误码映射：`40001`(BadRequest)、`40101`(Unauthorized)、`40102`(Token expired)、`40103`(disabled)、`40301`、`40401`、`40901`、`42901`、`50001`、`50003`。与设计的 **10001–10999 认证** 不一致（设计 10003 Token 过期、10002 禁用等）。
- `BusinessException`：使用 `BizErrorCodes`（如 20001 客户、30001 商机、40001 合同、50001 AI、90001 限流等）。其中 **40001 在设计中为「呼叫线路不可用」**，代码中为 **CONTRACT_NOT_FOUND**，与 chapter11 冲突。
- `errors`：校验失败时 `validationErrors = resp.message` 为 **字符串数组**（NestJS ValidationPipe 默认），直接写入 `errors`。设计要求 **`[{ field, message }]`**，当前无 `field` 信息。

**问题汇总：**

| 项目           | 设计                   | 实际              | 建议                                                                                                  |
| -------------- | ---------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| 认证错误码     | 10001–10999            | 40101/40102/40103 | 改为 10001/10002/10003 等与设计对齐                                                                   |
| 呼叫/合同      | 40001 呼叫             | 40001 合同        | 合同建议用 31001 等，避免占用 40001                                                                   |
| errors 结构    | `[{ field, message }]` | `string[]`        | 在 ValidationPipe 的 exceptionFactory 中构造带 field 的对象，或从 class-validator 的 constraints 解析 |
| 错误 timestamp | 毫秒数                 | ISO 字符串        | 与成功响应一起改为 `Date.now()`                                                                       |

---

### 2.4 URL 与 HTTP 方法（抽样）

| 模块        | 路径/方法示例                                                                                                                                           | 符合设计                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| customer    | `GET/POST /customers`、`GET/PUT/DELETE /customers/:id`、`POST /customers/check-duplicate`、`POST /customers/merge`、`PUT /customers/:id/assign`         | 是，资源名词、动词后缀           |
| opportunity | `GET/POST /opportunities`、`GET/PUT/DELETE /opportunities/:id`、`PUT /opportunities/:id/stage`、`GET /opportunities/stats`、`GET /opportunities/funnel` | 是                               |
| call-record | `GET/POST /call-records`、`GET/PUT/DELETE /call-records/:id`、`POST /call-records/:id/summarize`                                                        | 是                               |
| knowledge   | `GET/POST /knowledge/articles`、`GET /knowledge/articles/:id`、`GET /knowledge/search/history`                                                          | 是                               |
| ai          | `GET /ai/alerts`、`PUT /ai/alerts/:id/acknowledge`、`GET /ai/reports`、`POST /ai/reports/generate`                                                      | 是                               |
| call        | `POST /call/dial`、`POST /call/:callId/answer`、`POST /call/:callId/hangup` 等                                                                          | 是，动作为 POST 符合「触发操作」 |

**路径层级**：设计要求「路径层级不超过 3 层」。当前如 `/api/v1/customers/:id/assign` 为 4 段（api、v1、customers、:id、assign 中后三段为资源层），若按「资源路径段」计为 3 层（customers、:id、assign）则满足；若严格按「段数」则 4 层，建议在文档中明确「3 层」的定义（例如仅指资源名+子资源+动作）。

---

### 2.5 鉴权与权限

- 全局/控制器：需认证接口已使用 `JwtAuthGuard`、`RolesGuard`，与设计「除登录外需 Authorization」一致。
- 登录/刷新/验证码等：未在本次逐条核对，从既有代码看 auth 模块已区分公开与需登录接口。

---

## 三、不符合规范的接口与批量重构建议

1. **所有返回分页的 GET 接口**
   - 路径不变，仅调整响应 body：在拦截器或统一封装中，将 `data` 从 `{ list, total, page, pageSize }` 转为 `{ list, pagination: { page, pageSize, total, totalPages } }`。
2. **所有错误响应**
   - 在 `HttpExceptionFilter` 中：
     - 将错误码映射改为与 chapter11 一致（认证 10001–10999，呼叫 40001–40999 等）；
     - 校验错误时构造 `errors: [{ field, message }]`（可从 ValidationPipe 的 exception 中取 `response.message` 与约束信息）；
     - `timestamp` 统一为 `Date.now()`。
3. **成功响应**
   - 在 `ResponseInterceptor` 中：`code` 改为 200，`message` 改为「操作成功」（或 i18n），`timestamp` 改为 `Date.now()`。
4. **BizErrorCodes**
   - 将合同相关错误码从 40xxx 迁到 31001–31999（合同），避免与呼叫 40001–40999 冲突；若已有前端依赖 40xxx 合同码，可保留并同时在文档中注明与 chapter11 的映射。

---

## 四、对外开放（三方集成）适用性

- **当前**：响应格式（成功码、分页结构、错误码与 errors 结构、timestamp 类型）与设计文档不一致，对外暴露会增加接入方理解与适配成本，且错误码与文档不符易导致集成错误处理不准确。
- **建议**：
  1. 先按本章上述建议统一成功/分页/错误格式与错误码，再对外开放。
  2. 若需立即开放：在网关或 BFF 层做一层「设计规范格式」的适配，将现有 `code 0`、扁平分页、`errors: string[]` 转为设计中的 200、`pagination`、`errors: [{ field, message }]` 与规定错误码，并明确在对外文档中写明「实际错误码与 chapter11 的映射表」。

---

## 五、审查结论汇总

| 类别                            | 状态 | 说明                                        |
| ------------------------------- | ---- | ------------------------------------------- |
| URL 命名                        | PASS | 资源复数、小写、动词后缀合理                |
| HTTP 方法                       | PASS | 语义正确                                    |
| 统一响应 code/message/timestamp | WARN | 成功码 0、message、timestamp 类型与设计不符 |
| 分页 pagination                 | FAIL | 缺 `pagination` 嵌套与 `totalPages`         |
| 错误码与 errors                 | FAIL | 错误码区间与设计不一致，errors 为 string[]  |
| 鉴权与权限                      | PASS | 已保护需认证接口                            |
| 对外开放                        | WARN | 建议先统一格式与错误码再开放                |

**建议优先修复：**

1. 分页结构（含 totalPages）与成功响应的 code/timestamp；
2. 错误响应的 errors 结构与错误码与 chapter11 对齐。
