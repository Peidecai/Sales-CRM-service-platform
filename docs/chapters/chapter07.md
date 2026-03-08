## 7. 呼叫中心详细设计

### 7.1 设计目标与范围

呼叫中心模块为 CRM 提供统一的电话接入、通话处理、录音归档、语音识别与 AI 分析能力，覆盖销售外呼、客户来电接待、批量外呼任务和坐席管理等核心场景。  
本章设计范围包含：

- 呼叫链路：SIP 呼叫、来电弹屏、录音与后处理
- 实时能力：WebSocket 状态同步与事件通知
- 管理能力：坐席状态机、呼叫分配、监控统计
- 第三方集成：阿里云语音服务、讯飞 ASR、Claude API、阿里云 OSS
- 页面与接口：坐席工作台、通话记录、任务管理、统计看板

---

### 7.2 系统集成架构

#### 7.2.1 总体集成架构（ASCII）

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                              AI CRM 呼叫中心系统                              │
├───────────────────────────────────────────────────────────────────────────────┤
│  Web 前端（坐席工作台）                                                       │
│  - 软电话条  - 来电弹屏  - 通话记录  - 任务管理  - 统计看板                  │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │ HTTPS + WSS
                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          呼叫中心应用服务（Call Service）                     │
│                                                                               │
│  ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────────────┐ │
│  │ Call Control       │  │ Recording Pipeline │  │ Realtime Gateway        │ │
│  │ - 外呼/接听/挂断   │  │ - 录音回调处理      │  │ - WebSocket 事件推送    │ │
│  │ - IVR/转接/队列    │  │ - OSS 上传确认      │  │ - 坐席状态同步          │ │
│  └─────────┬──────────┘  └─────────┬──────────┘  └──────────┬──────────────┘ │
│            │                       │                         │                │
│  ┌─────────▼──────────┐  ┌────────▼──────────┐  ┌──────────▼──────────────┐ │
│  │ Customer Matcher   │  │ ASR Adapter        │  │ AI Analyzer             │ │
│  │ - 电话号匹配客户   │  │ - iFlytek接口封装  │  │ - Claude API 调用       │ │
│  │ - 弹屏数据聚合     │  │ - 转写任务管理      │  │ - 摘要/建议/标签提取    │ │
│  └─────────┬──────────┘  └────────┬──────────┘  └──────────┬──────────────┘ │
└────────────┼──────────────────────┼─────────────────────────┼────────────────┘
             │                      │                         │
             ▼                      ▼                         ▼
   ┌─────────────────┐    ┌──────────────────┐      ┌──────────────────────┐
   │ 阿里云语音服务   │    │ 讯飞 ASR         │      │ Claude API           │
   │ - SIP 通话控制   │    │ - 录音转写       │      │ - 对话内容语义分析    │
   │ - 录音文件回调   │    │ - 关键词/标点    │      │ - 跟进建议生成        │
   └────────┬────────┘    └──────────────────┘      └──────────────────────┘
            │
            ▼
      ┌───────────────┐
      │ 阿里云 OSS     │
      │ - 录音文件存储 │
      │ - 生命周期策略 │
      └───────────────┘

数据层：MySQL（业务数据） + Redis（坐席状态/队列/会话缓存）
```

#### 7.2.2 模块职责划分

- `Call Control`：统一封装拨号、接听、挂断、静音、保持、转接、三方通话等控制指令。
- `Customer Matcher`：来电/外呼号码归一化后，按“主手机号 > 联系人手机号 > 历史临时号码”匹配客户。
- `Recording Pipeline`：接收录音完成回调，做文件校验、OSS 持久化、转写任务触发。
- `ASR Adapter`：管理转写任务状态（待转写、转写中、完成、失败重试）。
- `AI Analyzer`：将转写文本结构化后提交 Claude，生成摘要、意向评分、异议点、下一步建议。
- `Realtime Gateway`：向坐席端和主管端实时推送来电、坐席状态、通话状态、任务进度等事件。

---

### 7.3 核心业务流程

#### 7.3.1 外呼流程（详细时序图）

```text
参与方：
坐席前端 -> CRM后端 -> 阿里云语音服务 -> 客户
                         │
                         └-> 回调CRM后端 -> OSS/ASR/Claude

1) 坐席点击“一键外呼”
2) 前端 POST /api/v1/call-center/calls/dial {customerId, phone}
3) 后端校验：
   - 坐席状态=空闲/可外呼
   - 号码合法性与黑名单
   - 客户归属与权限
