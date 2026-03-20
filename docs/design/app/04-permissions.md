# 04 — 权限体系

## RBAC 角色定义

与后端 `UserRole` 枚举一致，三个角色：

| 角色    | 枚举值             | APP 定位                            |
| ------- | ------------------ | ----------------------------------- |
| Admin   | `UserRole.ADMIN`   | 全功能访问 + 查看团队数据           |
| Manager | `UserRole.MANAGER` | 业务 CRUD + 删除 + 查看团队数据     |
| Sales   | `UserRole.SALES`   | 业务 CRUD（不含删除），仅看自己数据 |

---

## 功能 × 角色权限矩阵

### 工作台

| 功能                   | Admin | Manager | Sales |
| ---------------------- | ----- | ------- | ----- |
| 查看数据概览（全公司） | ✅    | ✅      | ❌    |
| 查看数据概览（个人）   | ✅    | ✅      | ✅    |
| 快捷操作               | ✅    | ✅      | ✅    |
| 待办提醒               | ✅    | ✅      | ✅    |
| PK 进展                | ✅    | ✅      | ✅    |
| AI 助理                | ✅    | ✅      | ✅    |
| 通知中心               | ✅    | ✅      | ✅    |

### 客户管理

| 功能           | Admin | Manager | Sales       |
| -------------- | ----- | ------- | ----------- |
| 查看全部客户   | ✅    | ✅      | ❌          |
| 查看自己的客户 | ✅    | ✅      | ✅          |
| 新建客户       | ✅    | ✅      | ✅          |
| 编辑客户       | ✅    | ✅      | ✅ (仅自己) |
| 删除客户       | ✅    | ✅      | ❌          |
| 批量转公海     | ✅    | ✅      | ❌          |
| 批量转让       | ✅    | ✅      | ❌          |
| 客户地图       | ✅    | ✅      | ✅          |
| 名片扫描       | ✅    | ✅      | ✅          |

### 通话与拨号

| 功能                | Admin | Manager | Sales       |
| ------------------- | ----- | ------- | ----------- |
| 一键外呼 (原生)     | ✅    | ✅      | ✅          |
| 云呼回呼发起        | ✅    | ✅      | ✅          |
| 双卡切换            | ✅    | ✅      | ✅          |
| 查看全部通话记录    | ✅    | ✅      | ❌          |
| 查看自己通话记录    | ✅    | ✅      | ✅          |
| 通话后记录          | ✅    | ✅      | ✅          |
| 语音速记            | ✅    | ✅      | ✅          |
| 通话录音播放 (云呼) | ✅    | ✅      | ✅ (仅自己) |
| AI 通话分析         | ✅    | ✅      | ✅ (仅自己) |
| 拍照取号            | ✅    | ✅      | ✅          |
| 云呼配置管理        | ✅    | ❌      | ❌          |
| 云呼线路余额查询    | ✅    | ✅      | ❌          |

### 商机管理

| 功能         | Admin | Manager | Sales       |
| ------------ | ----- | ------- | ----------- |
| 查看全部商机 | ✅    | ✅      | ❌          |
| 查看自己商机 | ✅    | ✅      | ✅          |
| 新建商机     | ✅    | ✅      | ✅          |
| 编辑商机     | ✅    | ✅      | ✅ (仅自己) |
| 删除商机     | ✅    | ✅      | ❌          |
| 阶段变更     | ✅    | ✅      | ✅ (仅自己) |
| 商机看板     | ✅    | ✅      | ❌          |

### 跟进管理

| 功能         | Admin | Manager | Sales       |
| ------------ | ----- | ------- | ----------- |
| 查看全部跟进 | ✅    | ✅      | ❌          |
| 查看自己跟进 | ✅    | ✅      | ✅          |
| 新建跟进     | ✅    | ✅      | ✅          |
| 编辑跟进     | ✅    | ✅      | ✅ (仅自己) |
| 删除跟进     | ✅    | ✅      | ❌          |
| 上门签到     | ✅    | ✅      | ✅          |
| 拜访路线规划 | ✅    | ✅      | ✅          |

