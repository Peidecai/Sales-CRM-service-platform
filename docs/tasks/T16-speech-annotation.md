# T16 — 话术标注/管理

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md)
> 优先级: 🟡中
> 参考设计: 06-ai-center.md §6.5 + 10-learning-training.md §10.1

## 背景

磐销云有独立的话术标注（annotation）模块，支持对通话录音中的关键话术进行标注、分类和导出。本项目 Knowledge 模块已有文章/话术分类，但缺少与通话录音关联的话术标注功能。话术库帮助销售团队标准化沟通流程，AI 可基于标注数据优化话术推荐。

## 功能需求

| #   | 功能          | 说明                                    |
| --- | ------------- | --------------------------------------- |
| 1   | 话术模板 CRUD | 标准话术创建/编辑/删除，含分类          |
| 2   | 话术分类      | 开场白/异议处理/逼单/产品介绍/挽留/其他 |
| 3   | 通话话术标注  | 在通话记录转写文本上标注关键话术片段    |
| 4   | 标注-话术关联 | 标注时可选择关联的标准话术模板          |
| 5   | 话术评分      | AI 评估通话中话术使用质量（1-100）      |
| 6   | 话术搜索      | 按关键词/分类/场景搜索话术              |
| 7   | CSV 导出      | 导出话术库                              |
| 8   | 话术统计      | 按分类/使用频率统计                     |

## 技术方案

### 后端

- **Entity**: `SpeechTemplate`（话术模板）, `SpeechCategory`（话术分类）, `SpeechAnnotation`（通话标注）
- **DTO**: `CreateSpeechTemplateDto`, `UpdateSpeechTemplateDto`, `QuerySpeechTemplateDto`, `CreateSpeechAnnotationDto`
- **Service**: `SpeechTemplateService` (话术模板 CRUD + export), `SpeechAnnotationService` (标注 CRUD + AI 评分)
- **Controller**: `SpeechController`
- **Module**: `SpeechModule` — imports `TypeOrmModule`, `CallRecordModule`, `AiModule`
- **Migration**: `1709000083000-CreateSpeechTables`

### 前端 (PC)

- **页面**: `views/speech/index.vue`（话术库列表）, `views/speech/detail.vue`（话术详情 + 关联标注列表）
- **组件**: `SpeechForm.vue`, `AnnotationPanel.vue`（通话详情页内嵌标注面板）, `SpeechSelector.vue`（标注时选择话术弹窗）
- **API 层**: `api/speech.ts`
- **路由**: `/speech` (列表), `/speech/:id` (详情)

### 前端 (APP)

- 话术库浏览（只读）
- 通话详情页查看标注

## API 接口

| Method | Path                                   | Description      | Auth     |
| ------ | -------------------------------------- | ---------------- | -------- |
| GET    | `/api/v1/speech-templates`             | 话术模板分页列表 | All      |
| POST   | `/api/v1/speech-templates`             | 创建话术模板     | Manager+ |
| GET    | `/api/v1/speech-templates/:id`         | 话术详情         | All      |
| PUT    | `/api/v1/speech-templates/:id`         | 更新话术         | Manager+ |
| DELETE | `/api/v1/speech-templates/:id`         | 删除话术         | Manager+ |
| GET    | `/api/v1/speech-templates/export`      | 导出 CSV         | Manager+ |
| GET    | `/api/v1/speech-categories`            | 话术分类列表     | All      |
| POST   | `/api/v1/speech-categories`            | 创建分类         | Manager+ |
| PUT    | `/api/v1/speech-categories/:id`        | 更新分类         | Manager+ |
| DELETE | `/api/v1/speech-categories/:id`        | 删除分类         | Manager+ |
| GET    | `/api/v1/call-records/:id/annotations` | 通话标注列表     | All      |
| POST   | `/api/v1/call-records/:id/annotations` | 创建标注         | Sales+   |
| PUT    | `/api/v1/speech-annotations/:id`       | 更新标注         | Sales+   |
| DELETE | `/api/v1/speech-annotations/:id`       | 删除标注         | Sales+   |
| GET    | `/api/v1/speech-templates/statistics`  | 话术使用统计     | Manager+ |

