# T29 — AI模型分析设置

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — 磐销云 aIModelAnalysisSet
> 优先级: 🟢低
> 参考设计: 06-ai-center.md

## 背景

本项目 AI 模块已实现 Chat、Embedding、通话摘要、RAG 等功能，但所有 AI 配置（模型、温度、token 限制、prompt 模板）硬编码在 `AiService` 中，无管理界面。磐销云提供 AI 模型分析设置页面供管理员配置。需构建 Admin 级 AI 配置管理界面，支持模型选择、参数调整、Prompt 模板管理、测试 Playground 和用量统计。

## 功能需求

| #   | 功能            | 说明                                                            | 优先级 |
| --- | --------------- | --------------------------------------------------------------- | ------ |
| 1   | 模型选择        | 配置 AI Provider（OpenAI/Azure/本地）和模型名称                 | P1     |
| 2   | 参数设置        | temperature, maxTokens, topP, frequencyPenalty 等               | P1     |
| 3   | Prompt 模板管理 | 各场景 Prompt 的 CRUD（通话摘要/分类/意向度/RAG 等）            | P1     |
| 4   | 模块级配置      | 不同模块可使用不同模型/参数（通话分析用 GPT-4，RAG 用 GPT-3.5） | P2     |
| 5   | 测试 Playground | 管理员可输入文本测试当前配置的 AI 响应                          | P2     |
| 6   | 用量统计        | token 消耗量/API 调用次数/费用估算（按日/周/月）                | P2     |
| 7   | Prompt 版本     | Prompt 模板修改历史，支持回滚                                   | P3     |
| 8   | AI 降级配置     | 配置 fallback 模型和降级阈值                                    | P2     |

## 技术方案

### 后端

#### Entity

```typescript
// ai-config.entity.ts
@Entity("ai_config")
@Unique(["module"])
class AiConfig extends BaseEntity {
  @Column({ type: "varchar", length: 50, comment: "模块标识" })
  module:
    | "call_summary"
    | "call_classify"
    | "call_intention"
    | "speech_eval"
    | "rag"
    | "chat"
    | "embedding"
    | "default";

  @Column({ type: "varchar", length: 50 })
  provider: "openai" | "azure" | "local" | "anthropic";

  @Column({ type: "varchar", length: 100 })
  model: string;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column({ type: "int", default: 2000 })
  maxTokens: number;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 1.0 })
  topP: number;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  frequencyPenalty: number;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  presencePenalty: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "varchar", length: 50, nullable: true, comment: "降级模型" })
  fallbackModel: string | null;

  @Column({ type: "int", default: 3, comment: "降级触发阈值(连续失败次数)" })
  fallbackThreshold: number;

  @ManyToOne(() => User)
  updatedBy: User;

  @Column({ type: "varchar", nullable: true })
  updatedById: string | null;
}

// ai-prompt-template.entity.ts
@Entity("ai_prompt_template")
class AiPromptTemplate extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  module: string;

  @Column({ type: "varchar", length: 50 })
  scene: string;

  @Column({ type: "text" })
  systemPrompt: string;

  @Column({ type: "text", nullable: true })
  userPromptTemplate: string | null;

  @Column({ type: "int", default: 1 })
  version: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @ManyToOne(() => User)
  createdBy: User;

  @Column()
  createdById: string;
}

// ai-prompt-history.entity.ts
@Entity("ai_prompt_history")
class AiPromptHistory extends BaseEntity {
  @ManyToOne(() => AiPromptTemplate, { onDelete: "CASCADE" })
  template: AiPromptTemplate;

  @Column()
  templateId: string;

  @Column({ type: "int" })
  version: number;

  @Column({ type: "text" })
  systemPrompt: string;

  @Column({ type: "text", nullable: true })
  userPromptTemplate: string | null;

  @Column({ type: "text", nullable: true })
  changeNote: string | null;

  @ManyToOne(() => User)
  changedBy: User;

  @Column()
  changedById: string;
}

// ai-usage-log.entity.ts
@Entity("ai_usage_log")
class AiUsageLog extends BaseEntity {
  @Column({ type: "varchar", length: 50 })
  module: string;

  @Column({ type: "varchar", length: 100 })
  model: string;

  @Column({ type: "int" })
  promptTokens: number;

  @Column({ type: "int" })
  completionTokens: number;

  @Column({ type: "int" })
  totalTokens: number;

  @Column({ type: "decimal", precision: 10, scale: 6, default: 0 })
  estimatedCost: number;

  @Column({ type: "int", comment: "API 响应时间(ms)" })
  latencyMs: number;

  @Column({ type: "boolean", default: true })
  isSuccess: boolean;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @ManyToOne(() => User, { nullable: true })
  triggeredBy: User | null;

  @Column({ type: "varchar", nullable: true })
  triggeredById: string | null;
}
```

