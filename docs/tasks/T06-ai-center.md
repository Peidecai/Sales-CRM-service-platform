# T06 — AI 智能中心 开发任务

## 任务概述

- **目标**: 增强 AI 模块，新增 Copilot 对话助手(CRM数据查询/报表生成/客户画像)、员工画像、客户画像(NBA/流失预警/最佳联系时间)、知识库增强(话术库/版本管理)、全局浮窗
- **优先级**: P2
- **依赖模块**: ai, knowledge, customer, call-record, opportunity, follow-up, user

## 现有模块

| 模块           | 路径                            | 状态                                            |
| -------------- | ------------------------------- | ----------------------------------------------- |
| AI             | `server/src/modules/ai/`        | 已有（chat, embed, call-summary队列, fallback） |
| Knowledge      | `server/src/modules/knowledge/` | 已有（文章CRUD+分类+RAG向量检索）               |
| AI 视图        | `web/src/views/ai/`             | 已有                                            |
| Knowledge 视图 | `web/src/views/knowledge/`      | 已有                                            |

## 子任务清单

### 后端任务

| #   | 标题                           | 涉及文件                                                      | 依赖   | 验收标准                                                                  |
| --- | ------------------------------ | ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| B1  | Copilot Service — CRM 数据查询 | `server/src/modules/ai/ai-copilot.service.ts` (新建)          | —      | queryCrm(naturalLanguageQuery, user): 自然语言→SQL/Service调用→结构化结果 |
| B2  | Copilot Service — 增强 Chat    | 同上                                                          | B1     | copilotChat(message, context, user): 整合RAG+CRM查询+上下文的对话         |
| B3  | Copilot — 报表生成             | 同上                                                          | B1     | generateReport(description, user): AI 根据描述生成报表数据+图表配置       |
| B4  | Copilot — 跟进建议             | 同上                                                          | —      | suggestFollowUps(user): 分析客户跟进状态，推荐今日优先联系列表            |
| B5  | Employee Profile Service       | `server/src/modules/ai/ai-employee-profile.service.ts` (新建) | —      | getProfile(userId): 聚合通话评分+业绩+跟进数据生成画像                    |
| B6  | Employee — 能力雷达图          | 同上                                                          | B5     | getRadar(userId): 多维度能力评分(话术/转化/跟进/客户管理/业绩)            |
| B7  | Employee — 成长曲线            | 同上                                                          | B5     | getGrowthCurve(userId, months): 月度能力变化趋势                          |
| B8  | Employee — 标杆对比            | 同上                                                          | B5     | compareBenchmark(userId): 与团队TOP3平均值对比                            |
| B9  | Customer Profile — 画像生成    | `server/src/modules/ai/ai-customer-profile.service.ts` (新建) | —      | getProfile(customerId): 聚合所有交互数据生成综合画像                      |
| B10 | Customer — NBA                 | 同上                                                          | B9     | getNextBestAction(customerId): 推荐下一步操作                             |
| B11 | Customer — 流失预警            | 同上                                                          | B9     | getChurnRisk(customerId): 预测流失概率+原因                               |
| B12 | Customer — 最佳联系时间        | 同上                                                          | —      | getBestContactTime(customerId): 分析历史接通率按小时统计                  |
| B13 | 知识库 — 话术模板              | `server/src/modules/knowledge/` 增强                          | —      | SpeechTemplate entity + CRUD，分类: 开场白/异议处理/促成等                |
| B14 | 知识库 — 版本管理              | `server/src/modules/knowledge/` 增强                          | —      | KnowledgeArticleVersion entity，文章每次编辑保存版本                      |
| B15 | Controller 端点                | `server/src/modules/ai/ai.controller.ts`                      | B1-B14 | 10 个新端点(见功能文档接口表)                                             |

### 前端任务