4) 后端调用阿里云语音SDK发起外呼
5) 阿里云返回 callId，后端写入 call_records(status=RINGING)
6) 后端通过WS推送 CALL_STATUS_CHANGED(RINGING)
7) 客户接通后，阿里云回调“已接通”
8) 后端更新 call_records(status=CONNECTED, answeredAt)
9) 后端启动录音标记、WS推送通话计时开始
10) 通话中坐席可执行：
    - 静音/保持/转接/三方（调用控制接口）
11) 坐席或客户挂断
12) 阿里云回调“通话结束+时长+录音文件信息”
13) 后端更新 call_records(status=ENDED, duration, endReason)
14) 进入录音后处理流程（见 7.3.3）
15) AI分析完成后，WS推送 ANALYSIS_COMPLETED，前端刷新摘要与建议
```

#### 7.3.2 来电弹屏流程

```text
[阿里云来电事件]
      |
      v
CRM后端接收来电回调(inboundNumber, caller, sessionId)
      |
      +--> 号码归一化(区号/国家码/脱敏还原)
      |
      +--> 客户匹配:
      |      1. customers.mobile = caller
      |      2. contacts.mobile = caller
      |      3. call_history.last_used_number = caller
      |
      +--> 生成弹屏数据:
      |      客户基本信息 + 最近3次跟进 + 最近通话摘要 + 待办
      |
      +--> 路由坐席:
             - 指定坐席优先
             - 队列分配策略
             - 无人可接则进入IVR/排队
      |
      v
WebSocket推送 INCOMING_CALL_POPUP 给目标坐席
      |
      +--> 坐席接听：进入通话中
      +--> 超时未接：转下个坐席/进入IVR
      +--> 拒接：记录未接原因并重分配
```

#### 7.3.3 录音处理流程（录音 -> OSS -> ASR -> AI 分析）

```text
通话结束
  |
  v
阿里云回调录音元数据(recordingUrl, callId, duration, codec)
  |
  +--> Step1 文件处理
  |    - 下载或拉取录音
  |    - 校验格式/时长/完整性
  |    - 生成文件指纹(md5/sha256)
  |
  +--> Step2 OSS入库
  |    - 存储路径: oss://crm-call-recordings/{yyyy}/{MM}/{dd}/{callId}.wav
  |    - 写入 recording_files 表
  |
  +--> Step3 触发ASR
  |    - 创建 asr_tasks(status=PENDING)
  |    - 调用讯飞ASR异步接口
  |
  +--> Step4 ASR结果回传
  |    - 保存 transcript_full / speaker_segments / confidence
  |    - asr_tasks -> SUCCESS/FAILED
  |
  +--> Step5 Claude分析
  |    - 输入: 转写文本 + 客户标签 + 历史上下文
  |    - 输出: 摘要、客户意向、异议点、行动建议、风险提示
  |
  +--> Step6 结构化入库
  |    - call_ai_analysis
  |    - followup_recommendations
  |
  +--> Step7 通知前端
       - WS: ANALYSIS_COMPLETED
       - 页面自动可见录音+转写+AI结果
```

#### 7.3.4 批量外呼任务流程

```text
创建任务(任务名、客户池、外呼时段、并发、重试策略)
   |
   v
任务预检
- 剔除空号/黑名单/重复号码
- 检查坐席容量与并发上限
- 生成待呼叫队列 campaign_call_items
   |
   v
任务启动(手动/定时)
   |
   +--> 调度器按策略派单:
   |    - 轮询/最少通话/技能路由
   |    - 控制队列速率QPS和并发
   |
   +--> 发起外呼并实时记录结果:
   |    CONNECTED / NO_ANSWER / BUSY / INVALID / FAILED
   |
   +--> 失败重试:
   |    按规则N次重拨，设置重拨间隔
   |
   +--> 完成判定:
   |    全部处理完成或超出结束时间窗
   |
   v
任务汇总
- 接通率、有效通话率、平均通话时长
- 坐席绩效与客户标签更新
- 导出日报/复盘报表
```

---

### 7.4 WebSocket 实时通信设计

#### 7.4.1 连接与鉴权

- 协议：`wss://{host}/ws/call-center`
- 鉴权：JWT + 会话签名（连接时校验，定期续期）
- 连接范围：坐席端、主管监控端、管理员端
- 心跳机制：`PING/PONG`（30s），超时自动断线重连

#### 7.4.2 坐席状态同步

