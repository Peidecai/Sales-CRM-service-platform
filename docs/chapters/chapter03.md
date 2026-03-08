## 3. 后端设计规范

---

### 3.1 项目结构设计

#### 3.1.1 NestJS 项目完整目录结构

```
src/
├── main.ts                              # 应用入口
├── app.module.ts                        # 根模块
├── app.controller.ts                    # 健康检查控制器
│
├── common/                              # 公共模块
│   ├── constants/                       # 常量定义
│   │   ├── error-code.constant.ts       # 错误码常量
│   │   ├── cache-key.constant.ts        # 缓存Key常量
│   │   ├── queue.constant.ts            # 队列名称常量
│   │   └── role.constant.ts             # 角色常量
│   ├── decorators/                      # 自定义装饰器
│   │   ├── current-user.decorator.ts    # 当前用户装饰器
│   │   ├── roles.decorator.ts           # 角色装饰器
│   │   ├── public.decorator.ts          # 公开接口装饰器
│   │   ├── api-pagination.decorator.ts  # 分页Swagger装饰器
│   │   └── idempotent.decorator.ts      # 幂等性装饰器
│   ├── dto/                             # 公共DTO
│   │   ├── pagination.dto.ts            # 分页请求DTO
│   │   ├── pagination-response.dto.ts   # 分页响应DTO
│   │   └── id-param.dto.ts             # ID参数DTO
│   ├── entities/                        # 基础实体
│   │   └── base.entity.ts              # Entity基类
│   ├── enums/                           # 枚举定义
│   │   ├── role.enum.ts                # 角色枚举
│   │   ├── customer-status.enum.ts     # 客户状态枚举
│   │   └── lead-source.enum.ts         # 线索来源枚举
│   ├── exceptions/                      # 异常定义
│   │   ├── business.exception.ts       # 业务异常
│   │   └── error-codes.ts             # 错误码映射
│   ├── filters/                         # 异常过滤器
│   │   └── http-exception.filter.ts    # 全局HTTP异常过滤器
│   ├── guards/                          # 守卫
│   │   ├── jwt-auth.guard.ts           # JWT认证守卫
│   │   └── roles.guard.ts             # RBAC角色守卫
│   ├── interceptors/                    # 拦截器
│   │   ├── transform.interceptor.ts    # 响应转换拦截器
│   │   ├── logging.interceptor.ts      # 日志拦截器
│   │   └── timeout.interceptor.ts      # 超时拦截器
│   ├── interfaces/                      # 接口/类型定义
│   │   ├── jwt-payload.interface.ts    # JWT载荷接口
│   │   ├── response.interface.ts       # 响应格式接口
│   │   └── request-context.interface.ts # 请求上下文接口
│   ├── middlewares/                      # 中间件
│   │   ├── request-logger.middleware.ts # 请求日志中间件
│   │   ├── rate-limit.middleware.ts     # 限流中间件
│   │   └── trace-id.middleware.ts       # 链路追踪中间件
│   ├── pipes/                           # 管道
│   │   └── validation.pipe.ts          # 全局参数校验管道
│   └── utils/                           # 工具函数
│       ├── crypto.util.ts              # 加密工具
│       ├── date.util.ts                # 日期工具
│       └── tree.util.ts               # 树形结构工具
│
├── config/                              # 配置模块
│   ├── config.module.ts                # 配置模块
│   ├── database.config.ts             # 数据库配置
│   ├── redis.config.ts                # Redis配置
│   ├── jwt.config.ts                  # JWT配置
│   ├── oss.config.ts                  # OSS配置
│   ├── bull.config.ts                 # Bull队列配置
│   └── app.config.ts                  # 应用通用配置
│
├── modules/                             # 业务模块
│   ├── auth/                           # 认证模块
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       ├── register.dto.ts
│   │       ├── refresh-token.dto.ts
│   │       └── auth-response.dto.ts
│   │
│   ├── user/                           # 用户模块
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       ├── update-user.dto.ts
│   │       └── query-user.dto.ts
│   │
│   ├── customer/                       # 客户模块
│   │   ├── customer.module.ts
│   │   ├── customer.controller.ts
│   │   ├── customer.service.ts
│   │   ├── customer.repository.ts
│   │   ├── entities/
│   │   │   ├── customer.entity.ts
│   │   │   └── customer-follow-record.entity.ts
│   │   └── dto/
│   │       ├── create-customer.dto.ts
│   │       ├── update-customer.dto.ts
│   │       ├── transfer-customer.dto.ts
│   │       └── query-customer.dto.ts
│   │
│   ├── lead/                           # 线索模块
│   │   ├── lead.module.ts
│   │   ├── lead.controller.ts
│   │   ├── lead.service.ts
│   │   ├── lead.repository.ts
│   │   ├── entities/
│   │   │   └── lead.entity.ts
│   │   └── dto/
│   │
│   ├── opportunity/                    # 商机模块
│   │   ├── opportunity.module.ts
│   │   ├── opportunity.controller.ts
│   │   ├── opportunity.service.ts
│   │   ├── opportunity.repository.ts
│   │   ├── entities/
│   │   │   └── opportunity.entity.ts
│   │   └── dto/
│   │
│   ├── contract/                       # 合同模块
│   │   ├── contract.module.ts
│   │   ├── contract.controller.ts
│   │   ├── contract.service.ts
│   │   ├── contract.repository.ts
│   │   ├── entities/
│   │   │   ├── contract.entity.ts
│   │   │   └── contract-payment.entity.ts
│   │   └── dto/
│   │
│   ├── product/                        # 产品模块
│   │   ├── product.module.ts
│   │   ├── product.controller.ts
│   │   ├── product.service.ts
│   │   ├── entities/
│   │   │   └── product.entity.ts
│   │   └── dto/
│   │
│   ├── high-seas/                      # 公海池模块
│   │   ├── high-seas.module.ts
│   │   ├── high-seas.controller.ts
│   │   ├── high-seas.service.ts
│   │   ├── entities/
│   │   │   ├── high-seas-pool.entity.ts
│   │   │   └── high-seas-rule.entity.ts
│   │   └── dto/
│   │
│   ├── ai-analysis/                    # AI分析模块
│   │   ├── ai-analysis.module.ts
│   │   ├── ai-analysis.controller.ts
│   │   ├── ai-analysis.service.ts
│   │   ├── ai-analysis.processor.ts    # Bull队列处理器
│   │   ├── entities/
│   │   │   └── ai-analysis-result.entity.ts
│   │   └── dto/
│   │
│   ├── call-record/                    # 通话记录模块
│   │   ├── call-record.module.ts
│   │   ├── call-record.controller.ts
│   │   ├── call-record.service.ts
│   │   ├── call-record.processor.ts
│   │   ├── entities/
│   │   │   └── call-record.entity.ts
│   │   └── dto/
│   │
│   ├── dashboard/                      # 仪表盘/统计模块
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   └── dto/
│   │
│   ├── report/                         # 报表模块
│   │   ├── report.module.ts
│   │   ├── report.controller.ts
│   │   ├── report.service.ts
│   │   ├── report.processor.ts
│   │   └── dto/
│   │
│   ├── notification/                   # 通知模块
│   │   ├── notification.module.ts
│   │   ├── notification.controller.ts
│   │   ├── notification.service.ts
│   │   ├── notification.processor.ts   # 邮件/站内信队列处理器
│   │   ├── entities/
│   │   │   └── notification.entity.ts
│   │   └── dto/
│   │
│   ├── system/                         # 系统管理模块
│   │   ├── system.module.ts
│   │   ├── role/                       # 角色管理
│   │   │   ├── role.controller.ts
│   │   │   ├── role.service.ts
│   │   │   └── entities/
│   │   │       └── role.entity.ts
│   │   ├── permission/                 # 权限管理
│   │   │   ├── permission.controller.ts
│   │   │   ├── permission.service.ts
│   │   │   └── entities/
│   │   │       └── permission.entity.ts
│   │   ├── department/                 # 部门管理
│   │   │   ├── department.controller.ts
│   │   │   ├── department.service.ts
│   │   │   └── entities/
│   │   │       └── department.entity.ts
│   │   ├── dict/                       # 数据字典
│   │   │   ├── dict.controller.ts
│   │   │   ├── dict.service.ts
│   │   │   └── entities/
│   │   │       └── dict.entity.ts
│   │   └── log/                        # 操作日志
│   │       ├── operation-log.controller.ts
│   │       ├── operation-log.service.ts
│   │       └── entities/
│   │           └── operation-log.entity.ts
│   │
│   └── file/                           # 文件管理模块
│       ├── file.module.ts
│       ├── file.controller.ts
│       ├── file.service.ts
│       ├── oss.service.ts              # OSS服务
│       ├── entities/
│       │   └── file.entity.ts
│       └── dto/
│           └── upload-file.dto.ts
│
├── shared/                              # 共享模块
│   ├── shared.module.ts                # 共享模块（全局导入）
│   ├── redis/                          # Redis封装
│   │   ├── redis.module.ts
│   │   ├── redis.service.ts
│   │   └── redis.constants.ts
│   ├── logger/                         # 日志封装
│   │   ├── logger.module.ts
│   │   └── logger.service.ts
│   ├── cache/                          # 缓存封装
│   │   ├── cache.module.ts
│   │   └── cache.service.ts
│   └── lock/                           # 分布式锁
│       ├── lock.module.ts
│       └── lock.service.ts
│
├── database/                            # 数据库相关
│   ├── migrations/                     # 数据库迁移文件
│   ├── seeds/                          # 种子数据
│   │   ├── role.seed.ts
│   │   ├── permission.seed.ts
│   │   └── admin.seed.ts
│   └── subscribers/                    # 实体订阅者
│       └── audit.subscriber.ts
│
└── jobs/                                # 定时任务/队列处理
    ├── jobs.module.ts
    ├── schedulers/                      # 定时调度
    │   ├── high-seas-recycle.scheduler.ts
    │   ├── statistics.scheduler.ts
    │   ├── cache-warmup.scheduler.ts
    │   ├── contract-expire-alert.scheduler.ts
    │   ├── follow-up-reminder.scheduler.ts
    │   ├── data-cleanup.scheduler.ts
    │   ├── report-generate.scheduler.ts
    │   ├── lead-score-update.scheduler.ts
    │   └── system-health-check.scheduler.ts
    └── processors/                      # 队列处理器
        ├── recording-process.processor.ts
        ├── ai-analysis.processor.ts
        ├── email-notification.processor.ts
        ├── data-export.processor.ts
        └── report-generate.processor.ts

# 项目根目录补充
├── .env                                 # 环境变量（不入版本库）
├── .env.development                     # 开发环境变量
├── .env.production                      # 生产环境变量
├── .env.example                         # 环境变量模板
├── nest-cli.json                        # NestJS CLI配置
├── tsconfig.json                        # TypeScript配置
├── tsconfig.build.json                  # 构建TypeScript配置
├── ormconfig.ts                         # TypeORM CLI配置
├── docker-compose.yml                   # Docker编排
├── Dockerfile                           # Docker镜像
└── package.json
```

#### 3.1.2 模块职责说明

| 目录        | 职责         | 说明                                                                   |
| ----------- | ------------ | ---------------------------------------------------------------------- |
| `common/`   | 公共基础设施 | 装饰器、DTO、过滤器、守卫、拦截器、中间件、管道、工具类等，全局共用    |
| `config/`   | 配置中心     | 所有外部依赖及应用配置集中管理，通过 `@nestjs/config` 注入             |
| `modules/`  | 业务模块     | 按领域边界拆分，每个模块自包含Controller/Service/Repository/Entity/DTO |
| `shared/`   | 共享服务     | Redis、日志、缓存、分布式锁等基础设施封装，作为全局模块注入            |
| `database/` | 数据库管理   | 迁移脚本、种子数据、实体订阅者                                         |
| `jobs/`     | 异步任务     | 定时调度任务、Bull队列处理器                                           |

---

### 3.2 四层架构实现

系统采用 **Controller - Service - Domain(Entity) - Repository** 四层架构，每层职责清晰分离，遵循单一职责原则和依赖倒置原则。

```
┌─────────────────────────────────────────────────────────┐
│                    Controller 层                         │
│         路由定义 · 参数校验 · Swagger文档 · 响应转换      │
├─────────────────────────────────────────────────────────┤
│                     Service 层                           │
│         业务逻辑 · 事务管理 · 权限校验 · 缓存协调         │
├─────────────────────────────────────────────────────────┤
│                     Domain 层                            │
│         实体定义 · 领域逻辑 · 值对象 · 状态机              │
├─────────────────────────────────────────────────────────┤
│                    Repository 层                         │
│         数据持久化 · 自定义查询 · 分页封装 · 软删除         │
└─────────────────────────────────────────────────────────┘
```

#### 3.2.1 Controller 层

Controller 层负责接收 HTTP 请求，通过装饰器定义路由、参数校验和 Swagger 文档，将请求委托给 Service 层处理。Controller 中不包含任何业务逻辑。

```typescript
// modules/customer/customer.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { CustomerService } from "./customer.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomerDto } from "./dto/query-customer.dto";
import { TransferCustomerDto } from "./dto/transfer-customer.dto";
import { CustomerResponseDto } from "./dto/customer-response.dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PaginationResponseDto } from "@/common/dto/pagination-response.dto";
import { RoleEnum } from "@/common/enums/role.enum";
import { IJwtPayload } from "@/common/interfaces/jwt-payload.interface";

@ApiTags("客户管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("customers")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({
    summary: "创建客户",
    description: "创建新客户并分配给当前销售",
  })
  @ApiResponse({
    status: 201,
    description: "创建成功",
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 409, description: "客户手机号已存在" })
  @Roles(
    RoleEnum.SALES,
    RoleEnum.SUPERVISOR,
    RoleEnum.ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: IJwtPayload,
  ): Promise<CustomerResponseDto> {
    return this.customerService.create(createCustomerDto, user);
  }

  @Get()
  @ApiOperation({
    summary: "查询客户列表",
    description: "支持多条件筛选和分页查询",
  })
  @ApiResponse({ status: 200, type: PaginationResponseDto })
  @Roles(
    RoleEnum.SALES,
    RoleEnum.SUPERVISOR,
    RoleEnum.ADMIN,
    RoleEnum.SUPER_ADMIN,
  )
  async findAll(
    @Query() query: QueryCustomerDto,
    @CurrentUser() user: IJwtPayload,
  ): Promise<PaginationResponseDto<CustomerResponseDto>> {
    return this.customerService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "查询客户详情" })
  @ApiParam({ name: "id", description: "客户ID", type: "string" })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: "客户不存在" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: IJwtPayload,
  ): Promise<CustomerResponseDto> {
    return this.customerService.findOne(id, user);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新客户信息" })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async update(
    @Param("id") id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: IJwtPayload,
  ): Promise<CustomerResponseDto> {
    return this.customerService.update(id, updateCustomerDto, user);
  }

  @Post("transfer")
  @ApiOperation({
    summary: "批量转移客户",
    description: "将客户从一个销售转移到另一个销售",
  })
  @Roles(RoleEnum.SUPERVISOR, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Body() transferDto: TransferCustomerDto,
    @CurrentUser() user: IJwtPayload,
  ): Promise<void> {
    return this.customerService.transfer(transferDto, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除客户（软删除）" })
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: IJwtPayload,
  ): Promise<void> {
    return this.customerService.remove(id, user);
  }
}
```

