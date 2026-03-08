# 客户分配功能补全规范 (Customer Allocation Feature)

## 功能说明

**当前状态**: 缺失
**优先级**: P1（核心 CRUD 补全）
**影响范围**: 后端 `customer` 模块 + 前端 `customer/index.vue` + `customer/detail.vue`

客户分配允许 Admin / Manager 将客户重新分配给其他销售员。当前代码中 `CLAUDE.md` 已声明此功能，但 `CustomerController` 和 `CustomerService` 均未实现对应端点和方法。

---

## 后端实现规范

### 1. DTO — `allocate-customer.dto.ts`

**文件路径**: `packages/server/src/modules/customer/dto/allocate-customer.dto.ts`

```typescript
import { IsInt, IsPositive } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AllocateCustomerDto {
  @ApiProperty({ description: '目标销售员用户 ID', example: 2 })
  @IsInt()
  @IsPositive()
  assignedUserId!: number
}
```

**约束规则**:

- `assignedUserId` 必须为正整数
- Service 层需验证目标用户存在且 `isActive = true`
- Service 层需验证目标用户 role 为 `sales` 或 `manager`（不能分配给 admin 以外的高权限用户是业务选择，可按需调整）

---

### 2. Service 方法 — `customer.service.ts`

在 `CustomerService` 中添加 `allocate` 方法：

```typescript
// 在 constructor 中注入 UserRepository（或通过 UserService）
constructor(
  @InjectRepository(Customer)
  private readonly customerRepository: Repository<Customer>,
  private readonly redisService: RedisService,
  @InjectRepository(User)                    // ← 新增
  private readonly userRepository: Repository<User>,  // ← 新增
) {}

/**
 * 重新分配客户负责人
 * @param id 客户 ID
 * @param dto 包含目标用户 ID
 * @param operator 操作人（用于审计 / 通知）
 */
async allocate(
  id: number,
  dto: AllocateCustomerDto,
  operator: AuthUser,
): Promise<Customer> {
  // 1. 验证客户存在（不传 user，跳过 SALES 数据隔离，允许 admin/manager 跨用户操作）
  const customer = await this.customerRepository.findOne({
    where: { id, deleted: false },
  })
  if (!customer) {
    throw new NotFoundException(`Customer with ID ${id} not found`)
  }

  // 2. 验证目标用户存在且激活
  const targetUser = await this.userRepository.findOne({
    where: { id: dto.assignedUserId, deleted: false, isActive: true },
  })
  if (!targetUser) {
    throw new BadRequestException(`用户 ID ${dto.assignedUserId} 不存在或已停用`)
  }

  // 3. 执行分配
  const previousUserId = customer.assignedUserId
  customer.assignedUserId = dto.assignedUserId
  const saved = await this.customerRepository.save(customer)

  // 4. 失效缓存
  await this.invalidateListCache()
  await this.invalidateDetailCache(id)

  // 5. 记录分配历史（扩展：可在 customer 上维护 allocationHistory JSON 字段）
  // 当前版本通过 AuditLogInterceptor 自动记录，无需额外操作

  return saved
}
```

**注意**: `CustomerModule` 需要在 `imports` 中添加 `TypeOrmModule.forFeature([Customer, User])`，或从 `UserModule` 导出 `UserRepository`。推荐直接在 `CustomerModule` 导入 `User` 实体，避免模块循环依赖。

---

### 3. Controller 端点 — `customer.controller.ts`

在 `CustomerController` 中添加端点（位于 `@Put(':id')` 之后）：

```typescript
import { AllocateCustomerDto } from './dto/allocate-customer.dto'

@Put(':id/assign')
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Reassign customer to another sales user' })
@ApiParam({ name: 'id', description: 'Customer ID', type: Number })
@ApiResponse({ status: 200, description: 'Customer reassigned successfully' })
@ApiResponse({ status: 400, description: 'Target user not found or inactive' })
@ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
@ApiResponse({ status: 404, description: 'Customer not found' })
async allocate(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: AllocateCustomerDto,
  @CurrentUser() user: AuthUser,
) {
  const customer = await this.customerService.allocate(id, dto, user)
  // 发送通知（广播，其他人可见分配动作）
  this.notificationService.customerUpdated(
    user.id,
    user.username,
    customer.id,
    customer.name,
  )
  return customer
}
```

