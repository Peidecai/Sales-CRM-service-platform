# 跟进记录模块规范 (FollowUp Records Module)

## 模块信息

**Team**: TM-E（建议新增团队）
**模块**: 跟进记录 (FollowUp Records)
**当前状态**: ❌ 完全缺失 — 无任何代码文件
**路径规划**:

- 后端: `packages/server/src/modules/follow-up/`
- 前端: `packages/web/src/views/follow-up/` 和 `packages/web/src/api/follow-up.ts`

---

## 功能需求

跟进记录是 CRM 系统的核心功能，记录销售员与客户之间的每次沟通/拜访行为。

### 核心功能列表

1. 创建跟进记录（文字 + 跟进方式 + 下次跟进计划）
2. 查看某客户的所有跟进记录（时间轴视图）
3. 查看个人所有跟进记录（日报视图）
4. 跟进记录编辑与软删除（仅创建者和管理员）
5. 查看未完成的跟进计划（待跟进提醒）

---

## 后端实现规范

### 1. 数据库迁移文件

**文件**: `packages/server/database/migrations/{timestamp}-create-follow-up-table.ts`

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class CreateFollowUpTable{timestamp} implements MigrationInterface {
  name = 'CreateFollowUpTable{timestamp}'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'follow_ups',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customer_id', type: 'int', isNullable: false, comment: '关联客户 ID' },
          { name: 'user_id', type: 'int', isNullable: false, comment: '跟进销售员 ID' },
          { name: 'type', type: 'enum', enum: ['call', 'visit', 'email', 'wechat', 'other'], default: "'call'", comment: '跟进方式' },
          { name: 'content', type: 'text', isNullable: false, comment: '跟进内容' },
          { name: 'next_follow_up_date', type: 'date', isNullable: true, comment: '下次跟进日期' },
          { name: 'next_follow_up_note', type: 'varchar', length: '500', isNullable: true, comment: '下次跟进备注' },
          { name: 'deleted', type: 'tinyint', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          { columnNames: ['customer_id'] },
          { columnNames: ['user_id'] },
          { columnNames: ['next_follow_up_date'] },
        ],
      }),
      true,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('follow_ups')
  }
}
```

### 2. 实体 — `follow-up.entity.ts`

```typescript
// packages/server/src/modules/follow-up/follow-up.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { Customer } from '../customer/customer.entity'
import { User } from '../user/user.entity'

export enum FollowUpType {
  CALL = 'call',
  VISIT = 'visit',
  EMAIL = 'email',
  WECHAT = 'wechat',
  OTHER = 'other',
}

@Entity('follow_ups')
export class FollowUp extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id' })
  customerId!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @Column({ type: 'enum', enum: FollowUpType, default: FollowUpType.CALL })
  type!: FollowUpType

  @Column({ type: 'text' })
  content!: string

  @Column({ name: 'next_follow_up_date', type: 'date', nullable: true })
  nextFollowUpDate?: Date

  @Column({ name: 'next_follow_up_note', length: 500, nullable: true })
  nextFollowUpNote?: string

  // Relations (optional load)
  @ManyToOne(() => Customer, { lazy: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'user_id' })
  user?: User
}
```

### 3. DTOs

**`create-follow-up.dto.ts`**:

```typescript
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { FollowUpType } from '../follow-up.entity'
import { Type } from 'class-transformer'
import { IsDateString } from 'class-validator'

export class CreateFollowUpDto {
  @ApiProperty({ description: '关联客户 ID' })
  @IsInt()
  @IsPositive()
  customerId!: number

  @ApiProperty({ enum: FollowUpType, description: '跟进方式' })
  @IsEnum(FollowUpType)
  type!: FollowUpType

