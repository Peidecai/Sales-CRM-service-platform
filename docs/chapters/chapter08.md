## 8. AI智能分析详细设计

### 8.1 AI功能架构

#### 8.1.1 AI引擎与业务模块集成架构

```
+------------------------------------------------------------------+
|                        前端应用层                                  |
|  [通话分析面板] [客户画像] [销售预测] [智能推荐] [报告中心]            |
+--------+-------------------+-------------------+-----------------+
         |  REST API          |  WebSocket         |
+--------v-------------------v-------------------v-----------------+
|                      NestJS API Gateway                           |
|  [AuthGuard] [RateLimitGuard] [TenantInterceptor]                |
+--------+-------------------+-------------------+-----------------+
         |                   |                   |
+--------v--------+ +-------v--------+ +-------v-----------------+
|  业务服务层      | | AI服务层        | |  实时通信层              |
|                 | |                 | |                         |
| CallService     | | ClaudeService   | | WebSocketGateway        |
| CustomerService | | PromptManager   | | NotificationService     |
| DealService     | | AIAnalysisService| |                        |
| ReportService   | | CostController  | |                        |
+---------+-------+ +---+------+------+ +------------+------------+
          |             |      |                      |
          |    +--------v------v-----------+          |
          |    |     Bull Queue 队列集群     |          |
          |    |                            |          |
          |    | [call-analysis    ] pri:1  |          |
          |    | [customer-profile ] pri:2  +----------+
          |    | [intent-prediction] pri:2  |  完成通知
          |    | [sales-forecast   ] pri:3  |
          |    | [anomaly-detect   ] pri:1  |
          |    | [report-generate  ] pri:4  |
          |    +--------+------------------+
          |             |
+---------v-------------v--------------------------------------+
|                       数据层                                   |
|  [PostgreSQL]  [Redis缓存]  [对象存储-通话录音/报告PDF]          |
+--------------------------------------------------------------+
          |
+---------v----------------------------------------------------+
|                     外部服务                                    |
|  [Claude API - 智能分析]    [讯飞ASR - 语音转文字]               |
+--------------------------------------------------------------+
```

#### 8.1.2 Claude API集成架构

系统采用统一的 `ClaudeService` 封装所有与 Claude API 的交互，通过 Prompt 模板引擎管理不同分析场景的提示词，结合 Bull Queue 实现异步处理流水线。

```
+------------------+     +------------------+     +----------------+
|  AIAnalysis      |---->|  PromptManager   |---->| PromptTemplate |
|  Service         |     |  (模板渲染)       |     | Repository     |
+--------+---------+     +------------------+     +----------------+
         |
+--------v---------+     +------------------+
|  ClaudeService   |---->| p-limit(5)       |
|  (API调用封装)    |     | 并发限流器        |
+--------+---------+     +------------------+
         |
+--------v---------+     +------------------+
|  RetryManager    |---->| CostTracker      |
|  (重试/超时/降级) |     | (Token用量追踪)   |
+------------------+     +------------------+
```

#### 8.1.3 异步处理管道总览

所有 AI 分析任务均通过 Bull Queue 异步执行，避免阻塞用户请求。任务完成后通过 WebSocket 推送结果通知。

```typescript
// AI队列注册 - ai-queue.module.ts
@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: "call-analysis",
        defaultJobOptions: {
          priority: 1,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        },
      },
      {
        name: "customer-profile",
        defaultJobOptions: {
          priority: 2,
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
        },
      },
      {
        name: "intent-prediction",
        defaultJobOptions: {
          priority: 2,
          attempts: 2,
          backoff: { type: "exponential", delay: 2000 },
        },
      },
      {
        name: "sales-forecast",
        defaultJobOptions: {
          priority: 3,
          attempts: 2,
          backoff: { type: "exponential", delay: 5000 },
        },
      },
      {
        name: "anomaly-detect",
        defaultJobOptions: {
          priority: 1,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        },
      },
      {
        name: "report-generate",
        defaultJobOptions: {
          priority: 4,
          attempts: 2,
          backoff: { type: "exponential", delay: 5000 },
        },
      },
    ),
  ],
})
export class AIQueueModule {}
```

---

### 8.2 Claude API集成设计

#### 8.2.1 ClaudeService类设计