**RBAC**: 仅 `ADMIN` 和 `MANAGER` 可执行分配，`SALES` 无此权限。

---

### 4. 同步修复 — `customer.controller.ts` 中缺失的 customerUpdated 通知

当前 `update()` 方法未调用 `notificationService.customerUpdated()`，需补充：

```typescript
// 现有代码（修改前）:
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateCustomerDto,
  @CurrentUser() user: AuthUser,
) {
  return this.customerService.update(id, dto, user)
}

// 修改后（添加通知）:
async update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateCustomerDto,
  @CurrentUser() user: AuthUser,
) {
  const customer = await this.customerService.update(id, dto, user)
  this.notificationService.customerUpdated(user.id, user.username, customer.id, customer.name)
  return customer
}
```

---

### 5. 模块注册 — `customer.module.ts`

确认 `TypeOrmModule.forFeature` 包含 `User` 实体：

```typescript
import { User } from '../user/user.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, User]),  // ← 添加 User
    ...
  ],
  ...
})
export class CustomerModule {}
```

---

## 前端实现规范

### 6. API 层 — `packages/web/src/api/customer.ts`

新增 `allocate` 方法：

```typescript
/** 客户分配请求参数 */
export interface AllocateCustomerParams {
  assignedUserId: number
}

// 在 customerApi 对象中添加:
allocate(id: number, params: AllocateCustomerParams) {
  return request.put<CustomerVO>(`/customers/${id}/assign`, params)
},
```

---

### 7. 前端 UI — 客户列表页 `packages/web/src/views/customer/index.vue`

在操作列添加「分配」按钮（仅 admin/manager 可见），点击打开分配对话框：

```vue
<!-- 操作列内，删除按钮旁 -->
<el-button
  v-if="isAdminOrManager"
  link
  type="primary"
  size="small"
  @click="openAllocateDialog(row)"
>
  分配
</el-button>

<!-- 分配对话框 -->
<el-dialog v-model="allocateVisible" title="分配客户" width="400px" :close-on-click-modal="false">
  <el-form :model="allocateForm" label-width="80px">
    <el-form-item label="客户">
      <span>{{ allocateTarget?.name }}</span>
    </el-form-item>
    <el-form-item label="分配给" required>
      <el-select
        v-model="allocateForm.assignedUserId"
        placeholder="请选择销售员"
        filterable
        style="width: 100%"
      >
        <el-option
          v-for="u in salesUserList"
          :key="u.id"
          :label="u.name"
          :value="u.id"
        />
      </el-select>
    </el-form-item>
  </el-form>
  <template #footer>
    <el-button @click="allocateVisible = false">取消</el-button>
    <el-button type="primary" :loading="allocateLoading" @click="handleAllocate">
      确定
    </el-button>
  </template>
</el-dialog>
```

**Script 逻辑** (`<script setup>`):

```typescript
import { customerApi } from '@/api/customer'
import { userApi } from '@/api/user' // 需要获取用户列表
import { usePermission } from '@/composables/usePermission'

const { isAdminOrManager } = usePermission()

// 分配对话框状态
const allocateVisible = ref(false)
const allocateTarget = ref<CustomerVO | null>(null)
const allocateLoading = ref(false)
const allocateForm = reactive({ assignedUserId: 0 })
const salesUserList = ref<{ id: number; name: string }[]>([])

async function openAllocateDialog(row: CustomerVO) {
  allocateTarget.value = row
  allocateForm.assignedUserId = row.assignedUserId
  allocateVisible.value = true

  // 加载销售员列表（仅加载一次）
  if (salesUserList.value.length === 0) {
    const res = await userApi.getList({ pageSize: 200 })
    salesUserList.value = res.data.data.list.map((u) => ({ id: u.id, name: u.name }))
  }
}

async function handleAllocate() {
  if (!allocateTarget.value || !allocateForm.assignedUserId) return
  allocateLoading.value = true
  try {
    await customerApi.allocate(allocateTarget.value.id, {
      assignedUserId: allocateForm.assignedUserId,
    })
    ElMessage.success('分配成功')
    allocateVisible.value = false
    await fetchList() // 刷新列表
  } finally {
    allocateLoading.value = false
  }
}
```