**DTO 定义示例（class-validator 参数校验）：**

```typescript
// modules/customer/dto/create-customer.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsMobilePhone,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { CustomerSourceEnum } from "@/common/enums/lead-source.enum";

export class ContactInfoDto {
  @ApiPropertyOptional({ description: "联系人姓名" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "联系人职位" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  position?: string;

  @ApiPropertyOptional({ description: "联系人电话" })
  @IsOptional()
  @IsMobilePhone("zh-CN")
  phone?: string;
}

export class CreateCustomerDto {
  @ApiProperty({ description: "客户名称", example: "阿里巴巴集团" })
  @IsString()
  @IsNotEmpty({ message: "客户名称不能为空" })
  @MinLength(2, { message: "客户名称至少2个字符" })
  @MaxLength(100, { message: "客户名称不超过100个字符" })
  name: string;

  @ApiProperty({ description: "客户手机号", example: "13800138000" })
  @IsMobilePhone("zh-CN", {}, { message: "请输入有效的手机号" })
  @IsNotEmpty({ message: "手机号不能为空" })
  phone: string;

  @ApiPropertyOptional({ description: "客户邮箱" })
  @IsOptional()
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  email?: string;

  @ApiPropertyOptional({ description: "公司名称" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiProperty({ description: "客户来源", enum: CustomerSourceEnum })
  @IsEnum(CustomerSourceEnum, { message: "无效的客户来源" })
  source: CustomerSourceEnum;

  @ApiPropertyOptional({ description: "联系人列表", type: [ContactInfoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactInfoDto)
  contacts?: ContactInfoDto[];

  @ApiPropertyOptional({ description: "备注", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
```

```typescript
// common/dto/pagination.dto.ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, Max, IsString } from "class-validator";

export class PaginationDto {
  @ApiPropertyOptional({ description: "页码", default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: "每页条数",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ description: "排序字段", default: "createdAt" })
  @IsOptional()
  @IsString()
  sortBy: string = "createdAt";

  @ApiPropertyOptional({
    description: "排序方向",
    default: "DESC",
    enum: ["ASC", "DESC"],
  })
  @IsOptional()
  @IsString()
  sortOrder: "ASC" | "DESC" = "DESC";
}
```

#### 3.2.2 Service 层

Service 层负责核心业务逻辑处理，包括数据组装、权限校验、事务管理和缓存协调。Service 依赖 Repository 层进行数据持久化操作。

```typescript
// modules/customer/customer.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import { Customer } from "./entities/customer.entity";
import { CustomerRepository } from "./customer.repository";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomerDto } from "./dto/query-customer.dto";
import { TransferCustomerDto } from "./dto/transfer-customer.dto";
import { CacheService } from "@/shared/cache/cache.service";
import { LockService } from "@/shared/lock/lock.service";
import { LoggerService } from "@/shared/logger/logger.service";
import { BusinessException } from "@/common/exceptions/business.exception";
import { ErrorCode } from "@/common/exceptions/error-codes";
import { IJwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { RoleEnum } from "@/common/enums/role.enum";
import { PaginationResponseDto } from "@/common/dto/pagination-response.dto";
import { CACHE_KEY } from "@/common/constants/cache-key.constant";
import { CustomerFollowRecord } from "./entities/customer-follow-record.entity";

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly cacheService: CacheService,
    private readonly lockService: LockService,
    private readonly logger: LoggerService,
    private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(CustomerService.name);
  }

  /**
   * 创建客户
   * 包含手机号唯一性校验和分布式锁防并发
   */
  async create(dto: CreateCustomerDto, user: IJwtPayload): Promise<Customer> {
    // 分布式锁防止同一手机号并发创建
    const lockKey = `lock:customer:create:${dto.phone}`;
    return this.lockService.executeWithLock(lockKey, 10, async () => {
      // 检查手机号唯一性
      const existing = await this.customerRepository.findByPhone(dto.phone);
      if (existing) {
        throw new BusinessException(ErrorCode.CUSTOMER_PHONE_EXISTS);
      }

      const customer = this.customerRepository.create({
        ...dto,
        ownerId: user.userId,
        ownerName: user.username,
        departmentId: user.departmentId,
      });

      const saved = await this.customerRepository.save(customer);

      // 清除相关列表缓存
      await this.cacheService.delByPattern(`${CACHE_KEY.CUSTOMER_LIST}:*`);

      this.logger.info(`客户创建成功: ${saved.id}`, {
        customerId: saved.id,
        operator: user.userId,
      });

      return saved;
    });
  }

  /**
   * 分页查询客户列表
   * 根据用户角色进行数据权限过滤
   */
  async findAll(
    query: QueryCustomerDto,
    user: IJwtPayload,
  ): Promise<PaginationResponseDto<Customer>> {
    // 数据权限过滤
    const dataScope = this.resolveDataScope(user);
    return this.customerRepository.findWithPagination(query, dataScope);
  }

  /**
   * 查询客户详情，优先从缓存读取
   */
  async findOne(id: string, user: IJwtPayload): Promise<Customer> {
    const cacheKey = `${CACHE_KEY.CUSTOMER_DETAIL}:${id}`;

    // Cache-Aside 模式
    let customer = await this.cacheService.get<Customer>(cacheKey);
    if (!customer) {
      customer = await this.customerRepository.findOneWithRelations(id);
      if (!customer) {
        throw new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND);
      }

      // 检查数据权限
      this.checkDataPermission(customer, user);

      // 写入缓存，TTL 30分钟
      await this.cacheService.set(cacheKey, customer, 1800);
    }

    return customer;
  }

  /**
   * 更新客户信息
   */
  async update(
    id: string,
    dto: UpdateCustomerDto,
    user: IJwtPayload,
  ): Promise<Customer> {
    const customer = await this.findOne(id, user);

    // 检查是否为客户负责人或管理员
    if (customer.ownerId !== user.userId && !this.isAdmin(user)) {
      throw new BusinessException(ErrorCode.NO_PERMISSION);
    }

    Object.assign(customer, dto);
    const updated = await this.customerRepository.save(customer);

    // 清除缓存
    await this.cacheService.del(`${CACHE_KEY.CUSTOMER_DETAIL}:${id}`);
    await this.cacheService.delByPattern(`${CACHE_KEY.CUSTOMER_LIST}:*`);

    return updated;
  }

  /**
   * 批量转移客户 - 使用事务保证数据一致性
   */
  async transfer(dto: TransferCustomerDto, user: IJwtPayload): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const customers = await queryRunner.manager.find(Customer, {
        where: { id: In(dto.customerIds) },
      });

      if (customers.length !== dto.customerIds.length) {
        throw new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND);
      }

      // 批量更新负责人
      for (const customer of customers) {
        customer.ownerId = dto.targetUserId;
        customer.ownerName = dto.targetUserName;
        customer.transferredAt = new Date();
        customer.transferredBy = user.userId;
      }

      await queryRunner.manager.save(Customer, customers);

      // 记录转移日志
      const followRecords = customers.map((c) => ({
        customerId: c.id,
        type: "TRANSFER",
        content: `客户从 ${c.ownerName} 转移至 ${dto.targetUserName}`,
        operatorId: user.userId,
        operatorName: user.username,
      }));

      await queryRunner.manager.save(CustomerFollowRecord, followRecords);

      await queryRunner.commitTransaction();

      // 清除相关缓存
      for (const id of dto.customerIds) {
        await this.cacheService.del(`${CACHE_KEY.CUSTOMER_DETAIL}:${id}`);
      }
      await this.cacheService.delByPattern(`${CACHE_KEY.CUSTOMER_LIST}:*`);

      this.logger.info("客户批量转移成功", {
        customerIds: dto.customerIds,
        targetUserId: dto.targetUserId,
        operator: user.userId,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error("客户转移失败", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 软删除客户
   */
  async remove(id: string, user: IJwtPayload): Promise<void> {
    const customer = await this.findOne(id, user);
    await this.customerRepository.softRemove(customer);
    await this.cacheService.del(`${CACHE_KEY.CUSTOMER_DETAIL}:${id}`);
  }

  /**
   * 根据用户角色确定数据权限范围
   */
  private resolveDataScope(user: IJwtPayload): {
    type: "ALL" | "DEPARTMENT" | "SELF";
    userId?: string;
    departmentId?: string;
  } {
    switch (user.role) {
      case RoleEnum.SUPER_ADMIN:
      case RoleEnum.ADMIN:
        return { type: "ALL" };
      case RoleEnum.SUPERVISOR:
        return { type: "DEPARTMENT", departmentId: user.departmentId };
      case RoleEnum.SALES:
      default:
        return { type: "SELF", userId: user.userId };
    }
  }

  private checkDataPermission(customer: Customer, user: IJwtPayload): void {
    const scope = this.resolveDataScope(user);
    if (scope.type === "ALL") return;
    if (
      scope.type === "DEPARTMENT" &&
      customer.departmentId === scope.departmentId
    )
      return;
    if (scope.type === "SELF" && customer.ownerId === scope.userId) return;
    throw new BusinessException(ErrorCode.NO_PERMISSION);
  }

  private isAdmin(user: IJwtPayload): boolean {
    return [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN].includes(user.role);
  }
}
```

#### 3.2.3 Domain 层（Entity）

Domain 层包含实体定义和领域逻辑。实体不仅是数据库表的映射，还可以承载与自身状态相关的领域行为。

```typescript
// common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export abstract class BaseEntity {
  @ApiProperty({ description: "主键ID" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "创建时间" })
  @CreateDateColumn({
    name: "created_at",
    type: "datetime",
    comment: "创建时间",
  })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  @UpdateDateColumn({
    name: "updated_at",
    type: "datetime",
    comment: "更新时间",
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: "deleted_at",
    type: "datetime",
    nullable: true,
    comment: "删除时间",
  })
  deletedAt: Date | null;

  @Column({
    name: "created_by",
    type: "varchar",
    length: 36,
    nullable: true,
    comment: "创建人ID",
  })
  createdBy: string;

  @Column({
    name: "updated_by",
    type: "varchar",
    length: 36,
    nullable: true,
    comment: "更新人ID",
  })
  updatedBy: string;
}
```

```typescript
// modules/customer/entities/customer.entity.ts
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "@/common/entities/base.entity";
import { ApiProperty } from "@nestjs/swagger";
import { CustomerStatusEnum } from "@/common/enums/customer-status.enum";
import { CustomerSourceEnum } from "@/common/enums/lead-source.enum";
import { CustomerFollowRecord } from "./customer-follow-record.entity";

@Entity("crm_customer")
@Index("idx_customer_phone", ["phone"], { unique: true })
@Index("idx_customer_owner", ["ownerId"])
@Index("idx_customer_department", ["departmentId"])
@Index("idx_customer_status", ["status"])
@Index("idx_customer_created_at", ["createdAt"])
export class Customer extends BaseEntity {
  @ApiProperty({ description: "客户名称" })
  @Column({ type: "varchar", length: 100, comment: "客户名称" })
  name: string;

  @ApiProperty({ description: "手机号" })
  @Column({ type: "varchar", length: 20, comment: "手机号" })
  phone: string;

  @ApiProperty({ description: "邮箱" })
  @Column({ type: "varchar", length: 100, nullable: true, comment: "邮箱" })
  email: string;

  @ApiProperty({ description: "公司名称" })
  @Column({ type: "varchar", length: 200, nullable: true, comment: "公司名称" })
  company: string;

  @ApiProperty({ description: "客户来源", enum: CustomerSourceEnum })
  @Column({ type: "enum", enum: CustomerSourceEnum, comment: "客户来源" })
  source: CustomerSourceEnum;

  @ApiProperty({ description: "客户状态", enum: CustomerStatusEnum })
  @Column({
    type: "enum",
    enum: CustomerStatusEnum,
    default: CustomerStatusEnum.POTENTIAL,
    comment: "客户状态",
  })
  status: CustomerStatusEnum;

  @ApiProperty({ description: "客户等级 A/B/C/D" })
  @Column({ type: "char", length: 1, default: "C", comment: "客户等级" })
  level: string;

  @ApiProperty({ description: "负责人ID" })
  @Column({
    name: "owner_id",
    type: "varchar",
    length: 36,
    comment: "负责人ID",
  })
  ownerId: string;

  @Column({
    name: "owner_name",
    type: "varchar",
    length: 50,
    comment: "负责人姓名",
  })
  ownerName: string;

  @Column({
    name: "department_id",
    type: "varchar",
    length: 36,
    comment: "所属部门ID",
  })
  departmentId: string;

  @Column({ type: "json", nullable: true, comment: "联系人列表" })
  contacts: Array<{
    name: string;
    position: string;
    phone: string;
  }>;

  @Column({ type: "varchar", length: 500, nullable: true, comment: "备注" })
  remark: string;

  @Column({
    name: "last_follow_at",
    type: "datetime",
    nullable: true,
    comment: "最后跟进时间",
  })
  lastFollowAt: Date;

  @Column({
    name: "next_follow_at",
    type: "datetime",
    nullable: true,
    comment: "下次跟进时间",
  })
  nextFollowAt: Date;

  @Column({
    name: "transferred_at",
    type: "datetime",
    nullable: true,
    comment: "转移时间",
  })
  transferredAt: Date;

  @Column({
    name: "transferred_by",
    type: "varchar",
    length: 36,
    nullable: true,
    comment: "转移操作人",
  })
  transferredBy: string;

  @OneToMany(() => CustomerFollowRecord, (record) => record.customer)
  followRecords: CustomerFollowRecord[];

  // ============= 领域方法 =============

  /**
   * 是否可以被回收到公海池
   * 规则：超过N天未跟进的客户可回收
   */
  canBeRecycled(maxIdleDays: number): boolean {
    if (!this.lastFollowAt) {
      // 从未跟进的客户，以创建时间计算
      const daysSinceCreated = this.daysBetween(this.createdAt, new Date());
      return daysSinceCreated > maxIdleDays;
    }
    const daysSinceLastFollow = this.daysBetween(this.lastFollowAt, new Date());
    return daysSinceLastFollow > maxIdleDays;
  }

  /**
   * 升级客户等级
   */
  upgradeLevel(): void {
    const levels = ["D", "C", "B", "A"];
    const currentIndex = levels.indexOf(this.level);
    if (currentIndex < levels.length - 1) {
      this.level = levels[currentIndex + 1];
    }
  }

  /**
   * 记录跟进
   */
  recordFollow(): void {
    this.lastFollowAt = new Date();
  }

  /**
   * 转入公海池
   */
  moveToHighSeas(): void {
    this.ownerId = null;
    this.ownerName = null;
    this.status = CustomerStatusEnum.HIGH_SEAS;
  }

  /**
   * 从公海池领取
   */
  claimFromHighSeas(
    ownerId: string,
    ownerName: string,
    departmentId: string,
  ): void {
    this.ownerId = ownerId;
    this.ownerName = ownerName;
    this.departmentId = departmentId;
    this.status = CustomerStatusEnum.POTENTIAL;
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
```

