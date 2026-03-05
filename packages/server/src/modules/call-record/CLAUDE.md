# TM-C: 通话记录模块 CLAUDE.md

## 模块信息

**Team**: TM-C
**模块**: 通话记录 (Call Record)
**路径**: `packages/server/src/modules/call-record/`
**前端路由**: `/call-record`

## 功能范围

### 核心功能

1. 通话记录 CRUD
2. 按客户/商机/销售员过滤查询
3. 通话时长统计
4. AI 通话摘要生成（调用 LLM 接口）
5. 跟进任务自动创建
6. 通话录音文件上传/播放（可选）

## 技术规范

### 实体设计

```typescript
// call-record.entity.ts
@Entity('call_records')
export class CallRecord extends BaseEntity {
  @Column({ name: 'customer_id' })
  customerId: number

  @Column({ name: 'opportunity_id', nullable: true })
  opportunityId: number

  @Column({ name: 'user_id', comment: '拨打人' })
  userId: number

  @Column({ name: 'call_at', type: 'datetime' })
  callAt: Date

  @Column({ type: 'int', default: 0, comment: '通话时长（秒）' })
  duration: number

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary: string

  @Column({ name: 'recording_url', length: 500, nullable: true })
  recordingUrl: string
}
```

### API 端点

| 方法   | 路径                               | 描述     |
| ------ | ---------------------------------- | -------- |
| GET    | /api/v1/call-records               | 分页列表 |
| POST   | /api/v1/call-records               | 创建记录 |
| GET    | /api/v1/call-records/:id           | 详情     |
| PUT    | /api/v1/call-records/:id           | 更新     |
| DELETE | /api/v1/call-records/:id           | 软删除   |
| POST   | /api/v1/call-records/:id/summarize | AI 摘要  |

## AI 集成说明

- 使用 DashScope (Qwen) API 生成通话摘要
- 提示词：分析通话记录，提取关键信息，输出结构化摘要（客户需求、跟进要点、下一步行动）
- API Key 通过环境变量 `DASHSCOPE_API_KEY` 注入
- 摘要异步生成，通过 Bull 队列处理

## 依赖关系

- **依赖**: Customer 模块 (TM-A)、Opportunity 模块 (TM-B)

## 权限与安全

### RBAC 权限控制

- Controller 类级别应用 `@UseGuards(JwtAuthGuard, RolesGuard)`
- DELETE (`/call-records/:id`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 导出 (`GET /call-records/export`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 其他 CRUD 操作（含 AI 摘要触发）所有已认证角色可用

### 审计日志

- Controller 使用 `@UseInterceptors(AuditLogInterceptor)` 自动记录所有写操作

### 前端权限

- 删除按钮、导出按钮使用 `v-if="isAdminOrManager"` 隐藏