| #   | 标题                  | 涉及文件                                                          | 依赖   | 验收标准                                                         |
| --- | --------------------- | ----------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| F1  | AI Copilot 全局浮窗   | `web/src/components/AiCopilot/` (新建)                            | B2     | 右下角悬浮按钮 → 展开对话面板，支持知识问答/CRM查询/报表生成     |
| F2  | Copilot 对话面板      | `web/src/components/AiCopilot/ChatPanel.vue`                      | F1     | 消息列表+输入框+快捷指令(/客户/报表/跟进)，流式响应              |
| F3  | Copilot 集成到 Layout | `web/src/layout/DefaultLayout.vue`                                | F1     | 全局挂载 AiCopilot 组件                                          |
| F4  | 员工画像页面          | `web/src/views/ai/employee-profile/index.vue` (新建)              | B5-B8  | 能力雷达图+成长曲线+优劣势分析+培训推荐+标杆对比                 |
| F5  | 客户AI画像组件        | `web/src/views/customer/components/AiProfileTab.vue` 增强(T03-F3) | B9-B12 | 画像卡片+NBA建议+流失预警+最佳联系时间                           |
| F6  | 话术库页面            | `web/src/views/knowledge/speech-templates/index.vue` (新建)       | B13    | 话术模板列表+分类筛选+搜索+创建/编辑                             |
| F7  | 文章版本历史          | `web/src/views/knowledge/components/VersionHistory.vue`           | B14    | 文章详情页新增版本历史 Tab，支持版本对比                         |
| F8  | AI API 层             | `web/src/api/ai.ts` 增强                                          | B15    | copilotChat, queryCrm, getEmployeeProfile, getCustomerProfile 等 |
| F9  | 路由 + 菜单           | `web/src/router/index.ts`                                         | F4,F6  | /ai/employee-profile/:id, /knowledge/speech-templates            |

### 数据库迁移

| #   | 文件                                             | DDL                                                                                                                     |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| M1  | `1709000081000-CreateSpeechTemplate.ts`          | `speech_template` 表: id, title, content, category(enum), tags(json), isPublic, userId, createdAt, updatedAt, deletedAt |
| M2  | `1709000082000-CreateKnowledgeArticleVersion.ts` | `knowledge_article_version` 表: id, articleId(FK), version(int), title, content, editedBy(FK), createdAt                |

### 测试任务

| #   | 标题                     | 文件                                                    | 验收标准                               |
| --- | ------------------------ | ------------------------------------------------------- | -------------------------------------- |
| T1  | AiCopilotService         | `server/test/ai/ai-copilot.service.spec.ts`             | ≥15 tests (CRM查询+对话+报表+跟进建议) |
| T2  | AiEmployeeProfileService | `server/test/ai/ai-employee-profile.service.spec.ts`    | ≥12 tests (画像+雷达+成长+对比)        |
| T3  | AiCustomerProfileService | `server/test/ai/ai-customer-profile.service.spec.ts`    | ≥12 tests (画像+NBA+流失+最佳时间)     |
| T4  | 话术模板 CRUD            | `server/test/knowledge/speech-template.service.spec.ts` | ≥8 tests                               |
| T5  | E2E — Copilot 浮窗       | `e2e/ai-copilot.spec.ts`                                | 打开/关闭/发送消息/收到回复            |

## 边界与约束

- **Scope 外**: 微信绑定/分析（第三方依赖）、模型微调（需 MLOps 基础设施）
- **安全**: Copilot CRM 查询必须走 Service 层，禁止直接拼 SQL；数据权限与原接口一致
- **性能**: Copilot 流式响应(SSE)；员工画像缓存 1h；最佳联系时间缓存 24h
- **模块接口**: AiCopilotService 依赖各业务 Module 的 Service，通过 Module import 获取

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `security-review`
- **AI Prompt**: 各功能独立 prompt template，存为 service 常量或 knowledge 表
- **流式响应**: Copilot chat 使用 SSE (`@Sse()` 装饰器 + Observable)
- **缓存**: employee-profile key `ai:emp-profile:{userId}` TTL 1h; best-contact-time key `ai:bct:{customerId}` TTL 24h