#### 3.2.4 Repository 层

Repository 层封装所有数据访问逻辑，使用 TypeORM 的自定义 Repository 模式。

```typescript
// modules/customer/customer.repository.ts
import { Injectable } from "@nestjs/common";
import { DataSource, Repository, SelectQueryBuilder, Brackets } from "typeorm";
import { Customer } from "./entities/customer.entity";
import { QueryCustomerDto } from "./dto/query-customer.dto";
import { PaginationResponseDto } from "@/common/dto/pagination-response.dto";

@Injectable()
export class CustomerRepository extends Repository<Customer> {
  constructor(private dataSource: DataSource) {
    super(Customer, dataSource.createEntityManager());
  }

  /**
   * 根据手机号查询客户
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    return this.findOne({ where: { phone } });
  }

  /**
   * 查询客户详情（含关联数据）
   */
  async findOneWithRelations(id: string): Promise<Customer | null> {
    return this.createQueryBuilder("customer")
      .leftJoinAndSelect("customer.followRecords", "records")
      .where("customer.id = :id", { id })
      .orderBy("records.createdAt", "DESC")
      .getOne();
  }

  /**
   * 分页查询客户列表（含数据权限过滤）
   */
  async findWithPagination(
    query: QueryCustomerDto,
    dataScope: {
      type: "ALL" | "DEPARTMENT" | "SELF";
      userId?: string;
      departmentId?: string;
    },
  ): Promise<PaginationResponseDto<Customer>> {
    const qb = this.createQueryBuilder("customer");

    // 数据权限过滤
    this.applyDataScope(qb, dataScope);

    // 关键字搜索（客户名称、手机号、公司名）
    if (query.keyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where("customer.name LIKE :keyword", {
              keyword: `%${query.keyword}%`,
            })
            .orWhere("customer.phone LIKE :keyword", {
              keyword: `%${query.keyword}%`,
            })
            .orWhere("customer.company LIKE :keyword", {
              keyword: `%${query.keyword}%`,
            });
        }),
      );
    }

    // 条件过滤
    if (query.status) {
      qb.andWhere("customer.status = :status", { status: query.status });
    }

    if (query.source) {
      qb.andWhere("customer.source = :source", { source: query.source });
    }

    if (query.level) {
      qb.andWhere("customer.level = :level", { level: query.level });
    }

    if (query.ownerId) {
      qb.andWhere("customer.ownerId = :ownerId", { ownerId: query.ownerId });
    }

    // 时间范围过滤
    if (query.startDate && query.endDate) {
      qb.andWhere("customer.createdAt BETWEEN :startDate AND :endDate", {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }

    // 排序
    const sortBy = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder || "DESC";
    qb.orderBy(`customer.${sortBy}`, sortOrder);

    // 分页
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 查询待回收的客户（公海回收定时任务使用）
   */
  async findRecyclableCustomers(
    maxIdleDays: number,
    batchSize: number = 100,
  ): Promise<Customer[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - maxIdleDays);

    return this.createQueryBuilder("customer")
      .where("customer.ownerId IS NOT NULL")
      .andWhere("customer.status != :status", { status: "HIGH_SEAS" })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            "customer.lastFollowAt IS NULL AND customer.createdAt < :threshold",
            {
              threshold: thresholdDate,
            },
          ).orWhere("customer.lastFollowAt < :threshold", {
            threshold: thresholdDate,
          });
        }),
      )
      .take(batchSize)
      .getMany();
  }

  /**
   * 统计销售客户数量
   */
  async countByOwner(ownerId: string): Promise<number> {
    return this.count({ where: { ownerId } });
  }

  /**
   * 应用数据权限范围
   */
  private applyDataScope(
    qb: SelectQueryBuilder<Customer>,
    scope: { type: string; userId?: string; departmentId?: string },
  ): void {
    switch (scope.type) {
      case "SELF":
        qb.andWhere("customer.ownerId = :userId", { userId: scope.userId });
        break;
      case "DEPARTMENT":
        qb.andWhere("customer.departmentId = :departmentId", {
          departmentId: scope.departmentId,
        });
        break;
      case "ALL":
      default:
        // 不添加数据权限过滤
        break;
    }
  }
}
```

---

### 3.3 中间件设计

#### 3.3.1 中间件执行顺序

```
HTTP 请求
    │
    ▼
┌─────────────────────────┐
│  CORS 配置 (Express)     │ ── 跨域处理
├─────────────────────────┤
│  Helmet 中间件           │ ── 安全响应头
├─────────────────────────┤
│  TraceId 中间件          │ ── 生成请求链路追踪ID
├─────────────────────────┤
│  RequestLogger 中间件    │ ── 请求/响应日志记录
├─────────────────────────┤
│  RateLimit 中间件        │ ── 基于Redis滑动窗口限流
├─────────────────────────┤
│  全局 ValidationPipe     │ ── 参数校验与转换
├─────────────────────────┤
│  JwtAuth Guard           │ ── JWT Token 认证
├─────────────────────────┤
│  Roles Guard             │ ── RBAC 角色权限校验
├─────────────────────────┤
│  Controller 方法执行      │ ── 路由匹配并执行控制器
├─────────────────────────┤
│  Logging Interceptor     │ ── 记录执行耗时
├─────────────────────────┤
│  Transform Interceptor   │ ── 统一响应格式包装
├─────────────────────────┤
│  HttpException Filter    │ ── 异常捕获与格式化
└─────────────────────────┘
    │
    ▼
HTTP 响应
```

#### 3.3.2 JWT 认证中间件（双Token机制）

本系统采用 Access Token + Refresh Token 双 Token 机制。Access Token 有效期为 2 小时，用于请求鉴权；Refresh Token 有效期为 7 天，用于无感刷新 Access Token，避免用户频繁重新登录。

**Token 流转示意：**

```
┌────────┐                    ┌──────────┐                    ┌────────┐
│ Client │                    │  Server  │                    │ Redis  │
└───┬────┘                    └────┬─────┘                    └───┬────┘
    │                              │                              │
    │  1. POST /auth/login         │                              │
    │  {username, password}        │                              │
    │─────────────────────────────>│                              │
    │                              │ 2. 验证用户名密码              │
    │                              │ 3. 生成 accessToken(2h)      │
    │                              │    生成 refreshToken(7d)     │
    │                              │───── 4. 存储 refreshToken ──>│
    │                              │      key: session:{userId}   │
    │  5. 返回双Token              │      ttl: 7d                 │
    │<─────────────────────────────│                              │
    │                              │                              │
    │  6. 携带 accessToken 请求     │                              │
    │  Authorization: Bearer xxx   │                              │
    │─────────────────────────────>│                              │
    │                              │ 7. 验证 accessToken          │
    │  8. 返回业务数据              │                              │
    │<─────────────────────────────│                              │
    │                              │                              │
    │  9. accessToken 过期          │                              │
    │  POST /auth/refresh          │                              │
    │  {refreshToken}              │                              │
    │─────────────────────────────>│                              │
    │                              │──── 10. 验证 refreshToken ──>│
    │                              │<──── 11. 匹配成功 ───────────│
    │                              │ 12. 生成新 accessToken(2h)   │
    │                              │     生成新 refreshToken(7d)  │
    │                              │──── 13. 更新 refreshToken ──>│
    │  14. 返回新双Token           │     (旧Token失效)             │
    │<─────────────────────────────│                              │
    │                              │                              │
```

**认证服务实现：**

```typescript
// modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { UserService } from "@/modules/user/user.service";
import { RedisService } from "@/shared/redis/redis.service";
import { LoggerService } from "@/shared/logger/logger.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { IJwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { BusinessException } from "@/common/exceptions/business.exception";
import { ErrorCode } from "@/common/exceptions/error-codes";

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly refreshTokenTTL: number; // 秒

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.accessTokenExpiresIn = this.configService.get(
      "JWT_ACCESS_EXPIRES",
      "2h",
    );
    this.refreshTokenExpiresIn = this.configService.get(
      "JWT_REFRESH_EXPIRES",
      "7d",
    );
    this.accessTokenSecret = this.configService.get("JWT_ACCESS_SECRET");
    this.refreshTokenSecret = this.configService.get("JWT_REFRESH_SECRET");
    this.refreshTokenTTL = 7 * 24 * 60 * 60; // 7天，单位秒
    this.logger.setContext(AuthService.name);
  }

  /**
   * 用户登录
   */
  async login(
    dto: LoginDto,
    ip: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    // 1. 查找用户
    const user = await this.userService.findByUsername(dto.username);
    if (!user) {
      throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // 2. 检查用户状态
    if (!user.isActive) {
      throw new BusinessException(ErrorCode.AUTH_ACCOUNT_DISABLED);
    }

    // 3. 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      // 记录登录失败次数（用于账户锁定）
      await this.incrementLoginFailCount(user.id);
      throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // 4. 清除登录失败计数
    await this.clearLoginFailCount(user.id);

    // 5. 生成双Token
    const tokens = await this.generateTokenPair(user);

    // 6. 存储会话信息到Redis
    await this.storeSession(user.id, tokens.refreshToken, {
      ip,
      userAgent,
      loginAt: new Date().toISOString(),
    });

    this.logger.info("用户登录成功", { userId: user.id, ip });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 7200, // 2小时 = 7200秒
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 刷新Token
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    // 1. 验证 refreshToken 签名
    let payload: IJwtPayload;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch (error) {
      throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
    }

    // 2. 从Redis验证refreshToken是否有效（防止已注销的Token被重用）
    const sessionKey = `session:${payload.userId}`;
    const storedToken = await this.redisService.hGet(
      sessionKey,
      "refreshToken",
    );

    if (!storedToken || storedToken !== dto.refreshToken) {
      // Token不匹配，可能已被刷新（Token Rotation）或已注销
      // 安全措施：检测到旧Token被重用时，清除所有会话（可能Token被盗）
      await this.redisService.del(sessionKey);
      this.logger.warn("检测到refreshToken重用，已清除会话", {
        userId: payload.userId,
      });
      throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
    }

    // 3. 查找用户（确认用户仍然有效）
    const user = await this.userService.findById(payload.userId);
    if (!user || !user.isActive) {
      await this.redisService.del(sessionKey);
      throw new BusinessException(ErrorCode.AUTH_ACCOUNT_DISABLED);
    }

    // 4. Token Rotation：生成全新的双Token
    const tokens = await this.generateTokenPair(user);

    // 5. 更新Redis中的refreshToken（旧Token立即失效）
    await this.redisService.hSet(
      sessionKey,
      "refreshToken",
      tokens.refreshToken,
    );
    await this.redisService.expire(sessionKey, this.refreshTokenTTL);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 7200,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 用户登出
   */
  async logout(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.redisService.del(sessionKey);
    this.logger.info("用户登出", { userId });
  }

  /**
   * 生成 Access Token + Refresh Token
   */
  private async generateTokenPair(
    user: any,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = uuidv4(); // JWT唯一标识

    const payload: IJwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
      jti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.accessTokenSecret,
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(
        { userId: user.id, jti },
        {
          secret: this.refreshTokenSecret,
          expiresIn: this.refreshTokenExpiresIn,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 存储会话信息到Redis (db0)
   */
  private async storeSession(
    userId: string,
    refreshToken: string,
    meta: { ip: string; userAgent: string; loginAt: string },
  ): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.redisService.hMSet(sessionKey, {
      refreshToken,
      ip: meta.ip,
      userAgent: meta.userAgent,
      loginAt: meta.loginAt,
    });
    await this.redisService.expire(sessionKey, this.refreshTokenTTL);
  }

  /**
   * 登录失败次数管理（5次后锁定30分钟）
   */
  private async incrementLoginFailCount(userId: string): Promise<void> {
    const key = `auth:fail:${userId}`;
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, 1800); // 30分钟窗口
    }
    if (count >= 5) {
      await this.userService.lockAccount(userId, 30); // 锁定30分钟
      this.logger.warn("账户因多次登录失败被锁定", {
        userId,
        failCount: count,
      });
    }
  }

  private async clearLoginFailCount(userId: string): Promise<void> {
    await this.redisService.del(`auth:fail:${userId}`);
  }
}
```

**JWT 策略实现：**

```typescript
// modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { IJwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { RedisService } from "@/shared/redis/redis.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: IJwtPayload): Promise<IJwtPayload> {
    // 检查用户会话是否存在（是否已登出）
    const sessionKey = `session:${payload.userId}`;
    const exists = await this.redisService.exists(sessionKey);
    if (!exists) {
      throw new UnauthorizedException("会话已失效，请重新登录");
    }

    return payload;
  }
}
```

```typescript
// common/interfaces/jwt-payload.interface.ts
import { RoleEnum } from "@/common/enums/role.enum";

export interface IJwtPayload {
  userId: string;
  username: string;
  role: RoleEnum;
  departmentId: string;
  jti: string; // JWT唯一标识
  iat?: number; // 签发时间
  exp?: number; // 过期时间
}
```

**JWT 认证守卫：**

```typescript
// common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { BusinessException } from "@/common/exceptions/business.exception";
import { ErrorCode } from "@/common/exceptions/error-codes";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === "TokenExpiredError") {
        throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED);
      }
      throw new BusinessException(ErrorCode.AUTH_UNAUTHORIZED);
    }
    return user;
  }
}
```

#### 3.3.3 RBAC 权限守卫

系统定义四级角色层级：超级管理员 > 管理员 > 主管 > 销售。权限控制基于角色层级实现，高层级角色自动拥有低层级角色的所有权限。

```typescript
// common/enums/role.enum.ts
export enum RoleEnum {
  SUPER_ADMIN = "SUPER_ADMIN", // 超级管理员 - 权重 100
  ADMIN = "ADMIN", // 管理员     - 权重 80
  SUPERVISOR = "SUPERVISOR", // 主管       - 权重 60
  SALES = "SALES", // 销售       - 权重 40
}

// 角色权重映射（用于层级比较）
export const ROLE_WEIGHT: Record<RoleEnum, number> = {
  [RoleEnum.SUPER_ADMIN]: 100,
  [RoleEnum.ADMIN]: 80,
  [RoleEnum.SUPERVISOR]: 60,
  [RoleEnum.SALES]: 40,
};
```

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";
import { RoleEnum } from "@/common/enums/role.enum";