#### DTO

- `UpdateAiConfigDto`: provider?, model?, temperature?, maxTokens?, topP?, frequencyPenalty?, presencePenalty?, fallbackModel?, fallbackThreshold?
- `CreatePromptTemplateDto`: name, module, scene, systemPrompt, userPromptTemplate?, description?
- `UpdatePromptTemplateDto`: systemPrompt?, userPromptTemplate?, changeNote?
- `PlaygroundDto`: prompt: string, module?: string (使用对应模块配置)
- `UsageQueryDto`: module?, startDate?, endDate?, groupBy: 'day' | 'week' | 'month'

#### Service

- `AiConfigService`:
  - `getConfig(module)`: 获取模块配置，fallback 到 'default'
  - `updateConfig(module, dto, user)`: 更新配置，写审计日志
  - `getAllConfigs()`: 获取全部模块配置
- `AiPromptService`:
  - `getActivePrompt(module, scene)`: 获取当前生效的 Prompt
  - `updatePrompt(id, dto, user)`: 更新 Prompt，自动创建 history 记录，version++
  - `rollback(id, version)`: 回滚到指定版本
  - `listHistory(templateId)`: 查看修改历史
- `AiUsageService`:
  - `logUsage(data)`: 记录每次 AI 调用（由 AiService 调用）
  - `getStatistics(query)`: 按时间/模块聚合统计
  - `getCostEstimate(query)`: 费用估算
- `AiPlaygroundService`:
  - `testPrompt(dto, user)`: 使用指定模块配置发送测试请求

#### AiService 增强

- `AiService.chat()` 调用前先读取 `AiConfigService.getConfig(module)` 获取模型参数
- 每次调用后写入 `AiUsageLog`
- Prompt 从 `AiPromptService.getActivePrompt()` 获取，不再硬编码

#### Controller

- `AiConfigController`: Admin-only

#### Module

- `AiConfigModule` 或增强 `AiModule`
- 需循环依赖注意: AiService ↔ AiConfigService，使用 `forwardRef`

#### Migration

- `1709000093000-CreateAiConfigTables.ts`: ai_config, ai_prompt_template, ai_prompt_history, ai_usage_log 四表
- `1709000093001-SeedDefaultAiConfig.ts`: 插入默认配置（default 模块）

### 前端 (PC)

#### 页面

| 页面        | 路径                      | 说明                                                   |
| ----------- | ------------------------- | ------------------------------------------------------ |
| AI 配置     | `/settings/ai`            | 模块列表 + 模型/参数配置表单                           |
| Prompt 管理 | `/settings/ai/prompts`    | Prompt 模板列表 + 编辑器 + 版本历史                    |
| Playground  | `/settings/ai/playground` | 测试输入框 + 模块选择 + 结果展示                       |
| 用量统计    | `/settings/ai/usage`      | ECharts 图表: token 消耗趋势 + 模块分布饼图 + 费用统计 |

#### 组件

- `AiConfigForm.vue`: 模块配置表单（provider/model/temperature slider/maxTokens 等）
- `PromptEditor.vue`: Prompt 编辑器（Monaco Editor 或 textarea + 变量高亮）
- `PromptHistory.vue`: 版本历史 timeline + diff 查看 + 回滚按钮
- `PlaygroundPanel.vue`: 输入 + 模块选择 + 发送 + 结果 + latency/token 信息
- `UsageChart.vue`: ECharts 图表（折线图+饼图+表格）