```typescript
// claude.service.ts
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";

@Injectable()
export class ClaudeService {
  private client: Anthropic;
  private limiter = pLimit(5); // 最大5个并发API调用
  private readonly MAX_TIMEOUT = 120_000; // 120秒超时
  private readonly MAX_RETRIES = 3;

  constructor(
    private configService: ConfigService,
    private costTracker: CostTrackerService,
    private logger: AILoggerService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get("CLAUDE_API_KEY"),
      timeout: this.MAX_TIMEOUT,
    });
  }

  async analyze(
    request: ClaudeAnalysisRequest,
  ): Promise<ClaudeAnalysisResponse> {
    return this.limiter(async () => {
      const traceId = randomUUID();
      const startTime = Date.now();

      // 预检查Token预算
      await this.costTracker.checkBudget(request.tenantId);

      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          this.logger.logRequest(traceId, request);

          const response = await this.client.messages.create({
            model: request.model ?? "claude-sonnet-4-20250514",
            max_tokens: request.maxTokens ?? 4096,
            system: request.systemPrompt,
            messages: [{ role: "user", content: request.userMessage }],
            temperature: request.temperature ?? 0.3,
          });

          const result = this.parseResponse(response);
          const cost = this.calculateCost(response.usage);

          await this.costTracker.recordUsage({
            traceId,
            tenantId: request.tenantId,
            feature: request.feature,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cost,
            latencyMs: Date.now() - startTime,
          });

          this.logger.logResponse(traceId, result, Date.now() - startTime);
          return result;
        } catch (error) {
          this.logger.logError(traceId, error, attempt);
          if (attempt === this.MAX_RETRIES || !this.isRetryable(error)) {
            throw new AIServiceException(error, traceId);
          }
          await this.delay(Math.pow(2, attempt) * 1000); // 指数退避
        }
      }
    });
  }

  private isRetryable(error: any): boolean {
    // 429(限流)和5xx(服务端错误)可重试; 400/401/403不重试
    const status = error?.status;
    return status === 429 || (status >= 500 && status < 600);
  }

  private calculateCost(usage: {
    input_tokens: number;
    output_tokens: number;
  }): number {
    // Claude Sonnet 4: input $3/MTok, output $15/MTok
    return (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

#### 8.2.2 Token用量管理与成本控制

```typescript
// cost-tracker.service.ts
@Injectable()
export class CostTrackerService {
  // 多级预算控制：租户月度预算 → 功能预算 → 单次调用上限
  private readonly MONTHLY_BUDGET_DEFAULT = 500; // $500/租户/月
  private readonly FEATURE_BUDGET: Record<string, number> = {
    "call-analysis": 200, // 高频功能给更多预算
    "customer-profile": 80,
    "intent-prediction": 50,
    "sales-forecast": 40,
    "anomaly-detect": 30,
    "report-generate": 60,
    "competitor-analysis": 20,
    "script-recommend": 20,
  };

  async checkBudget(tenantId: string): Promise<void> {
    const monthKey = `ai:cost:${tenantId}:${dayjs().format("YYYY-MM")}`;
    const currentCost = parseFloat((await this.redis.get(monthKey)) || "0");
    const budget = await this.getTenantBudget(tenantId);

    if (currentCost >= budget) {
      throw new BudgetExceededException(tenantId, currentCost, budget);
    }
    // 达到80%时发出预警
    if (currentCost >= budget * 0.8) {
      this.eventEmitter.emit("ai.budget.warning", {
        tenantId,
        currentCost,
        budget,
      });
    }
  }