export const ROLES_KEY = "roles";
export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import { RoleEnum, ROLE_WEIGHT } from "@/common/enums/role.enum";
import { BusinessException } from "@/common/exceptions/business.exception";
import { ErrorCode } from "@/common/exceptions/error-codes";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取接口要求的角色列表
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 未设置角色要求则放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new BusinessException(ErrorCode.AUTH_UNAUTHORIZED);
    }

    // 超级管理员拥有所有权限
    if (user.role === RoleEnum.SUPER_ADMIN) {
      return true;
    }

    // 检查用户角色是否在允许列表中（基于权重的层级比较）
    const userWeight = ROLE_WEIGHT[user.role] || 0;
    const minRequiredWeight = Math.min(
      ...requiredRoles.map((role) => ROLE_WEIGHT[role] || 0),
    );

    if (userWeight < minRequiredWeight) {
      throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
    }

    return true;
  }
}
```

#### 3.3.4 请求日志中间件

```typescript
// common/middlewares/request-logger.middleware.ts
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { LoggerService } from "@/shared/logger/logger.service";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext("HTTP");
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get("user-agent") || "";
    const traceId = req["traceId"] || "-";

    // 请求体脱敏（移除密码等敏感字段）
    const sanitizedBody = this.sanitizeBody(req.body);

    // 响应结束时记录日志
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get("content-length") || 0;

      const logData = {
        traceId,
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        contentLength,
        ip,
        userAgent,
        body: sanitizedBody,
      };

      if (statusCode >= 500) {
        this.logger.error(
          `${method} ${originalUrl} ${statusCode} ${duration}ms`,
          logData,
        );
      } else if (statusCode >= 400) {
        this.logger.warn(
          `${method} ${originalUrl} ${statusCode} ${duration}ms`,
          logData,
        );
      } else {
        this.logger.info(
          `${method} ${originalUrl} ${statusCode} ${duration}ms`,
          logData,
        );
      }
    });

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== "object") return body;
    const sanitized = { ...body };
    const sensitiveFields = [
      "password",
      "newPassword",
      "oldPassword",
      "token",
      "refreshToken",
    ];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "******";
      }
    }
    return sanitized;
  }
}
```

#### 3.3.5 限流中间件（基于 Redis 滑动窗口）

```typescript
// common/middlewares/rate-limit.middleware.ts
import { Injectable, NestMiddleware, HttpStatus } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { RedisService } from "@/shared/redis/redis.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly maxRequests: number; // 窗口内最大请求数
  private readonly windowSizeMs: number; // 滑动窗口大小（毫秒）

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.maxRequests = this.configService.get<number>("RATE_LIMIT_MAX", 100);
    this.windowSizeMs = this.configService.get<number>(
      "RATE_LIMIT_WINDOW_MS",
      60000,
    ); // 1分钟
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientKey = this.getClientKey(req);
    const redisKey = `ratelimit:${clientKey}`;
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    // 使用Redis的Sorted Set实现滑动窗口
    // 选择db3作为限流专用库
    const multi = this.redisService.getClient(3).multi();

    // 1. 移除窗口外的过期记录
    multi.zRemRangeByScore(redisKey, 0, windowStart);

    // 2. 获取当前窗口内的请求数
    multi.zCard(redisKey);

    // 3. 添加当前请求的时间戳
    multi.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });

    // 4. 设置Key过期时间（略大于窗口大小，自动清理）
    multi.expire(redisKey, Math.ceil(this.windowSizeMs / 1000) + 1);

    const results = await multi.exec();
    const currentCount = results[1] as number;

    // 设置限流响应头
    res.setHeader("X-RateLimit-Limit", this.maxRequests);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, this.maxRequests - currentCount - 1),
    );
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil((now + this.windowSizeMs) / 1000),
    );

    if (currentCount >= this.maxRequests) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        code: 429,
        message: "请求过于频繁，请稍后再试",
        data: null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  }

  /**
   * 获取客户端唯一标识
   * 已登录用户使用userId，未登录使用IP
   */
  private getClientKey(req: Request): string {
    const user = (req as any).user;
    if (user?.userId) {
      return `user:${user.userId}`;
    }
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? (forwarded as string).split(",")[0].trim() : req.ip;
    return `ip:${ip}`;
  }
}
```

#### 3.3.6 CORS 配置

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { TransformInterceptor } from "@/common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "@/common/interceptors/logging.interceptor";
import { TimeoutInterceptor } from "@/common/interceptors/timeout.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  // 1. 安全头
  app.use(helmet());

  // 2. CORS 配置
  app.enableCors({
    origin: configService
      .get<string>("CORS_ORIGINS", "http://localhost:3000")
      .split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Trace-Id",
      "Accept",
      "Origin",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Content-Disposition",
    ],
    credentials: true,
    maxAge: 3600, // 预检请求缓存1小时
  });

  // 3. 全局前缀
  app.setGlobalPrefix("api/v1");

  // 4. 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剥离非DTO定义的字段
      forbidNonWhitelisted: true, // 存在未定义字段时抛出异常
      transform: true, // 自动类型转换
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 5. 全局过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 6. 全局拦截器
  app.useGlobalInterceptors(
    new TimeoutInterceptor(),
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 7. Swagger 文档
  if (configService.get("NODE_ENV") !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("AI智能CRM销售管理系统")
      .setDescription("CRM系统后端API文档")
      .setVersion("1.0.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        "access-token",
      )
      .addTag("认证管理", "登录、登出、Token刷新")
      .addTag("用户管理", "用户CRUD、角色分配")
      .addTag("客户管理", "客户CRUD、转移、导入导出")
      .addTag("线索管理", "线索CRUD、转化")
      .addTag("商机管理", "商机CRUD、阶段推进")
      .addTag("合同管理", "合同CRUD、回款管理")
      .addTag("公海池", "公海规则、领取、回收")
      .addTag("AI分析", "AI评分、画像、话术推荐")
      .addTag("通话记录", "录音上传、转写、分析")
      .addTag("仪表盘", "数据统计、图表数据")
      .addTag("报表管理", "报表生成、导出")
      .addTag("系统管理", "角色、权限、部门、字典、日志")
      .addTag("文件管理", "文件上传、下载")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api-docs", app, document);
  }

  const port = configService.get<number>("PORT", 3000);
  await app.listen(port);

  console.log(`应用启动成功，端口: ${port}`);
  console.log(`Swagger文档: http://localhost:${port}/api-docs`);
}

bootstrap();
```

#### 3.3.7 链路追踪中间件

```typescript
// common/middlewares/trace-id.middleware.ts
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 优先使用客户端传入的traceId，否则生成新的
    const traceId = (req.headers["x-trace-id"] as string) || uuidv4();
    req["traceId"] = traceId;
    res.setHeader("X-Trace-Id", traceId);
    next();
  }
}
```

---

### 3.4 异常处理

#### 3.4.1 错误码体系设计

错误码采用 **模块前缀 + 错误编号** 的格式，共6位数字，便于快速定位错误来源。

| 编码范围 | 模块        | 说明     |
| -------- | ----------- | -------- |
| `100xxx` | AUTH        | 认证相关 |
| `101xxx` | USER        | 用户管理 |
| `102xxx` | CUSTOMER    | 客户管理 |
| `103xxx` | LEAD        | 线索管理 |
| `104xxx` | OPPORTUNITY | 商机管理 |
| `105xxx` | CONTRACT    | 合同管理 |
| `106xxx` | PRODUCT     | 产品管理 |
| `107xxx` | HIGH_SEAS   | 公海池   |
| `108xxx` | AI          | AI分析   |
| `109xxx` | CALL        | 通话记录 |
| `110xxx` | FILE        | 文件管理 |
| `111xxx` | SYSTEM      | 系统管理 |
| `900xxx` | COMMON      | 通用错误 |

```typescript
// common/exceptions/error-codes.ts
export const ErrorCode = {
  // ========== 通用错误 900xxx ==========
  SUCCESS: { code: 0, message: "操作成功", httpStatus: 200 },
  INTERNAL_ERROR: { code: 900001, message: "服务器内部错误", httpStatus: 500 },
  BAD_REQUEST: { code: 900002, message: "请求参数错误", httpStatus: 400 },
  NOT_FOUND: { code: 900003, message: "资源不存在", httpStatus: 404 },
  METHOD_NOT_ALLOWED: {
    code: 900004,
    message: "请求方法不允许",
    httpStatus: 405,
  },
  TOO_MANY_REQUESTS: { code: 900005, message: "请求过于频繁", httpStatus: 429 },
  NO_PERMISSION: { code: 900006, message: "没有操作权限", httpStatus: 403 },
  DATA_CONFLICT: { code: 900007, message: "数据冲突", httpStatus: 409 },

  // ========== 认证错误 100xxx ==========
  AUTH_UNAUTHORIZED: {
    code: 100001,
    message: "未登录或Token无效",
    httpStatus: 401,
  },
  AUTH_TOKEN_EXPIRED: { code: 100002, message: "Token已过期", httpStatus: 401 },
  AUTH_REFRESH_TOKEN_INVALID: {
    code: 100003,
    message: "RefreshToken无效或已过期",
    httpStatus: 401,
  },
  AUTH_INVALID_CREDENTIALS: {
    code: 100004,
    message: "用户名或密码错误",
    httpStatus: 401,
  },
  AUTH_ACCOUNT_DISABLED: {
    code: 100005,
    message: "账户已被禁用",
    httpStatus: 403,
  },
  AUTH_ACCOUNT_LOCKED: {
    code: 100006,
    message: "账户已被锁定，请30分钟后重试",
    httpStatus: 423,
  },
  AUTH_FORBIDDEN: { code: 100007, message: "权限不足", httpStatus: 403 },
  AUTH_OLD_PASSWORD_WRONG: {
    code: 100008,
    message: "原密码错误",
    httpStatus: 400,
  },

  // ========== 用户错误 101xxx ==========
  USER_NOT_FOUND: { code: 101001, message: "用户不存在", httpStatus: 404 },
  USER_ALREADY_EXISTS: {
    code: 101002,
    message: "用户名已存在",
    httpStatus: 409,
  },
  USER_PHONE_EXISTS: {
    code: 101003,
    message: "手机号已被注册",
    httpStatus: 409,
  },
  USER_EMAIL_EXISTS: { code: 101004, message: "邮箱已被注册", httpStatus: 409 },

  // ========== 客户错误 102xxx ==========
  CUSTOMER_NOT_FOUND: { code: 102001, message: "客户不存在", httpStatus: 404 },
  CUSTOMER_PHONE_EXISTS: {
    code: 102002,
    message: "客户手机号已存在",
    httpStatus: 409,
  },
  CUSTOMER_LIMIT_EXCEEDED: {
    code: 102003,
    message: "已达到客户持有上限",
    httpStatus: 400,
  },
  CUSTOMER_IN_HIGH_SEAS: {
    code: 102004,
    message: "客户已在公海池中",
    httpStatus: 400,
  },
  CUSTOMER_NOT_OWNED: {
    code: 102005,
    message: "非客户负责人无法操作",
    httpStatus: 403,
  },
  CUSTOMER_PROTECTED: {
    code: 102006,
    message: "客户在保护期内无法回收",
    httpStatus: 400,
  },

  // ========== 线索错误 103xxx ==========
  LEAD_NOT_FOUND: { code: 103001, message: "线索不存在", httpStatus: 404 },
  LEAD_ALREADY_CONVERTED: {
    code: 103002,
    message: "线索已转化",
    httpStatus: 400,
  },

  // ========== 商机错误 104xxx ==========
  OPPORTUNITY_NOT_FOUND: {
    code: 104001,
    message: "商机不存在",
    httpStatus: 404,
  },
  OPPORTUNITY_STAGE_INVALID: {
    code: 104002,
    message: "商机阶段流转不合法",
    httpStatus: 400,
  },

  // ========== 合同错误 105xxx ==========
  CONTRACT_NOT_FOUND: { code: 105001, message: "合同不存在", httpStatus: 404 },
  CONTRACT_AMOUNT_INVALID: {
    code: 105002,
    message: "合同金额不合法",
    httpStatus: 400,
  },
  CONTRACT_EXPIRED: { code: 105003, message: "合同已过期", httpStatus: 400 },

  // ========== 公海池错误 107xxx ==========
  HIGH_SEAS_CLAIM_LIMIT: {
    code: 107001,
    message: "今日领取已达上限",
    httpStatus: 400,
  },
  HIGH_SEAS_NO_AVAILABLE: {
    code: 107002,
    message: "公海池中无可领取客户",
    httpStatus: 404,
  },
  HIGH_SEAS_ALREADY_CLAIMED: {
    code: 107003,
    message: "客户已被其他销售领取",
    httpStatus: 409,
  },

  // ========== AI分析错误 108xxx ==========
  AI_SERVICE_UNAVAILABLE: {
    code: 108001,
    message: "AI服务暂不可用",
    httpStatus: 503,
  },
  AI_ANALYSIS_FAILED: { code: 108002, message: "AI分析失败", httpStatus: 500 },
  AI_QUOTA_EXCEEDED: {
    code: 108003,
    message: "AI调用额度已用完",
    httpStatus: 429,
  },

  // ========== 文件错误 110xxx ==========
  FILE_NOT_FOUND: { code: 110001, message: "文件不存在", httpStatus: 404 },
  FILE_TYPE_NOT_ALLOWED: {
    code: 110002,
    message: "文件类型不支持",
    httpStatus: 400,
  },
  FILE_SIZE_EXCEEDED: {
    code: 110003,
    message: "文件大小超出限制",
    httpStatus: 400,
  },
  FILE_UPLOAD_FAILED: {
    code: 110004,
    message: "文件上传失败",
    httpStatus: 500,
  },
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
```

#### 3.4.2 业务异常类

```typescript
// common/exceptions/business.exception.ts
import { HttpException } from "@nestjs/common";
import { ErrorCodeType } from "./error-codes";

export class BusinessException extends HttpException {
  private readonly errorCode: number;

  constructor(errorCode: ErrorCodeType, detail?: string) {
    const message = detail
      ? `${errorCode.message}: ${detail}`
      : errorCode.message;
    super(
      {
        code: errorCode.code,
        message,
        data: null,
        timestamp: new Date().toISOString(),
      },
      errorCode.httpStatus,
    );
    this.errorCode = errorCode.code;
  }

  getErrorCode(): number {
    return this.errorCode;
  }
}
```

#### 3.4.3 全局异常过滤器

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError, EntityNotFoundError } from "typeorm";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const traceId = request["traceId"] || "-";

    let status: number;
    let code: number;
    let message: string;

    if (exception instanceof HttpException) {
      // NestJS HTTP异常（包括BusinessException）
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === "object" && responseBody !== null) {
        const body = responseBody as any;
        code = body.code || status;
        message = body.message || exception.message;

        // class-validator 校验错误的特殊处理
        if (Array.isArray(body.message)) {
          message = body.message.join("; ");
          code = 900002; // BAD_REQUEST
        }
      } else {
        code = status;
        message = responseBody as string;
      }
    } else if (exception instanceof QueryFailedError) {
      // TypeORM 查询错误
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 900001;
      message = "数据库操作失败";
      this.logger.error(
        `数据库查询错误: ${exception.message}`,
        exception.stack,
      );
    } else if (exception instanceof EntityNotFoundError) {
      // TypeORM 实体未找到
      status = HttpStatus.NOT_FOUND;
      code = 900003;
      message = "请求的资源不存在";
    } else if (exception instanceof Error) {
      // 未知异常
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 900001;
      message = "服务器内部错误";
      this.logger.error(`未处理异常: ${exception.message}`, exception.stack);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 900001;
      message = "服务器内部错误";
    }

    const errorResponse = {
      code,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      traceId,
      path: request.url,
    };

    // 记录错误日志
    if (status >= 500) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.url} ${status}`,
        JSON.stringify(errorResponse),
      );
    }

    response.status(status).json(errorResponse);
  }
}
```

#### 3.4.4 统一响应格式

```typescript
// common/interfaces/response.interface.ts
export interface IResponse<T = any> {
  code: number; // 业务状态码，0为成功
  message: string; // 提示信息
  data: T; // 响应数据
  timestamp: string; // 响应时间戳 ISO 8601
  traceId?: string; // 链路追踪ID
}
```

```typescript
// common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { IResponse } from "@/common/interfaces/response.interface";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  IResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<IResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const traceId = request["traceId"] || "-";

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: "操作成功",
        data: data ?? null,
        timestamp: new Date().toISOString(),
        traceId,
      })),
    );
  }
}
```

**统一响应示例：**

```json
// 成功响应
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "阿里巴巴集团",
    "phone": "13800138000",
    "status": "POTENTIAL"
  },
  "timestamp": "2026-03-03T10:30:00.000Z",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}