## Claude Code 提示词

### B1-B4: Copilot Service

```
新建 packages/server/src/modules/ai/ai-copilot.service.ts：
1. 注入 AiService, CustomerService, OpportunityService, CallRecordService, FollowUpService, KnowledgeService
2. copilotChat(message, conversationHistory[], user):
   - 意图识别: 用 AI 判断用户意图(知识问答/CRM查询/报表/跟进建议/闲聊)
   - 知识问答: 走现有 RAG 流程
   - CRM查询: 调用 queryCrm
   - 报表: 调用 generateReport
   - 使用 SSE 流式返回
3. queryCrm(query, user):
   - AI 解析自然语言为结构化查询意图(entity, filters, aggregation)
   - 调用对应 Service 方法(不直接写 SQL)
   - 格式化结果返回
4. generateReport(description, user):
   - AI 解析报表需求 → 调用聚合查询 → 返回数据+ECharts配置建议
5. suggestFollowUps(user):
   - 查询用户客户中: 最近30天未联系 + 商机停滞 + 回款到期
   - AI 排序优先级 + 生成建议话术
在 ai.controller.ts 新增 POST /copilot/chat (SSE), POST /copilot/query-crm
```

### B5-B8: 员工画像

```
新建 packages/server/src/modules/ai/ai-employee-profile.service.ts：
1. 注入 CallRecordService, OpportunityService, FollowUpService, UserService, AiService, RedisService
2. getProfile(userId):
   - 聚合: 月均通话量/接通率/平均评分/签单数/签单金额/跟进频率/转化率
   - 调用 AiService.chat 生成文字画像(优势+待提升+建议)
   - 缓存 1h
3. getRadar(userId):
   - 5维度: 话术能力(平均speechScore), 转化能力(商机转化率), 跟进勤勉(跟进频率), 客户管理(客户活跃率), 业绩表现(目标完成率)
   - 每个维度 0-100 分
4. getGrowthCurve(userId, months=6):
   - 按月聚合5维度评分，返回时间序列
5. compareBenchmark(userId):
   - 查询同部门 TOP3 的平均分 vs 当前用户
在 ai.controller.ts 新增 GET /employee-profile/:userId, /radar, /growth
```

### F1-F3: AI Copilot 全局浮窗

```
新建 packages/web/src/components/AiCopilot/ 目录：
1. AiCopilot.vue: 主容器 — 右下角悬浮按钮(el-button circle) + 展开面板(fixed定位, 400x600)
2. ChatPanel.vue: 对话面板
   - 消息列表(v-for messages, 区分user/assistant/system)
   - 输入框(el-input + 发送按钮)
   - 快捷指令: 输入 / 弹出指令列表(/客户 XX, /报表 XX, /跟进)
   - SSE 流式接收: 使用 EventSource 或 fetch + ReadableStream
3. MessageBubble.vue: 消息气泡(支持 Markdown 渲染)
4. 在 DefaultLayout.vue 全局挂载 <AiCopilot />
5. 使用 Pinia store 管理对话历史(会话级别)
```

### B13-B14: 知识库增强

```
增强 packages/server/src/modules/knowledge/：
1. 新建 entities/speech-template.entity.ts:
   - title, content(text), category(SpeechTemplateCategory enum: OPENING/NEEDS_DISCOVERY/PRODUCT_INTRO/OBJECTION/CLOSING/EMOTION), tags(simple-json), isPublic(boolean), userId(ManyToOne User)
2. speech-template.service.ts: findAll(分页+分类筛选+搜索), create, update, delete
3. speech-template.controller.ts: GET/POST/PUT/DELETE /ai/speech-templates
4. 新建 entities/knowledge-article-version.entity.ts:
   - articleId(ManyToOne), version(int), title, content, editedBy(ManyToOne User)
5. 修改 knowledge.service.ts: update() 时自动创建 version 记录
6. 新增 getVersionHistory(articleId), getVersion(articleId, version), diffVersions(articleId, v1, v2)
```