  async recordUsage(record: AIUsageRecord): Promise<void> {
    // 写入Redis实时计数
    const monthKey = `ai:cost:${record.tenantId}:${dayjs().format("YYYY-MM")}`;
    await this.redis.incrbyfloat(monthKey, record.cost);
    await this.redis.expire(monthKey, 35 * 86400); // 35天过期

    // 持久化到数据库（异步）
    await this.usageRepo.save({
      ...record,
      createdAt: new Date(),
    });
  }
}
```

**AI调用日志表结构：**

```sql
CREATE TABLE ai_usage_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id      UUID NOT NULL,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  user_id       UUID REFERENCES users(id),
  feature       VARCHAR(50) NOT NULL,  -- 功能标识
  model         VARCHAR(50) NOT NULL,
  input_tokens  INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd      DECIMAL(10,6) NOT NULL,
  latency_ms    INTEGER NOT NULL,
  status        VARCHAR(20) NOT NULL,  -- success/error/timeout
  error_code    VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_usage_tenant_month (tenant_id, created_at)
);
```

#### 8.2.3 错误处理策略

| 错误类型   | HTTP状态码 | 处理策略              | 用户反馈                       |
| ---------- | ---------- | --------------------- | ------------------------------ |
| 限流       | 429        | 指数退避重试(最多3次) | "分析请求排队中，请稍候"       |
| 服务端错误 | 5xx        | 指数退避重试(最多3次) | "AI服务暂时不可用，已自动重试" |
| Token超限  | 400        | 截断输入内容后重试    | 透明处理                       |
| 预算耗尽   | -          | 拒绝请求              | "本月AI分析额度已用完"         |
| 认证失败   | 401        | 不重试，告警运维      | "系统配置异常，请联系管理员"   |
| 超时       | -          | 重试1次，失败则降级   | "分析超时，已使用基础模式"     |

---

### 8.3 八大AI分析功能详细设计

#### 8.3.1 通话内容分析

**功能说明：** 通话录音经讯飞ASR转文字后，由Claude分析情感走向、提取关键信息（客户需求、异议、承诺事项）、判断购买意向等级。

**处理流程：** 录音上传 → 讯飞ASR转写 → 文本入库 → Bull Queue触发 → Claude分析 → 结果存储 → WebSocket通知

**输入数据结构：**

```typescript
interface CallAnalysisInput {
  callId: string;
  tenantId: string;
  transcript: string; // ASR转写文本
  callDuration: number; // 通话时长(秒)
  direction: "inbound" | "outbound";
  salesRepName: string;
  customerName: string;
  customerStage: string; // 当前销售阶段
}
```

**输出数据结构：**

```typescript
interface CallAnalysisOutput {
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    score: number; // -1.0 ~ 1.0
    timeline: Array<{
      // 情感走势
      segment: string;
      sentiment: string;
      score: number;
    }>;
  };
  keyInfo: {
    customerNeeds: string[]; // 客户需求
    objections: string[]; // 异议点
    commitments: string[]; // 承诺事项
    nextSteps: string[]; // 后续行动
    mentionedProducts: string[]; // 提及的产品
    budget?: string; // 预算信息
    timeline?: string; // 时间计划
    decisionMakers?: string[]; // 决策人
  };
  intentLevel: "high" | "medium" | "low" | "none";
  intentScore: number; // 0-100
  summary: string; // 通话摘要(200字以内)
  salesPerformance: {
    strengths: string[]; // 销售做得好的点
    improvements: string[]; // 改进建议
  };
}
```

**Prompt模板：**

```typescript
const CALL_ANALYSIS_PROMPT = `你是专业的销售通话分析师。请分析以下销售通话记录。

## 通话基本信息
- 销售代表：{{salesRepName}}
- 客户：{{customerName}}
- 通话方向：{{direction}}
- 当前销售阶段：{{customerStage}}

## 通话记录
{{transcript}}

请严格按以下JSON格式输出分析结果：
{
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": <-1.0到1.0的浮点数>,
    "timeline": [{"segment": "开场", "sentiment": "...", "score": 0.0}]
  },
  "keyInfo": {
    "customerNeeds": ["需求1", "需求2"],
    "objections": ["异议1"],
    "commitments": ["承诺1"],
    "nextSteps": ["行动1"],
    "mentionedProducts": ["产品1"],
    "budget": "预算信息或null",
    "timeline": "时间计划或null",
    "decisionMakers": ["决策人1"]
  },
  "intentLevel": "high|medium|low|none",
  "intentScore": <0-100整数>,
  "summary": "200字以内的通话摘要",
  "salesPerformance": {
    "strengths": ["优点1"],
    "improvements": ["改进建议1"]
  }
}`;
```

**存储方案：**

```sql
CREATE TABLE call_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_record_id  UUID NOT NULL REFERENCES call_records(id),
  tenant_id       UUID NOT NULL,
  sentiment_score DECIMAL(4,3),
  sentiment_label VARCHAR(20),
  intent_level    VARCHAR(20),
  intent_score    SMALLINT,
  summary         TEXT,
  key_info        JSONB NOT NULL,       -- 关键信息结构化数据
  sentiment_timeline JSONB,
  sales_performance  JSONB,
  prompt_version  VARCHAR(20),          -- Prompt版本号
  model_version   VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8.3.2 客户画像生成

**功能说明：** 基于客户所有交互历史（通话记录、跟进记录、商机数据、行为日志），自动生成360度客户画像，包含基础特征、行为偏好、决策风格、沟通建议。

**输入数据结构：**

```typescript
interface CustomerProfileInput {
  customerId: string;
  tenantId: string;
  basicInfo: {
    name: string;
    company: string;
    position: string;
    industry: string;
  };
  callSummaries: Array<{ date: string; summary: string; sentiment: string }>; // 最近20条
  followUps: Array<{ date: string; type: string; content: string }>; // 最近30条
  deals: Array<{
    name: string;
    amount: number;
    stage: string;
    createdAt: string;
  }>;
  behaviorMetrics: {
    avgResponseTime: number; // 平均回复时长(小时)
    preferredContactTime: string;
    totalInteractions: number;
    lastInteractionDate: string;
  };
}
```

**输出数据结构：**

