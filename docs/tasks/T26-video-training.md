# T26 — 视频培训

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — 磐销云 videoTutorials
> 优先级: 🟢低
> 参考设计: 10-learning-training.md §10.4

## 背景

磐销云提供视频培训功能（员工培训模块），支持视频上传与在线学习。本项目目前仅有知识库文章（Knowledge 模块），缺少视频形式的培训内容。视频培训适用于产品知识、销售技巧、新人入职等场景，学习效果优于纯文本。需支持学习进度跟踪、章节书签、关联考试（T25）、完成证书等功能。

## 功能需求

| #   | 功能     | 说明                                                 | 优先级 |
| --- | -------- | ---------------------------------------------------- | ------ |
| 1   | 视频上传 | Admin/Manager 上传培训视频（mp4/webm），支持断点续传 | P1     |
| 2   | 视频分类 | 按类别管理：产品知识、销售技巧、新人入职、行业知识等 | P1     |
| 3   | 在线播放 | Web/APP 端视频播放器，支持倍速/全屏/画中画           | P1     |
| 4   | 学习进度 | 记录每个用户每个视频的观看进度（秒级精度），断点续播 | P1     |
| 5   | 视频章节 | 视频内标记章节点（时间戳+标题），方便跳转            | P2     |
| 6   | 书签     | 用户可在视频任意时间点添加个人书签+笔记              | P2     |
| 7   | 学习任务 | Admin 指定必看视频，设定截止日期，追踪完成情况       | P1     |
| 8   | 完成证书 | 视频观看 ≥90% 后自动发放完成证书（PDF 生成）         | P3     |
| 9   | 关联考试 | 视频可关联考试试卷（T25），看完后跳转答题            | P3     |
| 10  | 学习统计 | 按人/按视频统计观看时长、完成率、排行                | P2     |

## 技术方案

### 后端

#### Entity

```typescript
// training-video.entity.ts
@Entity("training_video")
class TrainingVideo extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 500 })
  fileUrl: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl: string | null;

  @Column({ type: "int", comment: "视频时长(秒)" })
  duration: number;

  @Column({ type: "bigint", comment: "文件大小(bytes)" })
  fileSize: number;

  @Column({ type: "varchar", length: 20, comment: "mp4/webm" })
  format: string;

  @ManyToOne(() => TrainingCategory)
  category: TrainingCategory;

  @Column()
  categoryId: string;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "boolean", default: false })
  isPublished: boolean;

  @ManyToOne(() => User)
  uploadedBy: User;

  @Column()
  uploadedById: string;

  @OneToMany(() => VideoChapter, (c) => c.video)
  chapters: VideoChapter[];
}

// training-category.entity.ts
@Entity("training_category")
class TrainingCategory extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  type: "product" | "sales_skill" | "onboarding" | "industry" | "other";

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "text", nullable: true })
  description: string | null;
}

// video-chapter.entity.ts
@Entity("video_chapter")
class VideoChapter extends BaseEntity {
  @ManyToOne(() => TrainingVideo, (v) => v.chapters, { onDelete: "CASCADE" })
  video: TrainingVideo;

  @Column()
  videoId: string;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "int", comment: "章节起始时间(秒)" })
  startTime: number;

  @Column({ type: "int", default: 0 })
  sortOrder: number;
}

// video-progress.entity.ts
@Entity("video_progress")
@Unique(["userId", "videoId"])
class VideoProgress extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => TrainingVideo, { onDelete: "CASCADE" })
  video: TrainingVideo;

  @Column()
  videoId: string;

  @Column({ type: "int", default: 0, comment: "已观看秒数" })
  watchedSeconds: number;

  @Column({ type: "int", default: 0, comment: "最后播放位置(秒)" })
  lastPosition: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Column({ type: "boolean", default: false })
  isCompleted: boolean;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date | null;
}

// video-bookmark.entity.ts
@Entity("video_bookmark")
class VideoBookmark extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => TrainingVideo, { onDelete: "CASCADE" })
  video: TrainingVideo;

  @Column()
  videoId: string;

  @Column({ type: "int", comment: "书签时间(秒)" })
  timestamp: number;

  @Column({ type: "text", nullable: true })
  note: string | null;
}

// training-task.entity.ts
@Entity("training_task")
class TrainingTask extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @ManyToOne(() => TrainingVideo, { onDelete: "CASCADE" })
  video: TrainingVideo;

  @Column()
  videoId: string;

  @ManyToOne(() => User)
  assignedBy: User;

  @Column()
  assignedById: string;

  @Column({ type: "timestamp" })
  deadline: Date;

  @OneToMany(() => TrainingTaskAssignee, (a) => a.task)
  assignees: TrainingTaskAssignee[];
}

// training-task-assignee.entity.ts
@Entity("training_task_assignee")
@Unique(["taskId", "userId"])
class TrainingTaskAssignee extends BaseEntity {
  @ManyToOne(() => TrainingTask, (t) => t.assignees, { onDelete: "CASCADE" })
  task: TrainingTask;

  @Column()
  taskId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: "boolean", default: false })
  isCompleted: boolean;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date | null;
}
```

