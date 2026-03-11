# CRM Sales Platform — 代码修复任务清单（含实现提示词）

**生成日期**: 2026-03-11
**审查来源**: 五轮递进式并行审查 (R1 安全 → R2 架构 → R3 业务 → R4 质量 → R5 运维)
**代码库**: `crm-sales-platform/` (NestJS + Vue 3 + uni-app monorepo)
**任务总数**: 64 项（P0: 7 / P1: 17 / P2: 28 / P3: 12）

---

## 路径约定

所有文件路径基于项目根目录 `crm-sales-platform/`：

| 缩写       | 完整路径                       |
| ---------- | ------------------------------ |
| `server/`  | `packages/server/src/`         |
| `web/`     | `packages/web/src/`            |
| `shared/`  | `packages/shared/src/`         |
| `modules/` | `packages/server/src/modules/` |
| `common/`  | `packages/server/src/common/`  |
| `config/`  | `packages/server/src/config/`  |

---

# P0 — 立即修复（预计 4-6 小时）

---

## P0-01 | 安全 | bcrypt salt rounds 从 10 改为 12

**文件**: `modules/user/user.service.ts` (L26, L88)

**当前问题代码**:

```typescript
// L26 — create 方法
const hashedPassword = await bcrypt.hash(dto.password, 10);

// L88 — update 方法
dto.password = await bcrypt.hash(dto.password, 10);
```

**修复提示词**:

```
在文件 packages/server/src/modules/user/user.service.ts 中：

1. 在类顶部添加一个私有常量：
   private readonly BCRYPT_SALT_ROUNDS = 12

2. 将第 26 行的 bcrypt.hash(dto.password, 10) 改为：
   bcrypt.hash(dto.password, this.BCRYPT_SALT_ROUNDS)

3. 将第 88 行的 bcrypt.hash(dto.password, 10) 改为：
   bcrypt.hash(dto.password, this.BCRYPT_SALT_ROUNDS)

注意：
- 修改后不影响已有密码的校验（bcrypt 自动识别存储 hash 中的轮数）
- 仅影响新密码的哈希强度
- OWASP 2024 推荐 >= 12 轮，10 轮约 1000 次/秒可暴力破解，12 轮降至约 250 次/秒
```

---

## P0-02 | 安全 | 注册全局 ThrottlerGuard

**文件**: `server/app.module.ts` (L52-58)

**当前问题代码**:

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,
    limit: 60,
  },
]),
```

`CustomThrottlerGuard` 已实现但未注册为 `APP_GUARD`，全局限流形同虚设。

**修复提示词**:

```
在文件 packages/server/src/app.module.ts 中：

1. 在文件顶部添加 import：
   import { APP_GUARD } from '@nestjs/core'
   import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard'

2. 在 @Module 的 providers 数组中添加：
   {
     provide: APP_GUARD,
     useClass: CustomThrottlerGuard,
   }

注意：
- CustomThrottlerGuard 已存在于 common/guards/custom-throttler.guard.ts
- 注册后全局默认 60 req/min，各 Controller 可通过 @Throttle() 覆盖
- AuthController 已配置了独立的 @Throttle（login 5/min、captcha 10/min 等），不受影响
- @Public() 端点（health、login、captcha）也会被限流，这是期望行为
- 需要确认 CustomThrottlerGuard 是否跳过了 @SkipThrottle() 装饰的端点
```

---

## P0-03 | 安全 | AI 端点添加独立频率限制

**文件**: `modules/ai/ai.controller.ts`, `modules/knowledge/knowledge.controller.ts`

**缺少限流的端点**:

- `POST /knowledge/ask` — AI/LLM 调用
- `POST /ai/reports/generate` — AI 报告生成
- `POST /ai/sales-forecasts/generate` — AI 销售预测
- `POST /ai/customer-profiles/:id/generate` — AI 客户画像
- `POST /ai/intent-predictions/generate` — AI 意向预测
- `GET /ai/script-recommend` — AI 话术推荐

**修复提示词**:

```
在文件 packages/server/src/modules/ai/ai.controller.ts 中：

1. 在文件顶部添加 import：
   import { Throttle } from '@nestjs/throttler'

2. 在以下方法上方添加 @Throttle 装饰器：

   @Throttle({ default: { ttl: 60000, limit: 3 } })
   加到以下方法：
   - generateReport()（POST /ai/reports/generate）
   - generateSalesForecast()（POST /ai/sales-forecasts/generate）
   - generateCustomerProfile()（POST /ai/customer-profiles/:id/generate）
   - generateIntentPrediction()（POST /ai/intent-predictions/generate）
   - getScriptRecommendation()（GET /ai/script-recommend）

在文件 packages/server/src/modules/knowledge/knowledge.controller.ts 中：

3. 同样添加 import { Throttle } from '@nestjs/throttler'

4. 在 askQuestion() 方法（POST /knowledge/ask）上方添加：
   @Throttle({ default: { ttl: 60000, limit: 5 } })

注意：
- AI 端点限制 3 次/分钟，知识库问答限制 5 次/分钟（问答成本低于生成式任务）
- 这些限制是 per-user（CustomThrottlerGuard 通常按 IP 或 user 追踪）
- 导出端点（/export）也建议添加 @Throttle({ default: { limit: 3, ttl: 60000 } })
```

---

## P0-04 | API | throw new Error 替换为 NestJS 内置异常

**文件**: 多处 Controller

**当前问题代码位置**:

```
agent.controller.ts:90     — throw new Error('Agent not found')
agent.controller.ts:105    — throw new Error('...')
agent.controller.ts:139    — throw new Error('...')
recording.controller.ts:35 — throw new Error('Unauthorized')
recording.controller.ts:60 — throw new Error('...')
campaign.controller.ts:37  — throw new Error('Unauthorized')
```

**修复提示词**:

```
在以下文件中将 throw new Error(...) 替换为正确的 NestJS HTTP 异常：

1. packages/server/src/modules/agent/agent.controller.ts:
   - L90: throw new Error('Agent not found')
     改为: throw new NotFoundException('Agent not found')
   - L105: throw new Error(...)（状态无效）
     改为: throw new BadRequestException('Invalid agent status')
   - L139: throw new Error(...)（分配失败）
     改为: throw new BadRequestException('Call assignment failed')

2. packages/server/src/modules/recording/recording.controller.ts:
   - L35: throw new Error('Unauthorized')
     改为: throw new ForbiddenException('No permission to access this recording')
   - L60: throw new Error(...)
     改为: throw new NotFoundException('Recording not found')

3. packages/server/src/modules/campaign/campaign.controller.ts:
   - L37: throw new Error('Unauthorized')
     改为: throw new ForbiddenException('No permission for this campaign')

每个文件顶部确保 import 了对应的异常类：
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'

原因：原生 Error 会被 HttpExceptionFilter 捕获但无法返回语义化 HTTP 状态码，
全部变成 500 Internal Server Error，而非正确的 404/400/403。
```

---

## P0-05 | API | 修复 6 个 Controller 双前缀路由 bug

**文件**:

- `modules/contact/contact.controller.ts:26` — `@Controller('api/v1')`
- `modules/customer-pool/customer-pool.controller.ts:30` — `@Controller('api/v1/customer-pool')`
- `modules/custom-field/custom-field.controller.ts:23` — `@Controller('api/v1/custom-fields')`
- `modules/customer-tag/customer-tag.controller.ts:24` — `@Controller('api/v1')`

**当前问题**:
`main.ts:28` 已设置 `app.setGlobalPrefix('api/v1')`，上述 Controller 手动重复写入前缀导致实际路径变为 `/api/v1/api/v1/...`。

**修复提示词**:

```
修复双前缀路由 bug。main.ts 已通过 setGlobalPrefix('api/v1') 设置全局前缀，
以下 Controller 不应再包含 'api/v1'：

1. packages/server/src/modules/contact/contact.controller.ts:
   L26: @Controller('api/v1')
   改为: @Controller()
   注意：该 Controller 的各方法路由已包含完整路径如 'customers/:customerId/contacts'，
   无需在 @Controller 中指定前缀。

2. packages/server/src/modules/customer-pool/customer-pool.controller.ts:
   L30: @Controller('api/v1/customer-pool')
   改为: @Controller('customer-pool')

3. packages/server/src/modules/custom-field/custom-field.controller.ts:
   L23: @Controller('api/v1/custom-fields')
   改为: @Controller('custom-fields')

4. packages/server/src/modules/customer-tag/customer-tag.controller.ts:
   L24: @Controller('api/v1')
   改为: @Controller()
   注意：与 contact.controller.ts 相同情况，方法级路由已包含完整路径。

修复后验证：
- 启动服务后访问 Swagger UI 确认路由前缀正确
- 原本 /api/v1/api/v1/customer-pool 应变为 /api/v1/customer-pool
```

---

## P0-06 | API | 解决 3 个 call Controller 路由前缀冲突

**文件**:

- `modules/call/call.controller.ts:21` — `@Controller('call')`
- `modules/call/call-callback.controller.ts:9` — `@Controller('call')`
- `modules/call/call-popup.controller.ts:22` — `@Controller('call')`

**修复提示词**:

```
三个 Controller 都使用 @Controller('call') 前缀，路由可能冲突。
按职责分离为不同前缀：

1. packages/server/src/modules/call/call.controller.ts:
   保持: @Controller('call')
   （核心外呼操作：dial, answer, hangup, mute, hold, transfer 等）

2. packages/server/src/modules/call/call-callback.controller.ts:
   L9: @Controller('call')
   改为: @Controller('call-callback')
   注意：该 Controller 的 @Public() 端点路由也需同步调整。
   如果前端或第三方服务依赖回调 URL，需同步更新回调配置。