```typescript
interface CustomerProfileOutput {
  personalityType: string; // DISC性格类型
  decisionStyle: "analytical" | "intuitive" | "collaborative" | "directive";
  communicationPreference: {
    preferredChannel: string;
    bestContactTime: string;
    communicationStyle: string; // 简洁/详细/数据驱动
  };
  painPoints: string[];
  motivations: string[];
  riskFactors: string[]; // 流失风险因素
  relationshipHealth: "strong" | "stable" | "at_risk" | "critical";
  healthScore: number; // 0-100
  recommendedApproach: string; // 推荐沟通策略(300字)
  tags: string[]; // 自动标签
}
```

**Prompt模板（核心片段）：**

```
你是CRM客户画像分析专家。基于以下客户交互数据，生成全面的客户画像。

## 客户基础信息
{{basicInfo}}

## 近期通话摘要（按时间倒序）
{{callSummaries}}

## 跟进记录
{{followUps}}

## 商机数据
{{deals}}

## 行为指标
{{behaviorMetrics}}

请输出JSON格式的客户画像，包含性格类型、决策风格、沟通偏好、痛点、动机、风险因素、关系健康度评分(0-100)、推荐沟通策略和自动标签。
```

**存储方案：** 客户画像存入`customer_profiles`表，使用JSONB字段存储完整画像，设置`refreshed_at`字段支持定期刷新（默认7天）。

#### 8.3.3 购买意向预测

**功能说明：** 综合客户行为数据（通话频率、响应速度、情感趋势、商机进展），通过Claude进行多维度分析，输出意向评分和购买概率。

**输入/输出关键结构：**

```typescript
// 输入：聚合最近30天的行为数据
interface IntentPredictionInput {
  customerId: string;
  recentCalls: Array<{ date: string; intentScore: number; sentiment: number }>;
  dealProgress: {
    stage: string;
    daysInStage: number;
    stageHistory: Array<{ stage: string; days: number }>;
  };
  engagementMetrics: {
    callFrequencyTrend: "increasing" | "stable" | "decreasing";
    responseTimeTrend: "faster" | "stable" | "slower";
    meetingAcceptRate: number;
  };
}

// 输出
interface IntentPredictionOutput {
  purchaseProbability: number; // 0-100
  predictedCloseDate: string; // 预计成交日期
  confidence: "high" | "medium" | "low";
  positiveSignals: string[]; // 积极信号
  negativeSignals: string[]; // 消极信号
  recommendedActions: string[]; // 推荐行动
}
```

**存储：** 结果写入`intent_predictions`表，保留历史预测记录用于准确率回溯分析。

#### 8.3.4 智能话术推荐

**功能说明：** 根据客户画像、当前销售阶段、历史异议点，实时推荐最合适的沟通话术和应答策略。

```typescript
interface ScriptRecommendInput {
  customerProfile: CustomerProfileOutput; // 客户画像
  currentStage: string;
  recentObjections: string[];
  dealContext: {
    productInterest: string;
    budget: string;
    competitors: string[];
  };
}

interface ScriptRecommendOutput {
  openingScript: string; // 开场话术
  keyPoints: string[]; // 沟通要点
  objectionHandling: Array<{
    // 异议处理
    objection: string;
    response: string;
    technique: string; // 使用的技巧名称
  }>;
  closingTechniques: string[]; // 促单技巧
  avoidTopics: string[]; // 避免的话题
}
```

**存储：** 话术推荐结果缓存在Redis中（TTL 24小时），相同客户画像+阶段组合命中缓存。

#### 8.3.5 销售预测

**功能说明：** 基于销售漏斗数据、历史转化率、季节性因素，预测未来1/3/6个月的销售收入。

```typescript
interface SalesForecastInput {
  tenantId: string;
  pipeline: Array<{
    stage: string;
    dealCount: number;
    totalAmount: number;
    avgDaysInStage: number;
    historicalConversionRate: number;
  }>;
  historicalRevenue: Array<{ month: string; revenue: number }>; // 最近12个月
  seasonalFactors?: Record<string, number>;
}

interface SalesForecastOutput {
  forecast: Array<{
    period: string; // "2026-04", "2026-Q2"
    predictedRevenue: number;
    confidenceRange: { low: number; high: number };
    confidence: number; // 置信度百分比
  }>;
  riskDeals: Array<{ dealId: string; dealName: string; risk: string }>;
  insights: string[]; // 关键发现
}
```

**存储：** 预测结果存入`sales_forecasts`表，支持与实际数据对比，计算预测准确率。

#### 8.3.6 异常预警

**功能说明：** 自动检测客户流失风险、商机停滞、销售行为异常等情况，生成预警并推送。