// 分页响应
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "items": [...],
    "total": 256,
    "page": 1,
    "pageSize": 20,
    "totalPages": 13
  },
  "timestamp": "2026-03-03T10:30:00.000Z",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}

// 错误响应
{
  "code": 102002,
  "message": "客户手机号已存在",
  "data": null,
  "timestamp": "2026-03-03T10:30:00.000Z",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "path": "/api/v1/customers"
}
```

---

### 3.5 日志体系

#### 3.5.1 Winston 日志配置

```typescript
// shared/logger/logger.service.ts
import {
  Injectable,
  Scope,
  LoggerService as NestLoggerService,
} from "@nestjs/common";
import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { ConfigService } from "@nestjs/config";
import { ClsService } from "nestjs-cls"; // 用于获取请求上下文中的traceId

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: WinstonLogger;
  private context: string = "Application";

  constructor(
    private readonly configService: ConfigService,
    private readonly clsService: ClsService,
  ) {
    const env = this.configService.get("NODE_ENV", "development");
    const logDir = this.configService.get("LOG_DIR", "logs");

    // 日志格式定义
    const logFormat = format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      format.errors({ stack: true }),
      format.printf(
        ({ timestamp, level, message, context, traceId, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? ` | ${JSON.stringify(meta)}`
            : "";
          return `${timestamp} [${level.toUpperCase().padEnd(5)}] [${traceId || "-"}] [${context || "-"}] ${message}${metaStr}`;
        },
      ),
    );

    // JSON结构化格式（生产环境用于ELK采集）
    const jsonFormat = format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      format.errors({ stack: true }),
      format.json(),
    );

    this.logger = createLogger({
      level: env === "production" ? "info" : "debug",
      defaultMeta: { service: "crm-api" },
      transports: [
        // 控制台输出（开发环境带颜色）
        new transports.Console({
          format:
            env === "development"
              ? format.combine(format.colorize(), logFormat)
              : format.combine(jsonFormat),
        }),

        // 全量日志文件（按日期轮转）
        new DailyRotateFile({
          dirname: `${logDir}/app`,
          filename: "app-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: "50m", // 单文件最大50MB
          maxFiles: "30d", // 保留30天
          format: env === "production" ? jsonFormat : logFormat,
          level: "info",
        }),

        // 错误日志文件（独立存放，便于监控报警）
        new DailyRotateFile({
          dirname: `${logDir}/error`,
          filename: "error-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: "50m",
          maxFiles: "90d", // 错误日志保留90天
          format: env === "production" ? jsonFormat : logFormat,
          level: "error",
        }),

        // 访问日志
        new DailyRotateFile({
          dirname: `${logDir}/access`,
          filename: "access-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: "100m",
          maxFiles: "15d",
          format: jsonFormat,
          level: "info",
        }),
      ],
    });
  }

  setContext(context: string): void {
    this.context = context;
  }

  private getTraceId(): string {
    try {
      return this.clsService.get("traceId") || "-";
    } catch {
      return "-";
    }
  }

  log(message: string, ...optionalParams: any[]): void {
    this.info(message, ...optionalParams);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, {
      context: this.context,
      traceId: this.getTraceId(),
      ...meta,
    });
  }

  error(message: string, trace?: any, meta?: any): void {
    this.logger.error(message, {
      context: this.context,
      traceId: this.getTraceId(),
      stack: trace instanceof Error ? trace.stack : trace,
      ...meta,
    });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, {
      context: this.context,
      traceId: this.getTraceId(),
      ...meta,
    });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, {
      context: this.context,
      traceId: this.getTraceId(),
      ...meta,
    });
  }
}
```

#### 3.5.2 日志级别使用规范

| 级别    | 使用场景                                 | 示例                                     |
| ------- | ---------------------------------------- | ---------------------------------------- |
| `error` | 系统异常、业务严重错误、外部服务调用失败 | 数据库连接失败、AI服务超时、支付回调异常 |
| `warn`  | 可恢复异常、性能预警、安全事件           | 登录失败多次、缓存命中率低、接口响应超2s |
| `info`  | 业务操作、请求日志、状态变更             | 用户登录、客户创建、合同审批通过         |
| `debug` | 调试信息（仅开发环境）                   | SQL语句、变量值、中间计算过程            |

#### 3.5.3 结构化日志输出样例

```
// 开发环境（可读格式）
2026-03-03 10:30:15.123 [INFO ] [a1b2c3d4] [CustomerService] 客户创建成功 | {"customerId":"uuid-xxx","operator":"user-001"}
2026-03-03 10:30:15.456 [ERROR] [a1b2c3d4] [HttpExceptionFilter] 数据库查询错误 | {"stack":"QueryFailedError: ..."}

// 生产环境（JSON格式，便于ELK采集）
{
  "timestamp": "2026-03-03T10:30:15.123Z",
  "level": "info",
  "service": "crm-api",
  "context": "CustomerService",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "客户创建成功",
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "operator": "user-001"
}
```

---

### 3.6 缓存设计

#### 3.6.1 Redis 分库规划

系统使用 Redis 6.x，按用途将不同类型的数据隔离在不同的数据库中，互不干扰，便于独立管理和监控。

| DB    | 用途     | 说明                                                 | 内存预估 |
| ----- | -------- | ---------------------------------------------------- | -------- |
| `db0` | 会话管理 | 用户登录会话（refreshToken、设备信息）、登录失败计数 | 200MB    |
| `db1` | 业务缓存 | 客户详情、数据字典、配置信息、热点数据               | 500MB    |
| `db2` | 任务队列 | Bull Queue 队列数据（Job元数据、状态、结果）         | 300MB    |
| `db3` | 接口限流 | 滑动窗口限流数据、IP黑名单                           | 100MB    |
| `db4` | 分布式锁 | 业务分布式锁（防并发写、幂等控制）                   | 50MB     |
| `db5` | 临时数据 | 验证码、短信码、临时计算结果、导出文件临时链接       | 100MB    |

```typescript
// shared/redis/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export enum RedisDB {
  SESSION = 0,
  CACHE = 1,
  QUEUE = 2,
  RATE_LIMIT = 3,
  LOCK = 4,
  TEMP = 5,
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private clients: Map<number, Redis> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get("REDIS_HOST", "127.0.0.1");
    const port = this.configService.get<number>("REDIS_PORT", 6379);
    const password = this.configService.get("REDIS_PASSWORD", "");

    // 为每个DB创建独立连接
    for (const db of [0, 1, 2, 3, 4, 5]) {
      const client = new Redis({
        host,
        port,
        password: password || undefined,
        db,
        maxRetriesPerRequest: 3,
        retryStrategy(times: number): number | null {
          if (times > 10) return null;
          return Math.min(times * 200, 5000);
        },
        enableReadyCheck: true,
        lazyConnect: false,
      });

      client.on("error", (err) => {
        console.error(`Redis db${db} 连接错误:`, err.message);
      });

      this.clients.set(db, client);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [, client] of this.clients) {
      await client.quit();
    }
  }

  /**
   * 获取指定DB的Redis客户端
   */
  getClient(db: RedisDB = RedisDB.CACHE): Redis {
    const client = this.clients.get(db);
    if (!client) {
      throw new Error(`Redis db${db} 客户端未初始化`);
    }
    return client;
  }

  // ============= db0 会话管理相关方法 =============

  async hMSet(key: string, data: Record<string, string>): Promise<void> {
    await this.getClient(RedisDB.SESSION).hmset(key, data);
  }

  async hGet(key: string, field: string): Promise<string | null> {
    return this.getClient(RedisDB.SESSION).hget(key, field);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.getClient(RedisDB.SESSION).exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.getClient(RedisDB.SESSION).expire(key, seconds);
  }

  async del(key: string): Promise<void> {
    await this.getClient(RedisDB.SESSION).del(key);
  }

  async incr(key: string): Promise<number> {
    return this.getClient(RedisDB.SESSION).incr(key);
  }
}
```

#### 3.6.2 Cache-Aside 模式实现

```typescript
// shared/cache/cache.service.ts
import { Injectable } from "@nestjs/common";
import { RedisService, RedisDB } from "@/shared/redis/redis.service";
import { LoggerService } from "@/shared/logger/logger.service";

@Injectable()
export class CacheService {
  private readonly client;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.client = this.redisService.getClient(RedisDB.CACHE);
    this.logger.setContext(CacheService.name);
  }

  /**
   * 获取缓存（反序列化）
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * 设置缓存
   * @param key 缓存Key
   * @param value 缓存值
   * @param ttl 过期时间（秒），添加随机偏移防雪崩
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    const serialized = JSON.stringify(value);
    // TTL添加随机偏移（±10%），防止大量缓存同时过期造成雪崩
    const jitter = Math.floor(ttl * 0.1 * (Math.random() * 2 - 1));
    const finalTtl = Math.max(ttl + jitter, 1);
    await this.client.setex(key, finalTtl, serialized);
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * 按模式批量删除缓存
   * 使用SCAN避免阻塞Redis
   */
  async delByPattern(pattern: string): Promise<void> {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== "0");
  }

  /**
   * Cache-Aside 模式封装
   * 缓存不存在时自动调用加载函数，并写入缓存
   *
   * 含互斥锁防止缓存击穿（同一Key只允许一个请求穿透到DB）
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T | null>,
    ttl: number,
  ): Promise<T | null> {
    // 1. 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 获取互斥锁，防止缓存击穿
    const lockKey = `cachelock:${key}`;
    const lockClient = this.redisService.getClient(RedisDB.LOCK);
    const lockAcquired = await lockClient.set(lockKey, "1", "EX", 10, "NX");

    if (lockAcquired) {
      try {
        // 二次检查（Double Check）
        const rechecked = await this.get<T>(key);
        if (rechecked !== null) {
          return rechecked;
        }

        // 3. 从数据源加载
        const data = await loader();

        if (data !== null && data !== undefined) {
          // 4. 写入缓存
          await this.set(key, data, ttl);
        } else {
          // 防缓存穿透：对空值缓存短时间
          await this.set(key, "__NULL__", 60);
        }

        return data;
      } finally {
        await lockClient.del(lockKey);
      }
    } else {
      // 未获取到锁，等待后重试（其他请求正在加载）
      await this.sleep(100);
      return this.get<T>(key);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

#### 3.6.3 缓存 Key 命名规范

命名格式：`{模块}:{资源类型}:{标识}`

```typescript
// common/constants/cache-key.constant.ts
export const CACHE_KEY = {
  // 客户模块
  CUSTOMER_DETAIL: "customer:detail", // customer:detail:{id}
  CUSTOMER_LIST: "customer:list", // customer:list:{queryHash}
  CUSTOMER_COUNT: "customer:count", // customer:count:{ownerId}

  // 用户模块
  USER_DETAIL: "user:detail", // user:detail:{id}
  USER_PERMISSIONS: "user:perms", // user:perms:{userId}

  // 系统模块
  DICT_DATA: "system:dict", // system:dict:{dictType}
  DEPT_TREE: "system:dept:tree", // system:dept:tree
  ROLE_LIST: "system:role:list", // system:role:list
  SYSTEM_CONFIG: "system:config", // system:config:{key}

  // 公海池
  HIGH_SEAS_RULES: "highseas:rules", // highseas:rules:{poolId}
  HIGH_SEAS_CLAIM_COUNT: "highseas:claim:count", // highseas:claim:count:{userId}:{date}

  // AI分析
  AI_ANALYSIS_RESULT: "ai:result", // ai:result:{analysisId}

  // 统计仪表盘
  DASHBOARD_OVERVIEW: "dashboard:overview", // dashboard:overview:{userId}
  DASHBOARD_SALES_RANKING: "dashboard:ranking", // dashboard:ranking:{period}

  // 产品
  PRODUCT_LIST: "product:list", // product:list
  PRODUCT_DETAIL: "product:detail", // product:detail:{id}
} as const;
```

#### 3.6.4 防缓存穿透/击穿/雪崩策略

| 问题         | 描述                                      | 解决方案               | 实现方式                                                                  |
| ------------ | ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| **缓存穿透** | 大量请求查询不存在的数据，穿透到数据库    | 空值缓存 + 布隆过滤器  | 查询DB为空时缓存`__NULL__`占位符，TTL=60s；高频场景可加布隆过滤器前置过滤 |
| **缓存击穿** | 热点Key过期瞬间，大量请求同时穿透到数据库 | 互斥锁（Mutex Lock）   | `getOrSet`方法中使用Redis SET NX获取互斥锁，只允许一个请求回源加载        |
| **缓存雪崩** | 大量Key同时过期，瞬时流量冲击数据库       | TTL随机偏移 + 缓存预热 | `set`方法中自动为TTL添加 +/-10% 随机抖动；定时任务提前刷新热点数据        |

#### 3.6.5 热点数据缓存策略表

| 数据       | 缓存Key                       | TTL   | 更新策略           | 说明                   |
| ---------- | ----------------------------- | ----- | ------------------ | ---------------------- |
| 用户信息   | `user:detail:{id}`            | 30min | 修改时主动失效     | 登录鉴权高频读取       |
| 用户权限   | `user:perms:{userId}`         | 1h    | 权限变更时主动失效 | 每次请求守卫检查       |
| 客户详情   | `customer:detail:{id}`        | 30min | 修改时主动失效     | CRM核心高频数据        |
| 数据字典   | `system:dict:{type}`          | 24h   | 字典变更时主动失效 | 全局共享，变更频率极低 |
| 部门树     | `system:dept:tree`            | 12h   | 部门变更时主动失效 | 全局共享               |
| 产品列表   | `product:list`                | 2h    | 产品变更时主动失效 | 商机/合同创建时选择    |
| 仪表盘概览 | `dashboard:overview:{userId}` | 10min | 定时刷新           | 实时性要求适中         |
| 销售排行榜 | `dashboard:ranking:{period}`  | 15min | 定时任务刷新       | 按天/周/月统计         |
| 公海池规则 | `highseas:rules:{poolId}`     | 6h    | 规则变更时主动失效 | 公海回收判断           |
| 系统配置   | `system:config:{key}`         | 24h   | 配置变更时主动失效 | 全局系统参数           |

---

### 3.7 任务队列设计

#### 3.7.1 Bull Queue 配置

```typescript
// config/bull.config.ts
import { BullModuleOptions } from "@nestjs/bull";
import { ConfigService } from "@nestjs/config";

export const bullConfigFactory = (
  configService: ConfigService,
): BullModuleOptions => ({
  redis: {
    host: configService.get("REDIS_HOST", "127.0.0.1"),
    port: configService.get<number>("REDIS_PORT", 6379),
    password: configService.get("REDIS_PASSWORD", "") || undefined,
    db: 2, // db2专用于队列
  },
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // 完成的Job保留1小时
      count: 1000, // 最多保留1000个
    },
    removeOnFail: {
      age: 86400 * 7, // 失败的Job保留7天
    },
    attempts: 3, // 默认重试3次
    backoff: {
      type: "exponential",
      delay: 5000, // 初始重试间隔5秒
    },
  },
  settings: {
    stalledInterval: 30000, // 30秒检查一次停滞的Job
    maxStalledCount: 2, // 最多停滞2次后标记失败
    lockDuration: 60000, // Job锁持续时间60秒
  },
});
```

```typescript
// common/constants/queue.constant.ts
export const QUEUE_NAMES = {
  // 异步处理队列
  RECORDING_PROCESS: "recording-process", // 录音处理
  AI_ANALYSIS: "ai-analysis", // AI分析
  EMAIL_NOTIFICATION: "email-notification", // 邮件通知
  DATA_EXPORT: "data-export", // 数据导出
  REPORT_GENERATE: "report-generate", // 报表生成

  // 定时任务队列（使用Bull的repeat功能）
  SCHEDULER: "scheduler", // 统一的定时调度队列
} as const;
```

#### 3.7.2 定时任务列表（9个）

| 序号 | 任务名称     | Cron 表达式                                                                                                                                                                                                    | 执行时间           | 说明                                                   |
| ---- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------ |
| 1    | 公海自动回收 | `0 0 2 * * *`                                                                                                                                                                                                  | 每天凌晨2:00       | 扫描超过N天未跟进的客户，自动回收至公海池              |
| 2    | 日报数据统计 | `0 30 0 * * *`                                                                                                                                                                                                 | 每天0:30           | 统计前一天各项业务数据，写入统计表，刷新仪表盘缓存     |
| 3    | 缓存预热     | `0 0 7 * * *`                                                                                                                                                                                                  | 每天7:00（工作前） | 预加载热点数据到Redis，含字典、产品、部门树等          |
| 4    | 合同到期预警 | `0 0 8 * * *`                                                                                                                                                                                                  | 每天8:00           | 扫描即将到期（7天/30天内）的合同，发送站内信和邮件通知 |
| 5    | 跟进提醒     | `0 0 9 * * *`                                                                                                                                                                                                  | 每天9:00           | 扫描设置了下次跟进日期为当天的客户，推送提醒给负责人   |
| 6    | 数据清理     | `0 0 3 \* \* API Error: Claude's response exceeded the 32000 output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.我从 3.7.2 定时任务列表的第6条继续。 |

---

| 序号 | 任务名称      | Cron 表达式                   | 执行时间                 | 说明                                                            |
| ---- | ------------- | ----------------------------- | ------------------------ | --------------------------------------------------------------- |
| 6    | 数据清理      | `0 0 3 * * 0`                 | 每周日凌晨3:00           | 清理过期的操作日志（保留90天）、临时文件、已完成的队列Job       |
| 7    | 周报/月报生成 | `0 0 1 * * 1` / `0 0 1 1 * *` | 每周一1:00 / 每月1日1:00 | 自动生成销售周报和月报，写入报表表并通知相关管理人员            |
| 8    | 线索评分更新  | `0 0 4 * * *`                 | 每天凌晨4:00             | 根据线索行为数据和规则引擎重新计算线索评分                      |
| 9    | 系统健康检查  | `0 */5 * * * *`               | 每5分钟                  | 检测MySQL/Redis/OSS连接状态、磁盘空间、队列积压情况，异常时告警 |

**定时任务实现示例（公海自动回收）：**

```typescript
// jobs/schedulers/high-seas-recycle.scheduler.ts
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CustomerRepository } from "@/modules/customer/customer.repository";
import { HighSeasService } from "@/modules/high-seas/high-seas.service";
import { LockService } from "@/shared/lock/lock.service";
import { CacheService } from "@/shared/cache/cache.service";
import { CACHE_KEY } from "@/common/constants/cache-key.constant";