- 客户端上报：`AGENT_STATUS_UPDATE`（READY/BUSY/ON_CALL/WRAP_UP/OFFLINE）
- 服务端广播：`AGENT_STATUS_BROADCAST`（给同队列坐席和主管端）
- Redis 保存实时状态：`agent:{agentId}:state`，TTL 防脏状态
- 幂等控制：状态变更带 `version`，旧版本更新直接丢弃

#### 7.4.3 来电通知推送

- 事件：`INCOMING_CALL_POPUP`
- 载荷：`sessionId, caller, customerProfile, recentActivities, queueInfo, timeoutSec`
- 推送策略：单播（分配坐席）+ 备份候选（超时后升级）
- 失败处理：坐席离线则自动重分配，并写入 `dispatch_logs`

#### 7.4.4 通话状态变更

- 事件枚举：
  - `CALL_RINGING`
  - `CALL_CONNECTED`
  - `CALL_HELD`
  - `CALL_TRANSFERRED`
  - `CALL_ENDED`
  - `RECORDING_READY`
  - `ANALYSIS_COMPLETED`
- 顺序保证：同 `callId` 严格按序（服务端单分区队列）
- 去重机制：事件携带 `eventId`，客户端本地缓存最近 200 条去重

---

### 7.5 页面设计

#### 7.5.1 坐席工作台

页面布局采用“三栏结构”：

1. 左侧：软电话条与坐席状态
2. 中间：客户信息与当前通话面板
3. 右侧：跟进记录与 AI 建议

核心区块：

- 软电话条：拨号盘、接听/挂断、静音、保持、转接、通话计时
- 客户信息卡：姓名、公司、标签、商机阶段、最近跟进
- 跟进记录：时间线、快速备注、下次跟进时间
- AI 助手区：实时摘要（通话后）、异议识别、推荐话术

#### 7.5.2 通话记录列表页

- 查询条件：日期、坐席、通话方向、通话结果、客户、任务来源
- 列表字段：通话时间、客户、号码、方向、时长、状态、录音、AI评分
- 批量操作：导出、批量打标签、批量创建跟进任务

#### 7.5.3 通话详情页（录音播放、AI分析结果）

- 顶部：通话基础信息（callId、时长、坐席、结束原因）
- 中部左侧：录音播放器（倍速、拖拽、片段标记）
- 中部右侧：逐句转写（按时间轴定位）
- 底部：AI 结构化分析
  - 通话摘要
  - 客户意向评分（0-100）
  - 关键异议点
  - 下一步行动建议（可一键转跟进任务）

#### 7.5.4 外呼任务管理页

- 任务配置：客户来源、时间窗口、并发数、重试策略、坐席池
- 任务监控：进行中任务、实时接通率、队列长度、失败原因分布
- 任务复盘：按任务查看转化漏斗与坐席表现排行

#### 7.5.5 通话统计看板

- 实时指标：在线坐席数、当前排队、今日外呼量、当前接通率
- 趋势图：小时级呼叫量、接通率趋势、平均通话时长
- 质量图：ASR 成功率、AI 分析完成率、录音上传成功率
- 维度钻取：团队/坐席/任务/客户等级

---

### 7.6 接口设计（完整接口列表）

统一前缀：`/api/v1/call-center`

#### 7.6.1 呼叫控制接口

| 接口                        | 方法 | 说明                 |
| --------------------------- | ---- | -------------------- |
| `/calls/dial`               | POST | 发起外呼             |
| `/calls/{callId}/answer`    | POST | 接听来电             |
| `/calls/{callId}/hangup`    | POST | 挂断                 |
| `/calls/{callId}/mute`      | POST | 静音                 |
| `/calls/{callId}/unmute`    | POST | 取消静音             |
| `/calls/{callId}/hold`      | POST | 保持                 |
| `/calls/{callId}/resume`    | POST | 取消保持             |
| `/calls/{callId}/transfer`  | POST | 转接                 |
| `/calls/{callId}/three-way` | POST | 发起三方通话         |
| `/calls/{callId}`           | GET  | 通话详情             |
| `/calls`                    | GET  | 通话列表（分页筛选） |

#### 7.6.2 来电弹屏与客户匹配

| 接口                          | 方法 | 说明                     |
| ----------------------------- | ---- | ------------------------ |
| `/inbound/match-customer`     | POST | 号码匹配客户（内部调用） |
| `/inbound/{sessionId}/popup`  | GET  | 获取来电弹屏数据         |
| `/inbound/{sessionId}/assign` | POST | 分配坐席                 |
| `/inbound/{sessionId}/reject` | POST | 拒接并记录原因           |