```typescript
interface AnomalyDetectionInput {
  tenantId: string;
  // 客户活跃度数据
  customerActivity: Array<{
    customerId: string;
    customerName: string;
    lastContactDate: string;
    contactFrequencyChange: number; // 频率变化百分比
    sentimentTrend: number[];
  }>;
  // 商机停滞数据
  stalledDeals: Array<{
    dealId: string;
    dealName: string;
    stage: string;
    daysInStage: number;
    avgDaysForStage: number; // 该阶段平均停留天数
  }>;
}

interface AnomalyDetectionOutput {
  alerts: Array<{
    type: "churn_risk" | "deal_stalled" | "sentiment_drop" | "engagement_drop";
    severity: "critical" | "warning" | "info";
    entityType: "customer" | "deal";
    entityId: string;
    entityName: string;
    description: string;
    suggestedAction: string;
    score: number; // 风险分数 0-100
  }>;
  summary: string;
}
```

**存储：** 预警写入`ai_alerts`表，状态流转：`pending` → `acknowledged` → `resolved`/`dismissed`。

#### 8.3.7 竞品分析

**功能说明：** 从通话记录中自动提取竞品提及信息，汇总竞品出现频率、客户对竞品的评价、竞品优劣势。

```typescript
interface CompetitorAnalysisInput {
  tenantId: string;
  recentCallAnalyses: Array<{
    // 近30天通话分析
    callId: string;
    customerName: string;
    transcript: string;
    date: string;
  }>;
  knownCompetitors: string[]; // 已知竞品列表
}

interface CompetitorAnalysisOutput {
  competitors: Array<{
    name: string;
    mentionCount: number;
    customerSentiment: "positive" | "neutral" | "negative";
    perceivedStrengths: string[];
    perceivedWeaknesses: string[];
    lostDealsTo: number; // 输给该竞品的单数
  }>;
  competitiveTrends: string[]; // 竞争趋势
  recommendations: string[]; // 应对建议
}
```

**存储：** 竞品分析结果按月存储在`competitor_reports`表，支持趋势对比。

#### 8.3.8 智能报告

**功能说明：** 自动汇总指定时间段的销售数据，生成结构化的周报/月报，包含关键指标、趋势分析、突出问题和行动建议。

```typescript
interface ReportGenerationInput {
  tenantId: string;
  reportType: "weekly" | "monthly";
  period: { start: string; end: string };
  metrics: {
    totalCalls: number;
    newCustomers: number;
    dealsWon: number;
    dealsLost: number;
    revenue: number;
    revenueTarget: number;
    conversionRates: Record<string, number>;
    topPerformers: Array<{ name: string; revenue: number; deals: number }>;
  };
  previousPeriodMetrics: Record<string, number>; // 环比数据
  aiInsights: {
    // 汇总AI分析结果
    avgSentiment: number;
    topObjections: string[];
    churnRisks: number;
    stalledDeals: number;
  };
}

interface ReportOutput {
  title: string;
  executiveSummary: string; // 执行摘要(300字)
  sections: Array<{
    title: string;
    content: string; // Markdown格式
    charts?: Array<{ type: string; data: any }>;
  }>;
  keyHighlights: string[];
  actionItems: Array<{
    priority: "high" | "medium" | "low";
    description: string;
    assignee?: string;
  }>;
}
```

**存储：** 报告存入`ai_reports`表（content为JSONB），同时生成PDF存储到对象存储，链接记录在`report_file_url`字段。

---

### 8.4 Prompt工程设计

#### 8.4.1 System Prompt分层模板体系

系统采用四层Prompt组装架构，运行时按层合并生成最终System Prompt。

```
+----------------------------------------------------------+
|  第4层：租户定制层 (Tenant Custom Layer)                     |
|  - 租户特有的产品信息、行业术语、竞品列表                       |
|  - 存储在tenant_prompt_configs表，管理员可配置                |
+----------------------------------------------------------+
|  第3层：输出规范层 (Output Schema Layer)                     |
|  - JSON输出格式定义                                         |
|  - 字段约束和取值范围                                        |
+----------------------------------------------------------+
|  第2层：功能专项层 (Feature Layer)                           |
|  - 各分析功能的专用指令                                      |
|  - Few-shot示例                                            |
+----------------------------------------------------------+
|  第1层：基础角色层 (Base Role Layer)                         |
|  - AI分析师角色定义                                         |
|  - 通用行为准则（客观、数据驱动、中文输出）                     |
+----------------------------------------------------------+
```

```typescript
// prompt-manager.service.ts
@Injectable()
export class PromptManagerService {
  async buildSystemPrompt(feature: string, tenantId: string): Promise<string> {
    const layers = await Promise.all([
      this.getBaseRoleLayer(),
      this.getFeatureLayer(feature),
      this.getOutputSchemaLayer(feature),
      this.getTenantCustomLayer(tenantId, feature),
    ]);
    return layers.filter(Boolean).join("\n\n---\n\n");
  }

  private getBaseRoleLayer(): string {
    return `# 角色定义