## 数据库设计

### speech_category 表

| Column    | Type                    | Nullable | Description                                                   |
| --------- | ----------------------- | -------- | ------------------------------------------------------------- |
| id        | int, PK, auto_increment | NO       |                                                               |
| name      | varchar(100)            | NO       | 分类名称                                                      |
| code      | varchar(50), unique     | NO       | 分类编码（opening/objection/closing/product/retention/other） |
| sort      | int                     | NO       | 排序，默认 0                                                  |
| createdAt | datetime(6)             | NO       |                                                               |
| updatedAt | datetime(6)             | NO       |                                                               |
| deletedAt | datetime(6)             | YES      |                                                               |

### speech_template 表

| Column     | Type                                 | Nullable | Description           |
| ---------- | ------------------------------------ | -------- | --------------------- |
| id         | int, PK, auto_increment              | NO       |                       |
| title      | varchar(200)                         | NO       | 话术标题              |
| content    | text                                 | NO       | 话术内容（Markdown）  |
| categoryId | int, FK → speech_category.id         | NO       | 所属分类              |
| scene      | varchar(200)                         | YES      | 适用场景描述          |
| tags       | varchar(500)                         | YES      | 标签，逗号分隔        |
| usageCount | int                                  | NO       | 使用/引用次数，默认 0 |
| status     | enum('draft','published','archived') | NO       | 默认 draft            |
| createdBy  | int, FK → user.id                    | NO       | 创建者                |
| createdAt  | datetime(6)                          | NO       |                       |
| updatedAt  | datetime(6)                          | NO       |                       |
| deletedAt  | datetime(6)                          | YES      |                       |

**索引**: `IDX_speech_tpl_category` (categoryId), `IDX_speech_tpl_status` (status), `FULLTEXT_speech_tpl` (title, content)

### speech_annotation 表

| Column       | Type                         | Nullable | Description          |
| ------------ | ---------------------------- | -------- | -------------------- |
| id           | int, PK, auto_increment      | NO       |                      |
| callRecordId | int, FK → call_record.id     | NO       | 关联通话             |
| templateId   | int, FK → speech_template.id | YES      | 关联话术模板（可选） |
| startTime    | int                          | NO       | 标注起始时间（秒）   |
| endTime      | int                          | NO       | 标注结束时间（秒）   |
| text         | text                         | NO       | 标注文本片段         |
| comment      | varchar(500)                 | YES      | 标注备注             |
| score        | int                          | YES      | AI 话术评分 1-100    |
| annotatedBy  | int, FK → user.id            | NO       | 标注者               |
| createdAt    | datetime(6)                  | NO       |                      |
| updatedAt    | datetime(6)                  | NO       |                      |

**索引**: `IDX_annotation_call` (callRecordId), `IDX_annotation_template` (templateId)

## 依赖模块

| 模块             | 关系               |
| ---------------- | ------------------ |
| CallRecordModule | 标注关联通话记录   |
| AiModule         | AI 话术评分        |
| KnowledgeModule  | 可共享话术到知识库 |
| AuthModule       | JWT + RBAC 守卫    |

## 验收标准

- [ ] SpeechTemplate CRUD 全部端点可用，支持分页/搜索/分类筛选
- [ ] SpeechCategory 内置 6 个分类，支持 CRUD
- [ ] SpeechAnnotation 标注 CRUD，关联通话记录和话术模板
- [ ] 通话详情页展示标注列表（时间轴形式）
- [ ] 话术统计接口返回按分类的使用频率和平均评分
- [ ] CSV 导出话术库（标题/分类/内容/场景/使用次数）
- [ ] 后端单元测试 ≥ 18 tests（SpeechTemplateService + SpeechAnnotationService）
- [ ] E2E 测试 ≥ 4 tests（话术列表 + 创建 + 通话标注 + 统计）