@Injectable()
export class HighSeasRecycleScheduler {
  private readonly logger = new Logger(HighSeasRecycleScheduler.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly highSeasService: HighSeasService,
    private readonly lockService: LockService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 公海自动回收
   * 每天凌晨2:00执行，扫描超过N天未跟进的客户回收至公海池
   * 使用分布式锁防止多实例重复执行
   */
  @Cron("0 0 2 * * *", { name: "high-seas-recycle", timeZone: "Asia/Shanghai" })
  async handleRecycle(): Promise<void> {
    const lockKey = "scheduler:high-seas-recycle";

    const acquired = await this.lockService.acquire(lockKey, 600); // 锁定10分钟
    if (!acquired) {
      this.logger.warn("公海回收任务已在其他实例执行中，跳过本次");
      return;
    }

    try {
      this.logger.log("===== 公海自动回收任务开始 =====");
      const startTime = Date.now();

      // 获取各公海池的回收规则
      const rules = await this.highSeasService.getRecycleRules();
      let totalRecycled = 0;

      for (const rule of rules) {
        const maxIdleDays = rule.maxIdleDays; // 最大未跟进天数
        const batchSize = 100;
        let processed = 0;

        // 分批处理，避免大事务
        while (true) {
          const customers =
            await this.customerRepository.findRecyclableCustomers(
              maxIdleDays,
              batchSize,
            );

          if (customers.length === 0) break;

          for (const customer of customers) {
            try {
              // 检查是否在保护期内
              if (customer.transferredAt) {
                const protectDays = rule.protectDays || 7;
                const daysSinceTransfer = Math.ceil(
                  (Date.now() - customer.transferredAt.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                if (daysSinceTransfer <= protectDays) {
                  continue; // 保护期内不回收
                }
              }

              // 调用领域方法执行回收
              customer.moveToHighSeas();
              await this.customerRepository.save(customer);

              // 清除该客户的缓存
              await this.cacheService.del(
                `${CACHE_KEY.CUSTOMER_DETAIL}:${customer.id}`,
              );

              processed++;
            } catch (err) {
              this.logger.error(`回收客户 ${customer.id} 失败: ${err.message}`);
            }
          }

          totalRecycled += processed;

          // 避免CPU占满，每批次间暂停
          if (customers.length === batchSize) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // 清除客户列表缓存
      await this.cacheService.delByPattern(`${CACHE_KEY.CUSTOMER_LIST}:*`);

      const duration = Date.now() - startTime;
      this.logger.log(
        `===== 公海自动回收任务完成: 共回收 ${totalRecycled} 个客户，耗时 ${duration}ms =====`,
      );
    } catch (error) {
      this.logger.error("公海回收任务异常", error.stack);
    } finally {
      await this.lockService.release(lockKey);
    }
  }
}
```

**缓存预热任务示例：**

```typescript
// jobs/schedulers/cache-warmup.scheduler.ts
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CacheService } from "@/shared/cache/cache.service";
import { LockService } from "@/shared/lock/lock.service";
import { CACHE_KEY } from "@/common/constants/cache-key.constant";
import { DictService } from "@/modules/system/dict/dict.service";
import { DepartmentService } from "@/modules/system/department/department.service";
import { ProductService } from "@/modules/product/product.service";
import { RoleService } from "@/modules/system/role/role.service";

@Injectable()
export class CacheWarmupScheduler {
  private readonly logger = new Logger(CacheWarmupScheduler.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly lockService: LockService,
    private readonly dictService: DictService,
    private readonly departmentService: DepartmentService,
    private readonly productService: ProductService,
    private readonly roleService: RoleService,
  ) {}

  /**
   * 缓存预热 - 每天7:00执行
   * 在工作高峰来临前预加载热点数据
   */
  @Cron("0 0 7 * * *", { name: "cache-warmup", timeZone: "Asia/Shanghai" })
  async handleWarmup(): Promise<void> {
    const lockKey = "scheduler:cache-warmup";
    const acquired = await this.lockService.acquire(lockKey, 300);
    if (!acquired) return;

    try {
      this.logger.log("===== 缓存预热任务开始 =====");

      // 1. 预热数据字典
      const dictTypes = [
        "customer_source",
        "customer_status",
        "customer_level",
        "industry_type",
        "opportunity_stage",
        "contract_status",
        "follow_type",
        "follow_result",
      ];
      for (const type of dictTypes) {
        const data = await this.dictService.findByType(type);
        await this.cacheService.set(
          `${CACHE_KEY.DICT_DATA}:${type}`,
          data,
          86400,
        );
      }
      this.logger.log(`数据字典预热完成: ${dictTypes.length} 类`);

      // 2. 预热部门树
      const deptTree = await this.departmentService.getDeptTree();
      await this.cacheService.set(CACHE_KEY.DEPT_TREE, deptTree, 43200);
      this.logger.log("部门树预热完成");

      // 3. 预热产品列表
      const products = await this.productService.findAllActive();
      await this.cacheService.set(CACHE_KEY.PRODUCT_LIST, products, 7200);
      this.logger.log(`产品列表预热完成: ${products.length} 个产品`);

      // 4. 预热角色列表
      const roles = await this.roleService.findAll();
      await this.cacheService.set(CACHE_KEY.ROLE_LIST, roles, 43200);
      this.logger.log("角色列表预热完成");

      this.logger.log("===== 缓存预热任务完成 =====");
    } catch (error) {
      this.logger.error("缓存预热任务异常", error.stack);
    } finally {
      await this.lockService.release(lockKey);
    }
  }
}
```

#### 3.7.3 异步队列详细说明（5个）

| 序号 | 队列名称             | 并发数 | 超时时间 | 重试次数 | 说明                                                           |
| ---- | -------------------- | ------ | -------- | -------- | -------------------------------------------------------------- |
| 1    | `recording-process`  | 3      | 5min     | 3        | 通话录音上传后的转码、分段、转文字处理                         |
| 2    | `ai-analysis`        | 2      | 3min     | 3        | 调用AI大模型进行客户画像分析、话术评分、情感分析               |
| 3    | `email-notification` | 5      | 30s      | 5        | 邮件发送（合同到期、跟进提醒、系统通知、审批流）               |
| 4    | `data-export`        | 2      | 10min    | 2        | 大数据量导出（客户列表、通话记录、报表等），生成Excel/CSV      |
| 5    | `report-generate`    | 1      | 15min    | 2        | 复杂报表生成（销售漏斗、业绩排行、趋势分析），涉及大量聚合计算 |

**队列处理器实现示例（AI分析）：**

```typescript
// jobs/processors/ai-analysis.processor.ts
import {
  Process,
  Processor,
  OnQueueFailed,
  OnQueueCompleted,
} from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { QUEUE_NAMES } from "@/common/constants/queue.constant";

interface AiAnalysisJobData {
  type:
    | "CUSTOMER_PROFILE"
    | "CALL_ANALYSIS"
    | "LEAD_SCORING"
    | "SPEECH_SUGGEST";
  targetId: string; // 分析目标ID（客户ID/录音ID/线索ID）
  userId: string; // 发起分析的用户ID
  params?: Record<string, any>;
}

@Processor(QUEUE_NAMES.AI_ANALYSIS)
export class AiAnalysisProcessor {
  private readonly logger = new Logger(AiAnalysisProcessor.name);

  constructor(
    private readonly aiService: AiAnalysisService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process({ concurrency: 2 })
  async handleAnalysis(job: Job<AiAnalysisJobData>): Promise<any> {
    const { type, targetId, userId, params } = job.data;
    this.logger.log(
      `开始AI分析: type=${type}, targetId=${targetId}, jobId=${job.id}`,
    );

    // 更新进度
    await job.progress(10);

    let result: any;

    switch (type) {
      case "CUSTOMER_PROFILE":
        // 客户画像分析：收集客户所有交互数据 -> 调用AI生成画像
        result = await this.aiService.generateCustomerProfile(targetId);
        break;

      case "CALL_ANALYSIS":
        // 通话分析：获取通话转写文本 -> AI分析情感、关键词、评分
        result = await this.aiService.analyzeCallRecord(targetId);
        break;

      case "LEAD_SCORING":
        // 线索评分：收集线索行为数据 -> AI模型预测转化概率
        result = await this.aiService.scoreLead(targetId);
        break;

      case "SPEECH_SUGGEST":
        // 话术推荐：基于客户画像和当前阶段 -> AI推荐沟通话术
        result = await this.aiService.suggestSpeech(targetId, params);
        break;

      default:
        throw new Error(`未知的分析类型: ${type}`);
    }

    await job.progress(100);

    // 分析完成后发送站内通知
    await this.notificationService.sendInApp(userId, {
      title: "AI分析完成",
      content: `您提交的${this.getTypeLabel(type)}分析已完成`,
      link: `/ai-analysis/${result.id}`,
    });

    this.logger.log(`AI分析完成: jobId=${job.id}, resultId=${result.id}`);
    return result;
  }

  @OnQueueFailed()
  async onFailed(job: Job<AiAnalysisJobData>, error: Error): Promise<void> {
    this.logger.error(
      `AI分析任务失败: jobId=${job.id}, type=${job.data.type}, ` +
        `attempts=${job.attemptsMade}/${job.opts.attempts}, error=${error.message}`,
    );

    // 最终失败时通知用户
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await this.notificationService.sendInApp(job.data.userId, {
        title: "AI分析失败",
        content: `您提交的分析任务处理失败，请稍后重试`,
      });
    }
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<AiAnalysisJobData>): Promise<void> {
    this.logger.log(
      `AI分析Job完成: jobId=${job.id}, 耗时=${Date.now() - job.timestamp}ms`,
    );
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CUSTOMER_PROFILE: "客户画像",
      CALL_ANALYSIS: "通话分析",
      LEAD_SCORING: "线索评分",
      SPEECH_SUGGEST: "话术推荐",
    };
    return labels[type] || type;
  }
}
```

**数据导出队列处理器：**

```typescript
// jobs/processors/data-export.processor.ts
import { Process, Processor, OnQueueFailed } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import * as ExcelJS from "exceljs";
import { QUEUE_NAMES } from "@/common/constants/queue.constant";
import { OssService } from "@/modules/file/oss.service";
import { NotificationService } from "@/modules/notification/notification.service";

interface DataExportJobData {
  exportType: "CUSTOMER" | "CALL_RECORD" | "CONTRACT" | "REPORT";
  filters: Record<string, any>; // 导出筛选条件
  columns: string[]; // 导出列
  userId: string;
  fileName: string;
}

@Processor(QUEUE_NAMES.DATA_EXPORT)
export class DataExportProcessor {
  private readonly logger = new Logger(DataExportProcessor.name);

  constructor(
    private readonly ossService: OssService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process({ concurrency: 2 })
  async handleExport(
    job: Job<DataExportJobData>,
  ): Promise<{ url: string; fileSize: number }> {
    const { exportType, filters, columns, userId, fileName } = job.data;
    this.logger.log(`开始数据导出: type=${exportType}, jobId=${job.id}`);

    // 1. 流式查询数据并写入Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("数据导出");

    // 设置表头
    sheet.columns = columns.map((col) => ({
      header: col,
      key: col,
      width: 20,
    }));

    // 2. 分批查询数据，逐行写入（避免内存溢出）
    const batchSize = 1000;
    let offset = 0;
    let totalRows = 0;

    while (true) {
      const batch = await this.queryDataBatch(
        exportType,
        filters,
        offset,
        batchSize,
      );
      if (batch.length === 0) break;

      for (const row of batch) {
        sheet.addRow(row);
        totalRows++;
      }

      offset += batchSize;
      await job.progress(
        Math.min(90, Math.floor((offset / (offset + batchSize)) * 90)),
      );
    }

    // 3. 生成文件Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 4. 上传到OSS
    const ossPath = `exports/${userId}/${Date.now()}_${fileName}.xlsx`;
    const uploadResult = await this.ossService.uploadBuffer(
      Buffer.from(buffer as ArrayBuffer),
      ossPath,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await job.progress(100);

    // 5. 生成带签名的下载链接（有效期24小时）
    const downloadUrl = await this.ossService.generateSignedUrl(ossPath, 86400);

    // 6. 通知用户下载
    await this.notificationService.sendInApp(userId, {
      title: "数据导出完成",
      content: `您导出的${totalRows}条数据已准备就绪，请在24小时内下载`,
      link: downloadUrl,
    });

    this.logger.log(`数据导出完成: jobId=${job.id}, rows=${totalRows}`);

    return { url: downloadUrl, fileSize: (buffer as ArrayBuffer).byteLength };
  }

  @OnQueueFailed()
  async onFailed(job: Job<DataExportJobData>, error: Error): Promise<void> {
    this.logger.error(`数据导出失败: jobId=${job.id}, error=${error.message}`);

    if (job.attemptsMade >= (job.opts.attempts || 2)) {
      await this.notificationService.sendInApp(job.data.userId, {
        title: "数据导出失败",
        content: "导出任务处理失败，请稍后重试或联系管理员",
      });
    }
  }

  private async queryDataBatch(
    type: string,
    filters: Record<string, any>,
    offset: number,
    limit: number,
  ): Promise<any[]> {
    // 根据不同类型调用对应的Repository查询
    // 实际实现中通过依赖注入各模块的Repository
    return [];
  }
}
```

#### 3.7.4 任务失败重试策略

```typescript
// 各队列的差异化重试配置
const QUEUE_RETRY_CONFIG: Record<
  string,
  {
    attempts: number;
    backoff: { type: string; delay: number };
    timeout: number;
  }
> = {
  [QUEUE_NAMES.RECORDING_PROCESS]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 }, // 10s -> 20s -> 40s
    timeout: 300000, // 5分钟超时
  },
  [QUEUE_NAMES.AI_ANALYSIS]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 15000 }, // 15s -> 30s -> 60s
    timeout: 180000, // 3分钟超时
  },
  [QUEUE_NAMES.EMAIL_NOTIFICATION]: {
    attempts: 5,
    backoff: { type: "fixed", delay: 5000 }, // 固定5秒重试
    timeout: 30000, // 30秒超时
  },
  [QUEUE_NAMES.DATA_EXPORT]: {
    attempts: 2,
    backoff: { type: "exponential", delay: 30000 }, // 30s -> 60s
    timeout: 600000, // 10分钟超时
  },
  [QUEUE_NAMES.REPORT_GENERATE]: {
    attempts: 2,
    backoff: { type: "exponential", delay: 60000 }, // 60s -> 120s
    timeout: 900000, // 15分钟超时
  },
};
```

重试策略遵循以下原则：

- **指数退避（exponential）**：适用于外部服务调用（AI、OSS），避免在服务恢复初期造成重复冲击。
- **固定间隔（fixed）**：适用于简单的网络抖动场景（邮件发送），快速重试即可恢复。
- **重试次数递减**：耗时越长的任务，重试次数越少（导出2次 vs 邮件5次），避免长时间占用资源。
- **超时保护**：每类任务设定合理超时时间，防止僵死Job占用worker。

#### 3.7.5 死信队列处理

当任务达到最大重试次数后仍然失败，进入"failed"状态。系统通过监听器捕获最终失败的任务，记录至数据库并发送告警。

```typescript
// jobs/processors/dead-letter.handler.ts
import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue, Job } from "bull";
import { Cron } from "@nestjs/schedule";
import { QUEUE_NAMES } from "@/common/constants/queue.constant";
import { OperationLogService } from "@/modules/system/log/operation-log.service";
import { NotificationService } from "@/modules/notification/notification.service";

