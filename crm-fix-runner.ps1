# CRM Sales Platform - Claude 自动化修复脚本
# 基于 FIX_TASKS.md 任务清单自动生成
# 版本: 1.1 (修复版)
# 生成日期: 2026-03-11

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("P0", "P1", "P2", "P3", "ALL")]
    [string]$Priority = "ALL",
    
    [Parameter(Mandatory=$false)]
    [string[]]$TaskIds = @(),
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectRoot = ".",
    
    [Parameter(Mandatory=$false)]
    [string]$PermissionMode = "acceptEdits",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipAllPermissions = $false,
    
    [Parameter(Mandatory=$false)]
    [string[]]$AllowedTools = @("Read", "Edit", "Write", "Glob", "Grep"),
    
    [Parameter(Mandatory=$false)]
    [int]$RetryCount = 3,
    
    [Parameter(Mandatory=$false)]
    [int]$RetryDelay = 5,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$ContinueSession = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Compact = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = ".\claude-fix-output",
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$Model = "sonnet",
    
    [Parameter(Mandatory=$false)]
    [switch]$ListTasks = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport = $false
)

# 配置
$Script:Config = @{
    ClaudePath = "claude"
    LogFile = ".\crm-fix-runner.log"
    SessionDir = "$env:USERPROFILE\.claude-crm-fixes"
    CompactThreshold = 50000
    AutoCompactInterval = 5
    DefaultModel = "sonnet"
    DefaultPermissionMode = "acceptEdits"
    TimeoutMinutes = 30
}

# 统计信息
$Script:Stats = @{
    StartTime = Get-Date
    TasksTotal = 0
    TasksSuccess = 0
    TasksFailed = 0
    TasksSkipped = 0
}

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("DEBUG", "INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    $colorMap = @{
        "DEBUG" = "Gray"
        "INFO" = "White"
        "WARN" = "Yellow"
        "ERROR" = "Red"
        "SUCCESS" = "Green"
    }
    
    Write-Host $logEntry -ForegroundColor $colorMap[$Level]
    Add-Content -Path $Script:Config.LogFile -Value $logEntry -ErrorAction SilentlyContinue
}

# 初始化环境
function Initialize-Environment {
    if (-not (Test-Path $Script:Config.SessionDir)) {
        New-Item -ItemType Directory -Path $Script:Config.SessionDir -Force | Out-Null
    }
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    
    $logHeader = @"
========================================
CRM Fix Runner Started: $(Get-Date)
Priority: $Priority
Project Root: $ProjectRoot
========================================
"@
    Add-Content -Path $Script:Config.LogFile -Value $logHeader
}

# 检查 Claude CLI
function Test-ClaudeCLI {
    try {
        $version = & $Script:Config.ClaudePath --version 2>&1
        Write-Log "Claude CLI 版本: $version" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Claude CLI 未安装！运行: npm install -g @anthropic-ai/claude-code" "ERROR"
        return $false
    }
}

