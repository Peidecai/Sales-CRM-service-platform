# T30 — 双卡切换完善

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — 磐销云双卡切换
> 优先级: 🟢低
> 参考设计: 05-call-recording.md §5.1 + 13-mobile-app.md §13.2/13.3

## 背景

磐销云 APP 端支持双卡切换功能，用户可选择使用哪张 SIM 卡外呼。本项目已有 `SimSelector` 组件（Phase 18 APP 开发），但功能不完善：缺少自动检测、客户偏好绑定、SIM 用量统计、运营商识别等。需完善双卡管理功能，提升销售人员外呼体验。

## 功能需求

| #   | 功能          | 说明                                          | 优先级 |
| --- | ------------- | --------------------------------------------- | ------ |
| 1   | SIM 自动检测  | APP 启动时自动检测可用 SIM 卡数量/运营商/号码 | P1     |
| 2   | 默认 SIM 设置 | 用户设置默认外呼 SIM 卡                       | P1     |
| 3   | 客户 SIM 偏好 | 为特定客户绑定 SIM 卡（如移动客户用移动卡）   | P2     |
| 4   | 外呼前选择    | 拨号时弹出 SIM 选择器（如有多张卡）           | P1     |
| 5   | 运营商检测    | 检测 SIM 卡运营商（移动/联通/电信）           | P2     |
| 6   | SIM 用量统计  | 统计每张 SIM 卡的通话次数/时长                | P2     |
| 7   | SIM 健康检查  | 检测 SIM 卡信号强度/网络状态                  | P3     |
| 8   | 通话记录标记  | 记录每次通话使用的 SIM 卡信息                 | P1     |

## 技术方案

### 后端

#### Entity

```typescript
// sim-preference.entity.ts
@Entity("sim_preference")
class SimPreference extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({
    type: "int",
    default: 0,
    comment: "默认 SIM 卡槽位(0=SIM1, 1=SIM2)",
  })
  defaultSlot: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  sim1Number: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  sim1Carrier: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  sim2Number: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  sim2Carrier: string | null;

  @Column({ type: "timestamp", nullable: true })
  lastDetectedAt: Date | null;
}

// customer-sim-binding.entity.ts
@Entity("customer_sim_binding")
@Unique(["userId", "customerId"])
class CustomerSimBinding extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  customer: Customer;

  @Column()
  customerId: string;

  @Column({ type: "int", comment: "SIM 卡槽位(0=SIM1, 1=SIM2)" })
  simSlot: number;

  @Column({ type: "text", nullable: true })
  reason: string | null;
}
```

#### CallRecord Entity 增强

```typescript
// call-record.entity.ts — 新增字段
@Column({ type: 'int', nullable: true, comment: '使用的 SIM 卡槽位' })
simSlot: number | null;

@Column({ type: 'varchar', length: 20, nullable: true, comment: '使用的 SIM 卡号码' })
simNumber: string | null;

@Column({ type: 'varchar', length: 20, nullable: true, comment: '运营商' })
simCarrier: string | null;
```

#### DTO