@Injectable()
export class DeadLetterHandler {
  private readonly logger = new Logger(DeadLetterHandler.name);
  private readonly queues: Queue[];

  constructor(
    @InjectQueue(QUEUE_NAMES.RECORDING_PROCESS) private recordingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.AI_ANALYSIS) private aiQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL_NOTIFICATION) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DATA_EXPORT) private exportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT_GENERATE) private reportQueue: Queue,
    private readonly logService: OperationLogService,
    private readonly notificationService: NotificationService,
  ) {
    this.queues = [
      this.recordingQueue,
      this.aiQueue,
      this.emailQueue,
      this.exportQueue,
      this.reportQueue,
    ];

    // 为每个队列注册全局失败监听
    for (const queue of this.queues) {
      queue.on("failed", (job: Job, err: Error) => {
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          this.handleDeadLetter(queue.name, job, err);
        }
      });
    }
  }

  /**
   * 处理死信（最终失败的任务）
   */
  private async handleDeadLetter(
    queueName: string,
    job: Job,
    error: Error,
  ): Promise<void> {
    this.logger.error(
      `[死信] 队列:${queueName}, JobId:${job.id}, ` +
        `重试:${job.attemptsMade}次, 错误:${error.message}`,
    );

    // 1. 记录到操作日志表（持久化）
    await this.logService.create({
      module: "QUEUE",
      action: "DEAD_LETTER",
      content: JSON.stringify({
        queueName,
        jobId: job.id,
        jobData: job.data,
        attempts: job.attemptsMade,
        error: error.message,
        stack: error.stack?.substring(0, 2000),
        failedAt: new Date().toISOString(),
      }),
      operatorId: "SYSTEM",
    });

    // 2. 发送告警通知给管理员
    await this.notificationService.sendToAdmins({
      title: `队列任务最终失败告警`,
      content: `队列 ${queueName} 中的任务 ${job.id} 经过 ${job.attemptsMade} 次重试后最终失败。\n错误: ${error.message}`,
      level: "ERROR",
    });
  }

  /**
   * 定时清理过期的失败任务（保留7天）
   * 每天凌晨4:30执行
   */
  @Cron("0 30 4 * * *", {
    name: "clean-dead-letters",
    timeZone: "Asia/Shanghai",
  })
  async cleanOldFailedJobs(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const queue of this.queues) {
      const failedJobs = await queue.getFailed();
      let cleaned = 0;

      for (const job of failedJobs) {
        if (job.finishedOn && job.finishedOn < sevenDaysAgo) {
          await job.remove();
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`清理队列 ${queue.name} 过期失败任务: ${cleaned} 个`);
      }
    }
  }
}
```

---

### 3.8 数据库连接与 ORM

#### 3.8.1 TypeORM 配置

```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";

export const databaseConfigFactory = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: "mysql",
  host: configService.get("DB_HOST", "127.0.0.1"),
  port: configService.get<number>("DB_PORT", 3306),
  username: configService.get("DB_USERNAME", "root"),
  password: configService.get("DB_PASSWORD", ""),
  database: configService.get("DB_DATABASE", "crm_db"),
  charset: "utf8mb4",

  // 实体加载
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  autoLoadEntities: true,

  // 同步与迁移
  synchronize: configService.get("NODE_ENV") === "development", // 仅开发环境自动同步
  migrationsRun: configService.get("NODE_ENV") === "production", // 生产环境自动运行迁移
  migrations: [__dirname + "/../database/migrations/*{.ts,.js}"],

  // 连接池配置
  extra: {
    connectionLimit: configService.get<number>("DB_POOL_SIZE", 20), // 最大连接数
    waitForConnections: true,
    queueLimit: 0, // 等待队列无上限
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000, // 30秒发起Keep-Alive
    connectTimeout: 10000, // 连接超时10秒
  },

  // 日志配置
  logging:
    configService.get("NODE_ENV") === "development"
      ? ["query", "error", "warn", "schema", "migration"]
      : ["error", "warn", "migration"],
  logger: "advanced-console",
  maxQueryExecutionTime: 3000, // 超过3秒的慢查询将被记录

  // 时区
  timezone: "+08:00",

  // 重连
  retryAttempts: 10,
  retryDelay: 3000,
});
```

```typescript
// app.module.ts (数据库模块注册)
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bull";
import { ClsModule } from "nestjs-cls";
import { databaseConfigFactory } from "./config/database.config";
import { bullConfigFactory } from "./config/bull.config";

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || "development"}`, ".env"],
    }),

    // CLS（Continuation Local Storage）- 请求上下文
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfigFactory,
    }),

    // Bull Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: bullConfigFactory,
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // ... 业务模块
  ],
})
export class AppModule {}
```

#### 3.8.2 Entity 基类设计

```typescript
// common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { ApiProperty, ApiHideProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";

/**
 * 实体基类
 * 所有业务实体均继承此类，统一提供：
 * - UUID主键
 * - 创建/更新时间（自动填充）
 * - 软删除支持
 * - 创建人/更新人审计字段
 */
export abstract class BaseEntity {
  @ApiProperty({
    description: "主键ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "创建时间" })
  @CreateDateColumn({
    name: "created_at",
    type: "datetime",
    precision: 3,
    comment: "创建时间",
  })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  @UpdateDateColumn({
    name: "updated_at",
    type: "datetime",
    precision: 3,
    comment: "更新时间",
  })
  updatedAt: Date;

  @ApiHideProperty()
  @Exclude()
  @DeleteDateColumn({
    name: "deleted_at",
    type: "datetime",
    nullable: true,
    comment: "删除时间（软删除）",
  })
  deletedAt: Date | null;

  @Column({
    name: "created_by",
    type: "varchar",
    length: 36,
    nullable: true,
    comment: "创建人ID",
  })
  createdBy: string;

  @Column({
    name: "updated_by",
    type: "varchar",
    length: 36,
    nullable: true,
    comment: "最后修改人ID",
  })
  updatedBy: string;
}
```

#### 3.8.3 软删除实现

TypeORM 通过 `@DeleteDateColumn` 装饰器和 `softRemove`/`softDelete` 方法实现软删除。当记录被软删除时，`deleted_at` 字段填充删除时间，而非真正从数据库中移除记录。所有默认查询会自动过滤已软删除的记录。

```typescript
// 软删除操作
async remove(id: string): Promise<void> {
  const entity = await this.repository.findOneBy({ id });
  if (!entity) {
    throw new BusinessException(ErrorCode.NOT_FOUND);
  }
  // softRemove 会填充 deletedAt 字段，不会物理删除
  await this.repository.softRemove(entity);
}

// 默认查询自动排除软删除记录
const customers = await this.customerRepository.find(); // 不含已删除

// 需要查询含软删除记录时
const allCustomers = await this.customerRepository.find({
  withDeleted: true,
});

// 仅查询已删除记录
const deletedCustomers = await this.customerRepository
  .createQueryBuilder('customer')
  .withDeleted()
  .where('customer.deletedAt IS NOT NULL')
  .getMany();

// 恢复软删除记录
async restore(id: string): Promise<void> {
  await this.customerRepository.restore(id); // 将 deletedAt 重置为 null
}
```

#### 3.8.4 审计订阅者（自动填充审计字段）

```typescript
// database/subscribers/audit.subscriber.ts
import {
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  EventSubscriber,
} from "typeorm";
import { ClsService } from "nestjs-cls";
import { Injectable } from "@nestjs/common";
import { BaseEntity } from "@/common/entities/base.entity";

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<BaseEntity> {
  constructor(private readonly clsService: ClsService) {}

  /**
   * 插入前自动填充 createdBy
   */
  beforeInsert(event: InsertEvent<BaseEntity>): void {
    const userId = this.getCurrentUserId();
    if (userId && event.entity) {
      event.entity.createdBy = userId;
      event.entity.updatedBy = userId;
    }
  }

  /**
   * 更新前自动填充 updatedBy
   */
  beforeUpdate(event: UpdateEvent<BaseEntity>): void {
    const userId = this.getCurrentUserId();
    if (userId && event.entity) {
      (event.entity as BaseEntity).updatedBy = userId;
    }
  }

  private getCurrentUserId(): string | null {
    try {
      return this.clsService.get("userId") || null;
    } catch {
      return null;
    }
  }
}
```

#### 3.8.5 查询构建器使用规范

```typescript
// 规范一：复杂查询统一使用 QueryBuilder，简单查询可用 find 方法
// 规范二：所有查询参数必须使用参数化绑定，严禁拼接SQL
// 规范三：大表查询必须指定索引条件，避免全表扫描
// 规范四：JOIN查询不超过3层，超过时考虑拆分或冗余

// 示例：复杂报表查询
async getSalesPerformance(
  departmentId: string,
  startDate: string,
  endDate: string,
): Promise<any[]> {
  return this.dataSource
    .createQueryBuilder()
    .select([
      'user.id AS userId',
      'user.real_name AS userName',
      'COUNT(DISTINCT customer.id) AS customerCount',
      'COUNT(DISTINCT opportunity.id) AS opportunityCount',
      'SUM(CASE WHEN contract.status = :signed THEN contract.amount ELSE 0 END) AS signedAmount',
      'COUNT(DISTINCT CASE WHEN contract.status = :signed THEN contract.id END) AS signedCount',
    ])
    .from('crm_user', 'user')
    .leftJoin('crm_customer', 'customer', 'customer.owner_id = user.id AND customer.deleted_at IS NULL')
    .leftJoin('crm_opportunity', 'opportunity', 'opportunity.owner_id = user.id AND opportunity.deleted_at IS NULL')
    .leftJoin('crm_contract', 'contract', 'contract.owner_id = user.id AND contract.deleted_at IS NULL')
    .where('user.department_id = :departmentId', { departmentId })
    .andWhere('user.deleted_at IS NULL')
    .andWhere(
      '(customer.created_at BETWEEN :startDate AND :endDate ' +
      'OR opportunity.created_at BETWEEN :startDate AND :endDate ' +
      'OR contract.created_at BETWEEN :startDate AND :endDate)',
      { startDate, endDate },
    )
    .setParameter('signed', 'SIGNED')
    .groupBy('user.id')
    .orderBy('signedAmount', 'DESC')
    .getRawMany();
}
```

