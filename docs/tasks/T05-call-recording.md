# T05 — 通话与录音 开发任务

## 任务概述

- **目标**: 增强通话录音AI分析，新增意向度分级、话术评估、谈判分析、误判标记、录音上传、通话弹屏
- **优先级**: P1
- **依赖模块**: call, call-record, recording, ai

## 现有模块

| 模块            | 路径                              | 状态                                          |
| --------------- | --------------------------------- | --------------------------------------------- |
| Call            | `server/src/modules/call/`        | 已有（呼叫中心、平台呼叫/手机外呼/回呼）      |
| CallRecord      | `server/src/modules/call-record/` | 已有（CRUD+详情+AI摘要+自动分类评分+CSV导出） |
| Recording       | `server/src/modules/recording/`   | 已有（录音管理+语音速记）                     |
| AI              | `server/src/modules/ai/`          | 已有（chat/embed/call-summary队列）           |
| CallRecord 视图 | `web/src/views/call-record/`      | 已有（列表+详情）                             |
| CallCenter 视图 | `web/src/views/call-center/`      | 已有                                          |

## 子任务清单

### 后端任务

| #   | 标题                             | 涉及文件                                                                                    | 依赖   | 验收标准                                                                                               |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| B1  | CallIntention 枚举 + Entity 字段 | `shared/src/types/call.ts`, `server/src/modules/call-record/entities/call-record.entity.ts` | —      | intention(A-E), speechScore(JSON), negotiationAnalysis(JSON), emotionAnalysis(JSON)                    |
| B2  | AI 意向度分析                    | `server/src/modules/ai/ai-call-analysis.service.ts` (新建或增强)                            | B1     | analyzeIntention(transcript): 返回 A-E 分级+理由                                                       |
| B3  | AI 话术评估                      | 同上                                                                                        | B1     | evaluateSpeech(transcript): 6维度评分(opening/needs_discovery/product_intro/objection/closing/emotion) |
| B4  | AI 谈判分析                      | 同上                                                                                        | B1     | analyzeNegotiation(transcript): 提取谈判要点/让步点/建议                                               |
| B5  | AI 情绪分析                      | 同上                                                                                        | B1     | analyzeEmotion(transcript): 时间线情绪变化(positive/neutral/negative)                                  |
| B6  | AI 关键词提取                    | 同上                                                                                        | B1     | extractKeywords(transcript): 高频关键词+TF-IDF                                                         |
| B7  | 误判标记 + 重新分析              | `server/src/modules/call-record/call-record.service.ts`                                     | B2-B6  | markMisjudgment(id, field, correctValue, reason), reanalyze(id): 重新调用 AI 分析管道                  |
| B8  | 增强 call-summary 队列           | `server/src/modules/call-record/` (Bull processor)                                          | B2-B6  | 通话结束后自动触发: 摘要+分类+意向度+话术评估(串行管道)                                                |
| B9  | 录音上传接口                     | `server/src/modules/recording/recording.controller.ts`                                      | —      | POST /recordings/upload: 上传音频文件+关联 callRecordId                                                |
| B10 | 录音批量下载                     | `server/src/modules/recording/recording.service.ts`                                         | —      | batchDownload(ids[]): 打包 ZIP 下载                                                                    |
| B11 | 通话弹屏接口                     | `server/src/modules/call/call.service.ts`                                                   | —      | getCallerInfo(phone): 来电号码匹配客户信息，通过 WebSocket 推送                                        |
| B12 | 通话标签                         | `server/src/modules/call-record/`                                                           | —      | CallRecordTag entity + addTag/removeTag                                                                |
| B13 | Controller 端点                  | 各 controller                                                                               | B2-B12 | 见功能文档接口表共 8 个新端点                                                                          |

### 前端任务

| #   | 标题                      | 涉及文件                                                   | 依赖 | 验收标准                                                                   |
| --- | ------------------------- | ---------------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| F1  | CallRecord API 增强       | `web/src/api/call-record.ts`                               | B13  | getIntention, getSpeechEval, getNegotiation, markMisjudgment, reanalyze 等 |
| F2  | 通话详情页增强 — 意向度   | `web/src/views/call-record/detail.vue`                     | F1   | 意向度徽章(A绿/B蓝/C黄/D橙/E红) + AI 分析理由                              |
| F3  | 通话详情页增强 — 话术评估 | 同上或子组件                                               | F1   | 6维度雷达图(ECharts) + 各维度得分详情                                      |
| F4  | 通话详情页增强 — 谈判分析 | 同上或子组件                                               | F1   | 谈判要点列表+让步点标记+策略建议                                           |
| F5  | 通话详情页增强 — 情绪曲线 | 同上或子组件                                               | F1   | ECharts 时间线折线图(情绪变化)                                             |
| F6  | 误判标记组件              | `web/src/views/call-record/components/MisjudgmentMark.vue` | F1   | 点击AI分析结果旁「标记误判」→ 弹窗输入正确值+原因 → 支持重新分析           |
| F7  | 录音上传组件              | `web/src/views/call-record/components/RecordingUpload.vue` | F1   | el-upload 上传音频文件，关联到当前通话记录                                 |
| F8  | 通话弹屏组件              | `web/src/views/call-center/components/CallerPopup.vue`     | F1   | WebSocket 监听来电事件 → 右下角弹窗显示客户信息                            |
| F9  | 通话标签选择              | `web/src/views/call-record/components/CallTags.vue`        | F1   | 多标签选择器(意向/咨询/投诉/成单等)                                        |
| F10 | 通话列表增强              | `web/src/views/call-record/index.vue`                      | F1   | 列表增加意向度列(彩色Tag)+标签列+筛选条件                                  |

### 数据库迁移