  @ApiProperty({ description: '跟进内容', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string

  @ApiPropertyOptional({ description: '下次跟进日期 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string

  @ApiPropertyOptional({ description: '下次跟进备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextFollowUpNote?: string
}
```

**`query-follow-up.dto.ts`**:

```typescript
import { IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { FollowUpType } from '../follow-up.entity'

export class QueryFollowUpDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customerId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId?: number

  @IsOptional()
  @IsEnum(FollowUpType)
  type?: FollowUpType

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}
```

### 4. Service — `follow-up.service.ts`

```typescript
@Injectable()
export class FollowUpService {
  constructor(
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateFollowUpDto, userId: number): Promise<FollowUp> {
    const followUp = this.followUpRepo.create({ ...dto, userId })
    const saved = await this.followUpRepo.save(followUp)
    // 失效客户跟进列表缓存
    await this.redisService.delByPattern(`cache:follow-ups:customer:${dto.customerId}:*`)
    return saved
  }

  async findByCustomer(
    customerId: number,
    query: QueryFollowUpDto,
    user: AuthUser,
  ): Promise<{ list: FollowUp[]; total: number }> {
    const cacheKey = `cache:follow-ups:customer:${customerId}:${JSON.stringify(query)}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const { page = 1, pageSize = 20 } = query
    const [list, total] = await this.followUpRepo.findAndCount({
      where: { customerId, deleted: false },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const result = { list, total }
    await this.redisService.set(cacheKey, JSON.stringify(result), 60)
    return result
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const followUp = await this.followUpRepo.findOne({ where: { id, deleted: false } })
    if (!followUp) throw new NotFoundException(`FollowUp with ID ${id} not found`)

    // 仅创建者和 admin/manager 可删除
    if (user.role === UserRole.SALES && followUp.userId !== user.id) {
      throw new ForbiddenException('您无权删除此跟进记录')
    }

    followUp.deleted = true
    await this.followUpRepo.save(followUp)
    await this.redisService.delByPattern(`cache:follow-ups:customer:${followUp.customerId}:*`)
  }
}
```

### 5. Controller — `follow-up.controller.ts`

```typescript
@ApiTags('跟进记录')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('follow-ups')
export class FollowUpController {
  constructor(
    private readonly followUpService: FollowUpService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFollowUpDto, @CurrentUser() user: AuthUser) {
    return this.followUpService.create(dto, user.id)
  }

  @Get()
  async findAll(@Query() query: QueryFollowUpDto, @CurrentUser() user: AuthUser) {
    // SALES 只看自己的跟进记录（或通过 customerId 查看自己客户的）
    if (user.role === UserRole.SALES && !query.customerId) {
      query.userId = user.id
    }
    const customerId = query.customerId
    if (!customerId) throw new BadRequestException('customerId 为必填参数')
    return this.followUpService.findByCustomer(customerId, query, user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.followUpService.remove(id, user)
    return null
  }
}
```

### 6. 模块注册 — `follow-up.module.ts`

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([FollowUp])],
  controllers: [FollowUpController],
  providers: [FollowUpService],
  exports: [FollowUpService],
})
export class FollowUpModule {}
```

**在 `AppModule` 中注册**:

```typescript
import { FollowUpModule } from './modules/follow-up/follow-up.module'

@Module({
  imports: [
    // ... 其他模块
    FollowUpModule,
  ],
})
export class AppModule {}
```

---

## 前端实现规范

### 7. API 封装 — `packages/web/src/api/follow-up.ts`

```typescript
import request from './request'

export type FollowUpType = 'call' | 'visit' | 'email' | 'wechat' | 'other'

export const FOLLOW_UP_TYPE_LABELS: Record<FollowUpType, string> = {
  call: '电话',
  visit: '拜访',
  email: '邮件',
  wechat: '微信',
  other: '其他',
}

export interface FollowUpVO {
  id: number
  customerId: number
  userId: number
  type: FollowUpType
  content: string
  nextFollowUpDate?: string
  nextFollowUpNote?: string
  createdAt: string
  user?: { id: number; name: string }
}

export interface CreateFollowUpParams {
  customerId: number
  type: FollowUpType
  content: string
  nextFollowUpDate?: string
  nextFollowUpNote?: string
}

export const followUpApi = {
  getList(params: { customerId: number; page?: number; pageSize?: number }) {
    return request.get<{ list: FollowUpVO[]; total: number }>('/follow-ups', { params })
  },
  create(params: CreateFollowUpParams) {
    return request.post<FollowUpVO>('/follow-ups', params)
  },
  remove(id: number) {
    return request.delete<null>(`/follow-ups/${id}`)
  },
}
```

### 8. 前端组件集成 — 客户详情页

在 `packages/web/src/views/customer/detail.vue` 的「跟进记录」Tab 中集成：

```vue
<el-tab-pane label="跟进记录" name="followUp">
  <!-- 新增按钮 -->
  <div style="margin-bottom: 12px;">
    <el-button type="primary" @click="showAddFollowUp = true">新增跟进</el-button>
  </div>

  <!-- 时间轴展示 -->
  <el-timeline>
    <el-timeline-item
      v-for="item in followUps"
      :key="item.id"
      :timestamp="new Date(item.createdAt).toLocaleString()"
      placement="top"
    >
      <el-card>
        <div class="follow-up-header">
          <el-tag size="small">{{ FOLLOW_UP_TYPE_LABELS[item.type] }}</el-tag>
          <span style="margin-left: 8px; color: #666;">{{ item.user?.name }}</span>
        </div>
        <p style="margin: 8px 0;">{{ item.content }}</p>
        <div v-if="item.nextFollowUpDate" style="color: #999; font-size: 12px;">
          下次跟进：{{ item.nextFollowUpDate }}
          <span v-if="item.nextFollowUpNote">— {{ item.nextFollowUpNote }}</span>
        </div>
      </el-card>
    </el-timeline-item>
    <div v-if="followUps.length === 0" style="text-align: center; color: #999; padding: 24px;">
      暂无跟进记录
    </div>
  </el-timeline>
</el-tab-pane>

<!-- 新增跟进对话框 -->
<el-dialog v-model="showAddFollowUp" title="新增跟进记录" width="520px">
  <el-form :model="followUpForm" :rules="followUpRules" ref="followUpFormRef" label-width="90px">
    <el-form-item label="跟进方式" prop="type">
      <el-select v-model="followUpForm.type">
        <el-option v-for="(label, key) in FOLLOW_UP_TYPE_LABELS" :key="key" :label="label" :value="key" />
      </el-select>
    </el-form-item>
    <el-form-item label="跟进内容" prop="content">
      <el-input v-model="followUpForm.content" type="textarea" :rows="4" maxlength="2000" show-word-limit />
    </el-form-item>
    <el-form-item label="下次跟进">
      <el-date-picker v-model="followUpForm.nextFollowUpDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
    </el-form-item>
    <el-form-item label="跟进备注">
      <el-input v-model="followUpForm.nextFollowUpNote" maxlength="500" show-word-limit />
    </el-form-item>
  </el-form>
  <template #footer>
    <el-button @click="showAddFollowUp = false">取消</el-button>
    <el-button type="primary" :loading="followUpLoading" @click="submitFollowUp">保存</el-button>
  </template>
</el-dialog>
```

---

## API 端点清单

| 方法   | 路径                            | 描述         | 权限                   |
| ------ | ------------------------------- | ------------ | ---------------------- |
| POST   | /api/v1/follow-ups              | 创建跟进记录 | 全部已登录用户         |
| GET    | /api/v1/follow-ups?customerId=1 | 查询跟进列表 | 全部（SALES 数据隔离） |
| DELETE | /api/v1/follow-ups/:id          | 软删除       | 创建者 + ADMIN/MANAGER |

---

## Redis 缓存规范

| Key 前缀                           | TTL | 失效时机      |
| ---------------------------------- | --- | ------------- |
| `cache:follow-ups:customer:{id}:*` | 60s | create/delete |

---

## 测试规范

### 后端单元测试

**文件**: `packages/server/test/follow-up/follow-up.service.spec.ts`

```typescript
describe('FollowUpService', () => {
  describe('create', () => {
    it('应成功创建跟进记录并关联 userId', async () => { ... })
    it('应在创建后失效客户跟进缓存', async () => { ... })
  })

  describe('findByCustomer', () => {
    it('应按 customerId 过滤并分页返回', async () => { ... })
    it('命中缓存时应直接返回缓存数据', async () => { ... })
  })

  describe('remove', () => {
    it('创建者可以删除自己的跟进记录', async () => { ... })
    it('SALES 删除他人记录应抛出 ForbiddenException', async () => { ... })
    it('记录不存在应抛出 NotFoundException', async () => { ... })
  })
})
```

### 运行命令

```bash
cd packages/server
cmd /c pnpm test -- --runInBand test/follow-up/
```

### 手动验证步骤

```bash
# 1. 以 sales01 登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"sales01","password":"sales123"}' | python -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# 2. 创建跟进记录
curl -X POST http://localhost:3000/api/v1/follow-ups \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"customerId": 1, "type": "call", "content": "电话沟通了产品需求，客户感兴趣", "nextFollowUpDate": "2026-03-14"}'
# 期望: { "code": 0, "data": { "id": 1, ... } }

# 3. 查询客户跟进记录
curl http://localhost:3000/api/v1/follow-ups?customerId=1 \
  -H "Authorization: Bearer $TOKEN"
# 期望: { "code": 0, "data": { "list": [...], "total": 1 } }
```