#### 7.6.3 录音与转写

| 接口                             | 方法 | 说明               |
| -------------------------------- | ---- | ------------------ |
| `/recordings/callback`           | POST | 阿里云录音回调接收 |
| `/recordings/{callId}`           | GET  | 获取录音信息       |
| `/recordings/{callId}/reprocess` | POST | 录音重处理         |
| `/asr/tasks/{taskId}`            | GET  | 查询转写任务状态   |
| `/asr/{callId}/transcript`       | GET  | 获取通话转写文本   |

#### 7.6.4 AI 分析接口

| 接口                         | 方法 | 说明                     |
| ---------------------------- | ---- | ------------------------ |
| `/analysis/{callId}/trigger` | POST | 触发 AI 分析             |
| `/analysis/{callId}`         | GET  | 获取 AI 分析结果         |
| `/analysis/{callId}/retry`   | POST | 失败重试                 |
| `/analysis/prompts/version`  | GET  | 当前提示词版本           |
| `/analysis/prompts/version`  | PUT  | 更新提示词版本（管理员） |

#### 7.6.5 批量外呼任务接口

| 接口                             | 方法 | 说明               |
| -------------------------------- | ---- | ------------------ |
| `/campaigns`                     | POST | 创建外呼任务       |
| `/campaigns`                     | GET  | 任务列表           |
| `/campaigns/{campaignId}`        | GET  | 任务详情           |
| `/campaigns/{campaignId}/start`  | POST | 启动任务           |
| `/campaigns/{campaignId}/pause`  | POST | 暂停任务           |
| `/campaigns/{campaignId}/resume` | POST | 恢复任务           |
| `/campaigns/{campaignId}/stop`   | POST | 终止任务           |
| `/campaigns/{campaignId}/stats`  | GET  | 任务统计           |
| `/campaigns/{campaignId}/items`  | GET  | 任务明细（客户级） |

#### 7.6.6 坐席管理与监控接口

| 接口                       | 方法 | 说明         |
| -------------------------- | ---- | ------------ |
| `/agents`                  | GET  | 坐席列表     |
| `/agents/{agentId}`        | GET  | 坐席详情     |
| `/agents/{agentId}/status` | PUT  | 更新坐席状态 |
| `/agents/{agentId}/skills` | PUT  | 更新技能组   |
| `/agents/realtime/status`  | GET  | 实时状态快照 |
| `/monitoring/queues`       | GET  | 队列监控     |
| `/monitoring/alerts`       | GET  | 告警列表     |

#### 7.6.7 WebSocket 事件接口定义

连接地址：`/ws/call-center`  
客户端发送事件：

- `SUBSCRIBE_QUEUE`
- `UNSUBSCRIBE_QUEUE`
- `AGENT_STATUS_UPDATE`
- `CALL_ACTION`（answer/hangup/mute/hold/transfer）

服务端推送事件：

- `INCOMING_CALL_POPUP`
- `CALL_STATUS_CHANGED`
- `AGENT_STATUS_BROADCAST`
- `CAMPAIGN_PROGRESS`
- `RECORDING_READY`
- `ANALYSIS_COMPLETED`
- `SYSTEM_ALERT`

---

### 7.7 第三方集成设计

#### 7.7.1 阿里云语音服务 SDK 集成

集成目标：

- SIP 外呼/来电接入
- 通话事件回调（振铃、接通、挂断）
- 录音能力与录音文件通知
- IVR 菜单导航与按键收集

关键设计点：

- 封装 `VoiceProviderAdapter`，隔离厂商 SDK 差异
- 所有回调必须验签、防重放、防重复投递
- 呼叫控制采用“命令+状态回执”模式，避免前端直接信任控制结果
- 异常容错：SDK 超时重试（指数退避），并记录 provider traceId

#### 7.7.2 讯飞 ASR 集成方案

处理模式：异步转写（推荐）

- 任务创建后立即返回 `taskId`
- 通过回调或轮询获取最终结果
- 结果标准化为内部统一格式（句段、时间戳、说话人、置信度）

质量控制：

- 通话时长小于阈值（如 8 秒）可跳过 ASR，减少成本
- 低置信度片段标记 `uncertain=true`，供人工复核
- ASR 失败自动重试 2 次，最终失败进入人工补录队列

#### 7.7.3 录音文件 OSS 存储方案

存储规范：

- Bucket：`crm-call-recordings`
- 路径规则：`/{env}/{yyyy}/{MM}/{dd}/{callId}/{recordingId}.wav`
- 元数据：`callId, agentId, customerId, duration, codec, md5`

