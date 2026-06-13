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

### 方案B扩展（手机原生外呼 + 语音速记）

**CallType 枚举新增：**

- `MANUAL` — 手机原生外呼（方案B），通过 `uni.makePhoneCall()` 调起

**实体新增字段：**

```typescript
@Column({ name: 'call_type', length: 20, default: 'normal' })
callType: string  // 'normal' | 'manual' | 'callback'

@Column({ name: 'estimated_duration', type: 'int', nullable: true })
estimatedDuration: number  // 用户估算通话时长（秒），方案B专用

@Column({ name: 'call_result', length: 20, nullable: true })
callResult: string  // 'connected' | 'no_answer' | 'busy' | 'power_off'
```

**POST /recordings/upload 实现规范（从stub升级）：**

- 接收 multipart/form-data（音频文件 + callRecordId + sourceType）
- `sourceType`: `platform`=平台录音, `voice_memo`=语音速记
- 存储到 OSS，记录到 `recording_files` 表
- 上传成功后可选触发 AI 分析（`POST /call-records/:id/summarize`）

**GET /call-records?customerId=X 使用说明：**

- 按客户筛选通话记录，用于小程序客户详情页"通话记录"Tab
- 遵循 DataScope 数据权限，SALES 角色只能查看自己的通话记录
- 返回按 `callAt` 倒序排列，包含 `aiSummary` 字段用于列表预览

**inputSource 处理分支：**

- `voice_memo` → 使用 VOICE_MEMO_PROMPT（口述专用），分析结果标注低置信度
- `asr` / `both` → 使用 CALL_ANALYSIS_PROMPT（现有通话分析）
- `notes` → 使用简版 Prompt

## AI 集成说明

- 使用 DashScope (Qwen) API 生成通话摘要
- 提示词：分析通话记录，提取关键信息，输出结构化摘要（客户需求、跟进要点、下一步行动）
- API Key 通过环境变量 `DASHSCOPE_API_KEY` 注入
- 摘要异步生成，通过 Bull 队列处理
- **双Prompt策略**：根据 `inputSource` 自动选择 Prompt
  - `voice_memo` → VOICE_MEMO_PROMPT（口述专用，标注置信度）
  - `asr` / `both` → CALL_ANALYSIS_PROMPT（双方对话分析）
  - `notes` → NOTES_SUMMARY_PROMPT（简版摘要）

### 领导点评

**实体**: `LeaderReview` (callRecordId, customerId, reviewerId, content)

**DTO**: `CreateLeaderReviewDto` — content (@IsNotEmpty @MaxLength(2000)), customerId (@IsOptional @IsInt)

**端点**:

| 方法 | 路径                                              | 描述             | 权限          |
| ---- | ------------------------------------------------- | ---------------- | ------------- |
| GET  | /api/v1/call-records/customer/:customerId/reviews | 按客户查点评     | All           |
| POST | /api/v1/call-records/:id/reviews                  | 创建点评         | Admin/Manager |
| GET  | /api/v1/call-records/:id/reviews                  | 按通话记录查点评 | All           |

**迁移**: `1709000098000-CreateLeaderReviewTable`

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

## Skill 规范

- **backend-patterns** — Service 分层、Bull 队列异步处理
- **coding-standards** — TypeScript 严格模式
- **tdd-workflow** — 22 tests (CallRecordService)