#### DTO

- `CreateTrainingVideoDto`: title, description?, categoryId, sortOrder?, isPublished?
- `UpdateTrainingVideoDto`: PartialType(Create)
- `CreateChapterDto`: title, startTime, sortOrder?
- `UpdateProgressDto`: watchedSeconds, lastPosition
- `CreateBookmarkDto`: timestamp, note?
- `CreateTrainingTaskDto`: title, description?, videoId, assigneeIds: string[], deadline
- `QueryVideoDto`: categoryId?, isPublished?, keyword?, page, pageSize

#### Service / Controller / Module

- `TrainingVideoService`: CRUD + 分页 + 文件上传（Multer）+ 发布/取消发布
- `VideoProgressService`: 更新进度 + 判定完成 + 统计
- `VideoBookmarkService`: CRUD 用户书签
- `TrainingTaskService`: 创建任务 + 分配 + 完成追踪
- `TrainingController`: RESTful 端点
- `TrainingModule`: imports UserModule, 注册所有 entity

#### Migration

- `1709000090000-CreateTrainingTables.ts`: 7 个表

### 前端 (PC)

#### 页面

| 页面     | 路径                   | 说明                              |
| -------- | ---------------------- | --------------------------------- |
| 视频列表 | `/training/videos`     | 卡片网格 + 分类筛选 + 搜索        |
| 视频播放 | `/training/videos/:id` | 播放器 + 章节列表 + 书签 + 进度条 |
| 视频管理 | `/training/manage`     | Admin: 上传/编辑/分类/章节管理    |
| 学习任务 | `/training/tasks`      | 我的任务列表 / Admin 任务管理     |
| 学习统计 | `/training/statistics` | 观看时长排行 + 完成率统计         |

#### 组件

- `VideoPlayer.vue`: 基于 video.js 或原生 `<video>`，支持章节跳转/书签标记/进度上报
- `VideoCard.vue`: 视频卡片（封面+标题+时长+进度条）
- `ChapterEditor.vue`: 章节编辑器（时间戳+标题列表）
- `BookmarkList.vue`: 书签列表+笔记
- `ProgressBar.vue`: 视频完成进度条

#### API 层

- `api/training.ts`: 所有 training 相关接口封装

#### 路由

- 菜单组: 学习培训 → 视频培训 / 学习任务 / 学习统计
- 权限: 视频列表/播放 — 全角色；管理/统计 — Admin/Manager

### 前端 (APP)

- `pages/training/video-list.vue`: 视频列表（瀑布流卡片）
- `pages/training/video-play.vue`: 全屏播放器 + 章节 + 书签
- `pages/training/my-tasks.vue`: 学习任务列表

## API 接口