### 学习与 PK

| 功能       | Admin | Manager | Sales |
| ---------- | ----- | ------- | ----- |
| PK 排行榜  | ✅    | ✅      | ✅    |
| 知识库浏览 | ✅    | ✅      | ✅    |
| 营销素材   | ✅    | ✅      | ✅    |
| 发布文章   | ✅    | ✅      | ❌    |
| 管理素材   | ✅    | ✅      | ❌    |

### 个人中心

| 功能         | Admin | Manager | Sales |
| ------------ | ----- | ------- | ----- |
| 查看个人信息 | ✅    | ✅      | ✅    |
| 编辑个人信息 | ✅    | ✅      | ✅    |
| 个人业绩     | ✅    | ✅      | ✅    |
| 团队业绩     | ✅    | ✅      | ❌    |
| 通知设置     | ✅    | ✅      | ✅    |
| 双卡设置     | ✅    | ✅      | ✅    |
| 版本更新     | ✅    | ✅      | ✅    |

---

## 数据权限

后端通过 `applyDataPermission()` 和 `checkOwnership()` 强制执行：

| 角色    | 数据范围                             | 实现                          |
| ------- | ------------------------------------ | ----------------------------- |
| Admin   | 全部数据                             | 无 WHERE 过滤                 |
| Manager | 全部数据                             | 无 WHERE 过滤                 |
| Sales   | 仅 `assignedUserId = currentUser.id` | `WHERE assignedUserId = :uid` |

### 数据权限对 APP 的影响

```typescript
// API 层自动带入用户上下文，后端自动过滤
// Sales 用户调 GET /api/v1/customers 只返回自己的客户
// 前端无需额外处理，后端保证数据隔离
```

---

## 前端权限控制

### 1. Store 层角色判断

```typescript
// stores/user.ts
const userStore = useUserStore();
const { role } = storeToRefs(userStore);

// 判断
const isAdmin = computed(() => role.value === UserRole.ADMIN);
const isManager = computed(() => role.value === UserRole.MANAGER);
const isSales = computed(() => role.value === UserRole.SALES);
const canDelete = computed(() => role.value !== UserRole.SALES);
const canViewTeam = computed(() => role.value !== UserRole.SALES);
```

### 2. 页面级权限

路由跳转前检查角色：

```typescript
// 在 navigateTo 前检查
function navigateWithPermission(url: string, requiredRoles?: UserRole[]) {
  const userStore = useUserStore();
  if (requiredRoles && !requiredRoles.includes(userStore.role)) {
    uni.showToast({ title: "无权访问", icon: "none" });
    return;
  }
  uni.navigateTo({ url });
}
```

### 3. 组件级权限

```vue
<template>
  <!-- 仅管理角色显示删除按钮 -->
  <button v-if="canDelete" @click="handleDelete">删除</button>

  <!-- 仅管理角色显示批量操作 -->
  <view v-if="canViewTeam" class="batch-actions">
    <button @click="batchTransfer">批量转让</button>
    <button @click="batchRelease">转公海</button>
  </view>
</template>
```

### 4. 工作台数据范围切换

```vue
<template>
  <view v-if="canViewTeam" class="scope-tabs">
    <text :class="{ active: scope === 'personal' }" @click="scope = 'personal'">
      个人
    </text>
    <text :class="{ active: scope === 'team' }" @click="scope = 'team'">
      团队
    </text>
  </view>
</template>
```

---

## 后端权限守卫

所有 API 接口由后端 `JwtAuthGuard` + `RolesGuard` + `@Roles()` 强制保护：

```typescript
// 后端 Controller 示例
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/customers')
export class CustomerController {

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string) { ... }

  @Get()
  findAll(@CurrentUser() user: User) {
    // applyDataPermission 自动过滤 Sales 用户数据
  }
}
```

即使前端绕过 UI 限制，后端仍会拒绝无权限请求（403）。
