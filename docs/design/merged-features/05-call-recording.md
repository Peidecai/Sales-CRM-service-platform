# 05 — 通话与录音

> 合并来源: 本项目 Call/CallRecord/Recording 模块 + 磐销云通话录音AI分析

## 现有功能（本项目）

- [x] 呼叫中心（Call 模块 — 呼入/呼出/手机原生外呼）
- [x] 通话记录 CRUD + 详情页
- [x] 录音管理（Recording 模块）
- [x] AI 通话摘要自动生成
- [x] AI 自动分类评分（call-summary Bull 队列）
- [x] 语音速记（方案B）
- [x] CSV 导出

## 磐销云通话功能

- AI 通话录音分析
- AI 误判标记（人工纠正AI分析结果）
- 通话意向度判定
- 录音上传（手动上传外部录音）
- 双卡切换（APP端）
- 拍照取号（APP端OCR识别）

## 合并后功能清单

### 5.1 呼叫中心（增强）

| 功能         | 说明                         | 状态          |
| ------------ | ---------------------------- | ------------- |
| 平台呼叫     | 阿里云CCC集成                | 已有          |
| 手机原生外呼 | 方案B                        | 已有          |
| 回呼模式     | 方案D预留                    | 已有          |
| 双卡切换     | APP端选择外呼SIM卡           | **新增(APP)** |
| 拍照取号     | OCR识别名片/截图中的电话号码 | **新增(APP)** |
| 一键外呼     | 客户详情页一键拨打           | 已有增强      |
| 通话弹屏     | 来电时自动弹出客户信息       | **新增**      |

### 5.2 通话记录管理（增强）

| 功能         | 说明                               | 状态     |
| ------------ | ---------------------------------- | -------- |
| 通话记录列表 | 按时间/客户/销售筛选               | 已有     |
| 通话详情     | 基本信息+摘要+评分+录音            | 已有     |
| CSV 导出     | 导出通话记录                       | 已有     |
| 通话标签     | 为通话添加标签（意向/投诉/咨询等） | **新增** |
| 通话备注     | 通话后手动备注                     | 已有增强 |

### 5.3 录音管理（增强）

| 功能         | 说明                       | 状态     |
| ------------ | -------------------------- | -------- |
| 平台录音     | 自动录音存储               | 已有     |
| 语音速记     | 方案B录音                  | 已有     |
| 手动上传录音 | 上传外部录音文件关联到通话 | **新增** |
| 录音在线播放 | Web/APP端播放器            | 已有增强 |
| 录音转文字   | ASR 语音转文本             | 已有增强 |
| 录音批量下载 | 批量下载录音文件           | **新增** |

### 5.4 AI 通话分析（核心增强）

| 功能           | 说明                                       | 状态     |
| -------------- | ------------------------------------------ | -------- |
| AI 摘要生成    | 通话内容自动摘要                           | 已有     |
| AI 分类评分    | 自动分类（意向/咨询/投诉等）+ 评分         | 已有     |
| AI 意向度分级  | A/B/C/D/E 五级意向判定                     | **新增** |
| AI 话术评估    | 评估销售话术质量（开场白/异议处理/促成等） | **新增** |
| AI 谈判分析    | 分析通话中的谈判要点/让步点                | **新增** |
| AI 误判标记    | 人工标记AI分析不准确，用于模型优化         | **新增** |
| AI 重新分析    | 对标记误判的录音重新AI分析                 | **新增** |
| 话术关键词提取 | 提取通话中的关键词/高频词                  | **新增** |
| 客户情绪分析   | 分析通话中客户情绪变化                     | **新增** |

### 5.5 AI 意向度枚举

```typescript
enum CallIntention {
  A = "A", // 明确意向，近期可签
  B = "B", // 有意向，需跟进
  C = "C", // 一般意向，持观望态度
  D = "D", // 意向不明，需继续培育
  E = "E", // 无意向/拒绝
}

enum SpeechSkillDimension {
  OPENING = "opening", // 开场白
  NEEDS_DISCOVERY = "needs_discovery", // 需求挖掘
  PRODUCT_INTRO = "product_intro", // 产品介绍
  OBJECTION_HANDLING = "objection", // 异议处理
  CLOSING = "closing", // 促成话术
  EMOTION_MANAGEMENT = "emotion", // 情绪管理
}
```

## 后端接口（新增部分）

| 接口                                   | 方法 | 说明         |
| -------------------------------------- | ---- | ------------ |
| `/api/v1/call-records/:id/intention`   | GET  | AI 意向度    |
| `/api/v1/call-records/:id/speech-eval` | GET  | 话术评估结果 |
| `/api/v1/call-records/:id/negotiation` | GET  | 谈判分析     |
| `/api/v1/call-records/:id/misjudgment` | POST | 标记AI误判   |
| `/api/v1/call-records/:id/reanalyze`   | POST | 重新AI分析   |
| `/api/v1/call-records/:id/emotion`     | GET  | 客户情绪分析 |
| `/api/v1/recordings/upload`            | POST | 手动上传录音 |
| `/api/v1/recordings/batch-download`    | POST | 批量下载录音 |

## 涉及模块

- `packages/server/src/modules/call/` (增强)
- `packages/server/src/modules/call-record/` (增强)
- `packages/server/src/modules/recording/` (增强)
- `packages/server/src/modules/ai/` (增强 — 意向度/话术/谈判分析)
- `packages/web/src/views/call-record/` (增强)
- `packages/web/src/views/call-center/` (增强)