```typescript
class UpdateSimPreferenceDto {
  @IsInt()
  @Min(0)
  @Max(1)
  defaultSlot: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sim1Number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sim1Carrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sim2Number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sim2Carrier?: string;
}

class SetCustomerSimBindingDto {
  @IsUUID()
  customerId: string;

  @IsInt()
  @Min(0)
  @Max(1)
  simSlot: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

class SimUsageQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

#### Service

- `SimPreferenceService`:
  - `getPreference(userId)`: 获取用户 SIM 配置
  - `updatePreference(userId, dto)`: 更新默认 SIM 配置
  - `getCustomerBinding(userId, customerId)`: 获取客户 SIM 绑定
  - `setCustomerBinding(userId, dto)`: 设置/更新客户 SIM 绑定
  - `removeCustomerBinding(userId, customerId)`: 删除绑定
  - `resolveSimSlot(userId, customerId?)`: 解析应使用的 SIM 卡（客户绑定 > 默认设置 > SIM1）
  - `getUsageStatistics(userId, query)`: SIM 用量统计（按 SIM 聚合 call_record）

#### Controller

- `SimController`: `/api/v1/sim/*` 端点

#### Module

- `SimModule`: imports UserModule, CustomerModule, CallRecordModule

#### Migration

- `1709000094000-CreateSimTables.ts`: sim_preference, customer_sim_binding 两表
- `1709000094001-AddCallRecordSimFields.ts`: call_record 加 sim_slot/sim_number/sim_carrier

### 前端 (PC)

- 无 PC 端 UI（双卡为 APP 专属功能）
- 管理端可在用户详情页查看 SIM 统计

### 前端 (APP)

#### 组件增强

```
packages/miniapp/src/components/
├── SimSelector.vue          # 增强: 自动检测 + 客户偏好 + 运营商图标
├── SimSettingsPanel.vue     # 新增: 个人中心 SIM 设置面板
└── SimUsageStats.vue        # 新增: SIM 用量统计图表
```

#### SimSelector.vue 增强

- 启动时调用原生插件检测 SIM 卡数量/号码/运营商
- 外呼前: 先查客户绑定 → 否则用默认 SIM → 如都未设置则弹出选择器
- 显示运营商图标（移动/联通/电信/未知）
- 信号强度指示器

#### 原生能力封装

```typescript
// native/sim-card.ts 增强
interface SimInfo {
  slot: number;
  phoneNumber: string | null;
  carrier: string | null;
  carrierCode: string | null;
  signalStrength: number; // 0-4
  isAvailable: boolean;
}

export function detectSims(): Promise<SimInfo[]>;
export function getSignalStrength(slot: number): Promise<number>;
export function dialWithSim(phone: string, slot: number): Promise<void>;
```

#### 页面

| 页面     | 路径                             | 说明                      |
| -------- | -------------------------------- | ------------------------- |
| SIM 设置 | `pages/profile/sim-settings.vue` | 默认卡设置 + SIM 信息展示 |
| SIM 统计 | `pages/profile/sim-usage.vue`    | 各卡用量图表              |

#### API 层

- `api/sim.ts`: SIM 偏好 + 客户绑定 + 统计接口

## API 接口

| 方法   | 路径                                       | 说明                  | 权限 |
| ------ | ------------------------------------------ | --------------------- | ---- |
| GET    | `/api/v1/sim/preference`                   | 获取当前用户 SIM 配置 | All  |
| PUT    | `/api/v1/sim/preference`                   | 更新 SIM 配置         | All  |
| GET    | `/api/v1/sim/customer-binding/:customerId` | 获取客户 SIM 绑定     | All  |
| POST   | `/api/v1/sim/customer-binding`             | 设置客户 SIM 绑定     | All  |
| DELETE | `/api/v1/sim/customer-binding/:customerId` | 删除客户 SIM 绑定     | All  |
| GET    | `/api/v1/sim/resolve/:customerId?`         | 解析应使用的 SIM 卡   | All  |
| GET    | `/api/v1/sim/usage`                        | SIM 用量统计          | All  |

## 数据库设计

### sim_preference

| 字段             | 类型                  | 说明               |
| ---------------- | --------------------- | ------------------ |
| id               | varchar(36) PK        | UUID               |
| user_id          | varchar(36) FK UNIQUE | 用户ID（一人一条） |
| default_slot     | int DEFAULT 0         | 默认 SIM 槽位      |
| sim1_number      | varchar(20)           | SIM1 号码          |
| sim1_carrier     | varchar(20)           | SIM1 运营商        |
| sim2_number      | varchar(20)           | SIM2 号码          |
| sim2_carrier     | varchar(20)           | SIM2 运营商        |
| last_detected_at | timestamp             | 最后检测时间       |
| created_at       | timestamp(6)          |                    |
| updated_at       | timestamp(6)          |                    |

### customer_sim_binding

| 字段        | 类型                   | 说明     |
| ----------- | ---------------------- | -------- |
| id          | varchar(36) PK         | UUID     |
| user_id     | varchar(36) FK         | 用户ID   |
| customer_id | varchar(36) FK CASCADE | 客户ID   |
| sim_slot    | int NOT NULL           | SIM 槽位 |
| reason      | text                   | 绑定原因 |
| created_at  | timestamp(6)           |          |
| updated_at  | timestamp(6)           |          |

**索引**: `UQ_csb_user_customer` UNIQUE (user_id, customer_id)

### call_record 表变更

| 新增字段    | 类型        | 说明            |
| ----------- | ----------- | --------------- |
| sim_slot    | int         | 使用的 SIM 槽位 |
| sim_number  | varchar(20) | 使用的 SIM 号码 |
| sim_carrier | varchar(20) | 运营商          |

## 依赖模块

| 模块             | 用途                             | 变更                                                   |
| ---------------- | -------------------------------- | ------------------------------------------------------ |
| UserModule       | 用户关联                         | 导入                                                   |
| CustomerModule   | 客户 SIM 绑定                    | 导入                                                   |
| CallRecordModule | 通话记录 SIM 信息记录 + 统计查询 | 增加 SIM 字段                                          |
| CallModule       | 外呼时读取 SIM 偏好              | 集成 SimPreferenceService                              |
| uni-app 原生插件 | SIM 卡检测/信号/拨号             | Android: TelephonyManager; iOS: CTTelephonyNetworkInfo |

## 验收标准

### 功能验收

- [ ] APP 启动时自动检测 SIM 卡信息（数量/号码/运营商）
- [ ] 用户可在个人中心设置默认外呼 SIM 卡
- [ ] 外呼时，如客户有 SIM 绑定则自动选择对应 SIM 卡
- [ ] 无绑定时使用默认 SIM 卡，无默认时弹出选择器
- [ ] 客户详情页可设置/修改/删除 SIM 绑定
- [ ] 通话记录中记录使用的 SIM 卡信息
- [ ] SIM 用量统计页展示各卡通话次数/时长
- [ ] 仅单卡设备不显示 SIM 选择器

### 测试要求

| 类型         | 文件                             | 数量                                                 |
| ------------ | -------------------------------- | ---------------------------------------------------- |
| 后端单元测试 | `sim-preference.service.spec.ts` | ≥12 tests (偏好CRUD + 客户绑定 + resolve逻辑 + 统计) |
| 后端单元测试 | `sim.controller.spec.ts`         | ≥6 tests                                             |
| 前端单元测试 | `SimSelector.spec.ts`            | ≥6 tests (自动检测 + 选择逻辑 + 显示)                |
| E2E          | 需真机/模拟器测试，非 Playwright | 手动测试清单                                         |

### 边界与约束

- iOS 限制: 无法通过 API 获取 SIM 卡号码，仅能获取运营商名称
- Android 权限: 需 `READ_PHONE_STATE` 权限
- SIM 卡检测失败时（权限拒绝/API 不支持），降级为手动输入
- 每用户最多 2 张 SIM 卡（slot 0/1）
- 客户 SIM 绑定为 per-user 级别（不同销售同一客户可绑不同卡）

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`
- **原生桥接**: uni-app 使用 `plus.device` / uni 原生插件获取 SIM 信息
- **缓存**: SIM 偏好缓存到本地 `uni.setStorageSync('sim_preference', ...)`，同步到后端
- **运营商识别**: 通过 MCC/MNC 代码映射运营商（46000/46002=移动, 46001=联通, 46003/46011=电信）
- **拨号集成**: `SimPreferenceService.resolveSimSlot()` 在 CallService.makeCall() 中调用