你是一位资深的销售数据分析师，服务于企业CRM系统。

# 行为准则
1. 所有分析必须基于提供的数据，不得臆测
2. 输出语言为中文
3. 数值结果需精确到合理的小数位
4. 当数据不足以支撑结论时，明确标注"数据不足"
5. 严格按照指定的JSON格式输出，不添加额外字段
6. 不输出任何JSON之外的文字`;
  }

  private async getFeatureLayer(feature: string): Promise<string> {
    // 从prompt_templates表加载，支持版本管理
    const template = await this.promptRepo.findOne({
      where: { feature, status: "active" },
      order: { version: "DESC" },
    });
    return template?.content ?? "";
  }

  private async getTenantCustomLayer(
    tenantId: string,
    feature: string,
  ): Promise<string> {
    const config = await this.tenantPromptRepo.findOne({
      where: { tenantId, feature },
    });
    if (!config) return "";
    return `# 业务定制信息\n${config.customPrompt}`;
  }
}
```

#### 8.4.2 Few-shot示例设计

每个功能的Prompt模板均包含1-2个Few-shot示例，嵌入在功能专项层中。以通话分析为例：

```
## 示例

输入通话记录：
"销售：王总您好，上次咱们聊的ERP方案您考虑得怎么样了？
客户：方案整体还行，但价格比用友贵了20%，我们预算有限。
销售：理解您的顾虑。我们的方案包含了实施服务和三年维保，综合性价比其实更优。我可以帮您做个详细的TCO对比分析。
客户：好的，你做一份对比发我邮箱，下周我们内部讨论一下。"

输出：
{
  "sentiment": { "overall": "neutral", "score": 0.2, ... },
  "keyInfo": {
    "customerNeeds": ["ERP系统"],
    "objections": ["价格比竞品贵20%，预算有限"],
    "commitments": ["发送TCO对比分析到客户邮箱"],
    "nextSteps": ["客户下周内部讨论"],
    "mentionedProducts": ["ERP"],
    "budget": "有限，对价格敏感",
    "decisionMakers": ["王总及内部团队"]
  },
  "intentLevel": "medium",
  "intentScore": 55,
  "summary": "客户对ERP方案整体认可但对价格有异议...（略）"
}
```

#### 8.4.3 Prompt版本管理方案

```sql
CREATE TABLE prompt_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature     VARCHAR(50) NOT NULL,     -- 功能标识
  version     VARCHAR(20) NOT NULL,     -- 语义化版本 v1.0.0
  content     TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'draft',  -- draft/active/archived
  -- A/B测试支持
  ab_group    VARCHAR(10),              -- 'A' | 'B' | null
  ab_weight   SMALLINT DEFAULT 100,     -- 流量权重
  -- 效果追踪
  avg_quality_score  DECIMAL(3,2),      -- 人工评分均值
  usage_count        INTEGER DEFAULT 0,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  UNIQUE(feature, version)
);
```

版本发布流程：`draft`（编写）→ `active`（上线，同一feature仅一个active版本）→ `archived`（归档）。支持通过`ab_group`进行A/B测试，按权重分流，根据`avg_quality_score`决定最终采纳版本。

---

### 8.5 异步处理管道

#### 8.5.1 Bull Queue各队列配置

```typescript
// queue-config.ts
export const QUEUE_CONFIG: Record<string, QueueOptions> = {
  "call-analysis": {
    concurrency: 5, // 最高频，5个并发
    rateLimiter: { max: 60, duration: 60_000 }, // 60次/分钟
    defaultJobOptions: {
      priority: 1,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 7 * 86400 }, // 7天后清理
      removeOnFail: { age: 30 * 86400 },
      timeout: 180_000, // 3分钟超时
    },
  },
  "customer-profile": {
    concurrency: 3,
    rateLimiter: { max: 30, duration: 60_000 },
    defaultJobOptions: {
      priority: 2,
      attempts: 3,
      timeout: 120_000,
      removeOnComplete: { age: 7 * 86400 },
    },
  },
  "anomaly-detect": {
    concurrency: 2,
    rateLimiter: { max: 10, duration: 60_000 },
    defaultJobOptions: {
      priority: 1,
      attempts: 3,
      timeout: 300_000, // 5分钟(批量数据处理)
    },
  },
  "report-generate": {
    concurrency: 1, // 低频高耗，串行
    rateLimiter: { max: 5, duration: 60_000 },
    defaultJobOptions: {
      priority: 4,
      attempts: 2,
      timeout: 600_000, // 10分钟
    },
  },
};
```

#### 8.5.2 任务处理器

```typescript
// call-analysis.processor.ts
@Processor("call-analysis")
export class CallAnalysisProcessor {
  constructor(
    private claudeService: ClaudeService,
    private promptManager: PromptManagerService,
    private callAnalysisRepo: Repository<CallAnalysis>,
    private notificationService: NotificationService,
  ) {}