| #   | 文件                                     | DDL                                                                                                                                 |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `1709000078000-AddCallRecordAiFields.ts` | call_record 表加 `intention` varchar(2), `speech_score` json, `negotiation_analysis` json, `emotion_analysis` json, `keywords` json |
| M2  | `1709000079000-AddMisjudgmentFields.ts`  | call_record 表加 `misjudgment_marked` boolean default false, `misjudgment_reason` text, `misjudgment_corrections` json              |
| M3  | `1709000080000-CreateCallRecordTag.ts`   | `call_record_tag` 表: id, callRecordId(FK), name, createdAt                                                                         |

### 测试任务

| #   | 标题                  | 文件                                              | 验收标准                                 |
| --- | --------------------- | ------------------------------------------------- | ---------------------------------------- |
| T1  | AiCallAnalysisService | `server/test/ai/ai-call-analysis.service.spec.ts` | ≥20 tests (意向度+话术+谈判+情绪+关键词) |
| T2  | 误判标记+重新分析     | `server/test/call-record/misjudgment.spec.ts`     | ≥8 tests                                 |
| T3  | 录音上传              | `server/test/recording/recording-upload.spec.ts`  | ≥6 tests (上传+关联+格式校验)            |
| T4  | 通话弹屏              | `server/test/call/caller-popup.spec.ts`           | ≥5 tests                                 |
| T5  | E2E — 通话详情AI分析  | `e2e/call-record-ai.spec.ts`                      | 意向度+话术雷达图+误判标记               |

## 边界与约束

- **Scope 外**: APP端双卡切换、拍照取号（属于 T13-移动端）；ASR 引擎切换（已有方案B）
- **安全**: 录音上传限制格式(mp3/wav/m4a)、大小(≤100MB)；误判标记记录操作者
- **性能**: AI 分析管道异步(Bull 队列)；情绪分析按 30s 窗口采样；批量下载打 ZIP 限 ≤50 个录音
- **模块接口**: AiCallAnalysisService 由 CallRecord 的 Bull 队列 processor 调用

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `security-review`
- **枚举**: CallIntention(A-E), SpeechSkillDimension(6维度) 定义在 `@crm/shared`
- **AI Prompt**: 意向度/话术/谈判分析各用独立 prompt template，存在 service 常量中
- **缓存**: AI 分析结果持久化到 call_record 表列，不单独缓存

## Claude Code 提示词

### B1-B6: AI 通话分析服务

```
在 packages/server/src/modules/ai/ 新建或增强 ai-call-analysis.service.ts：
1. 在 @crm/shared 新增枚举 CallIntention(A/B/C/D/E) 和 SpeechSkillDimension(6维度)
2. analyzeIntention(transcript: string): Promise<{intention: CallIntention, reason: string}>
   - Prompt: "分析以下通话内容，判断客户意向度(A-E)，A=明确意向近期可签..."
3. evaluateSpeech(transcript: string): Promise<Record<SpeechSkillDimension, {score: number, comment: string}>>
   - 每个维度 0-100 分 + 评语
4. analyzeNegotiation(transcript: string): Promise<{keyPoints: string[], concessions: string[], suggestions: string[]}>
5. analyzeEmotion(transcript: string): Promise<{timeline: {timestamp: string, emotion: 'positive'|'neutral'|'negative', confidence: number}[]}>
6. extractKeywords(transcript: string): Promise<{keyword: string, frequency: number, importance: number}[]>
所有方法调用 this.aiService.chat() 并解析 JSON 响应。添加错误处理和重试逻辑。
```

### B7: 误判标记

```
在 packages/server/src/modules/call-record/call-record.service.ts 新增：
1. markMisjudgment(callRecordId, field: string, correctValue: unknown, reason: string, user):
   - 校验所有权
   - 更新 misjudgment_marked=true, 记录 misjudgment_corrections[field]={original, corrected, reason, markedBy, markedAt}
   - 写审计日志
2. reanalyze(callRecordId, user):
   - 重新投入 call-summary Bull 队列
   - 清除旧的 AI 分析结果
   - 返回 jobId 供前端轮询
```

### B8: 增强 call-summary 队列

```
修改 packages/server/src/modules/call-record/ 的 Bull 队列 processor：
现有管道: 摘要 → 分类评分
增强为: 摘要 → 分类评分 → 意向度分析 → 话术评估
1. 注入 AiCallAnalysisService
2. 在 processor 中串行调用: summary → classify → analyzeIntention → evaluateSpeech
3. 将结果写入 call_record 的对应字段(intention, speech_score)
4. 谈判分析和情绪分析标记为 on-demand(仅用户请求时触发)，不放入自动管道
5. 失败时单步重试，不阻塞后续步骤
```

### F2-F6: 通话详情前端增强

```
增强 packages/web/src/views/call-record/detail.vue：
1. 意向度区域: 显示彩色徽章(A绿/B蓝/C黄/D橙/E红) + AI分析理由文本
2. 新建 components/SpeechRadar.vue: ECharts radar 图，6维度(开场白/需求挖掘/产品介绍/异议处理/促成/情绪管理)
3. 新建 components/NegotiationPanel.vue: 谈判要点(el-tag list) + 让步点(带图标) + 策略建议(el-alert)
4. 新建 components/EmotionTimeline.vue: ECharts line 图，X轴时间，Y轴情绪值(-1~1)
5. 新建 components/MisjudgmentMark.vue: 每个AI分析结果旁显示「标记误判」图标按钮 → el-dialog 填写正确值+原因 → 提交后显示已标记状态
6. 按需加载: 谈判分析和情绪分析 Tab 点击时才请求 API
使用 Element Plus + ECharts + <script setup>。
```