| 方法   | 路径                                       | 说明               | 权限              |
| ------ | ------------------------------------------ | ------------------ | ----------------- |
| GET    | `/api/v1/training/videos`                  | 视频列表（分页）   | All               |
| POST   | `/api/v1/training/videos`                  | 创建视频           | Admin, Manager    |
| GET    | `/api/v1/training/videos/:id`              | 视频详情           | All               |
| PUT    | `/api/v1/training/videos/:id`              | 更新视频           | Admin, Manager    |
| DELETE | `/api/v1/training/videos/:id`              | 删除视频（软删除） | Admin             |
| POST   | `/api/v1/training/videos/:id/upload`       | 上传视频文件       | Admin, Manager    |
| PUT    | `/api/v1/training/videos/:id/publish`      | 发布/取消发布      | Admin, Manager    |
| GET    | `/api/v1/training/videos/:id/chapters`     | 获取章节列表       | All               |
| POST   | `/api/v1/training/videos/:id/chapters`     | 添加章节           | Admin, Manager    |
| PUT    | `/api/v1/training/chapters/:id`            | 更新章节           | Admin, Manager    |
| DELETE | `/api/v1/training/chapters/:id`            | 删除章节           | Admin, Manager    |
| PUT    | `/api/v1/training/videos/:id/progress`     | 更新学习进度       | All               |
| GET    | `/api/v1/training/videos/:id/progress`     | 获取学习进度       | All               |
| GET    | `/api/v1/training/videos/:id/bookmarks`    | 获取书签列表       | All               |
| POST   | `/api/v1/training/videos/:id/bookmarks`    | 添加书签           | All               |
| DELETE | `/api/v1/training/bookmarks/:id`           | 删除书签           | All               |
| GET    | `/api/v1/training/categories`              | 分类列表           | All               |
| POST   | `/api/v1/training/categories`              | 创建分类           | Admin             |
| PUT    | `/api/v1/training/categories/:id`          | 更新分类           | Admin             |
| DELETE | `/api/v1/training/categories/:id`          | 删除分类           | Admin             |
| GET    | `/api/v1/training/tasks`                   | 学习任务列表       | All               |
| POST   | `/api/v1/training/tasks`                   | 创建学习任务       | Admin, Manager    |
| PUT    | `/api/v1/training/tasks/:id/complete`      | 标记任务完成       | All               |
| GET    | `/api/v1/training/statistics`              | 学习统计           | Admin, Manager    |
| GET    | `/api/v1/training/statistics/user/:userId` | 用户学习统计       | All (own) / Admin |

## 数据库设计

### training_video

| 字段           | 类型                  | 说明            |
| -------------- | --------------------- | --------------- |
| id             | varchar(36) PK        | UUID            |
| title          | varchar(200) NOT NULL | 视频标题        |
| description    | text                  | 描述            |
| file_url       | varchar(500) NOT NULL | 视频文件路径    |
| cover_url      | varchar(500)          | 封面图片路径    |
| duration       | int NOT NULL          | 视频时长(秒)    |
| file_size      | bigint NOT NULL       | 文件大小(bytes) |
| format         | varchar(20) NOT NULL  | 格式(mp4/webm)  |
| category_id    | varchar(36) FK        | 分类ID          |
| sort_order     | int DEFAULT 0         | 排序            |
| is_published   | boolean DEFAULT false | 是否发布        |
| uploaded_by_id | varchar(36) FK        | 上传人          |
| created_at     | timestamp(6)          | 创建时间        |
| updated_at     | timestamp(6)          | 更新时间        |
| deleted_at     | timestamp(6)          | 软删除          |

**索引**: `IDX_tv_category` (category_id), `IDX_tv_published` (is_published), `IDX_tv_uploaded_by` (uploaded_by_id)

### training_category

| 字段        | 类型                  | 说明     |
| ----------- | --------------------- | -------- |
| id          | varchar(36) PK        | UUID     |
| name        | varchar(100) NOT NULL | 分类名   |
| type        | varchar(50) NOT NULL  | 类型枚举 |
| sort_order  | int DEFAULT 0         | 排序     |
| description | text                  | 描述     |
| created_at  | timestamp(6)          |          |
| updated_at  | timestamp(6)          |          |
| deleted_at  | timestamp(6)          |          |

### video_chapter

| 字段       | 类型                   | 说明         |
| ---------- | ---------------------- | ------------ |
| id         | varchar(36) PK         | UUID         |
| video_id   | varchar(36) FK CASCADE | 视频ID       |
| title      | varchar(200) NOT NULL  | 章节标题     |
| start_time | int NOT NULL           | 起始时间(秒) |
| sort_order | int DEFAULT 0          | 排序         |
| created_at | timestamp(6)           |              |
| updated_at | timestamp(6)           |              |
| deleted_at | timestamp(6)           |              |

**索引**: `IDX_vc_video` (video_id)

### video_progress

| 字段            | 类型                   | 说明         |
| --------------- | ---------------------- | ------------ |
| id              | varchar(36) PK         | UUID         |
| user_id         | varchar(36) FK         | 用户ID       |
| video_id        | varchar(36) FK CASCADE | 视频ID       |
| watched_seconds | int DEFAULT 0          | 已观看秒数   |
| last_position   | int DEFAULT 0          | 最后播放位置 |
| completion_rate | decimal(5,2) DEFAULT 0 | 完成率       |
| is_completed    | boolean DEFAULT false  | 是否完成     |
| completed_at    | timestamp              | 完成时间     |
| created_at      | timestamp(6)           |              |
| updated_at      | timestamp(6)           |              |