  @Process({ concurrency: 5 })
  async handleAnalysis(
    job: Job<CallAnalysisInput>,
  ): Promise<CallAnalysisOutput> {
    const { data } = job;

    // 1. 构建Prompt
    await job.progress(10);
    const systemPrompt = await this.promptManager.buildSystemPrompt(
      "call-analysis",
      data.tenantId,
    );
    const userMessage = this.promptManager.renderTemplate(
      "call-analysis",
      data,
    );

    // 2. 调用Claude分析
    await job.progress(30);
    const response = await this.claudeService.analyze({
      tenantId: data.tenantId,
      feature: "call-analysis",
      systemPrompt,
      userMessage,
      maxTokens: 4096,
      temperature: 0.2,
    });

    // 3. 解析并验证结果
    await job.progress(80);
    const result: CallAnalysisOutput = this.parseAndValidate(response.content);

    // 4. 持久化
    await this.callAnalysisRepo.save({
      callRecordId: data.callId,
      tenantId: data.tenantId,
      sentimentScore: result.sentiment.score,
      sentimentLabel: result.sentiment.overall,
      intentLevel: result.intentLevel,
      intentScore: result.intentScore,
      summary: result.summary,
      keyInfo: result.keyInfo,
      sentimentTimeline: result.sentiment.timeline,
      salesPerformance: result.salesPerformance,
    });

    // 5. 通知前端
    await job.progress(100);
    await this.notificationService.notifyUser(data.tenantId, {
      type: "call-analysis-complete",
      callId: data.callId,
      summary: result.summary,
      intentLevel: result.intentLevel,
    });

    return result;
  }

  @OnQueueFailed()
  async handleFailure(job: Job, error: Error) {
    this.logger.error(`Call analysis failed: ${job.id}`, error.stack);
    if (job.attemptsMade >= job.opts.attempts) {
      // 最终失败，通知用户
      await this.notificationService.notifyUser(job.data.tenantId, {
        type: "call-analysis-failed",
        callId: job.data.callId,
        message: "通话分析失败，请稍后重试",
      });
    }
  }
}
```

#### 8.5.3 WebSocket实时通知

```typescript
// ai-notification.gateway.ts
@WebSocketGateway({ namespace: "/ai-notifications", cors: true })
export class AINotificationGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    const tenantId = client.handshake.auth.tenantId;
    const userId = client.handshake.auth.userId;
    // 加入租户房间和个人房间
    client.join(`tenant:${tenantId}`);
    client.join(`user:${userId}`);
  }

  // 被NotificationService调用
  sendToTenant(tenantId: string, event: string, payload: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }

  sendToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}

// notification.service.ts
@Injectable()
export class NotificationService {
  constructor(private gateway: AINotificationGateway) {}