#### API 层

- `api/ai-config.ts`: 所有 AI 配置相关接口

#### 路由

- 在现有设置页面 `/settings` 增加 AI 配置子菜单（Admin-only）

### 前端 (APP)

- 无 APP 端需求（Admin-only 功能）

## API 接口

| 方法   | 路径                              | 说明                      | 权限  |
| ------ | --------------------------------- | ------------------------- | ----- |
| GET    | `/api/v1/ai/config`               | 获取所有模块 AI 配置      | Admin |
| GET    | `/api/v1/ai/config/:module`       | 获取指定模块配置          | Admin |
| PUT    | `/api/v1/ai/config/:module`       | 更新模块配置              | Admin |
| GET    | `/api/v1/ai/prompts`              | Prompt 模板列表           | Admin |
| POST   | `/api/v1/ai/prompts`              | 创建 Prompt 模板          | Admin |
| GET    | `/api/v1/ai/prompts/:id`          | Prompt 详情               | Admin |
| PUT    | `/api/v1/ai/prompts/:id`          | 更新 Prompt（自动版本化） | Admin |
| DELETE | `/api/v1/ai/prompts/:id`          | 删除 Prompt（软删除）     | Admin |
| GET    | `/api/v1/ai/prompts/:id/history`  | Prompt 修改历史           | Admin |
| POST   | `/api/v1/ai/prompts/:id/rollback` | 回滚到指定版本            | Admin |
| POST   | `/api/v1/ai/playground`           | 测试 Playground           | Admin |
| GET    | `/api/v1/ai/usage`                | 用量统计                  | Admin |
| GET    | `/api/v1/ai/usage/cost`           | 费用估算                  | Admin |

## 数据库设计

### ai_config

| 字段               | 类型                        | 说明       |
| ------------------ | --------------------------- | ---------- |
| id                 | varchar(36) PK              | UUID       |
| module             | varchar(50) NOT NULL UNIQUE | 模块标识   |
| provider           | varchar(50) NOT NULL        | AI 提供商  |
| model              | varchar(100) NOT NULL       | 模型名称   |
| temperature        | decimal(3,2) DEFAULT 0.70   | 温度       |
| max_tokens         | int DEFAULT 2000            | 最大 token |
| top_p              | decimal(3,2) DEFAULT 1.00   | top_p      |
| frequency_penalty  | decimal(3,2) DEFAULT 0.00   | 频率惩罚   |
| presence_penalty   | decimal(3,2) DEFAULT 0.00   | 存在惩罚   |
| is_active          | boolean DEFAULT true        | 是否启用   |
| fallback_model     | varchar(50)                 | 降级模型   |
| fallback_threshold | int DEFAULT 3               | 降级阈值   |
| updated_by_id      | varchar(36) FK              | 最后修改人 |
| created_at         | timestamp(6)                |            |
| updated_at         | timestamp(6)                |            |

### ai_prompt_template

| 字段                 | 类型                  | 说明                           |
| -------------------- | --------------------- | ------------------------------ |
| id                   | varchar(36) PK        | UUID                           |
| name                 | varchar(100) NOT NULL | 模板名称                       |
| module               | varchar(50) NOT NULL  | 模块                           |
| scene                | varchar(50) NOT NULL  | 场景                           |
| system_prompt        | text NOT NULL         | System Prompt                  |
| user_prompt_template | text                  | User Prompt 模板(含变量占位符) |
| version              | int DEFAULT 1         | 当前版本号                     |
| is_active            | boolean DEFAULT true  | 是否启用                       |
| description          | text                  | 描述                           |
| created_by_id        | varchar(36) FK        | 创建人                         |
| created_at           | timestamp(6)          |                                |
| updated_at           | timestamp(6)          |                                |
| deleted_at           | timestamp(6)          |                                |

**索引**: `IDX_apt_module_scene` (module, scene), `IDX_apt_active` (is_active)

### ai_prompt_history