---

## 测试规范

### 后端单元测试

**文件**: `packages/server/test/customer/customer-allocate.spec.ts`

```typescript
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CustomerService } from '../../src/modules/customer/customer.service'
import { Customer } from '../../src/modules/customer/customer.entity'
import { User } from '../../src/modules/user/user.entity'
import { RedisService } from '../../src/common/redis'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('CustomerService.allocate', () => {
  let service: CustomerService

  const mockCustomer = {
    id: 1,
    name: '张三',
    assignedUserId: 1,
    deleted: false,
  }
  const mockTargetUser = {
    id: 2,
    name: '李四',
    isActive: true,
    deleted: false,
  }

  const mockCustomerRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
  }
  const mockUserRepo = {
    findOne: jest.fn(),
  }
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Customer), useValue: mockCustomerRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile()
    service = module.get(CustomerService)
    jest.clearAllMocks()
  })

  it('应成功将客户分配给目标用户', async () => {
    mockCustomerRepo.findOne.mockResolvedValue({ ...mockCustomer })
    mockUserRepo.findOne.mockResolvedValue(mockTargetUser)

    const operator = { id: 99, username: 'admin', role: 'admin' }
    const result = await service.allocate(1, { assignedUserId: 2 }, operator as any)

    expect(result.assignedUserId).toBe(2)
    expect(mockCustomerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: 2 }),
    )
  })

  it('客户不存在时应抛出 NotFoundException', async () => {
    mockCustomerRepo.findOne.mockResolvedValue(null)
    const operator = { id: 99, username: 'admin', role: 'admin' }
    await expect(service.allocate(999, { assignedUserId: 2 }, operator as any)).rejects.toThrow(
      NotFoundException,
    )
  })

  it('目标用户不存在或停用时应抛出 BadRequestException', async () => {
    mockCustomerRepo.findOne.mockResolvedValue({ ...mockCustomer })
    mockUserRepo.findOne.mockResolvedValue(null)
    const operator = { id: 99, username: 'admin', role: 'admin' }
    await expect(service.allocate(1, { assignedUserId: 999 }, operator as any)).rejects.toThrow(
      BadRequestException,
    )
  })

  it('分配完成后应失效列表和详情缓存', async () => {
    mockCustomerRepo.findOne.mockResolvedValue({ ...mockCustomer })
    mockUserRepo.findOne.mockResolvedValue(mockTargetUser)
    const operator = { id: 99, username: 'admin', role: 'admin' }
    await service.allocate(1, { assignedUserId: 2 }, operator as any)
    expect(mockRedis.delByPattern).toHaveBeenCalled()
    expect(mockRedis.del).toHaveBeenCalled()
  })
})
```

### 运行测试

```bash
cd packages/server
# Windows 环境必须使用 cmd /c
cmd /c pnpm test -- --runInBand test/customer/customer-allocate.spec.ts
```

### E2E 验证步骤

1. 以 `admin / admin123` 登录
2. 进入「客户管理」列表页
3. 对任意客户点击「分配」按钮
4. 在下拉框中选择另一个销售员，点击「确定」
5. **期望**: 列表中该客户的负责人更新；右下角出现 `customer:updated` 通知弹窗
6. 以被分配的销售员账号登录，验证该客户出现在其列表中
7. 以 `sales01 / sales123` 登录，验证操作列中「分配」按钮不可见

---

## API 文档

```
PUT /api/v1/customers/:id/assign
Authorization: Bearer <token>
Role: ADMIN, MANAGER

Request Body:
{
  "assignedUserId": 2
}

Response 200:
{
  "code": 0,
  "message": "success",
  "data": { ...CustomerVO, "assignedUserId": 2 }
}

Response 400:
{
  "code": 400,
  "message": "用户 ID 999 不存在或已停用",
  "data": null
}

Response 403:
{
  "code": 403,
  "message": "Forbidden resource",
  "data": null
}

Response 404:
{
  "code": 404,
  "message": "Customer with ID 999 not found",
  "data": null
}
```