# 获取任务定义
function Get-TaskDefinitions {
    $tasks = @{}
    
    # P0-01: bcrypt salt rounds
    $tasks["P0-01"] = @{
        Priority = "P0"
        Category = "安全"
        Title = "bcrypt salt rounds 从 10 改为 12"
        Files = @("packages/server/src/modules/user/user.service.ts")
        Prompt = '在文件 packages/server/src/modules/user/user.service.ts 中：

1. 在类顶部添加一个私有常量：
   private readonly BCRYPT_SALT_ROUNDS = 12

2. 将第 26 行的 bcrypt.hash(dto.password, 10) 改为：
   bcrypt.hash(dto.password, this.BCRYPT_SALT_ROUNDS)

3. 将第 88 行的 bcrypt.hash(dto.password, 10) 改为：
   bcrypt.hash(dto.password, this.BCRYPT_SALT_ROUNDS)

注意：修改后不影响已有密码的校验（bcrypt 自动识别存储 hash 中的轮数）'
    }
    
    # P0-02: 注册全局 ThrottlerGuard
    $tasks["P0-02"] = @{
        Priority = "P0"
        Category = "安全"
        Title = "注册全局 ThrottlerGuard"
        Files = @("packages/server/src/app.module.ts")
        Prompt = '在文件 packages/server/src/app.module.ts 中：

1. 在文件顶部添加 import：
   import { APP_GUARD } from ''@nestjs/core''
   import { CustomThrottlerGuard } from ''./common/guards/custom-throttler.guard''

2. 在 @Module 的 providers 数组中添加：
   {
     provide: APP_GUARD,
     useClass: CustomThrottlerGuard,
   }

注意：CustomThrottlerGuard 已存在于 common/guards/custom-throttler.guard.ts'
    }
    
    # P0-03: AI 端点添加独立频率限制
    $tasks["P0-03"] = @{
        Priority = "P0"
        Category = "安全"
        Title = "AI 端点添加独立频率限制"
        Files = @(
            "packages/server/src/modules/ai/ai.controller.ts",
            "packages/server/src/modules/knowledge/knowledge.controller.ts"
        )
        Prompt = '在文件 packages/server/src/modules/ai/ai.controller.ts 中：

1. 在文件顶部添加 import：
   import { Throttle } from ''@nestjs/throttler''

2. 在以下方法上方添加 @Throttle 装饰器：
   @Throttle({ default: { ttl: 60000, limit: 3 } })
   加到以下方法：
   - generateReport()
   - generateSalesForecast()
   - generateCustomerProfile()
   - generateIntentPrediction()
   - getScriptRecommendation()

在文件 packages/server/src/modules/knowledge/knowledge.controller.ts 中：

3. 同样添加 import { Throttle } from ''@nestjs/throttler''

4. 在 askQuestion() 方法上方添加：
   @Throttle({ default: { ttl: 60000, limit: 5 } })'
    }
    
    # P0-04: throw new Error 替换为 NestJS 内置异常
    $tasks["P0-04"] = @{
        Priority = "P0"
        Category = "API"
        Title = "throw new Error 替换为 NestJS 内置异常"
        Files = @(
            "packages/server/src/modules/agent/agent.controller.ts",
            "packages/server/src/modules/recording/recording.controller.ts",
            "packages/server/src/modules/campaign/campaign.controller.ts"
        )
        Prompt = '在以下文件中将 throw new Error(...) 替换为正确的 NestJS HTTP 异常：

1. packages/server/src/modules/agent/agent.controller.ts:
   - L90: throw new Error(''Agent not found'')
     改为: throw new NotFoundException(''Agent not found'')
   - L105: throw new Error(...)（状态无效）
     改为: throw new BadRequestException(''Invalid agent status'')
   - L139: throw new Error(...)（分配失败）
     改为: throw new BadRequestException(''Call assignment failed'')

2. packages/server/src/modules/recording/recording.controller.ts:
   - L35: throw new Error(''Unauthorized'')
     改为: throw new ForbiddenException(''No permission to access this recording'')
   - L60: throw new Error(...)
     改为: throw new NotFoundException(''Recording not found'')

3. packages/server/src/modules/campaign/campaign.controller.ts:
   - L37: throw new Error(''Unauthorized'')
     改为: throw new ForbiddenException(''No permission for this campaign'')

每个文件顶部确保 import 了对应的异常类：
import { NotFoundException, BadRequestException, ForbiddenException } from ''@nestjs/common'''
    }
    
    # P0-05: 修复双前缀路由 bug
    $tasks["P0-05"] = @{
        Priority = "P0"
        Category = "API"
        Title = "修复 6 个 Controller 双前缀路由 bug"
        Files = @(
            "packages/server/src/modules/contact/contact.controller.ts",
            "packages/server/src/modules/customer-pool/customer-pool.controller.ts",
            "packages/server/src/modules/custom-field/custom-field.controller.ts",
            "packages/server/src/modules/customer-tag/customer-tag.controller.ts"
        )
        Prompt = '修复双前缀路由 bug。main.ts 已通过 setGlobalPrefix(''api/v1'') 设置全局前缀，以下 Controller 不应再包含 ''api/v1''：

1. packages/server/src/modules/contact/contact.controller.ts:
   L26: @Controller(''api/v1'')
   改为: @Controller()

2. packages/server/src/modules/customer-pool/customer-pool.controller.ts:
   L30: @Controller(''api/v1/customer-pool'')
   改为: @Controller(''customer-pool'')

3. packages/server/src/modules/custom-field/custom-field.controller.ts:
   L23: @Controller(''api/v1/custom-fields'')
   改为: @Controller(''custom-fields'')

4. packages/server/src/modules/customer-tag/customer-tag.controller.ts:
   L24: @Controller(''api/v1'')
   改为: @Controller()

修复后验证：启动服务后访问 Swagger UI 确认路由前缀正确'
    }
    
    # P0-06: 解决 call Controller 路由前缀冲突
    $tasks["P0-06"] = @{
        Priority = "P0"
        Category = "API"
        Title = "解决 3 个 call Controller 路由前缀冲突"
        Files = @(
            "packages/server/src/modules/call/call.controller.ts",
            "packages/server/src/modules/call/call-callback.controller.ts",
            "packages/server/src/modules/call/call-popup.controller.ts"
        )
        Prompt = '三个 Controller 都使用 @Controller(''call'') 前缀，路由可能冲突。按职责分离为不同前缀：

1. packages/server/src/modules/call/call.controller.ts:
   保持: @Controller(''call'')
   （核心外呼操作：dial, answer, hangup, mute, hold, transfer 等）

2. packages/server/src/modules/call/call-callback.controller.ts:
   L9: @Controller(''call'')
   改为: @Controller(''call-callback'')

3. packages/server/src/modules/call/call-popup.controller.ts:
   L22: @Controller(''call'')
   改为: @Controller(''call-popup'')

验证：确认 callback URL 更新后阿里云/第三方语音服务回调能正确到达'
    }
    
    # P0-07: 回调签名改用恒等时间比较 + 防重放
    $tasks["P0-07"] = @{
        Priority = "P0"
        Category = "安全"
        Title = "回调签名改用恒等时间比较 + 防重放"
        Files = @(
            "packages/server/src/common/guards/callback-signature.guard.ts",
            "packages/server/src/modules/call/call-callback.controller.ts"
        )
        Prompt = '在文件 packages/server/src/common/guards/callback-signature.guard.ts 中：

1. 在文件顶部添加 import：
   import { timingSafeEqual } from ''crypto''

2. 将 L33 的签名比较：
   if (signature.toLowerCase() !== expected.toLowerCase()) {
   替换为恒等时间比较：
   const sigBuf = Buffer.from(signature.toLowerCase(), ''utf8'')
   const expBuf = Buffer.from(expected.toLowerCase(), ''utf8'')
   if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {

在文件 packages/server/src/modules/call/call-callback.controller.ts 中：

3. 在 Controller 的 @UseGuards 中叠加 ReplayAttackGuard：
   @UseGuards(CallbackSignatureGuard, ReplayAttackGuard)'
    }
    
    # P1-01: AiController 重构到 Service 层
    $tasks["P1-01"] = @{
        Priority = "P1"
        Category = "架构"
        Title = "AiController 重构到 Service 层"
        Files = @("packages/server/src/modules/ai/ai.controller.ts")
        Prompt = '重构 packages/server/src/modules/ai/ai.controller.ts，目标是 Controller 仅做路由分发：

第一步：创建新的 Service 文件
在 packages/server/src/modules/ai/ 目录下创建以下 Service：

1. ai-alert.service.ts - 从 AiController 迁移 getAlerts(), acknowledgeAlert(), resolveAlert()
2. ai-report.service.ts - 迁移 getReports(), generateReport()
3. ai-forecast.service.ts - 迁移 getSalesForecasts(), generateSalesForecast()
4. ai-competitor.service.ts - 迁移 getCompetitorReports()
5. ai-profile.service.ts - 迁移 generateCustomerProfile()
6. ai-prediction.service.ts - 迁移 getIntentPredictions(), generateIntentPrediction()
7. ai-script.service.ts - 迁移 getScriptRecommendation()

第二步：更新 AiModule
在 ai.module.ts 的 providers 数组中注册所有新 Service

第三步：重构 AiController
- 移除所有 Repository 注入
- 移除所有 Queue 注入
- 改为注入对应的 Service
- 方法体改为简单调用 Service 方法并返回结果'
    }
    
    # P1-02: CustomerService 拆分
    $tasks["P1-02"] = @{
        Priority = "P1"
        Category = "架构"
        Title = "CustomerService 拆分"
        Files = @("packages/server/src/modules/customer/customer.service.ts")
        Prompt = '将 packages/server/src/modules/customer/customer.service.ts（468 行）拆分为：

1. customer.service.ts - 保留 CRUD + 状态管理（约200行）
2. customer-export.service.ts - Excel/CSV 导出逻辑
3. customer-import.service.ts - 导入逻辑
4. customer-number.service.ts - 编号生成（Redis INCR）

更新 customer.module.ts 的 providers 注册新 Service。
确保所有拆分后的 Service 方法签名保持不变，避免破坏现有调用。'
    }
    
    # P1-03: AuthService 拆分
    $tasks["P1-03"] = @{
        Priority = "P1"
        Category = "架构"
        Title = "AuthService 拆分"
        Files = @("packages/server/src/modules/auth/auth.service.ts")
        Prompt = '将 packages/server/src/modules/auth/auth.service.ts（505 行）拆分为：

1. auth.service.ts - 保留 login/logout/validateCredentials（约150行）
2. token.service.ts - JWT 生成/刷新/黑名单/白名单管理
3. wx-auth.service.ts - 微信登录/绑定手机号
4. captcha.service.ts - 验证码生成/验证

更新 auth.module.ts 的 providers 注册新 Service。'
    }
    
    # P1-04: 统一响应格式拦截器
    $tasks["P1-04"] = @{
        Priority = "P1"
        Category = "API"
        Title = "统一响应格式拦截器"
        Files = @("packages/server/src/common/interceptors/response.interceptor.ts")
        Prompt = '在 packages/server/src/common/interceptors/response.interceptor.ts 中：

1. 修改 transform 方法，确保所有响应格式统一为 { code, message, data }
2. 移除 Controller 中手动构造响应的代码
3. 确保分页响应格式为 { code, message, data: { list, pagination } }
4. 添加对 null/undefined data 的处理，返回空对象或空数组

更新 main.ts 确保全局应用该拦截器。'
    }
    
    # P1-05: 统一异常过滤器增强
    $tasks["P1-05"] = @{
        Priority = "P1"
        Category = "API"
        Title = "统一异常过滤器增强"
        Files = @("packages/server/src/common/filters/http-exception.filter.ts")
        Prompt = '在 packages/server/src/common/filters/http-exception.filter.ts 中：

1. 增强错误响应格式，包含：
   - code: HTTP 状态码
   - message: 错误信息
   - path: 请求路径
   - timestamp: 错误时间
   - traceId: 用于链路追踪

2. 对不同类型的异常提供专门的错误信息：
   - ValidationError: 返回详细的字段验证错误
   - QueryFailedError: 返回数据库错误（生产环境隐藏敏感信息）
   - 其他异常: 返回通用错误信息

3. 记录错误日志到文件'
    }
    
    # P1-06: JWT 配置移至环境变量
    $tasks["P1-06"] = @{
        Priority = "P1"
        Category = "安全"
        Title = "JWT 配置移至环境变量"
        Files = @("packages/server/src/config/jwt.config.ts")
        Prompt = '在 packages/server/src/config/jwt.config.ts 中：

1. 将硬编码的 JWT 配置改为从环境变量读取：
   - secret: process.env.JWT_SECRET
   - expiresIn: process.env.JWT_EXPIRES_IN || ''2h''
   - refreshSecret: process.env.JWT_REFRESH_SECRET
   - refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || ''7d''

2. 在 .env.example 中添加对应的配置项模板

3. 添加配置验证，确保必要的环境变量已设置'
    }
    
    # P1-07: Redis 密钥前缀隔离
    $tasks["P1-07"] = @{
        Priority = "P1"
        Category = "安全"
        Title = "Redis 密钥前缀隔离"
        Files = @("packages/server/src/common/redis/cache-keys.ts")
        Prompt = '在 packages/server/src/common/redis/cache-keys.ts 中：

1. 添加全局前缀配置：
   const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || ''crm:''

2. 更新所有缓存键定义，添加前缀：
   export const AUTH_KEYS = {
     TOKEN_BLACKLIST: (token: string) => `${KEY_PREFIX}auth:blacklist:${token}`,
     // ...
   }

3. 确保各 Service 中使用缓存键时自动包含前缀'
    }
    
    # P1-08: DTO 验证增强
    $tasks["P1-08"] = @{
        Priority = "P1"
        Category = "API"
        Title = "DTO 验证增强"
        Files = @("packages/server/src/modules/*/dto/*.ts")
        Prompt = '为所有 DTO 添加完善的验证装饰器：

1. 确保所有字段都有 @IsString(), @IsNumber(), @IsBoolean() 等类型验证
2. 添加 @IsOptional() 标记可选字段
3. 添加 @Min(), @Max(), @Length(), @IsEmail() 等约束验证
4. 使用 @IsEnum() 验证枚举类型字段
5. 使用 @ValidateNested() 验证嵌套对象
6. 添加 @ApiProperty() 用于 Swagger 文档

重点检查以下模块的 DTO：
- customer/dto/
- opportunity/dto/
- campaign/dto/
- user/dto/'
    }
    
    # P1-09: Swagger 文档完善
    $tasks["P1-09"] = @{
        Priority = "P1"
        Category = "API"
        Title = "Swagger 文档完善"
        Files = @("packages/server/src/main.ts")
        Prompt = '在 packages/server/src/main.ts 中完善 Swagger 配置：

1. 添加 API 信息：
   .setTitle(''CRM Sales Platform API'')
   .setDescription(''CRM 销售平台 API 文档'')
   .setVersion(''1.0'')
   .addBearerAuth()

2. 添加标签分组：
   .addTag(''Auth'', ''认证相关'')
   .addTag(''User'', ''用户管理'')
   .addTag(''Customer'', ''客户管理'')
   // ...

3. 配置文档路径和 UI

4. 为所有 Controller 添加 @ApiTags() 装饰器'
    }
    
    # P1-10: 日志格式标准化
    $tasks["P1-10"] = @{
        Priority = "P1"
        Category = "质量"
        Title = "日志格式标准化"
        Files = @("packages/server/src/common/logger/")
        Prompt = '在 packages/server/src/common/logger/ 目录下：

1. 创建 logger.config.ts 配置日志格式：
   - 时间戳
   - 日志级别
   - 上下文（模块名）
   - 消息
   - 元数据（traceId, userId 等）

2. 创建 logger.service.ts 封装日志方法：
   - log(), error(), warn(), debug()
   - 支持结构化日志输出（JSON 格式）

3. 更新全局日志配置，使用 Winston 或 Pino'
    }
    
    # P1-11: 环境配置分离
    $tasks["P1-11"] = @{
        Priority = "P1"
        Category = "质量"
        Title = "环境配置分离"
        Files = @("packages/server/src/config/")
        Prompt = '在 packages/server/src/config/ 目录下：

1. 创建 environment.ts 定义环境类型
2. 创建 config.validation.ts 验证环境变量
3. 分离各环境的配置文件：
   - database.config.ts
   - redis.config.ts
   - jwt.config.ts
   - app.config.ts

4. 使用 @nestjs/config 模块统一管理配置
5. 创建 .env.example 作为配置模板'
    }
    
    # P1-12: 健康检查端点
    $tasks["P1-12"] = @{
        Priority = "P1"
        Category = "质量"
        Title = "健康检查端点"
        Files = @("packages/server/src/modules/health/")
        Prompt = '在 packages/server/src/modules/health/ 目录下：

1. 创建 health.module.ts
2. 创建 health.controller.ts，添加以下端点：
   - GET /health - 基础健康检查
   - GET /health/ready - 就绪检查（数据库、Redis 连接）
   - GET /health/live - 存活检查

3. 使用 @nestjs/terminus 实现健康检查
4. 检查数据库连接、Redis 连接、外部服务可用性'
    }
    
    # P1-13: 统一分页响应格式
    $tasks["P1-13"] = @{
        Priority = "P1"
        Category = "API"
        Title = "统一分页响应格式"
        Files = @("packages/server/src/common/dto/pagination.dto.ts")
        Prompt = '在 packages/server/src/common/dto/pagination.dto.ts 中：

1. 创建 PaginationDto 定义分页参数：
   - page: number (默认 1)
   - pageSize: number (默认 20, 最大 100)

2. 创建 PaginatedResponseDto 定义分页响应：
   - list: T[]
   - pagination: {
       page: number
       pageSize: number
       total: number
       totalPages: number
     }

3. 创建 PaginationHelper 工具类处理分页逻辑
4. 更新所有 Service 使用统一的分页格式'
    }
    
    # P1-14: 敏感数据脱敏
    $tasks["P1-14"] = @{
        Priority = "P1"
        Category = "安全"
        Title = "敏感数据脱敏"
        Files = @("packages/server/src/common/interceptors/")
        Prompt = '在 packages/server/src/common/interceptors/ 目录下：

1. 创建 sensitive-data.interceptor.ts
2. 实现敏感数据脱敏逻辑：
   - 手机号：138****8888
   - 身份证号：110***********1234
   - 银行卡号：6222************1234
   - 邮箱：a***@example.com

3. 使用装饰器 @Sensitive() 标记需要脱敏的字段
4. 在响应拦截器中自动处理脱敏'
    }
    
    # P1-15: API 版本控制
    $tasks["P1-15"] = @{
        Priority = "P1"
        Category = "API"
        Title = "API 版本控制"
        Files = @("packages/server/src/")
        Prompt = '实现 API 版本控制：

1. 在 main.ts 中启用版本控制：
   app.enableVersioning({
     type: VersioningType.URI,
     defaultVersion: ''1'',
   })

2. 在 Controller 中使用 @Version() 装饰器标记版本
3. 创建 v2 版本的 API 时复制并修改相关 Controller
4. 使用 @Header() 添加 API 版本信息到响应头'
    }
    
    # P1-16: 输入消毒
    $tasks["P1-16"] = @{
        Priority = "P1"
        Category = "质量"
        Title = "输入消毒"
        Files = @("packages/server/src/common/pipes/")
        Prompt = '在 packages/server/src/common/pipes/ 目录下：

1. 创建 sanitization.pipe.ts
2. 实现输入消毒逻辑：
   - 去除 XSS 攻击向量
   - 去除 SQL 注入风险字符
   - 去除 HTML 标签（除非明确允许）

3. 使用 class-validator 的 @Sanitize() 装饰器
4. 在全局管道中应用消毒逻辑'
    }
    
    # P1-17: 请求追踪 ID
    $tasks["P1-17"] = @{
        Priority = "P1"
        Category = "质量"
        Title = "请求追踪 ID"
        Files = @("packages/server/src/common/middleware/")
        Prompt = '在 packages/server/src/common/middleware/ 目录下：

1. 创建 request-id.middleware.ts
2. 为每个请求生成唯一的 traceId
3. 将 traceId 添加到响应头 X-Request-Id
4. 在日志中记录 traceId 用于链路追踪
5. 支持从请求头 X-Request-Id 读取外部传入的 traceId'
    }
    
    # P2-01: 添加缺失的数据库索引
    $tasks["P2-01"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "添加缺失的数据库索引"
        Files = @("packages/server/src/modules/*/entities/*.ts")
        Prompt = '为以下字段添加数据库索引：

1. opportunity.entity.ts:
   - @Index([''customerId''])
   - @Index([''stage''])
   - @Index([''ownerId''])
   - @Index([''createdAt''])

2. customer.entity.ts:
   - @Index([''status''])
   - @Index([''ownerId''])
   - @Index([''poolId''])
   - @Index([''createdAt''])

3. call-record.entity.ts:
   - @Index([''customerId''])
   - @Index([''agentId''])
   - @Index([''callTime''])

4. campaign-task.entity.ts:
   - @Index([''campaignId''])
   - @Index([''status''])
   - @Index([''assignedTo''])

为每个索引创建对应的 TypeORM Migration。'
    }
    
    # P2-02: 软删除统一使用 deletedAt
    $tasks["P2-02"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "软删除统一使用 deletedAt"
        Files = @("packages/server/src/common/entities/base.entity.ts")
        Prompt = '在 packages/server/src/common/entities/base.entity.ts 中：

1. 将 deleted 字段改为 deletedAt：
   从：
   @Column({ type: ''boolean'', default: false })
   deleted!: boolean
   
   改为：
   @DeleteDateColumn({ name: ''deleted_at'', nullable: true })
   deletedAt?: Date

2. 创建 Migration 添加 deleted_at 列
3. 迁移数据：将 deleted=true 的记录设置 deleted_at = updated_at
4. 移除 deleted 列
5. 更新所有 WHERE deleted = false 查询为 WHERE deleted_at IS NULL'
    }
    
    # P2-03: 金额字段统一 DECIMAL(15,2)
    $tasks["P2-03"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "金额字段统一 DECIMAL(15,2)"
        Files = @("packages/server/src/modules/*/entities/*.ts")
        Prompt = '统一以下金额字段为 DECIMAL(15,2)：

1. opportunity.entity.ts:
   - amount: DECIMAL(12,2) → DECIMAL(15,2)
   - weightedAmount: DECIMAL(14,2) → DECIMAL(15,2)

2. customer.entity.ts:
   - registeredCapital: DECIMAL(12,2) → DECIMAL(15,2)
   - annualRevenue: DECIMAL(14,2) → DECIMAL(15,2)

3. sales-target.entity.ts:
   - targetValue: DECIMAL(14,2) → DECIMAL(15,2)
   - achievedValue: DECIMAL(14,2) → DECIMAL(15,2)

4. sales-forecast.entity.ts:
   - forecastAmount: DECIMAL(14,2) → DECIMAL(15,2)
   - confidenceLow/High: DECIMAL(14,2) → DECIMAL(15,2)

创建 Migration 使用 ALTER TABLE ... MODIFY COLUMN。'
    }
    
    # P2-04: 外键字段添加索引
    $tasks["P2-04"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "外键字段添加索引"
        Files = @("packages/server/src/modules/*/entities/*.ts")
        Prompt = '为以下外键字段添加索引：

1. call_records: opportunity_id
2. knowledge_categories: parent_id
3. campaign_call_items: customer_id, contact_id, call_record_id
4. ai_alerts: customer_id, opportunity_id
5. intent_predictions: customer_id, opportunity_id
6. competitor_reports: customer_id, opportunity_id
7. sys_role_departments: department_id

在 Entity 中添加 @Index() 装饰器，并创建对应的 Migration。'
    }
    
    # P2-05: 时间戳字段统一 _at 后缀
    $tasks["P2-05"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "时间戳字段统一 _at 后缀"
        Files = @("packages/server/src/modules/*/entities/*.ts")
        Prompt = '统一以下时间戳字段命名为 _at 后缀：

1. customer.entity.ts:
   - pool_enter_time → pool_entered_at

2. knowledge-article.entity.ts:
   - publish_time → published_at
   - review_time → reviewed_at

3. campaign-task.entity.ts:
   - start_time → started_at
   - end_time → ended_at

每个字段需要：
1. Entity 中修改 @Column({ name: ''xxx'' }) 的 name 值
2. 创建 Migration：ALTER TABLE xxx RENAME COLUMN old_name TO new_name
3. 更新所有引用该字段的代码'
    }
    
    # P2-06: 复合唯一索引优化
    $tasks["P2-06"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "复合唯一索引优化"
        Files = @("packages/server/src/modules/*/entities/*.ts")
        Prompt = '为以下场景添加复合唯一索引：

1. performance-ranking.entity.ts:
   @Unique([''snapshotDate'', ''year'', ''month'', ''metricType'', ''userId''])

2. sales-target.entity.ts:
   @Unique([''year'', ''month'', ''userId'', ''targetType''])

3. customer-pool-rule.entity.ts:
   @Unique([''poolId'', ''ruleOrder''])

创建对应的 Migration 添加这些唯一索引。'
    }
    
    # P2-07: 字符集和排序规则配置
    $tasks["P2-07"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "字符集和排序规则配置"
        Files = @("packages/server/src/config/database.config.ts")
        Prompt = '在 packages/server/src/config/database.config.ts 中：

1. 显式配置字符集和排序规则：
   extra: {
     charset: ''utf8mb4'',
     collation: ''utf8mb4_unicode_ci'',
   }

2. 在 docker/mysql/conf.d/my.cnf 中添加：
   [mysqld]
   character-set-server=utf8mb4
   collation-server=utf8mb4_unicode_ci
   ngram_token_size=2

3. 确保所有表使用正确的字符集'
    }
    
    # P2-08: 大表分区策略
    $tasks["P2-08"] = @{
        Priority = "P2"
        Category = "数据库"
        Title = "大表分区策略"
        Files = @("packages/server/src/modules/call/entities/call-record.entity.ts")
        Prompt = '为 call_records 大表添加分区策略：

1. 按时间范围分区（每月一个分区）
2. 在 Entity 中配置分区
3. 创建自动分区维护脚本
4. 更新查询以利用分区裁剪

注意：这是一个较大的改动，需要在低峰期执行。'
    }
    
    # P3-01: Docker 非 root 用户运行
    $tasks["P3-01"] = @{
        Priority = "P3"
        Category = "运维"
        Title = "Docker 非 root 用户运行"
        Files = @("Dockerfile", "docker-compose.yml")
        Prompt = '在所有 Dockerfile 中添加非 root 用户运行：

1. 在 Dockerfile 中添加：
   RUN addgroup --system --gid 1001 nodejs && \
       adduser --system --uid 1001 nestjs
   USER nestjs

2. 确保文件权限正确（使用 --chown=nestjs:nodejs）
3. 更新 docker-compose.yml 中的用户配置'
    }
    
    # P3-02: 蓝绿/滚动部署配置
    $tasks["P3-02"] = @{
        Priority = "P3"
        Category = "运维"
        Title = "蓝绿/滚动部署配置"
        Files = @("k8s/", "docker-compose.yml")
        Prompt = '配置蓝绿/滚动部署：

1. Kubernetes 配置：
   - 添加 readinessProbe 和 livenessProbe
   - 配置 RollingUpdate 策略
   - 设置合理的 maxSurge 和 maxUnavailable

2. 或 Docker Compose 配置：
   - 使用 Traefik 实现蓝绿切换
   - 配置健康检查

3. 添加部署脚本自动化切换流程'
    }
    
    # P3-03: 单元测试覆盖率提升至 80%
    $tasks["P3-03"] = @{
        Priority = "P3"
        Category = "质量"
        Title = "单元测试覆盖率提升至 80%"
        Files = @("packages/server/src/**/*.spec.ts")
        Prompt = '按优先级编写单元测试：

第一批（关键业务逻辑）：
- customer.service.ts - create/update/validateStatusTransition
- opportunity.service.ts - updateStage/create/calculateWeightedAmount
- customer-pool.service.ts - claim/return
- auth.service.ts - login/refreshToken/revokeToken

第二批（安全相关）：
- encryption.service.ts - encrypt/decrypt
- callback-signature.guard.ts - canActivate
- jwt.strategy.ts - validate

使用 Jest + @nestjs/testing 的 Test.createTestingModule()
mock 外部依赖（Repository、Redis、Bull Queue）'
    }
    
    # P3-04: Redis KEYS 改用 SCAN
    $tasks["P3-04"] = @{
        Priority = "P3"
        Category = "性能"
        Title = "Redis KEYS 改用 SCAN"
        Files = @("packages/server/src/modules/agent/agent-status.service.ts")
        Prompt = '将 getWrapUpOverdueAgentIds() 中的 KEYS 命令改为 SCAN：

async getWrapUpOverdueAgentIds(): Promise<string[]> {
  const pattern = ''agent:wrap_up_at:*''
  const overdueIds: string[] = []
  let cursor = ''0''
  do {
    const [nextCursor, keys] = await this.redis.scan(cursor, ''MATCH'', pattern, ''COUNT'', 100)
    cursor = nextCursor
    for (const key of keys) {
      const timestamp = await this.redis.get(key)
      if (timestamp && Date.now() > parseInt(timestamp) + 120000) {
        overdueIds.push(key.split('':'').pop()!)
      }
    }
  } while (cursor !== ''0'')
  return overdueIds
}'
    }
    
    # P3-05: 缓存键命名统一
    $tasks["P3-05"] = @{
        Priority = "P3"
        Category = "质量"
        Title = "缓存键命名统一"
        Files = @("packages/server/src/common/redis/cache-keys.ts")
        Prompt = '统一缓存键命名格式为 crm:{module}:{entity}:{qualifier}：

1. 更新 cache-keys.ts 中所有键定义
2. 更新 auth.service.ts 中的 AUTH_KEYS
3. 更新 agent-status.service.ts 中的键
4. 更新 permission-cache.service.ts 中的键

迁移步骤：
- 新旧键并存过渡期
- 旧键 TTL 到期后自然消亡'
    }
    
    # P3-06: 呼叫分配策略完善
    $tasks["P3-06"] = @{
        Priority = "P3"
        Category = "业务"
        Title = "呼叫分配策略完善"
        Files = @("packages/server/src/modules/agent/call-distribution.service.ts")
        Prompt = '完善 least_calls 和 skill_based 策略实现：

1. least_calls 策略：
   查询各空闲坐席当日通话次数，选择最少的

2. skill_based 策略：
   根据 options.skillIds 匹配坐席技能标签
   - Agent 实体需要添加 skills: string[] 字段
   - 过滤出技能匹配的坐席
   - 在匹配坐席中按 least_calls 排序'
    }
    
    # P3-07: 录音生命周期管理
    $tasks["P3-07"] = @{
        Priority = "P3"
        Category = "业务"
        Title = "录音生命周期管理"
        Files = @("packages/server/src/modules/recording/")
        Prompt = '实现录音生命周期管理：

1. 创建录音保留策略配置（环境变量或配置表）
2. 创建定时任务（每天凌晨执行）：
   - 查询超过保留期的录音记录
   - 删除 OSS 上的录音文件
   - 更新数据库记录标记为已归档
3. 添加存储统计 API'
    }
    
    # P3-08: 小程序离线队列
    $tasks["P3-08"] = @{
        Priority = "P3"
        Category = "前端"
        Title = "小程序离线队列"
        Files = @("packages/miniapp/utils/")
        Prompt = '在 packages/miniapp/ 中完善离线队列实现：

1. 创建 utils/offline-queue.ts：
   - 使用 uni.getStorageSync 持久化待发送请求
   - 网络恢复时自动重试
   - 支持请求去重和过期清理

2. 在关键写操作中集成离线队列'
    }
    
    # P3-09: 布隆过滤器防穿透
    $tasks["P3-09"] = @{
        Priority = "P3"
        Category = "缓存"
        Title = "布隆过滤器防穿透"
        Files = @("packages/server/src/common/cache/")
        Prompt = '为高频查询路径添加布隆过滤器防止缓存穿透：

1. 创建 bloom-filter.service.ts
2. 在 customer.service.ts 中集成：
   - 系统启动时将所有客户 ID 加入布隆过滤器
   - findOne 查询前先检查布隆过滤器
   - 创建新客户时添加到布隆过滤器'
    }
    
    # P3-10: 缺失模块开发规划
    $tasks["P3-10"] = @{
        Priority = "P3"
        Category = "业务"
        Title = "缺失模块开发规划"
        Files = @()
        Prompt = '规划开发以下缺失模块：

1. 报价模块（Quotation）- 行项目金额计算、折扣审批触发
2. 合同模块（Contract）- 审批分级、unpaid_amount 刷新、到期续签提醒
3. 回款模块（Payment/Collection）- 超付校验 <= 105%、逾期自动标记
4. 审批引擎（Approval Engine）- 节点配置、撤回条件、超时梯度提醒

每个模块需要：Entity + Migration + DTO + Service + Controller + 单元测试'
    }
    
    return $tasks
}

# 获取要执行的任务列表
function Get-TasksToRun {
    $allTasks = Get-TaskDefinitions
    $tasks = @()
    
    if ($TaskIds.Count -gt 0) {
        foreach ($id in $TaskIds) {
            if ($allTasks.ContainsKey($id)) {
                $tasks += @{ Id = $id; Info = $allTasks[$id] }
            }
            else {
                Write-Log "未知任务ID: $id" "WARN"
            }
        }
    }
    else {
        foreach ($key in $allTasks.Keys | Sort-Object) {
            $task = $allTasks[$key]
            if ($Priority -eq "ALL" -or $task.Priority -eq $Priority) {
                $tasks += @{ Id = $key; Info = $task }
            }
        }
    }
    
    return $tasks | Sort-Object { $_.Id }
}

# 构建 Claude 参数
function Build-ClaudeArguments {
    param([string]$Prompt, [switch]$IsContinue)
    
    $arguments = @("--print")
    
    if ($IsContinue -or $ContinueSession) {
        $arguments += "--continue"
    }
    
    if ($SkipAllPermissions) {
        $arguments += "--dangerously-skip-permissions"
    }
    else {
        $arguments += "--permission-mode"
        $arguments += $PermissionMode
    }
    
    if ($AllowedTools) {
        $arguments += "--allowedTools"
        $arguments += ($AllowedTools -join ",")
    }
    
    $arguments += "--output-format"
    $arguments += "text"
    
    if ($Verbose) { $arguments += "--verbose" }
    if ($Model) {
        $arguments += "--model"
        $arguments += $Model
    }
    
    $arguments += $Prompt
    
    return $arguments
}

# 执行任务
function Invoke-FixTask {
    param(
        [string]$TaskId,
        [hashtable]$TaskInfo,
        [switch]$IsContinue
    )
    
    Write-Log "======================================="
    Write-Log "执行任务: $TaskId - $($TaskInfo.Title)"
    Write-Log "优先级: $($TaskInfo.Priority) | 类别: $($TaskInfo.Category)"
    if ($TaskInfo.Files.Count -gt 0) {
        Write-Log "涉及文件: $($TaskInfo.Files -join ', ')"
    }
    Write-Log "======================================="
    
    if ($DryRun) {
        Write-Log "[Dry Run] 跳过实际执行" "WARN"
        Write-Log "任务提示词预览:"
        Write-Log $TaskInfo.Prompt.Substring(0, [Math]::Min(200, $TaskInfo.Prompt.Length)) "DEBUG"
        return $true
    }
    
    $fullPrompt = "项目根目录: $ProjectRoot`n`n" + $TaskInfo.Prompt + "`n`n请直接在项目中进行修复，完成后报告修改的文件和行数。"
    
    $arguments = Build-ClaudeArguments -Prompt $fullPrompt -IsContinue:$IsContinue
    
    Write-Log "Claude 参数: $($arguments -join ' ')" "DEBUG"
    
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $outputFile = Join-Path $OutputDir "fix-$TaskId-$timestamp.txt"
    
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        
        & $Script:Config.ClaudePath @arguments 2>&1 | Tee-Object -FilePath $outputFile
        
        $sw.Stop()
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "任务完成 ($($sw.Elapsed.ToString('mm\:ss')))" "SUCCESS"
            Write-Log "输出保存: $outputFile"
            return $true
        }
        else {
            throw "Claude 退出码: $LASTEXITCODE"
        }
    }
    catch {
        Write-Log "任务执行失败: $_" "ERROR"
        return $false
    }
}

# 执行任务（带重试）
function Invoke-TaskWithRetry {
    param([string]$TaskId, [hashtable]$TaskInfo, [switch]$IsContinue)
    
    $attempt = 0
    $success = $false
    
    while ($attempt -lt $RetryCount -and -not $success) {
        $attempt++
        Write-Log "尝试 $attempt/$RetryCount"
        
        if (Invoke-FixTask -TaskId $TaskId -TaskInfo $TaskInfo -IsContinue:$IsContinue) {
            $success = $true
        }
        elseif ($attempt -lt $RetryCount) {
            Write-Log "等待 $RetryDelay 秒后重试..."
            Start-Sleep -Seconds $RetryDelay
        }
    }
    
    return $success
}

# 清理上下文
function Invoke-Compact {
    Write-Log "清理上下文..."
    $arguments = @("--print", "--continue", "--permission-mode", "acceptEdits", "/compact")
    try {
        & $Script:Config.ClaudePath @arguments 2>&1 | Out-Null
        Write-Log "上下文已清理" "SUCCESS"
    }
    catch {
        Write-Log "清理失败: $_" "WARN"
    }
}

# 显示任务列表
function Show-TaskList {
    $allTasks = Get-TaskDefinitions
    
    Write-Log "=== CRM 修复任务清单 ==="
    
    $grouped = $allTasks.GetEnumerator() | Group-Object { $_.Value.Priority }
    
    foreach ($group in $grouped | Sort-Object Name) {
        Write-Log ""
        Write-Log "[$($group.Name)] 优先级任务:"
        foreach ($item in $group.Group | Sort-Object Name) {
            $fileCount = $item.Value.Files.Count
            $status = if ($fileCount -gt 0) { "[$fileCount 文件]" } else { "" }
            Write-Log "  $($item.Name) | $($item.Value.Category) | $($item.Value.Title) $status"
        }
    }
    
    Write-Log ""
    Write-Log "总计: $($allTasks.Count) 个任务"
    Write-Log "P0: $(($allTasks.Values | Where-Object { $_.Priority -eq 'P0' }).Count)"
    Write-Log "P1: $(($allTasks.Values | Where-Object { $_.Priority -eq 'P1' }).Count)"
    Write-Log "P2: $(($allTasks.Values | Where-Object { $_.Priority -eq 'P2' }).Count)"
    Write-Log "P3: $(($allTasks.Values | Where-Object { $_.Priority -eq 'P3' }).Count)"
}

# 生成报告
function Generate-Report {
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $reportFile = Join-Path $OutputDir "fix-report-$timestamp.md"
    
    $duration = (Get-Date) - $Script:Stats.StartTime
    
    $report = @"
# CRM 修复执行报告

**生成时间**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**执行模式**: $(if ($DryRun) { "模拟运行" } else { "实际执行" })
**优先级**: $Priority

## 执行统计

| 指标 | 数值 |
|------|------|
| 总任务数 | $($Script:Stats.TasksTotal) |
| 成功 | $($Script:Stats.TasksSuccess) |
| 失败 | $($Script:Stats.TasksFailed) |
| 跳过 | $($Script:Stats.TasksSkipped) |
| 运行时间 | $($duration.ToString('hh\:mm\:ss')) |

## 详细记录

"@
    
    $report | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Log "报告已生成: $reportFile" "SUCCESS"
}

# 主函数
function Main {
    if ($args -contains "-?" -or $args -contains "--help") {
        Write-Host @"
CRM Fix Runner - Claude 自动化修复脚本

用法: .\crm-fix-runner.ps1 [选项]

选项:
    -Priority <P0|P1|P2|P3|ALL>  执行优先级 (默认: ALL)
    -TaskIds <数组>              指定任务ID，如 @("P0-01", "P0-02")
    -ProjectRoot <路径>          项目根目录 (默认: .)
    -PermissionMode <模式>        权限模式 (默认: acceptEdits)
    -SkipAllPermissions           跳过所有权限检查
    -DryRun                       模拟运行，不实际修改
    -ContinueSession              继续上次会话
    -Compact                      定期清理上下文
    -Verbose                      详细日志
    -Model <模型>                 模型: sonnet/opus/haiku
    -ListTasks                    显示任务列表
    -GenerateReport               生成执行报告

示例:
    .\crm-fix-runner.ps1 -Priority P0 -DryRun
    .\crm-fix-runner.ps1 -Priority P0 -SkipAllPermissions
    .\crm-fix-runner.ps1 -TaskIds @("P0-01", "P0-02")
"@
        return
    }
    
    if ($ListTasks) {
        Show-TaskList
        return
    }
    
    Initialize-Environment
    
    if (-not (Test-ClaudeCLI)) {
        exit 1
    }
    
    $tasks = Get-TasksToRun
    $Script:Stats.TasksTotal = $tasks.Count
    
    if ($tasks.Count -eq 0) {
        Write-Log "没有匹配的任务" "WARN"
        return
    }
    
    Write-Log "=== 开始执行 $($tasks.Count) 个修复任务 ==="
    
    $i = 0
    foreach ($task in $tasks) {
        $i++
        Write-Log ""
        Write-Log "[$i/$($tasks.Count)] 开始执行: $($task.Id)"
        
        $isFirst = ($i -eq 1)
        $shouldContinue = $ContinueSession -or (-not $isFirst)
        
        if (Invoke-TaskWithRetry -TaskId $task.Id -TaskInfo $task.Info -IsContinue:$shouldContinue) {
            $Script:Stats.TasksSuccess++
        }
        else {
            $Script:Stats.TasksFailed++
            Write-Log "任务 $($task.Id) 最终失败" "ERROR"
        }
        
        if ($Compact -and ($i % $Script:Config.AutoCompactInterval -eq 0) -and ($i -lt $tasks.Count)) {
            Invoke-Compact
        }
        
        if ($i -lt $tasks.Count) {
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Log ""
    Write-Log "=== 执行完成 ==="
    Write-Log "成功: $($Script:Stats.TasksSuccess)/$($Script:Stats.TasksTotal)"
    Write-Log "失败: $($Script:Stats.TasksFailed)/$($Script:Stats.TasksTotal)"
    
    if ($GenerateReport -or $Script:Stats.TasksFailed -gt 0) {
        Generate-Report
    }
}

Main