---

### 3.9 文件上传设计

#### 3.9.1 文件上传架构

```
┌──────────┐     ┌──────────────────┐     ┌───────────────┐
│          │     │                  │     │               │
│  前端     │────>│  后端 NestJS      │────>│  阿里云 OSS    │
│          │     │                  │     │               │
│ 1.选择文件 │     │ 2.Multer接收      │     │ 4.持久化存储    │
│          │     │ 3.校验类型/大小    │     │ 5.返回URL      │
│          │     │ 6.记录file表      │     │               │
└──────────┘     └──────────────────┘     └───────────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │   MySQL          │
                  │   crm_file 表    │
                  │   记录文件元信息   │
                  └──────────────────┘
```

#### 3.9.2 Multer 配置

```typescript
// modules/file/file.module.ts
import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { memoryStorage } from "multer";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileController } from "./file.controller";
import { FileService } from "./file.service";
import { OssService } from "./oss.service";
import { FileEntity } from "./entities/file.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // 使用内存存储，文件直接流转到OSS，不落盘
        storage: memoryStorage(),
        limits: {
          fileSize: configService.get<number>(
            "UPLOAD_MAX_SIZE",
            50 * 1024 * 1024,
          ), // 默认50MB
          files: 10, // 单次最多10个文件
        },
        fileFilter: (_req: any, file: any, callback: any) => {
          // 文件类型白名单校验
          const allowedMimeTypes = [
            // 图片
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            // 文档
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            // 文本
            "text/plain",
            "text/csv",
            // 音频（通话录音）
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "audio/mp4",
            "audio/x-m4a",
            // 压缩包
            "application/zip",
            "application/x-rar-compressed",
          ];

          if (allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error(`不支持的文件类型: ${file.mimetype}`), false);
          }
        },
      }),
    }),
  ],
  controllers: [FileController],
  providers: [FileService, OssService],
  exports: [FileService, OssService],
})
export class FileModule {}
```

#### 3.9.3 文件类型与大小限制

| 文件类别 | 允许的扩展名                         | 最大大小 | 用途                   |
| -------- | ------------------------------------ | -------- | ---------------------- |
| 图片     | jpg, jpeg, png, gif, webp, svg       | 10MB     | 头像、合同扫描件、名片 |
| 文档     | pdf, doc, docx, xls, xlsx, ppt, pptx | 30MB     | 合同文件、方案文档     |
| 文本     | txt, csv                             | 10MB     | 客户数据导入           |
| 音频     | mp3, wav, ogg, m4a                   | 200MB    | 通话录音               |
| 压缩包   | zip, rar                             | 50MB     | 批量文件               |

#### 3.9.4 阿里云 OSS 集成

```typescript
// modules/file/oss.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OSS from "ali-oss";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import { LoggerService } from "@/shared/logger/logger.service";
import { BusinessException } from "@/common/exceptions/business.exception";
import { ErrorCode } from "@/common/exceptions/error-codes";

@Injectable()
export class OssService implements OnModuleInit {
  private client: OSS;
  private bucket: string;
  private region: string;
  private cdnDomain: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(OssService.name);
  }

  onModuleInit(): void {
    this.bucket = this.configService.get("OSS_BUCKET");
    this.region = this.configService.get("OSS_REGION");
    this.cdnDomain = this.configService.get("OSS_CDN_DOMAIN", "");

    this.client = new OSS({
      region: this.region,
      accessKeyId: this.configService.get("OSS_ACCESS_KEY_ID"),
      accessKeySecret: this.configService.get("OSS_ACCESS_KEY_SECRET"),
      bucket: this.bucket,
      timeout: 60000, // 上传超时60秒
      secure: true, // HTTPS
    });
  }

  /**
   * 上传文件Buffer到OSS
   * @param buffer 文件Buffer
   * @param objectKey OSS对象路径
   * @param mimeType MIME类型
   * @returns OSS存储路径
   */
  async uploadBuffer(
    buffer: Buffer,
    objectKey: string,
    mimeType: string,
  ): Promise<{ objectKey: string; url: string; size: number }> {
    try {
      const result = await this.client.put(objectKey, buffer, {
        mime: mimeType,
        headers: {
          "Cache-Control": "max-age=31536000", // CDN缓存1年（文件名含UUID不会重复）
          "Content-Disposition": "inline",
        },
      });

      const url = this.cdnDomain
        ? `${this.cdnDomain}/${objectKey}`
        : result.url;

      this.logger.info("文件上传成功", { objectKey, size: buffer.length });

      return {
        objectKey,
        url,
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error("OSS上传失败", error);
      throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED, error.message);
    }
  }

  /**
   * 生成带签名的临时访问URL
   * @param objectKey OSS对象路径
   * @param expiresInSeconds 有效期（秒）
   * @returns 签名URL
   */
  async generateSignedUrl(
    objectKey: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    try {
      const url = this.client.signatureUrl(objectKey, {
        expires: expiresInSeconds,
        process: undefined,
      });
      return url;
    } catch (error) {
      this.logger.error("生成签名URL失败", error);
      throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
    }
  }

  /**
   * 生成图片处理URL（OSS图片处理服务）
   * @param objectKey 原始图片路径
   * @param style 处理参数
   */
  generateImageProcessUrl(
    objectKey: string,
    style: { width?: number; height?: number; quality?: number },
  ): string {
    const params: string[] = [];
    if (style.width || style.height) {
      params.push(
        `image/resize,m_lfit${style.width ? `,w_${style.width}` : ""}${style.height ? `,h_${style.height}` : ""}`,
      );
    }
    if (style.quality) {
      params.push(`image/quality,q_${style.quality}`);
    }

    const process = params.join("/");
    const baseUrl = this.cdnDomain
      ? `${this.cdnDomain}/${objectKey}`
      : `https://${this.bucket}.${this.region}.aliyuncs.com/${objectKey}`;

    return process ? `${baseUrl}?x-oss-process=${process}` : baseUrl;
  }

  /**
   * 删除OSS文件
   */
  async deleteObject(objectKey: string): Promise<void> {
    try {
      await this.client.delete(objectKey);
      this.logger.info("OSS文件删除成功", { objectKey });
    } catch (error) {
      this.logger.warn("OSS文件删除失败", { objectKey, error: error.message });
    }
  }

  /**
   * 生成上传目录路径
   * 格式: {category}/{yyyy}/{MM}/{dd}/{uuid}{ext}
   */
  generateObjectKey(category: string, originalName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const ext = path.extname(originalName).toLowerCase();
    const uuid = uuidv4().replace(/-/g, "");

    return `${category}/${year}/${month}/${day}/${uuid}${ext}`;
  }
}
```

#### 3.9.5 文件上传控制器与服务

```typescript
// modules/file/file.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { FileService } from "./file.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { IJwtPayload } from "@/common/interfaces/jwt-payload.interface";

@ApiTags("文件管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("files")
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post("upload")
  @ApiOperation({ summary: "单文件上传" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary", description: "上传文件" },
        category: {
          type: "string",
          description: "文件分类",
          enum: ["avatar", "contract", "recording", "document", "import"],
        },
      },
      required: ["file", "category"],
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.CREATED)
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Query("category") category: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.fileService.upload(file, category, user);
  }

  @Post("upload/batch")
  @ApiOperation({ summary: "批量文件上传（最多10个）" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("files", 10))
  @HttpCode(HttpStatus.CREATED)
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Query("category") category: string,
    @CurrentUser() user: IJwtPayload,
  ) {
    return this.fileService.uploadBatch(files, category, user);
  }

  @Get(":id/signed-url")
  @ApiOperation({ summary: "获取文件签名下载链接" })
  @ApiResponse({
    status: 200,
    schema: { properties: { url: { type: "string" } } },
  })
  async getSignedUrl(
    @Param("id") id: string,
    @Query("expires") expires: number = 3600,
  ) {
    return this.fileService.getSignedUrl(id, expires);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除文件" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string, @CurrentUser() user: IJwtPayload) {
    return this.fileService.remove(id, user);
  }
}
```

```typescript
// modules/file/file.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FileEntity } from "./entities/file.entity";
import { OssService } from "./oss.service";
import { LoggerService } from "@/shared/logger/logger.service";
import { BusinessException } from "@/common/exceptions/business.exception";
import { ErrorCode } from "@/common/exceptions/error-codes";
import { IJwtPayload } from "@/common/interfaces/jwt-payload.interface";

// 各分类的大小限制（字节）
const CATEGORY_SIZE_LIMITS: Record<string, number> = {
  avatar: 10 * 1024 * 1024, // 头像 10MB
  contract: 30 * 1024 * 1024, // 合同 30MB
  recording: 200 * 1024 * 1024, // 录音 200MB
  document: 30 * 1024 * 1024, // 文档 30MB
  import: 10 * 1024 * 1024, // 导入 10MB
};

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly ossService: OssService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(FileService.name);
  }

  /**
   * 单文件上传
   */
  async upload(
    file: Express.Multer.File,
    category: string,
    user: IJwtPayload,
  ): Promise<FileEntity> {
    // 1. 校验分类
    if (!CATEGORY_SIZE_LIMITS[category]) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `不支持的文件分类: ${category}`,
      );
    }

    // 2. 校验文件大小
    const maxSize = CATEGORY_SIZE_LIMITS[category];
    if (file.size > maxSize) {
      throw new BusinessException(
        ErrorCode.FILE_SIZE_EXCEEDED,
        `${category}类文件最大允许 ${Math.round(maxSize / 1024 / 1024)}MB`,
      );
    }

    // 3. 生成OSS路径并上传
    const objectKey = this.ossService.generateObjectKey(
      category,
      file.originalname,
    );
    const uploadResult = await this.ossService.uploadBuffer(
      file.buffer,
      objectKey,
      file.mimetype,
    );

    // 4. 保存文件记录到数据库
    const fileEntity = this.fileRepository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      objectKey: uploadResult.objectKey,
      url: uploadResult.url,
      category,
      uploaderId: user.userId,
      uploaderName: user.username,
    });

    const saved = await this.fileRepository.save(fileEntity);

    this.logger.info("文件上传成功", {
      fileId: saved.id,
      originalName: file.originalname,
      size: file.size,
      category,
      operator: user.userId,
    });

    return saved;
  }

  /**
   * 批量上传
   */
  async uploadBatch(
    files: Express.Multer.File[],
    category: string,
    user: IJwtPayload,
  ): Promise<FileEntity[]> {
    const results: FileEntity[] = [];
    for (const file of files) {
      const result = await this.upload(file, category, user);
      results.push(result);
    }
    return results;
  }

  /**
   * 获取签名下载URL
   */
  async getSignedUrl(
    fileId: string,
    expiresInSeconds: number = 3600,
  ): Promise<{ url: string; expiresAt: string }> {
    const file = await this.fileRepository.findOneBy({ id: fileId });
    if (!file) {
      throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
    }

    const url = await this.ossService.generateSignedUrl(
      file.objectKey,
      expiresInSeconds,
    );
    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();

    return { url, expiresAt };
  }

  /**
   * 删除文件（软删除数据库记录 + 异步删除OSS文件）
   */
  async remove(fileId: string, user: IJwtPayload): Promise<void> {
    const file = await this.fileRepository.findOneBy({ id: fileId });
    if (!file) {
      throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
    }

    // 软删除数据库记录
    await this.fileRepository.softRemove(file);

    // 异步删除OSS文件（不阻塞响应）
    this.ossService.deleteObject(file.objectKey).catch((err) => {
      this.logger.warn("异步删除OSS文件失败", {
        objectKey: file.objectKey,
        error: err.message,
      });
    });

    this.logger.info("文件删除成功", { fileId, operator: user.userId });
  }
}
```

#### 3.9.6 文件实体定义

```typescript
// modules/file/entities/file.entity.ts
import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@/common/entities/base.entity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("crm_file")
@Index("idx_file_uploader", ["uploaderId"])
@Index("idx_file_category", ["category"])
export class FileEntity extends BaseEntity {
  @ApiProperty({ description: "原始文件名" })
  @Column({
    name: "original_name",
    type: "varchar",
    length: 255,
    comment: "原始文件名",
  })
  originalName: string;

  @ApiProperty({ description: "MIME类型" })
  @Column({
    name: "mime_type",
    type: "varchar",
    length: 100,
    comment: "MIME类型",
  })
  mimeType: string;

  @ApiProperty({ description: "文件大小（字节）" })
  @Column({ type: "bigint", comment: "文件大小（字节）" })
  size: number;

  @ApiProperty({ description: "OSS对象Key" })
  @Column({
    name: "object_key",
    type: "varchar",
    length: 500,
    comment: "OSS对象路径",
  })
  objectKey: string;

  @ApiProperty({ description: "文件访问URL" })
  @Column({
    type: "varchar",
    length: 1000,
    comment: "文件URL（公开或CDN地址）",
  })
  url: string;

  @ApiProperty({ description: "文件分类" })
  @Column({
    type: "varchar",
    length: 50,
    comment: "文件分类: avatar/contract/recording/document/import",
  })
  category: string;

  @Column({
    name: "uploader_id",
    type: "varchar",
    length: 36,
    comment: "上传者ID",
  })
  uploaderId: string;

  @Column({
    name: "uploader_name",
    type: "varchar",
    length: 50,
    comment: "上传者姓名",
  })
  uploaderName: string;
}
```

#### 3.9.7 OSS 存储目录规划

```
crm-bucket/
├── avatar/                 # 用户头像
│   └── 2026/03/03/
│       └── {uuid}.jpg
├── contract/               # 合同文件
│   └── 2026/03/03/
│       └── {uuid}.pdf
├── recording/              # 通话录音
│   └── 2026/03/03/
│       └── {uuid}.mp3
├── document/               # 业务文档
│   └── 2026/03/03/
│       └── {uuid}.docx
├── import/                 # 导入文件
│   └── 2026/03/03/
│       └── {uuid}.xlsx
└── exports/                # 系统导出文件
    └── {userId}/
        └── {timestamp}_{filename}.xlsx
```

OSS Bucket 访问策略：

- **avatar** 目录设置为公共读，通过 CDN 加速访问。
- **contract / recording / document** 目录设置为私有读写，所有访问必须通过后端生成的签名 URL。
- **exports** 目录设置为私有，签名 URL 有效期 24 小时，过期后文件由定时任务清理。

---

以上为"AI智能CRM销售管理系统详细设计文档"第3章《后端设计规范》的完整内容。该章节覆盖了从项目结构、四层架构、中间件、异常处理、日志、缓存、任务队列、数据库 ORM 到文件上传的全部后端基础设施设计，每个子章节均包含架构说明、配置代码和业务代码示例，可直接作为开发团队的实施参考。