3. packages/server/src/modules/call/call-popup.controller.ts:
   L22: @Controller('call')
   改为: @Controller('call-popup')
   同步修改前端 API 调用路径。

验证：
- 确认 callback URL 更新后阿里云/第三方语音服务回调能正确到达
- 前端弹屏 API 调用路径需从 /api/v1/call/popup-* 调整为 /api/v1/call-popup/*
```

---

## P0-07 | 安全 | 回调签名改用恒等时间比较 + 防重放

**文件**: `common/guards/callback-signature.guard.ts` (L33), `modules/call/call-callback.controller.ts`

**当前问题代码**:

```typescript
// callback-signature.guard.ts:33 — 非恒等时间比较，存在时序攻击风险
if (signature.toLowerCase() !== expected.toLowerCase()) {
  throw new ForbiddenException("Invalid callback signature");
}
```

**修复提示词**:

```
在文件 packages/server/src/common/guards/callback-signature.guard.ts 中：

1. 在文件顶部添加 import：
   import { timingSafeEqual } from 'crypto'

2. 将 L33 的签名比较：
   if (signature.toLowerCase() !== expected.toLowerCase()) {
   替换为恒等时间比较：
   const sigBuf = Buffer.from(signature.toLowerCase(), 'utf8')
   const expBuf = Buffer.from(expected.toLowerCase(), 'utf8')
   if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {

   注意：timingSafeEqual 要求两个 Buffer 长度相同，所以先检查长度。

3. 参考同目录下 hmac-signature.guard.ts:57-58，该文件已正确使用 timingSafeEqual。

在文件 packages/server/src/modules/call/call-callback.controller.ts 中：

4. 在 Controller 的 @UseGuards 中叠加 ReplayAttackGuard：
   @UseGuards(CallbackSignatureGuard, ReplayAttackGuard)

   ReplayAttackGuard 已存在于 common/guards/replay-attack.guard.ts，
   它基于 timestamp + nonce 做防重放校验。

注意：
- HmacSignatureGuard（用于其他场景）已正确实现，可作为参考
- 修改后需要确保阿里云回调请求 body 中包含 timestamp 和 nonce 字段，
  否则 ReplayAttackGuard 需要适配回调 body 的字段名
```

---

# P1 — 本周修复（预计 2-3 天）

---

## P1-01 | 架构 | AiController 重构到 Service 层

**文件**: `modules/ai/ai.controller.ts` (全部 276 行)

**当前问题**: Controller 直接注入 6 个 Repository + 5 个 Bull Queue，包含 findAndCount、createQueryBuilder、手动构造 `{ code, message, data }` 响应。

**修复提示词**:

```
重构 packages/server/src/modules/ai/ai.controller.ts，目标是 Controller 仅做路由分发：

第一步：创建新的 Service 文件
在 packages/server/src/modules/ai/ 目录下创建以下 Service：

1. ai-alert.service.ts — 从 AiController 迁移：
   - getAlerts()（列表查询 + 分页）
   - acknowledgeAlert()（确认告警）
   - resolveAlert()（解决告警）
   注入 Repository<AiAlert>

2. ai-report.service.ts — 从 AiController 迁移：
   - getReports()（列表查询 + 分页）
   - generateReport()（入队 reportQueue）
   注入 Repository<AiReport>, @InjectQueue('report-generate')

3. ai-forecast.service.ts — 从 AiController 迁移：
   - getSalesForecasts()
   - generateSalesForecast()
   注入 Repository<SalesForecast>, @InjectQueue('sales-forecast')

4. ai-competitor.service.ts — 迁移 getCompetitorReports()
   注入 Repository<CompetitorReport>

5. ai-profile.service.ts — 迁移 generateCustomerProfile()
   注入 Repository<CustomerProfile>, @InjectQueue('customer-profile')

6. ai-prediction.service.ts — 迁移 getIntentPredictions(), generateIntentPrediction()
   注入 Repository<IntentPrediction>, @InjectQueue('intent-prediction')

第二步：重写 AiController
- 移除所有 @InjectRepository 和 @InjectQueue
- 仅注入上述 6 个 Service + ScriptRecommendService + CostTrackerService
- 每个方法体简化为一行 Service 调用 + return
- 删除所有手动构造的 { code: 0, message, data } 响应
  （让全局 ResponseInterceptor 处理包装）
- 错误响应改为 throw NotFoundException / BadRequestException
  （让全局 HttpExceptionFilter 处理）

第三步：更新 ai.module.ts
- 将新 Service 添加到 providers 数组

第四步：为 AiController 中的查询端点添加数据权限过滤
- 各 Service 的 list 方法接收 user 参数
- SALES 角色用户仅能看到自己相关的 AI 数据
```

---

## P1-02 | 架构 | AgentController 重构到 Service 层

**文件**: `modules/agent/agent.controller.ts`

**修复提示词**:

```
重构 packages/server/src/modules/agent/agent.controller.ts：

1. 创建 packages/server/src/modules/agent/agent.service.ts（如不存在）

2. 将以下逻辑从 Controller 迁移到 AgentService：
   - list()：userRepository + createQueryBuilder 查询逻辑
   - getOne()：用户详情 + 状态聚合查询
   - available()：空闲坐席列表查询（消除 N+1 查询，改为批量获取 Redis 状态）
   - statusLogs()：agentStatusLogRepository 查询
   - getStats()：统计计算逻辑

3. Controller 改为仅注入 AgentService + AgentStatusService，
   移除 userRepository 和 statusLogRepository 的直接注入。

4. 将 throw new Error(...) 替换为 NestJS 内置异常（已在 P0-04 覆盖）。

5. 更新 agent.module.ts 的 providers。

6. list() 方法中的 N+1 查询（逐个检查坐席状态）优化为：
   - 批量获取所有坐席 ID
   - 使用 Redis MGET 或 pipeline 一次性获取所有状态
   - 在内存中合并数据
```

---

## P1-03 | 架构 | 事务保护

**文件**: `modules/opportunity/opportunity.service.ts:137-181`, `modules/customer/customer-import.processor.ts:41-52`

**修复提示词**:

```
为以下缺乏事务保护的多步写操作添加 QueryRunner 事务：

1. packages/server/src/modules/opportunity/opportunity.service.ts 的 updateStage() 方法：

   当前代码在 L149 save opportunity 和 L176 save stageLog 之间无事务包裹。
   如果 stageLog save 失败，opportunity 的 stage 已更新但日志未记录，数据不一致。

   修改方案：
   async updateStage(id, dto, user) {
     const queryRunner = this.dataSource.createQueryRunner()
     await queryRunner.connect()
     await queryRunner.startTransaction()
     try {
       const opportunity = await this.findOne(id, user)
       // ... 设置 stage、probability ...
       const saved = await queryRunner.manager.save(opportunity)
       // ... 创建 stageLog ...
       await queryRunner.manager.save(stageLog)
       await queryRunner.commitTransaction()
       // 事务提交后再清缓存
       await this.invalidateStatsCache()
       await this.invalidateDetailCache(id)
       return { opportunity: saved, previousStage, currentStage: saved.stage }
     } catch (err) {
       await queryRunner.rollbackTransaction()
       throw err
     } finally {
       await queryRunner.release()
     }
   }

   需要在构造函数中注入 DataSource：
   constructor(private readonly dataSource: DataSource, ...)

2. packages/server/src/modules/customer/customer-import.processor.ts 的 handleImport()：

   当前逐行 create 无批量事务。改为分批（每 100 条一个事务）：
   - 将 rows 分为 chunks（每 chunk 100 条）
   - 每个 chunk 用 queryRunner 包裹事务
   - 单行失败记录到 errorRows，不中断整个 chunk
   - 每个 chunk 完成后推送进度通知
```

---

## P1-04 | 架构 | 7 处裸 body 参数补充 DTO

**文件**: 多处 Controller

**修复提示词**:

```
为以下 7 处缺少 DTO 的裸 body 参数创建 DTO class 并添加 class-validator 校验：

1. packages/server/src/modules/customer/dto/import-customer.dto.ts（新建）:
   export class ImportCustomerDto {
     @IsArray()
     @ArrayMaxSize(5000)
     rows!: Record<string, string>[]

     @IsObject()
     @IsNotEmpty()
     mapping!: Record<string, string>

     @IsOptional()
     @IsString()
     fileName?: string
   }
   应用到 customer.controller.ts:102 的 importCsv(@Body() body)

2. packages/server/src/modules/customer/dto/merge-customer.dto.ts（新建）:
   export class MergeCustomerDto {
     @IsInt()
     primaryId!: number

     @IsInt()
     secondaryId!: number
   }
   应用到 customer.controller.ts:145 的 previewMerge 和 :152 的 executeMerge

3. packages/server/src/modules/customer-tag/dto/add-tags.dto.ts（新建）:
   export class AddTagsDto {
     @IsArray()
     @IsInt({ each: true })
     tagIds!: number[]
   }
   应用到 customer-tag.controller.ts:59

4. packages/server/src/modules/agent/dto/set-status.dto.ts（新建）:
   export class SetStatusDto {
     @IsString()
     @IsIn(['IDLE', 'BUSY', 'ON_CALL', 'WRAP_UP', 'OFFLINE'])
     status!: string
   }
   应用到 agent.controller.ts:100

5. packages/server/src/modules/campaign/dto/create-campaign.dto.ts（新建或修改现有）:
   export class CreateCampaignDto {
     @IsString()
     @IsNotEmpty()
     name!: string

     @IsOptional()
     @IsArray()
     @IsInt({ each: true })
     customerIds?: number[]
   }
   应用到 campaign.controller.ts:45

6. packages/server/src/modules/call/dto/hangup-call.dto.ts（新建）:
   用于 call.controller.ts:53 hangup 方法
   以及 call.controller.ts:98 transfer 方法

7. packages/server/src/modules/call/dto/update-popup-config.dto.ts（新建）:
   用于 call-popup.controller.ts:76

每个 DTO 创建后，将对应 Controller 方法的 @Body() body 类型从裸对象改为 DTO class。
全局 ValidationPipe 会自动对 DTO 执行 whitelist + forbidNonWhitelisted 校验。
```

---

## P1-05 | 安全 | 前端 v-html XSS 防护

**文件**:

- `web/components/MarkdownEditor.vue:213`
- `web/views/knowledge/detail.vue:49`
- `web/views/announcement/detail.vue:15`

**修复提示词**:

```
在前端项目 packages/web/ 中安装 DOMPurify 并创建全局 v-safe-html 指令：

第一步：安装依赖
cd packages/web
pnpm add dompurify
pnpm add -D @types/dompurify

第二步：创建全局指令
新建 packages/web/src/directives/safe-html.ts：

import DOMPurify from 'dompurify'
import type { Directive } from 'vue'

export const vSafeHtml: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    el.innerHTML = DOMPurify.sanitize(binding.value ?? '')
  },
  updated(el, binding) {
    el.innerHTML = DOMPurify.sanitize(binding.value ?? '')
  },
}

第三步：在 main.ts 中全局注册
在 packages/web/src/main.ts 中添加：
import { vSafeHtml } from './directives/safe-html'
app.directive('safe-html', vSafeHtml)

第四步：替换 v-html 为 v-safe-html
1. packages/web/src/components/MarkdownEditor.vue:213
   将 v-html="renderedContent" 改为 v-safe-html="renderedContent"

2. packages/web/src/views/knowledge/detail.vue:49
   将 v-html="article.content" 改为 v-safe-html="article.content"

3. packages/web/src/views/announcement/detail.vue:15
   将 v-html="announcement.content" 改为 v-safe-html="announcement.content"

注意：DOMPurify 默认配置已能阻止绝大多数 XSS payload，
如需更严格的配置可传入 { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...] }。
```

---

## P1-06 | 安全 | 敏感字段加密存储

**文件**: `common/security/encryption.service.ts`, 多处 Entity

**修复提示词**:

```
EncryptionService 已实现 AES-256-GCM 加密和 transformer() 方法，
但未应用到任何 Entity 的 @Column。需要启用加密存储：

第一步：确认 ENCRYPTION_KEY 环境变量
在 .env 和 .env.example 中设置非空的 32 字节密钥：
ENCRYPTION_KEY=你的32字节hex密钥

第二步：在以下 Entity 字段上应用 transformer
packages/server/src/modules/customer/entities/customer.entity.ts:
  @Column({
    name: 'phone',
    type: 'varchar',
    length: 255,  // 加密后长度增加，需要加大
    nullable: true,
    transformer: EncryptionService.transformer(),
  })
  phone?: string

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: true,
    transformer: EncryptionService.transformer(),
  })
  email?: string

packages/server/src/modules/contact/entities/contact.entity.ts:
  同样为 mobile、phone、email 字段添加 transformer

第三步：创建数据迁移
新建 Migration 文件：
1. ALTER TABLE customers MODIFY phone VARCHAR(255)（扩大字段长度以容纳加密后的文本）
2. ALTER TABLE customers MODIFY email VARCHAR(255)
3. ALTER TABLE contacts MODIFY mobile VARCHAR(255)
4. 编写数据迁移脚本：读取现有明文数据 → 加密 → 回写

注意：
- 加密后数据长度约为明文的 2-3 倍（Base64 编码的 IV + ciphertext + tag）
- 加密字段无法直接用 SQL LIKE 查询，需要调整查询逻辑
- DataMaskInterceptor 的脱敏功能仍然有效（在解密后的值上脱敏）
- 建议先在测试环境验证，确保加解密正确
```

---

## P1-07 | 安全 | 统一添加 RolesGuard

**文件**: 7 个 Controller

**修复提示词**:

```
以下 7 个 Controller 仅有 JwtAuthGuard 无 RolesGuard，
需要在类级别补充 RolesGuard 以预留细粒度权限控制：

1. packages/server/src/modules/campaign/campaign.controller.ts:
   L24: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)
   并 import { RolesGuard } from '../../common/guards/roles.guard'

2. packages/server/src/modules/agent/agent.controller.ts:
   L26: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)

3. packages/server/src/modules/announcement/announcement.controller.ts:
   L25: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)

4. packages/server/src/modules/call/call.controller.ts:
   L20: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)

5. packages/server/src/modules/call/call-popup.controller.ts:
   L20: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)

6. packages/server/src/modules/recording/recording.controller.ts:
   L19: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)

7. packages/server/src/modules/material/material.controller.ts:
   L24: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)

8. packages/server/src/modules/route/route.controller.ts:
   L9: @UseGuards(JwtAuthGuard)
   改为: @UseGuards(JwtAuthGuard, RolesGuard)

注意：
- RolesGuard 在无 @Roles() 装饰器时默认放行已认证用户
- 此修改不会破坏现有行为，但为后续添加细粒度角色限制预留入口
- 后续可在需要权限控制的方法上添加 @Roles('admin', 'manager') 等
```

---

## P1-08 | 安全 | 新模块数据权限过滤

**文件**: 多处 Controller/Service

**修复提示词**:

```
5 个新模块缺少数据权限过滤，SALES 角色用户可以看到所有数据：

1. AI 模块 — packages/server/src/modules/ai/ai.controller.ts:
   所有查询方法（getAlerts/getReports 等）的 findAndCount 需添加数据权限：
   - 接收 @CurrentUser() user 参数
   - SALES 角色追加 WHERE 条件过滤 assignedUserId 或 createdBy

2. Call-Popup 模块 — packages/server/src/modules/call/call-popup.controller.ts:
   弹屏配置更新方法需验证操作者身份

3. Material 模块 — packages/server/src/modules/material/material.controller.ts:
   DELETE 操作需要角色限制（仅 admin/manager）

4. Contact 模块 — packages/server/src/modules/contact/contact.controller.ts:
   create() 方法需将 assignedUserId 绑定为当前用户 ID

5. 所有新模块的 create() 方法应自动设置 createdBy 或 assignedUserId 为当前用户：
   参考 CustomerService 的 applyDataPermission() 和 checkOwnership() 模式
   （packages/server/src/modules/customer/customer.service.ts:449-460）
```

---

## P1-09 | 安全 | OSS 回调签名校验 + 类型限制

**文件**: `modules/material/material.controller.ts:46-51`, `modules/material/oss-upload.service.ts`

**修复提示词**:

```
修复文件上传回调安全漏洞：

1. packages/server/src/modules/material/material.controller.ts:
   当前 uploadCallback 方法标记 @Public() 且无签名校验。

   方案 A（推荐）：添加 CallbackSignatureGuard
   @Public()
   @UseGuards(CallbackSignatureGuard)
   @Post('upload/callback')
   async uploadCallback(@Body() body: OssCallbackDto) { ... }

   创建 OssCallbackDto：
   export class OssCallbackDto {
     @IsString() filename!: string
     @IsString() oss_key!: string
     @IsNumber() file_size!: number
     @IsString() mime_type!: string
     @IsString() signature!: string
     @IsString() timestamp!: string
   }

2. packages/server/src/modules/material/oss-upload.service.ts:
   在 handleCallback() 中添加验证：

   const ALLOWED_MIME_TYPES = [
     'image/jpeg', 'image/png', 'image/gif', 'image/webp',
     'application/pdf',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'video/mp4', 'audio/mpeg', 'audio/wav',
   ]
   const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

   if (!ALLOWED_MIME_TYPES.includes(body.mime_type)) {
     throw new BadRequestException('Unsupported file type')
   }
   if (body.file_size > MAX_FILE_SIZE) {
     throw new BadRequestException('File too large')
   }
```

---

## P1-10 | 安全 | STS Token 替代永久密钥

**文件**: `modules/material/oss-upload.service.ts:34-39`

**修复提示词**:

```
当前 oss-upload.service.ts 的 getUploadCredentials() 直接返回永久 AK/SK，
存在密钥泄露风险。改用 STS AssumeRole 临时凭证：

1. 安装阿里云 STS SDK：
   cd packages/server && pnpm add @alicloud/sts20150401 @alicloud/openapi-client

2. 在 oss-upload.service.ts 中：
   - 创建 STS client
   - 调用 AssumeRole 获取临时凭证（有效期 900-3600 秒）
   - 返回 { accessKeyId, accessKeySecret, securityToken, expiration } 给前端

3. 前端使用临时凭证 + securityToken 进行 OSS 直传

4. STS Role 的 Policy 应限制：
   - 仅允许 PutObject 操作
   - 仅允许写入指定 Bucket 的指定前缀路径
   - 设置最大文件大小限制

环境变量新增：
STS_ROLE_ARN=acs:ram::xxx:role/oss-upload-role
STS_SESSION_NAME=crm-upload
STS_DURATION_SECONDS=900
```

---

## P1-11 | 业务 | 客户创建强制查重

**文件**: `modules/customer/customer.service.ts:33-42`, `modules/customer/duplicate-check.service.ts`

**修复提示词**:

```
在 packages/server/src/modules/customer/customer.service.ts 的 create() 方法中
自动调用 DuplicateCheckService 查重：

async create(dto: CreateCustomerDto): Promise<Customer> {
  if (dto.customFields) {
    await this.customFieldService.validateCustomFields(dto.customFields)
  }

  // 新增：自动查重（除非 forceCreate=true）
  if (!dto.forceCreate) {
    const duplicates = await this.duplicateCheckService.checkDuplicates({
      company: dto.name,
      phone: dto.phone,
      email: dto.email,
      unifiedCreditCode: dto.unifiedCreditCode,
    })
    if (duplicates.length > 0) {
      throw new ConflictException({
        message: '发现疑似重复客户',
        duplicates,
        allowForceCreate: true,
      })
    }
  }

  const customer = this.customerRepository.create(dto)
  customer.customerNo = await this.generateCustomerNo()
  const saved = await this.customerRepository.save(customer)
  await this.invalidateListCache()
  return saved
}

同时修改：
1. CreateCustomerDto 添加字段：
   @IsOptional()
   @IsBoolean()
   forceCreate?: boolean

2. CheckDuplicateDto 添加 name 字段：
   @IsOptional()
   @IsString()
   name?: string

3. DuplicateCheckService.checkDuplicates() 添加名称模糊匹配维度
   （Levenshtein 相似度 >= 80%）

4. 前端创建客户时处理 409 响应：
   显示重复客户列表 + "强制创建"按钮
```

---

## P1-12 | 业务 | 商机阶段准入校验

**文件**: `modules/opportunity/opportunity.service.ts:137-181`

**修复提示词**:

```
在 packages/server/src/modules/opportunity/opportunity.service.ts 中
为 updateStage() 添加阶段流转矩阵校验：

1. 在文件顶部定义合法转换矩阵：
const ALLOWED_STAGE_TRANSITIONS: Record<string, string[]> = {
  LEAD: ['QUALIFIED', 'CLOSED_LOST'],
  QUALIFIED: ['LEAD', 'PROPOSAL', 'CLOSED_LOST'],
  PROPOSAL: ['QUALIFIED', 'NEGOTIATION', 'CLOSED_LOST'],
  NEGOTIATION: ['PROPOSAL', 'CLOSED_WON', 'CLOSED_LOST'],
  CLOSED_WON: [],  // 终态，不可流转
  CLOSED_LOST: [],  // 终态，不可流转
}

2. 在 updateStage() 方法中，L147（opportunity.stage = dto.stage）之前添加校验：
const allowedNextStages = ALLOWED_STAGE_TRANSITIONS[opportunity.stage] ?? []
if (!allowedNextStages.includes(dto.stage)) {
  throw new BadRequestException(
    `不允许从 ${opportunity.stage} 流转到 ${dto.stage}`
  )
}

3. 当 dto.stage === 'CLOSED_LOST' 时，强制要求 closeReason：
if (dto.stage === 'CLOSED_LOST' && !dto.closeReason) {
  throw new BadRequestException('丢单必须填写原因')
}
opportunity.closeReason = dto.closeReason
opportunity.closeRemark = dto.closeRemark

4. 修改 UpdateStageDto（dto/update-stage.dto.ts）添加字段：
@IsOptional()
@IsString()
closeReason?: string

@IsOptional()
@IsString()
closeRemark?: string

5. 更新 CLOSED_WON 校验（如需合同关联，后续添加）

注意：
- 阶段矩阵应与产品确认后调整
- 仅允许回退一步（QUALIFIED→LEAD），不允许跨阶段回退
```

---

## P1-13 | 业务 | 丢单强制填写原因

**文件**: `modules/opportunity/dto/update-stage.dto.ts`

**修复提示词**:

```
（已包含在 P1-12 中，此任务确保 DTO 层面的条件校验）

在 packages/server/src/modules/opportunity/dto/update-stage.dto.ts 中
使用 class-validator 的条件校验：

import { ValidateIf } from 'class-validator'

export class UpdateStageDto {
  @IsString()
  @IsNotEmpty()
  stage!: string

  @ValidateIf(o => o.stage === 'CLOSED_LOST')
  @IsString()
  @IsNotEmpty({ message: '丢单必须填写关闭原因' })
  closeReason?: string

  @IsOptional()
  @IsString()
  closeRemark?: string
}
```

---

## P1-14 | 业务 | weightedAmount 自动计算

**文件**: `modules/opportunity/opportunity.service.ts`

**修复提示词**:

```
在 packages/server/src/modules/opportunity/opportunity.service.ts 中
所有修改 amount 或 probability 的地方自动计算 weightedAmount：

1. 添加私有方法：
private calculateWeightedAmount(amount: number, probability: number): number {
  return Math.round(amount * probability) / 100
}

2. 在 create() 方法中（约 L54-67）：
   在 save 之前添加：
   opportunity.weightedAmount = this.calculateWeightedAmount(
     opportunity.amount ?? 0,
     STAGE_PROBABILITY[opportunity.stage] ?? 0
   )

3. 在 update() 方法中：
   在 save 之前添加：
   if (dto.amount !== undefined || dto.stage !== undefined) {
     const amount = dto.amount ?? opportunity.amount ?? 0
     const prob = dto.stage
       ? (STAGE_PROBABILITY[dto.stage] ?? opportunity.probability)
       : opportunity.probability
     opportunity.weightedAmount = this.calculateWeightedAmount(amount, prob)
   }

4. 在 updateStage() 方法中（约 L149）：
   opportunity.weightedAmount = this.calculateWeightedAmount(
     opportunity.amount ?? 0,
     toProbability
   )
```

---

## P1-15 | 业务 | 客户公海池并发竞态修复

**文件**: `modules/customer-pool/customer-pool.service.ts:26-103`

**修复提示词**:

```
修复 packages/server/src/modules/customer-pool/customer-pool.service.ts 的 claim() 方法
并发竞态问题：

当前问题：
1. findOne 在事务外执行（L27-29），两个并发请求可同时找到同一客户
2. 持有数量 count 在事务外（L65-69），TOCTOU 漏洞
3. Redis incr 先递增后校验，失败时日配额不回滚

修复方案：
async claim(userId: number, customerId: number): Promise<Customer> {
  const config = await this.configService.getConfig()

  // 冷却期检查（可在事务外，只读）
  // ... 保持现有冷却期逻辑 ...

  const queryRunner = this.dataSource.createQueryRunner()
  await queryRunner.connect()
  await queryRunner.startTransaction()

  try {
    // 事务内加行锁查询客户
    const customer = await queryRunner.manager
      .createQueryBuilder(Customer, 'c')
      .setLock('pessimistic_write')
      .where('c.id = :id', { id: customerId })
      .andWhere('c.isInPool = true')
      .andWhere('c.deleted = false')
      .getOne()

    if (!customer) {
      throw new NotFoundException('客户不在公海池中或已被领取')
    }

    // 事务内检查持有数量
    const holdingCount = await queryRunner.manager.count(Customer, {
      where: { assignedUserId: userId, deleted: false, isInPool: false },
    })
    if (holdingCount >= config.max_holding) {
      throw new BadRequestException(`持有客户数已达上限(${config.max_holding}个)`)
    }

    // 执行领取
    customer.isInPool = false
    customer.assignedUserId = userId
    customer.poolEnterTime = null as any
    customer.protectUntil = this.calcProtectUntil(config.protect_days_new)
    await queryRunner.manager.save(customer)

    const log = this.poolLogRepository.create({ ... })
    await queryRunner.manager.save(log)

    await queryRunner.commitTransaction()

    // 事务提交成功后再递增日配额
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const claimKey = `pool:claim:${userId}:${today}`
    await this.redisService.incr(claimKey)
    await this.redisService.expire(claimKey, 86400)

    return customer
  } catch (err) {
    await queryRunner.rollbackTransaction()
    throw err
  } finally {
    await queryRunner.release()
  }
}

关键改动：
- findOne 改为事务内 SELECT ... FOR UPDATE（悲观锁）
- holdingCount 检查移入事务内
- Redis incr 移到事务 commit 之后（确保数据库操作成功再扣配额）
```

---

## P1-16 | API | ResponseInterceptor 补充 timestamp

**文件**: `common/interceptors/response.interceptor.ts:32-36`

**修复提示词**:

```
在 packages/server/src/common/interceptors/response.interceptor.ts 中
为成功响应添加 timestamp 字段，与 HttpExceptionFilter 的错误响应格式保持一致：

将 L34-37 的返回对象：
return {
  code: 0,
  message: 'success',
  data,
}

改为：
return {
  code: 0,
  message: 'success',
  data,
  timestamp: new Date().toISOString(),
}

同时更新 ResponseData<T> 接口定义（L10-14）：
export interface ResponseData<T> {
  code: number
  message: string
  data: T
  timestamp: string
}
```

---

## P1-17 | API | AiController 停止手动拼响应

**说明**: 已包含在 P1-01 AiController 重构中。重构后 Controller 方法仅 return data，
由全局 ResponseInterceptor 自动包装为 `{ code: 0, message: 'success', data, timestamp }`。
错误响应通过 throw NotFoundException 等异常，由 HttpExceptionFilter 处理。

---

# P2 — 本迭代修复（预计 1-2 周）

---

## P2-01 | 安全 | JWT 生产环境启动校验

**文件**: `modules/auth/auth.module.ts:22-44`

**修复提示词**:

```
在 packages/server/src/modules/auth/auth.module.ts 的 JwtModule.registerAsync 中
添加生产环境启动校验：

useFactory: (config: ConfigService) => {
  const privateKey = config.get<string>('JWT_PRIVATE_KEY')
  const jwtSecret = config.get<string>('JWT_SECRET')
  const nodeEnv = config.get<string>('NODE_ENV', 'development')

  // 生产环境强制要求密钥配置
  if (nodeEnv === 'production' && !privateKey && !jwtSecret) {
    throw new Error(
      'Production requires JWT_PRIVATE_KEY (RS256) or JWT_SECRET (HS256). ' +
      'Refusing to start with default dev secret.'
    )
  }

  if (privateKey) {
    return {
      privateKey,
      publicKey: config.get<string>('JWT_PUBLIC_KEY'),
      signOptions: { algorithm: 'RS256', expiresIn: '2h' },
    }
  }

  return {
    secret: jwtSecret || 'dev-secret-key',
    signOptions: { algorithm: 'HS256', expiresIn: '2h' },
  }
}
```

---

## P2-02 | 安全 | ENCRYPTION_KEY 启动校验

**文件**: `common/security/encryption.service.ts`

**修复提示词**:

```
在 packages/server/src/common/security/encryption.service.ts 的构造函数中
添加 ENCRYPTION_KEY 非空校验：

constructor(private readonly configService: ConfigService) {
  const key = this.configService.get<string>('ENCRYPTION_KEY')
  const nodeEnv = this.configService.get<string>('NODE_ENV', 'development')

  if (nodeEnv === 'production' && (!key || key === '0'.repeat(64))) {
    throw new Error(
      'Production requires a valid ENCRYPTION_KEY. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }

  this.key = Buffer.from(key || '0'.repeat(64), 'hex')
}
```

---

## P2-03 | 安全 | LIKE 查询通配符转义

**文件**: 多处 QueryBuilder

**修复提示词**:

```
在所有 LIKE 查询中转义用户输入的 % 和 _ 通配符，防止全表扫描 DoS：

1. 在 packages/server/src/common/ 下创建 utils/query.utils.ts：
   export function escapeLikePattern(input: string): string {
     return input.replace(/[%_\\]/g, '\\$&')
   }

2. 在所有使用 LIKE 的 Service 中，将：
   qb.andWhere('customer.name LIKE :kw', { kw: `%${keyword}%` })
   改为：
   import { escapeLikePattern } from '../../common/utils/query.utils'
   qb.andWhere('customer.name LIKE :kw', { kw: `%${escapeLikePattern(keyword)}%` })

涉及文件（搜索 LIKE :kw 或 LIKE :keyword）：
- modules/customer/customer.service.ts
- modules/opportunity/opportunity.service.ts
- modules/call-record/call-record.service.ts
- modules/knowledge/knowledge.service.ts
- modules/contact/contact.service.ts
- modules/follow-up/follow-up.service.ts
- modules/audit-log/audit-log.service.ts
```

---

## P2-04 | 安全 | 添加 Dependabot 配置

**文件**: 新建 `.github/dependabot.yml`

**修复提示词**:

```
在项目根目录创建 .github/dependabot.yml：

version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-team"
    labels:
      - "dependencies"
    groups:
      production-deps:
        dependency-type: "production"
      dev-deps:
        dependency-type: "development"
```

---

## P2-05 | 安全 | 移除硬编码默认数据库密码

**文件**: `config/database.config.ts:8`

**修复提示词**:

```
在 packages/server/src/config/database.config.ts 中：

将 L8 的默认密码：
password: configService.get<string>('DB_PASSWORD', 'crm_password_123')

改为空字符串默认值：
password: configService.get<string>('DB_PASSWORD', '')

同时在非生产环境下发出警告：
const dbPassword = configService.get<string>('DB_PASSWORD', '')
if (!dbPassword && nodeEnv === 'production') {
  throw new Error('DB_PASSWORD is required in production')
}
```

---

## P2-06 | 质量 | traceId 全链路追踪

**文件**: `common/interceptors/logging.interceptor.ts`, `common/logger/winston.config.ts`

**修复提示词**:

```
实现请求级 traceId 全链路追踪：

1. 安装依赖：
   cd packages/server && pnpm add cls-hooked
   pnpm add -D @types/cls-hooked

   或使用 Node.js 内置 AsyncLocalStorage（推荐，无额外依赖）：

2. 创建 packages/server/src/common/context/request-context.ts：
   import { AsyncLocalStorage } from 'async_hooks'
   import { randomUUID } from 'crypto'

   interface RequestContext {
     traceId: string
     userId?: number
   }

   export const requestContext = new AsyncLocalStorage<RequestContext>()

   export function getTraceId(): string {
     return requestContext.getStore()?.traceId ?? 'no-trace'
   }

   export function getUserId(): number | undefined {
     return requestContext.getStore()?.userId
   }

3. 创建 packages/server/src/common/middleware/request-context.middleware.ts：
   在每个请求开始时创建上下文：
   - 从请求头读取 X-Request-Id，若无则生成 randomUUID()
   - 在响应头中回传 X-Request-Id
   - 用 requestContext.run({ traceId, userId }, next) 包裹后续逻辑

4. 在 main.ts 中注册中间件（在所有 Guard/Interceptor 之前）

5. 更新 logging.interceptor.ts：
   - 日志中添加 traceId 和 userId 字段
   - 使用 getTraceId() 和 getUserId() 获取上下文

6. 更新 winston.config.ts 的 format：
   添加自定义 format 注入 traceId
```

---

## P2-07 | 质量 | Bull Processor 失败处理

**文件**: 各 `*.processor.ts`

**修复提示词**:

```
为所有 Bull Processor 添加 @OnQueueFailed 失败处理器：

在以下文件中添加：
- modules/customer/customer-import.processor.ts
- modules/ai/processors/anomaly-detect.processor.ts
- modules/ai/processors/report-generate.processor.ts
- modules/ai/processors/sales-forecast.processor.ts
- modules/ai/processors/customer-profile.processor.ts
- modules/ai/processors/intent-prediction.processor.ts
- modules/recording/asr.processor.ts（如存在）
- modules/ai/processors/embedding.processor.ts（如存在）

在每个 Processor 类中添加：
@OnQueueFailed()
async handleFailed(job: Job, error: Error) {
  this.logger.error(
    `Job ${job.id} in queue "${job.queue.name}" failed after ${job.attemptsMade} attempts`,
    error.stack,
  )

  // 超过最大重试次数时发送告警通知
  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await this.notificationService.notifyAdmins({
      type: 'QUEUE_JOB_FAILED',
      title: `队列任务最终失败: ${job.queue.name}`,
      content: `Job ${job.id} 失败: ${error.message}`,
      metadata: { jobId: job.id, queue: job.queue.name, data: job.data },
    })
  }
}

需要在各 Processor 中注入 NotificationService 和 Logger。
```

---

## P2-08 | 质量 | Bull 队列 defaultJobOptions

**文件**: 各模块的 `*.module.ts`

**修复提示词**:

```
在所有 BullModule.registerQueue() 调用中添加 defaultJobOptions：

示例（在各 module.ts 中）：
BullModule.registerQueue({
  name: 'customer-import',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,  // 保留最近 100 个已完成任务
    removeOnFail: 200,       // 保留最近 200 个失败任务
  },
})

AI 相关队列的配置可以更宽松：
{
  attempts: 2,
  backoff: { type: 'exponential', delay: 10000 },
  removeOnComplete: 50,
  removeOnFail: 100,
  timeout: 120000,  // AI 任务超时 2 分钟
}

涉及模块：
- app.module.ts 中的所有 registerQueue 调用
- 或各子模块中的 registerQueue
```

---

## P2-09 | 质量 | 创建 BusinessException 基类

**文件**: 新建 `common/exceptions/business.exception.ts`

**修复提示词**:

```
创建 packages/server/src/common/exceptions/business.exception.ts：

import { HttpException, HttpStatus } from '@nestjs/common'

export class BusinessException extends HttpException {
  constructor(
    public readonly bizCode: number,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code: bizCode, message, data: null }, httpStatus)
  }
}

// 按模块分段的错误码常量
export const BizErrorCodes = {
  // 客户模块 20000-29999
  CUSTOMER_DUPLICATE: 20001,
  CUSTOMER_STATUS_INVALID: 20002,
  CUSTOMER_POOL_LIMIT: 20003,

  // 商机模块 30000-39999
  OPPORTUNITY_STAGE_INVALID: 30001,
  OPPORTUNITY_CLOSE_REASON_REQUIRED: 30002,

  // 呼叫模块 40000-49999
  CALL_AGENT_NOT_IDLE: 40001,
  CALL_NUMBER_INVALID: 40002,

  // AI 模块 50000-59999
  AI_RATE_LIMIT: 50001,

  // 通用 90000-99999
  GENERAL_ERROR: 90001,
} as const

更新 http-exception.filter.ts 以正确处理 BusinessException：
识别 response.code 为业务错误码而非 HTTP 状态码映射。

创建 barrel export：
packages/server/src/common/exceptions/index.ts
export * from './business.exception'
```

---

## P2-10 | 质量 | 创建 Response DTO

**文件**: 各模块 DTO 目录

**修复提示词**:

```
为关键模块创建 Response DTO，避免 TypeORM Entity 直接泄漏到 API：

1. packages/server/src/modules/user/dto/user-response.dto.ts:
   import { Exclude, Expose } from 'class-transformer'

   @Exclude()
   export class UserResponseDto {
     @Expose() id!: number
     @Expose() username!: string
     @Expose() name!: string
     @Expose() email!: string
     @Expose() phone!: string
     @Expose() role!: string
     @Expose() isActive!: boolean
     @Expose() createdAt!: Date
     // password 字段被 @Exclude() 自动排除
   }

2. packages/server/src/modules/customer/dto/customer-response.dto.ts:
   类似模式，排除内部字段

3. packages/server/src/modules/opportunity/dto/opportunity-response.dto.ts

在 Service 或 Controller 中使用 plainToInstance 转换：
import { plainToInstance } from 'class-transformer'
return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true })

优先级：先为包含敏感字段的 User 和 AuditLog 创建 Response DTO，
其他模块可渐进式添加。
```

---

## P2-11 | 质量 | 补充 Swagger 装饰器

**文件**: 4 个 Controller

**修复提示词**:

```
为以下缺少 Swagger 文档的 Controller 添加装饰器：

对每个 Controller 添加类级别装饰器：
@ApiTags('模块名')
@ApiBearerAuth()

并为每个方法添加：
@ApiOperation({ summary: '操作描述' })
@ApiResponse({ status: 200, description: '成功' })

涉及文件：
1. packages/server/src/modules/contact/contact.controller.ts
   @ApiTags('联系人')
   @ApiBearerAuth()

2. packages/server/src/modules/customer-pool/customer-pool.controller.ts
   @ApiTags('客户公海池')
   @ApiBearerAuth()

3. packages/server/src/modules/customer-tag/customer-tag.controller.ts
   @ApiTags('客户标签')
   @ApiBearerAuth()

4. packages/server/src/modules/custom-field/custom-field.controller.ts
   @ApiTags('自定义字段')
   @ApiBearerAuth()

需要 import：
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
```

---

## P2-12 | 质量 | MySQL 连接池调优

**文件**: `config/database.config.ts:16-18`

**修复提示词**:

```
在 packages/server/src/config/database.config.ts 中调整连接池配置：

将 extra 配置：
extra: {
  connectionLimit: 10,
}

改为：
extra: {
  connectionLimit: configService.get<number>('DB_CONNECTION_LIMIT', 20),
  acquireTimeout: 10000,
  connectTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0,
},

同时在 .env.example 中添加：
DB_CONNECTION_LIMIT=20

生产环境建议 20-50，根据服务器 CPU 核心数和数据库最大连接数调整。
```

---

## P2-13 | 安全 | 前端 RSA 公钥加密密码

**文件**: `web/utils/crypto.ts`（新建）, `web/views/login/index.vue`

**修复提示词**:

```
实现前端密码 RSA 公钥加密传输：

1. 创建 packages/web/src/utils/crypto.ts：
   export async function encryptPassword(password: string, publicKeyPem: string): Promise<string> {
     const publicKey = await crypto.subtle.importKey(
       'spki',
       pemToArrayBuffer(publicKeyPem),
       { name: 'RSA-OAEP', hash: 'SHA-256' },
       false,
       ['encrypt']
     )
     const encrypted = await crypto.subtle.encrypt(
       { name: 'RSA-OAEP' },
       publicKey,
       new TextEncoder().encode(password)
     )
     return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
   }

2. 后端添加获取公钥 API：GET /api/v1/auth/public-key

3. 登录页面调用时先获取公钥，再加密密码后提交

4. 后端 AuthService.login() 中用私钥解密后再 bcrypt.compare
```

---

## P2-14 | 安全 | 前端 CSRF Token

**文件**: `web/utils/request.ts`（Axios 配置）

**修复提示词**:

```
实现 CSRF Token 双重提交 Cookie 模式：

后端：
1. 在 NestJS 中间件中设置 CSRF cookie：
   res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'strict' })

2. 在写操作中间件中验证请求头 X-XSRF-TOKEN 与 cookie 一致

前端：
3. 在 Axios 拦截器中读取 cookie 并设置请求头：
   Axios 默认支持 xsrfCookieName 和 xsrfHeaderName 配置：
   const request = axios.create({
     xsrfCookieName: 'XSRF-TOKEN',
     xsrfHeaderName: 'X-XSRF-TOKEN',
   })
```

---

## P2-15 | 业务 | 呼叫中心外呼前校验链

**文件**: `modules/call/call.controller.ts:26-37`, `modules/call/call.service.ts:42-56`

**修复提示词**:

```
在 packages/server/src/modules/call/call.service.ts 的 dial() 方法中
添加完整的外呼前校验链：

async dial(dto: DialDto, user: AuthUser): Promise<CallResult> {
  // 1. 坐席状态检查
  const agentStatus = await this.agentStatusService.getStatus(user.id)
  if (agentStatus !== 'IDLE') {
    throw new BadRequestException('坐席当前非空闲状态，无法外呼')
  }

  // 2. 号码格式校验
  const phoneRegex = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/
  if (!phoneRegex.test(dto.calleeNumber)) {
    throw new BadRequestException('号码格式不正确')
  }

  // 3. 黑名单检查（如存在黑名单表）
  const isBlacklisted = await this.checkBlacklist(dto.calleeNumber)
  if (isBlacklisted) {
    throw new ForbiddenException('该号码在外呼黑名单中')
  }

  // 4. 客户归属验证（SALES 角色仅能外呼自己负责的客户）
  if (dto.customerId && user.role === 'SALES') {
    const customer = await this.customerService.findOne(dto.customerId, user)
    if (customer.assignedUserId !== user.id) {
      throw new ForbiddenException('无权对非自己负责的客户发起外呼')
    }
  }

  // ... 原有外呼逻辑 ...
}

同时更新 DialDto 添加号码正则校验：
@Matches(/^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/, { message: '号码格式不正确' })
calleeNumber!: string
```

---

## P2-16 | 业务 | 回调事件按序处理

**文件**: `modules/call/call-callback.service.ts:18-41`

**修复提示词**:

```
在 packages/server/src/modules/call/call-callback.service.ts 中
添加回调事件排序和幂等处理：

方案一（乐观锁）：
在 handleCallback() 方法中：
// 仅当目标状态比当前状态"更晚"时才更新
const CALL_STATUS_ORDER = { RINGING: 1, CONNECTED: 2, ON_HOLD: 3, ENDED: 4 }

async handleCallback(payload: CallbackPayload) {
  const currentRecord = await this.callRecordRepository.findOne({
    where: { callId: payload.callId },
  })
  if (!currentRecord) return

  const currentOrder = CALL_STATUS_ORDER[currentRecord.status] ?? 0
  const newOrder = CALL_STATUS_ORDER[payload.event] ?? 0

  // 拒绝"倒退"的事件
  if (newOrder <= currentOrder) {
    this.logger.warn(`Ignoring out-of-order event: ${payload.event} for call ${payload.callId}`)
    return
  }

  // 使用 WHERE 条件确保原子性
  const result = await this.callRecordRepository.update(
    { callId: payload.callId, status: currentRecord.status },
    { status: this.mapEventToStatus(payload.event), ...otherFields }
  )

  if (result.affected === 0) {
    this.logger.warn(`Concurrent update detected for call ${payload.callId}`)
  }
}

方案二（队列串行化）：
将回调事件推入 Bull 队列，以 callId 为 jobId 保证同一通话的事件串行处理。
```

---

## P2-17 | 业务 | 短通话跳过 ASR

**文件**: `modules/recording/recording.service.ts:76-96`

**修复提示词**:

```
在 packages/server/src/modules/recording/recording.service.ts 的
triggerAsr() 方法入口添加时长判断：

async triggerAsr(recordingId: number): Promise<void> {
  const recording = await this.recordingFileRepository.findOne({
    where: { id: recordingId },
  })
  if (!recording) return

  // 通话时长 < 8 秒跳过 ASR（短通话无有效内容）
  if (recording.durationSeconds < 8) {
    this.logger.debug(`Skipping ASR for recording ${recordingId}: duration ${recording.durationSeconds}s < 8s`)
    return
  }

  // ... 原有 ASR 任务创建逻辑 ...
}

阈值 8 秒可提取为配置常量：
private readonly ASR_MIN_DURATION_SECONDS = 8
```

---

## P2-18 | 业务 | 通知事件去重

**文件**: `modules/notification/notification.gateway.ts`, 前端 composable

**修复提示词**:

```
1. 修改 packages/server/src/modules/notification/ 中的通知类型定义：
   在 NotificationPayload 接口中添加 eventId 字段：
   export interface NotificationPayload {
     eventId: string       // 新增：UUID 唯一事件标识
     type: NotificationType
     title: string
     content: string
     metadata?: Record<string, unknown>
     createdAt: string
   }

2. 在 NotificationGateway 的 sendToUser() 和 broadcast() 方法中
   自动生成 eventId：
   import { randomUUID } from 'crypto'
   payload.eventId = payload.eventId || randomUUID()

3. 前端 packages/web/src/composables/useNotification.ts 中添加去重：
   const processedEventIds = new Set<string>()
   const MAX_PROCESSED_IDS = 1000

   function handleNotification(payload: NotificationPayload) {
     if (processedEventIds.has(payload.eventId)) return
     processedEventIds.add(payload.eventId)
     if (processedEventIds.size > MAX_PROCESSED_IDS) {
       const oldest = processedEventIds.values().next().value
       processedEventIds.delete(oldest)
     }
     // ... 原有处理逻辑 ...
   }
```

---

## P2-19 | 业务 | 知识库树结构安全

**文件**: `modules/knowledge/knowledge.service.ts:468,514`

**修复提示词**:

```
1. 循环引用检测 — 在 updateCategory() 中（L468-469）：
   在设置 dto.parentId 之前检查新 parent 是否为自身或自身后代：

   if (dto.parentId) {
     if (dto.parentId === categoryId) {
       throw new BadRequestException('分类不能设置自身为父分类')
     }
     // 检查是否为后代节点
     const descendants = await this.getDescendantIds(categoryId)
     if (descendants.includes(dto.parentId)) {
       throw new BadRequestException('不能将分类移动到自身的子分类下')
     }
   }

   private async getDescendantIds(categoryId: number): Promise<number[]> {
     // 利用 path 字段快速查询所有后代
     const category = await this.categoryRepository.findOne({ where: { id: categoryId } })
     if (!category) return []
     const descendants = await this.categoryRepository
       .createQueryBuilder('c')
       .where('c.path LIKE :path', { path: `${category.path}/%` })
       .select('c.id')
       .getMany()
     return descendants.map(d => d.id)
   }

2. 删除分类级联处理 — 在 removeCategory()（L514-526）中：
   删除分类前处理子分类和关联文章：
   - 选项 A：禁止删除有子分类的分类（throw BadRequest）
   - 选项 B：级联将子分类的 parentId 设为被删分类的 parentId
   - 选项 C：级联软删除所有子分类和关联文章

   推荐选项 A（最安全）：
   const childCount = await this.categoryRepository.count({
     where: { parentId: categoryId, deleted: false },
   })
   if (childCount > 0) {
     throw new BadRequestException('该分类下还有子分类，请先删除或移动子分类')
   }
```

---

## P2-20 | 业务 | 公告多渠道推送

**文件**: `modules/announcement/announcement.service.ts`, `modules/announcement/entities/announcement.entity.ts`

**修复提示词**:

```
1. 在 announcement.entity.ts 中添加字段：
   @Column({ type: 'simple-array', nullable: true })
   channels?: string[]  // ['WEB', 'EMAIL', 'SMS', 'WECHAT']

   @Column({ type: 'simple-array', nullable: true })
   targetRoles?: string[]  // ['admin', 'manager', 'sales']

2. 在 announcement.service.ts 的 create() 方法中集成 NotificationService：
   async create(dto: CreateAnnouncementDto, userId: number) {
     const announcement = this.repo.create({ ...dto, createdBy: userId })
     const saved = await this.repo.save(announcement)

     // 发布时推送
     if (saved.publishAt && new Date(saved.publishAt) <= new Date()) {
       await this.pushAnnouncement(saved)
     }
     return saved
   }

   private async pushAnnouncement(announcement: Announcement) {
     // WebSocket 推送给在线用户
     await this.notificationService.broadcast({
       type: 'ANNOUNCEMENT_NEW',
       title: announcement.title,
       content: announcement.content.slice(0, 200),
       metadata: { announcementId: announcement.id },
     })
     // 后续可扩展 EMAIL/SMS/WECHAT 渠道
   }

3. 更新 CreateAnnouncementDto 添加 channels 和 targetRoles 字段
```

---

## P2-21 | 业务 | 文章版本控制

**文件**: `modules/knowledge/knowledge.service.ts:209-219`

**修复提示词**:

```
在 updateArticle() 方法中启用 version 自增：

1. 在 knowledge.service.ts 的 updateArticle() 中：
   Object.assign(article, dto) 之后添加：
   article.version = (article.version ?? 0) + 1

2. 长期方案：创建 article_versions 历史表
   新建 Migration：
   CREATE TABLE article_versions (
     id INT AUTO_INCREMENT PRIMARY KEY,
     article_id INT NOT NULL,
     version INT NOT NULL,
     title VARCHAR(200),
     content LONGTEXT,
     editor_id INT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_article_version (article_id, version)
   )

   在 updateArticle() 中，save 之前将旧内容快照存入 article_versions 表。

3. 添加乐观锁（防止并发编辑覆盖）：
   在 Entity 中添加 @VersionColumn() 或在 update 时使用：
   const result = await this.repo.update(
     { id: articleId, version: article.version - 1 },
     updatedFields
   )
   if (result.affected === 0) {
     throw new ConflictException('文章已被他人修改，请刷新后重试')
   }
```

---

## P2-22 | 业务 | 排行榜快照去重

**文件**: `modules/sales-target/sales-target.service.ts:408-413`

**修复提示词**:

```
1. 修复快照查询条件缺少 metricType 过滤：
   在 sales-target.service.ts 约 L408-413 的重复检查中：

   将：
   const existing = await this.rankingRepo.findOne({
     where: { snapshotDate, year, month },
   })

   改为：
   const existing = await this.rankingRepo.findOne({
     where: { snapshotDate, year, month, metricType },
   })

2. 在 performance-ranking.entity.ts 中添加复合唯一索引：
   @Unique(['snapshotDate', 'year', 'month', 'metricType', 'userId'])

3. 创建对应的 Migration 添加该唯一索引
```

---

## P2-23 | 数据库 | 外键字段添加索引

**文件**: 多处 Entity

**修复提示词**:

```
为 12 个缺少索引的外键字段创建 Migration：

需要添加索引的字段：
1. call_records.opportunity_id
2. knowledge_categories.parent_id
3. campaign_call_items.customer_id
4. campaign_call_items.contact_id
5. campaign_call_items.call_record_id
6. ai_alerts.customer_id
7. ai_alerts.opportunity_id
8. intent_predictions.customer_id
9. intent_predictions.opportunity_id
10. competitor_reports.customer_id
11. competitor_reports.opportunity_id
12. sys_role_departments.department_id

创建 Migration 文件，为每个字段添加：
CREATE INDEX idx_{table}_{column} ON {table} ({column})

或在 Entity 中添加 @Index() 装饰器后通过 synchronize 自动创建（仅开发环境）。
```

---

## P2-24 | 数据库 | 唯一索引包含 deleted_at

**文件**: 多处 Entity

**修复提示词**:

```
8 个唯一索引在软删除场景下可能冲突（删除记录占用唯一键）。

推荐方案：将 BaseEntity 的 deleted: boolean 改为 @DeleteDateColumn() 的 deletedAt：

1. 修改 packages/server/src/common/entities/base.entity.ts：
   将：
   @Column({ type: 'boolean', default: false })
   deleted!: boolean

   改为：
   @DeleteDateColumn({ name: 'deleted_at', nullable: true })
   deletedAt?: Date

2. 唯一索引改为部分唯一索引（MySQL 8.0 不支持 partial index，
   改用函数唯一索引或在应用层处理）：

   方案 A（MySQL 8.0.13+）：
   CREATE UNIQUE INDEX idx_unique_username
   ON users (username, (CASE WHEN deleted_at IS NULL THEN 0 ELSE id END))

   方案 B（应用层）：
   在 Service 层做唯一性检查时过滤 deletedAt IS NULL

3. 这是一个较大的改动，建议分步执行：
   - 先创建 Migration 添加 deleted_at 列
   - 迁移 deleted=true 的记录设置 deleted_at = updated_at
   - 移除 deleted 列
   - 调整所有 WHERE deleted = false 查询
```

---

## P2-25 | 数据库 | User.isActive 列名映射

**文件**: `modules/user/entities/user.entity.ts:23`

**修复提示词**:

```
在 packages/server/src/modules/user/entities/user.entity.ts 中：

将：
@Column({ type: 'boolean', default: true })
isActive!: boolean

改为：
@Column({ name: 'is_active', type: 'boolean', default: true })
isActive!: boolean

确保 Entity 属性名与数据库列名正确映射。
Migration 文件中列名为 is_active（snake_case），
TypeORM 默认可能将 isActive 映射为 isActive（camelCase）。
```

---

## P2-26 | 数据库 | 金额字段统一 DECIMAL(15,2)

**文件**: 多处 Entity

**修复提示词**:

```
统一以下金额字段为 DECIMAL(15,2)：

当前不一致的字段：
- opportunity.entity.ts:29 — amount: DECIMAL(12,2) → DECIMAL(15,2)
- opportunity.entity.ts:69 — weightedAmount: DECIMAL(14,2) → DECIMAL(15,2)
- customer.entity.ts:93 — registeredCapital: DECIMAL(12,2) → DECIMAL(15,2)
- customer.entity.ts:96 — annualRevenue: DECIMAL(14,2) → DECIMAL(15,2)
- sales-target.entity.ts:21 — targetValue: DECIMAL(14,2) → DECIMAL(15,2)
- sales-target.entity.ts:24 — achievedValue: DECIMAL(14,2) → DECIMAL(15,2)
- sales-forecast.entity.ts:16 — forecastAmount: DECIMAL(14,2) → DECIMAL(15,2)
- sales-forecast.entity.ts:19,22 — confidenceLow/High: DECIMAL(14,2) → DECIMAL(15,2)
- performance-ranking.entity.ts:22 — metricValue: DECIMAL(14,2) → DECIMAL(15,2)

创建 Migration 文件使用 ALTER TABLE ... MODIFY COLUMN。
```

---

## P2-27 | 数据库 | 时间戳字段统一 \_at 后缀

**文件**: 多处 Entity

**修复提示词**:

```
统一以下时间戳字段命名为 _at 后缀（需创建 Migration + 修改 Entity）：

- customer.entity.ts:108 — pool_enter_time → pool_entered_at
- knowledge-article.entity.ts:65 — publish_time → published_at
- knowledge-article.entity.ts:74 — review_time → reviewed_at
- campaign-task.entity.ts:43 — start_time → started_at
- campaign-task.entity.ts:46 — end_time → ended_at

每个字段需要：
1. Entity 中修改 @Column({ name: 'xxx' }) 的 name 值
2. 创建 Migration：ALTER TABLE xxx RENAME COLUMN old_name TO new_name
3. 更新所有 Service/Controller 中引用该字段的代码
```

---

## P2-28 | 数据库 | 显式配置 collation

**文件**: `config/database.config.ts`

**修复提示词**:

```
在 packages/server/src/config/database.config.ts 中显式配置 collation：

extra: {
  connectionLimit: configService.get<number>('DB_CONNECTION_LIMIT', 20),
  collation: 'utf8mb4_unicode_ci',
  // ... 其他配置
}

并在 docker/mysql/conf.d/my.cnf 中添加：
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
ngram_token_size=2
```

---

# P3 — 中长期优化（本月+）

---

## P3-01 | 运维 | Docker 非 root 用户

**修复提示词**:

```
在所有 Dockerfile 中添加非 root 用户运行：

# 在 build 阶段最后
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 切换用户
USER nestjs

同时使用多阶段构建减小镜像体积：
FROM node:20-alpine AS builder
# ... build steps ...

FROM node:20-alpine AS runner
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
CMD ["node", "dist/main.js"]
```

---

## P3-02 | 运维 | 蓝绿/滚动部署

**修复提示词**:

```
在 docker-compose.yml 或 Kubernetes 配置中添加：

docker-compose（蓝绿）：
使用 docker-compose profiles 或 Traefik 实现蓝绿切换

Kubernetes（滚动）：
apiVersion: apps/v1
kind: Deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: crm-server
        readinessProbe:
          httpGet:
            path: /api/v1/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## P3-03 | 质量 | 单元测试覆盖率提升至 80%

**修复提示词**:

```
按优先级编写单元测试：

第一批（关键业务逻辑）：
- customer.service.ts — create/update/validateStatusTransition
- opportunity.service.ts — updateStage/create/calculateWeightedAmount
- customer-pool.service.ts — claim/return
- auth.service.ts — login/refreshToken/revokeToken
- duplicate-check.service.ts — checkDuplicates

第二批（安全相关）：
- encryption.service.ts — encrypt/decrypt/transformer
- callback-signature.guard.ts — canActivate
- jwt.strategy.ts — validate

第三批（基础设施）：
- redis.service.ts
- response.interceptor.ts
- http-exception.filter.ts

使用 Jest + @nestjs/testing 的 Test.createTestingModule()
mock 外部依赖（Repository、Redis、Bull Queue）
```

---

## P3-04 | 架构 | 拆分 CustomerService

**修复提示词**:

```
将 packages/server/src/modules/customer/customer.service.ts（468 行）拆分为：

1. customer.service.ts — 保留 CRUD + 状态管理（~200 行）
2. customer-export.service.ts — Excel/CSV 导出逻辑
3. customer-import.service.ts — 导入逻辑（从 Controller 迁移）
4. customer-number.service.ts — 编号生成（Redis INCR）

更新 customer.module.ts 的 providers 注册新 Service。
```

---

## P3-05 | 架构 | 拆分 AuthService

**修复提示词**:

```
将 packages/server/src/modules/auth/auth.service.ts（505 行）拆分为：

1. auth.service.ts — 保留 login/logout/validateCredentials（~150 行）
2. token.service.ts — JWT 生成/刷新/黑名单/白名单管理
3. wx-auth.service.ts — 微信登录/绑定手机号
4. captcha.service.ts — 验证码生成/验证（从 AuthController 迁移）

更新 auth.module.ts。
```

---

## P3-06 | 性能 | Redis KEYS 改用 SCAN

**文件**: `modules/agent/agent-status.service.ts:69`

**修复提示词**:

```
将 getWrapUpOverdueAgentIds() 中的 KEYS 命令改为 SCAN 或 ZSET：

方案 A（SCAN）：
async getWrapUpOverdueAgentIds(): Promise<string[]> {
  const pattern = 'agent:wrap_up_at:*'
  const overdueIds: string[] = []
  let cursor = '0'
  do {
    const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = nextCursor
    for (const key of keys) {
      const timestamp = await this.redis.get(key)
      if (timestamp && Date.now() > parseInt(timestamp) + 120000) {
        overdueIds.push(key.split(':').pop()!)
      }
    }
  } while (cursor !== '0')
  return overdueIds
}

方案 B（ZSET，推荐）：
使用 agent:wrap_up_set（ZSET，score=时间戳）：
- transition 到 WRAP_UP 时：ZADD agent:wrap_up_set <timestamp> <agentId>
- 扫描超时：ZRANGEBYSCORE agent:wrap_up_set 0 <now - 120000>
- transition 离开 WRAP_UP 时：ZREM agent:wrap_up_set <agentId>
```

---

## P3-07 | 质量 | 缓存键命名统一

**文件**: `common/redis/cache-keys.ts`, 多处 Service

**修复提示词**:

```
统一缓存键命名格式为 crm:{module}:{entity}:{qualifier}：

1. 更新 cache-keys.ts 中所有键定义
2. 更新 auth.service.ts 中的 AUTH_KEYS
3. 更新 agent-status.service.ts 中的键
4. 更新 permission-cache.service.ts 中的键

迁移步骤：
- 新旧键并存过渡期（读取时先查新键，miss 后查旧键）
- 旧键 TTL 到期后自然消亡
- 或一次性 SCAN + RENAME 迁移
```

---

## P3-08 | 业务 | 呼叫分配策略完善

**文件**: `modules/agent/call-distribution.service.ts`

**修复提示词**:

```
完善 least_calls 和 skill_based 策略实现：

1. least_calls 策略：
   查询各空闲坐席当日通话次数，选择最少的：
   const callCounts = await this.callRecordRepo
     .createQueryBuilder('cr')
     .select('cr.assigned_user_id', 'userId')
     .addSelect('COUNT(*)', 'count')
     .where('cr.assigned_user_id IN (:...ids)', { ids: idleAgentIds })
     .andWhere('cr.created_at >= :today', { today: todayStart })
     .groupBy('cr.assigned_user_id')
     .getRawMany()

2. skill_based 策略：
   根据 options.skillIds 匹配坐席技能标签：
   - Agent 实体需要添加 skills: string[] 字段
   - 过滤出技能匹配的坐席
   - 在匹配坐席中按 least_calls 排序
```

---

## P3-09 | 业务 | 录音生命周期管理

**修复提示词**:

```
1. 创建录音保留策略配置表或使用环境变量：
   RECORDING_RETENTION_DAYS=180

2. 创建定时任务（每天凌晨执行）：
   - 查询超过保留期的录音记录
   - 删除 OSS 上的录音文件
   - 更新数据库记录标记为已归档
   - 记录操作日志

3. 添加存储统计 API：
   GET /api/v1/recordings/storage-stats
   返回 { totalCount, totalSizeBytes, oldestRecording, newestRecording }

4. CallRecord 软删除时级联处理关联的 RecordingFile
```

---

## P3-10 | 业务 | 缺失模块开发规划

**修复提示词**:

```
以下模块在代码审查中确认不存在，需要规划开发：

按业务依赖顺序：
1. 报价模块（Quotation）— 行项目金额计算、折扣审批触发
2. 合同模块（Contract）— 审批分级、unpaid_amount 刷新、到期续签提醒
3. 回款模块（Payment/Collection）— 超付校验 <= 105%、逾期自动标记
4. 审批引擎（Approval Engine）— 节点配置、撤回条件、超时梯度提醒、完成回调

每个模块需要：Entity + Migration + DTO + Service + Controller + 单元测试
建议先出详细设计文档，再分 Sprint 开发。
```

---

## P3-11 | 前端 | 小程序离线队列

**修复提示词**:

```
在 packages/miniapp/ 中完善离线队列实现：

1. 创建 utils/offline-queue.ts：
   - 使用 uni.getStorageSync 持久化待发送请求
   - 网络恢复时（uni.onNetworkStatusChange）自动重试
   - 支持请求去重和过期清理
   - 冲突解决策略：last-write-wins + 服务端时间戳比较

2. 在关键写操作（签到、跟进记录提交）中集成离线队列：
   try {
     await api.post('/follow-ups', data)
   } catch (err) {
     if (isNetworkError(err)) {
       offlineQueue.enqueue({ method: 'POST', url: '/follow-ups', data })
       uni.showToast({ title: '已保存到离线队列' })
     }
   }
```

---

## P3-12 | 缓存 | 布隆过滤器防穿透

**修复提示词**:

```
为高频查询路径添加布隆过滤器防止缓存穿透：

1. 安装 Redis 布隆过滤器模块（如使用 Redis Stack）
   或使用纯 Redis 位图实现简易布隆过滤器

2. 在 customer.service.ts 中：
   - 系统启动时将所有客户 ID 加入布隆过滤器
   - findOne 查询前先检查布隆过滤器
   - 创建新客户时添加到布隆过滤器

3. 简易实现（无需 Redis 模块）：
   使用多个 Redis SETBIT 实现布隆过滤器
   或使用 npm 包 bloom-filters 在内存中维护

注意：布隆过滤器有假阳性但无假阴性，
适合作为"一定不存在"的快速判断。
```

---

# 附录：统计汇总

| 优先级            | 任务数 | 预计总工时 | 涉及模块                  |
| ----------------- | ------ | ---------- | ------------------------- |
| **P0** 立即修复   | 7      | ~4h        | 安全、API 路由            |
| **P1** 本周修复   | 17     | ~28h       | 架构、安全、业务逻辑、API |
| **P2** 本迭代修复 | 28     | ~40h       | 安全、质量、业务、数据库  |
| **P3** 中长期优化 | 12     | ~75h       | 运维、架构、测试、业务    |
| **总计**          | **64** | **~147h**  | —                         |

---

# 附录：修复依赖关系图

```
P0-02（全局限流） ← P0-03（AI端点限流）
P0-04（异常替换） ← P1-01（AiController重构）
P0-05（双前缀修复） ← P2-11（Swagger补充）
P1-01（AiController重构） ← P1-08（数据权限）
P1-03（事务保护） ← P1-15（公海池并发修复）
P1-12（阶段准入校验） ← P1-13（丢单原因）← P1-14（weightedAmount）
P2-06（traceId） ← P2-07（Bull失败处理，日志需traceId）
P2-09（BusinessException） ← P2-10（Response DTO）
P2-24（唯一索引+deleted_at） ← 需评估影响范围后执行
```

---

**文档结束**