  async notifyUser(tenantId: string, payload: AINotification) {
    this.gateway.sendToTenant(tenantId, "ai:analysis:complete", {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**前端监听示例：**

```typescript
// 前端WebSocket连接
const socket = io("/ai-notifications", { auth: { tenantId, userId } });

socket.on("ai:analysis:complete", (data) => {
  // 更新UI展示分析结果
  if (data.type === "call-analysis-complete") {
    notification.success({
      message: "通话分析完成",
      description: data.summary,
    });
    queryClient.invalidateQueries(["call-analysis", data.callId]);
  }
});
```

---

### 8.6 性能与成本

#### 8.6.1 API调用频率与月度Token预算估算

**基于100人销售团队的月度估算：**

| 功能     | 月调用次数 | 平均输入Token | 平均输出Token | 月Input费用 | 月Output费用 | 合计        |
| -------- | ---------- | ------------- | ------------- | ----------- | ------------ | ----------- |
| 通话分析 | 6,000      | 3,000         | 1,500         | $54.0       | $135.0       | $189.0      |
| 客户画像 | 1,000      | 4,000         | 1,200         | $12.0       | $18.0        | $30.0       |
| 意向预测 | 2,000      | 2,000         | 800           | $12.0       | $24.0        | $36.0       |
| 话术推荐 | 3,000      | 2,500         | 1,000         | $22.5       | $45.0        | $67.5       |
| 销售预测 | 50         | 5,000         | 2,000         | $0.75       | $1.5         | $2.25       |
| 异常预警 | 60         | 6,000         | 1,500         | $1.08       | $1.35        | $2.43       |
| 竞品分析 | 30         | 8,000         | 2,000         | $0.72       | $0.9         | $1.62       |
| 智能报告 | 50         | 6,000         | 3,000         | $0.9        | $2.25        | $3.15       |
| **合计** | **12,190** |               |               | **$103.95** | **$228.0**   | **$331.95** |

> 注：按Claude Sonnet 4 定价（input $3/MTok, output $15/MTok）估算。实际费用随用量浮动，建议设置月度预算上限$500并配置80%告警阈值。

#### 8.6.2 缓存策略

```typescript
// ai-cache.service.ts
@Injectable()
export class AICacheService {
  // 缓存键生成：对输入内容做SHA256哈希
  private buildCacheKey(feature: string, input: any): string {
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex")
      .substring(0, 16);
    return `ai:cache:${feature}:${hash}`;
  }

  async getOrAnalyze<T>(
    feature: string,
    input: any,
    ttl: number,
    analyzer: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.buildCacheKey(feature, input);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const result = await analyzer();
    await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
    return result;
  }
}
```

**各功能缓存TTL策略：**

| 功能     | 缓存TTL        | 缓存策略说明                         |
| -------- | -------------- | ------------------------------------ |
| 通话分析 | 永久(结果不变) | 相同通话不重复分析，结果入库即为最终 |
| 客户画像 | 7天            | 定期刷新；有新通话/跟进时主动失效    |
| 意向预测 | 24小时         | 每日更新，新交互触发重新预测         |
| 话术推荐 | 24小时         | 相同画像+阶段命中缓存                |
| 销售预测 | 12小时         | 每日2次定时刷新                      |
| 异常预警 | 6小时          | 高时效性，短缓存                     |
| 竞品分析 | 7天            | 按月度批量分析                       |
| 智能报告 | 永久           | 生成后不变，按需重新生成             |

**客户画像主动失效机制：**

```typescript
// customer.listener.ts
@OnEvent('call.analyzed')
@OnEvent('followup.created')
async invalidateCustomerProfile(payload: { customerId: string }) {
  const cachePattern = `ai:cache:customer-profile:*`;
  // 通过关联索引直接删除该客户的画像缓存
  const key = `ai:profile:customer:${payload.customerId}`;
  await this.redis.del(key);
}
```

#### 8.6.3 降级策略

当Claude API不可用时，系统按以下优先级逐级降级：

```typescript
// fallback.service.ts
@Injectable()
export class AIFallbackService {
  async analyzeWithFallback<T>(
    feature: string,
    input: any,
    primaryAnalyzer: () => Promise<T>,
  ): Promise<T & { degraded?: boolean }> {
    // 第1级：尝试主分析（Claude API）
    try {
      return await primaryAnalyzer();
    } catch (error) {
      this.logger.warn(`Primary AI failed for ${feature}, trying fallback`);
    }

    // 第2级：返回历史缓存（即使已过期）
    const staleCache = await this.getStaleCache<T>(feature, input);
    if (staleCache) {
      return { ...staleCache, degraded: true };
    }

    // 第3级：规则引擎兜底（仅部分功能支持）
    if (this.hasRuleEngine(feature)) {
      const ruleResult = await this.ruleEngine.analyze(feature, input);
      return { ...ruleResult, degraded: true };
    }

    // 第4级：返回默认值/空结果 + 加入重试队列
    await this.retryQueue.add(feature, input, { delay: 300_000 }); // 5分钟后重试
    throw new AITemporarilyUnavailableException(feature);
  }

  // 断路器：连续失败5次后自动熔断60秒
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60_000,
  });
}
```

**降级能力矩阵：**

| 功能     | 缓存降级         | 规则引擎兜底                | 延迟重试 | 用户提示         |
| -------- | ---------------- | --------------------------- | -------- | ---------------- |
| 通话分析 | 不适用(首次分析) | 仅情感分关键词匹配          | 是       | "分析延迟中"     |
| 客户画像 | 返回旧版画像     | 基于统计数据生成简版        | 是       | 标注"参考数据"   |
| 意向预测 | 返回上次预测     | 基于阶段+天数规则评分       | 是       | 标注"预估值"     |
| 话术推荐 | 返回通用话术库   | 按阶段匹配标准话术          | 否       | 标注"通用推荐"   |
| 异常预警 | 返回上次预警     | 基于阈值规则(如>14天未联系) | 是       | 正常展示         |
| 智能报告 | 返回纯数据报告   | 生成无AI洞察的统计报告      | 是       | 标注"基础版报告" |

---

以上为AI智能分析模块的完整详细设计。核心设计原则：通过`ClaudeService`统一封装API调用实现可观测性和成本控制；通过Bull Queue异步管道解耦业务请求与AI处理；通过四层Prompt体系实现可维护和可定制；通过多级缓存与降级策略保障系统可用性。

---

### 8.7 接口设计

---

### 8.8 页面设计