**索引**: `UQ_vp_user_video` UNIQUE (user_id, video_id), `IDX_vp_completed` (is_completed)

### video_bookmark

| 字段       | 类型                   | 说明         |
| ---------- | ---------------------- | ------------ |
| id         | varchar(36) PK         | UUID         |
| user_id    | varchar(36) FK         | 用户ID       |
| video_id   | varchar(36) FK CASCADE | 视频ID       |
| timestamp  | int NOT NULL           | 书签时间(秒) |
| note       | text                   | 笔记         |
| created_at | timestamp(6)           |              |
| updated_at | timestamp(6)           |              |

**索引**: `IDX_vb_user_video` (user_id, video_id)

### training_task

| 字段           | 类型                   | 说明     |
| -------------- | ---------------------- | -------- |
| id             | varchar(36) PK         | UUID     |
| title          | varchar(200) NOT NULL  | 任务标题 |
| description    | text                   | 描述     |
| video_id       | varchar(36) FK CASCADE | 关联视频 |
| assigned_by_id | varchar(36) FK         | 指派人   |
| deadline       | timestamp NOT NULL     | 截止日期 |
| created_at     | timestamp(6)           |          |
| updated_at     | timestamp(6)           |          |
| deleted_at     | timestamp(6)           |          |

**索引**: `IDX_tt_video` (video_id), `IDX_tt_deadline` (deadline)

### training_task_assignee

| 字段         | 类型                   | 说明     |
| ------------ | ---------------------- | -------- |
| id           | varchar(36) PK         | UUID     |
| task_id      | varchar(36) FK CASCADE | 任务ID   |
| user_id      | varchar(36) FK         | 用户ID   |
| is_completed | boolean DEFAULT false  | 是否完成 |
| completed_at | timestamp              | 完成时间 |
| created_at   | timestamp(6)           |          |
| updated_at   | timestamp(6)           |          |

**索引**: `UQ_tta_task_user` UNIQUE (task_id, user_id)

## 依赖模块

| 模块               | 用途                               | 变更     |
| ------------------ | ---------------------------------- | -------- |
| UserModule         | 用户关联（上传者、学习者、指派者） | 导入     |
| KnowledgeModule    | 分类体系参考                       | 无变更   |
| NotificationModule | 任务到期提醒推送                   | 导入     |
| ExamModule (T25)   | 视频关联考试                       | 可选导入 |
| Multer             | 视频文件上传                       | 配置     |

## 验收标准

### 功能验收

- [ ] Admin/Manager 可上传视频（mp4/webm，≤500MB），设置标题/分类/封面
- [ ] 视频列表支持分类筛选、关键词搜索、分页
- [ ] 播放器支持倍速(0.5x/1x/1.5x/2x)、全屏、画中画
- [ ] 用户观看进度实时记录，刷新后断点续播
- [ ] 章节跳转功能正常
- [ ] 用户可添加/删除书签，书签含笔记
- [ ] Admin 可创建学习任务，指定用户和截止日期
- [ ] 学习统计页展示观看时长排行和完成率
- [ ] 视频观看 ≥90% 自动标记完成

### 测试要求

| 类型         | 文件                             | 数量      |
| ------------ | -------------------------------- | --------- |
| 后端单元测试 | `training-video.service.spec.ts` | ≥15 tests |
| 后端单元测试 | `video-progress.service.spec.ts` | ≥10 tests |
| 后端单元测试 | `training-task.service.spec.ts`  | ≥10 tests |
| 前端单元测试 | `VideoPlayer.spec.ts`            | ≥5 tests  |
| E2E          | `training.spec.ts`               | ≥8 tests  |

### 边界与约束

- 视频文件大小限制: ≤500MB
- 支持格式: mp4, webm
- 进度上报频率: 每 10 秒一次（防抖）
- 封面图: ≤2MB，jpg/png
- 软删除: 视频删除后文件保留 30 天

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `security-review`
- **文件存储**: 本地磁盘 `uploads/training/` 或对象存储（可配置）
- **视频封面**: 上传时可手动指定，或后端使用 ffmpeg 自动截取第一帧
- **缓存**: 视频列表缓存 `training:videos:list:{categoryId}:{page}` TTL 5min