安全策略：

- Bucket 私有读写
- 前端播放使用 STS 临时凭证或短时签名 URL（1~5 分钟）
- 录音下载与播放操作写审计日志（who/when/where）

生命周期策略：

- 热数据（0~90 天）：标准存储，支持高频回放
- 温数据（90~365 天）：低频访问存储
- 冷数据（>365 天）：归档或按合规要求删除

---

### 7.8 坐席管理设计

#### 7.8.1 坐席状态机

状态定义：

- `IDLE` 空闲：可接听、可外呼
- `BUSY` 忙碌：临时不可分配（培训/会议/处理事务）
- `ON_CALL` 通话中：正在通话，禁止新分配
- `WRAP_UP` 整理中：通话后填写备注与结论
- `OFFLINE` 离线：未登录或主动签出

状态流转图：

```text
OFFLINE --登录--> IDLE --手动置忙--> BUSY --恢复--> IDLE
  ^                  |                   ^
  |                  |接通               |
  |                  v                   |
  +-----签出----- WRAP_UP <--挂断-- ON_CALL
                     |
                     +--整理完成--> IDLE
```

约束规则：

- `ON_CALL` 状态下禁止切换到 `OFFLINE`（需先挂断）
- `WRAP_UP` 超时自动回到 `IDLE`（默认 120 秒，可配置）
- 非管理员不可强制变更他人状态

#### 7.8.2 呼叫分配策略

1. 轮询（Round Robin）

- 场景：同质化坐席队列
- 特点：实现简单，分配均衡
- 注意：需跳过 `BUSY/ON_CALL/OFFLINE`

2. 最少通话（Least Calls）

- 场景：追求负载均衡与公平
- 特点：按当日已接通数升序分配
- 注意：避免把短通话过多坐席误判为高负载，可结合累计时长

3. 技能路由（Skill-Based Routing）

- 场景：按行业、产品线、语言、客户等级分配
- 特点：匹配成功率和转化率更高
- 注意：需维护技能标签与熟练度评分，支持回退策略

策略优先级建议：

- 默认：技能路由 > 最少通话 > 轮询
- 兜底：超时无人接听时转公共队列或 IVR

#### 7.8.3 坐席监控

监控维度：

- 实时：在线人数、空闲人数、通话中人数、排队长度、最长等待时长
- 质量：接通率、平均通话时长、首次接通率、ASR/AI 成功率
- 绩效：人均呼叫量、有效通话率、跟进完成率、转化贡献

告警规则（示例）：

- 队列等待 > 120 秒：触发队列拥塞告警
- 录音上传失败率 > 3%：触发录音链路告警
- ASR 失败率 > 5%：触发语音识别告警
- 某坐席 `WRAP_UP` 超时连续 5 次：触发管理提醒

---

### 7.9 数据与可靠性设计补充

#### 7.9.1 核心数据表（建议）

- `call_records`：通话主记录（方向、时长、结果、坐席、客户）
- `recording_files`：录音文件与 OSS 地址
- `asr_tasks`：转写任务状态与失败原因
- `call_transcripts`：转写全文与分段结果
- `call_ai_analysis`：AI 摘要、评分、建议
- `agent_status_logs`：坐席状态变化日志
- `campaign_tasks` / `campaign_call_items`：批量任务与明细
- `dispatch_logs`：呼叫分配轨迹与策略命中结果

#### 7.9.2 可靠性与幂等

- 回调幂等：`providerEventId + callId` 唯一约束，重复回调直接忽略
- 任务重试：ASR/AI 分析均采用指数退避和最大重试次数
- 最终一致性：通话结束后允许“先有通话记录，后补录音/分析”
- 降级策略：ASR 或 AI 不可用时，基础通话功能不受影响，标记“待补分析”

#### 7.9.3 安全与合规

- 录音、转写文本、AI 结果按敏感等级分级授权
- 关键字段（手机号）展示脱敏，导出受角色控制
- 对外接口全链路 TLS，回调验签与时间窗校验
- 操作审计：播放、下载、删除、导出均记录审计日志

---

### 7.10 章节小结

本章完成了呼叫中心从“通话接入、录音处理、语音识别、AI 分析、页面交互、接口定义、坐席调度”的完整详细设计。  
通过阿里云语音服务 + 讯飞 ASR + Claude API 的分层集成，系统可在保障实时性与稳定性的前提下，形成“通话即资产、记录即洞察、分析即行动”的销售闭环能力。