| 字段                 | 类型                   | 说明               |
| -------------------- | ---------------------- | ------------------ |
| id                   | varchar(36) PK         | UUID               |
| template_id          | varchar(36) FK CASCADE | 模板ID             |
| version              | int NOT NULL           | 版本号             |
| system_prompt        | text NOT NULL          | 历史 System Prompt |
| user_prompt_template | text                   | 历史 User Prompt   |
| change_note          | text                   | 修改说明           |
| changed_by_id        | varchar(36) FK         | 修改人             |
| created_at           | timestamp(6)           |                    |

**索引**: `IDX_aph_template_version` (template_id, version)

### ai_usage_log

| 字段              | 类型                    | 说明                |
| ----------------- | ----------------------- | ------------------- |
| id                | varchar(36) PK          | UUID                |
| module            | varchar(50) NOT NULL    | 模块                |
| model             | varchar(100) NOT NULL   | 模型                |
| prompt_tokens     | int NOT NULL            | Prompt token 数     |
| completion_tokens | int NOT NULL            | Completion token 数 |
| total_tokens      | int NOT NULL            | 总 token            |
| estimated_cost    | decimal(10,6) DEFAULT 0 | 估算费用(USD)       |
| latency_ms        | int NOT NULL            | 响应时间            |
| is_success        | boolean DEFAULT true    | 是否成功            |
| error_message     | text                    | 错误信息            |
| triggered_by_id   | varchar(36) FK          | 触发用户            |
| created_at        | timestamp(6)            |                     |

**索引**: `IDX_aul_module` (module), `IDX_aul_created` (created_at), `IDX_aul_model` (model)

## 依赖模块

| 模块           | 用途               | 变更                               |
| -------------- | ------------------ | ---------------------------------- |
| AiModule       | 核心增强（配置化） | AiService 读取 AiConfig 而非硬编码 |
| UserModule     | 操作人记录         | 导入                               |
| AuditLogModule | 配置变更审计       | 自动拦截                           |

## 验收标准

### 功能验收

- [ ] Admin 可查看/修改每个模块的 AI 模型配置
- [ ] 修改配置后，对应模块的 AI 调用使用新参数
- [ ] Prompt 模板支持 CRUD，修改自动创建版本历史
- [ ] Prompt 支持回滚到历史版本
- [ ] Playground 可测试任意模块配置的 AI 响应
- [ ] 用量统计展示 token 消耗趋势图、模块分布、费用估算
- [ ] 配置降级模型后，主模型连续失败 N 次自动切换
- [ ] 所有配置变更记录在审计日志中

### 测试要求

| 类型         | 文件                        | 数量                                   |
| ------------ | --------------------------- | -------------------------------------- |
| 后端单元测试 | `ai-config.service.spec.ts` | ≥12 tests (CRUD + fallback + 配置读取) |
| 后端单元测试 | `ai-prompt.service.spec.ts` | ≥10 tests (CRUD + 版本化 + 回滚)       |
| 后端单元测试 | `ai-usage.service.spec.ts`  | ≥8 tests (记录 + 统计 + 费用)          |
| 前端单元测试 | `AiConfigForm.spec.ts`      | ≥5 tests                               |
| E2E          | `ai-settings.spec.ts`       | ≥6 tests                               |

### 边界与约束

- 仅 Admin 角色可访问所有 AI 配置端点
- temperature 范围: 0.00 - 2.00
- maxTokens 范围: 100 - 128000
- Prompt 模板变量使用 `{{variable}}` 语法
- 用量日志按月自动归档（保留 12 个月）
- 费用估算基于公开价格表，需可配置单价

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `security-review`
- **配置缓存**: AI 配置缓存到 Redis `ai:config:{module}` TTL 5min，修改时主动失效
- **Prompt 变量**: 运行时使用 `String.replace(/\{\{(\w+)\}\}/g, ...)` 替换
- **费用计算**: 维护 `MODEL_PRICING` 常量映射 model → price_per_1k_tokens
- **迁移数据**: 现有硬编码配置作为 seed 数据插入 ai_config 表
