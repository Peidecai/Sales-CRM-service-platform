# T10 — 学习与培训 开发任务

## 任务概述

- **目标**: 增强知识库(话术库/最佳实践/收藏点赞)、新建企业论坛/企业考试/培训视频/营销素材模块
- **优先级**: P3
- **依赖模块**: knowledge, user, notification

## 现有模块

| 模块           | 路径                               | 状态                       |
| -------------- | ---------------------------------- | -------------------------- |
| Knowledge      | `server/src/modules/knowledge/`    | 已有（CRUD+分类+RAG+审核） |
| Material       | `server/src/modules/material/`     | 已有（素材管理基础）       |
| User           | `server/src/modules/user/`         | 已有                       |
| Notification   | `server/src/modules/notification/` | 已有                       |
| Knowledge 视图 | `web/src/views/knowledge/`         | 已有                       |

## 子任务清单

### 后端任务

| #   | 标题                         | 涉及文件                                                                             | 依赖    | 验收标准                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------- | ------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | 知识库收藏/点赞 Entity       | `server/src/modules/knowledge/entities/article-interaction.entity.ts` (新建)         | —       | articleId(ManyToOne KnowledgeArticle), userId(ManyToOne User), type('like'\|'favorite'), createdAt; UNIQUE(articleId, userId, type)                                                                                                                                                                                                  |
| B2  | 知识库收藏/点赞 Service      | `server/src/modules/knowledge/knowledge.service.ts` 增强                             | B1      | toggleLike(articleId, user), toggleFavorite(articleId, user), getFavorites(userId, page), getLikeCount(articleId)                                                                                                                                                                                                                    |
| B3  | 话术库标签                   | `server/src/modules/knowledge/knowledge.service.ts` 增强                             | —       | 文章分类新增 '话术' category + sceneTag(varchar nullable) 字段；findByScene(scene): 按场景查话术                                                                                                                                                                                                                                     |
| B4  | Forum Entity                 | `server/src/modules/forum/entities/` (新建)                                          | —       | ForumCategory(name, description, sortOrder), ForumPost(title, content, categoryId, authorId, isPinned, isFeatured, viewCount, likeCount), ForumComment(postId, authorId, parentId nullable, content)                                                                                                                                 |
| B5  | Forum Service                | `server/src/modules/forum/forum.service.ts` (新建)                                   | B4      | CRUD posts(分页+分类+排序), CRUD categories(Admin), addComment, toggleLike, pin/feature(Admin/Manager), getHotPosts                                                                                                                                                                                                                  |
| B6  | Forum Controller             | `server/src/modules/forum/forum.controller.ts` (新建)                                | B5      | /api/v1/forum/posts CRUD, /forum/posts/:id/comments GET/POST, /forum/categories CRUD; @UseGuards + @UseInterceptors(AuditLogInterceptor)                                                                                                                                                                                             |
| B7  | Forum Module                 | `server/src/modules/forum/forum.module.ts` (新建)                                    | B4-B6   | 导入 UserModule, NotificationModule；注册到 AppModule                                                                                                                                                                                                                                                                                |
| B8  | Exam Entity                  | `server/src/modules/exam/entities/` (新建)                                           | —       | Question(content, type:single/multi/judge/essay, options:json, answer:json, explanation, categoryId, difficulty:1-5), ExamPaper(title, totalScore, duration:minutes, questions:json[{questionId, score}], createdBy), ExamSession(paperId, userId, startedAt, submittedAt, score, answers:json, status:in_progress/submitted/graded) |
| B9  | Exam Service                 | `server/src/modules/exam/exam.service.ts` (新建)                                     | B8      | CRUD questions(分页+分类+难度), CRUD papers, startExam(paperId, user): 创建 session + 计时, submitExam(sessionId, answers): 客观题自动评分 + 计算总分, getStatistics(paperId): 通过率/平均分/分数分布, getWrongQuestions(userId): 错题本                                                                                             |
| B10 | Exam Controller              | `server/src/modules/exam/exam.controller.ts` (新建)                                  | B9      | /api/v1/exam/questions, /exam/papers, /exam/sessions, /exam/sessions/:id/submit, /exam/statistics                                                                                                                                                                                                                                    |
| B11 | Exam Module                  | `server/src/modules/exam/exam.module.ts` (新建)                                      | B8-B10  | 导入 UserModule；注册到 AppModule                                                                                                                                                                                                                                                                                                    |
| B12 | Training Entity              | `server/src/modules/training/entities/` (新建)                                       | —       | TrainingVideo(title, description, url, duration, categoryId, thumbnailUrl, sortOrder), TrainingCategory(name, parentId nullable), LearningProgress(videoId, userId, watchedDuration, totalDuration, completedAt nullable), LearningTask(videoId, assigneeId, assignerId, dueDate, status:pending/completed/overdue)                  |
| B13 | Training Service             | `server/src/modules/training/training.service.ts` (新建)                             | B12     | CRUD videos + categories, updateProgress(videoId, userId, watchedDuration), assignTask(videoId, userIds, dueDate), getMyTasks(userId), getStatistics(): 观看时长/完成率/人均学习时长                                                                                                                                                 |
| B14 | Training Controller          | `server/src/modules/training/training.controller.ts` (新建)                          | B13     | /api/v1/training/videos, /training/videos/:id/progress, /training/categories, /training/tasks                                                                                                                                                                                                                                        |
| B15 | Training Module              | `server/src/modules/training/training.module.ts` (新建)                              | B12-B14 | 导入 UserModule, NotificationModule；注册到 AppModule                                                                                                                                                                                                                                                                                |
| B16 | MarketingMaterial Entity     | `server/src/modules/marketing-material/entities/marketing-material.entity.ts` (新建) | —       | title, content(longtext), type('text'\|'image'\|'poster'), imageUrl(nullable), category, useCount(int default 0), createdBy(ManyToOne User)                                                                                                                                                                                          |
| B17 | MarketingMaterial Service    | `server/src/modules/marketing-material/marketing-material.service.ts` (新建)         | B16     | CRUD(分页+类型筛选), incrementUseCount(id), getPopular(limit)                                                                                                                                                                                                                                                                        |
| B18 | MarketingMaterial Controller | `server/src/modules/marketing-material/marketing-material.controller.ts` (新建)      | B17     | /api/v1/marketing/materials CRUD + POST /:id/use                                                                                                                                                                                                                                                                                     |
| B19 | MarketingMaterial Module     | `server/src/modules/marketing-material/marketing-material.module.ts` (新建)          | B16-B18 | 导入 UserModule；注册到 AppModule                                                                                                                                                                                                                                                                                                    |
| B20 | Knowledge Controller 增强    | `server/src/modules/knowledge/knowledge.controller.ts`                               | B1-B3   | POST /knowledge/:id/like, POST /knowledge/:id/favorite, GET /knowledge/favorites, GET /knowledge/scripts?scene=                                                                                                                                                                                                                      |

### 前端任务

| #   | 标题                     | 涉及文件                                         | 依赖   | 验收标准                                                                                                                                      |
| --- | ------------------------ | ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Forum API 层             | `web/src/api/forum.ts` (新建)                    | B6     | posts CRUD, comments, categories, like                                                                                                        |
| F2  | Exam API 层              | `web/src/api/exam.ts` (新建)                     | B10    | questions, papers, sessions, submit, statistics                                                                                               |
| F3  | Training API 层          | `web/src/api/training.ts` (新建)                 | B14    | videos, progress, categories, tasks                                                                                                           |
| F4  | MarketingMaterial API 层 | `web/src/api/marketing-material.ts` (新建)       | B18    | materials CRUD, use                                                                                                                           |
| F5  | Knowledge API 增强       | `web/src/api/knowledge.ts` 增强                  | B20    | like, favorite, getFavorites, getScripts                                                                                                      |
| F6  | 知识库收藏/点赞          | `web/src/views/knowledge/` 增强                  | F5     | 文章详情页加 ❤️ 点赞 + ⭐ 收藏按钮; 新增 "我的收藏" tab                                                                                       |
| F7  | 论坛列表页               | `web/src/views/forum/index.vue` (新建)           | F1     | 板块分类 tab + 帖子列表(标题/作者/回复数/浏览数) + 精华/置顶标签 + 发帖按钮                                                                   |
| F8  | 论坛详情页               | `web/src/views/forum/detail.vue` (新建)          | F1     | 帖子内容(Markdown) + 评论列表(嵌套回复) + 点赞 + 回复框                                                                                       |
| F9  | 考试题库管理             | `web/src/views/exam/questions/index.vue` (新建)  | F2     | 题目列表(类型/难度/分类筛选) + 创建/编辑对话框(按类型动态表单)                                                                                |
| F10 | 试卷管理                 | `web/src/views/exam/papers/index.vue` (新建)     | F2     | 试卷列表 + 组卷页面(手动选题+随机抽题+分值设置)                                                                                               |
| F11 | 在线考试页               | `web/src/views/exam/session/index.vue` (新建)    | F2     | 倒计时 + 题目导航 + 答题区 + 自动提交                                                                                                         |
| F12 | 考试统计                 | `web/src/views/exam/statistics/index.vue` (新建) | F2     | 成绩分布图 + 通过率 + 错题 Top10                                                                                                              |
| F13 | 培训视频列表             | `web/src/views/training/index.vue` (新建)        | F3     | 视频卡片(缩略图+标题+时长+进度条) + 分类筛选                                                                                                  |
| F14 | 视频播放页               | `web/src/views/training/detail.vue` (新建)       | F3     | 视频播放器 + 自动记录进度(每30s) + 学习任务状态                                                                                               |
| F15 | 学习任务管理             | `web/src/views/training/tasks/index.vue` (新建)  | F3     | 我的任务列表(待完成/已完成/已逾期) + Manager 指派任务                                                                                         |
| F16 | 营销素材库               | `web/src/views/marketing/index.vue` (新建)       | F4     | 素材卡片(文案/图片/海报) + 一键复制 + 使用次数 + 筛选                                                                                         |
| F17 | 路由 + 菜单              | `web/src/router/index.ts`                        | F6-F16 | /forum, /forum/:id, /exam/questions, /exam/papers, /exam/session/:id, /exam/statistics, /training, /training/:id, /training/tasks, /marketing |

### 数据库迁移

| #   | 文件                                        | DDL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `1709000092000-AddKnowledgeInteractions.ts` | `article_interaction` 表: id, article_id(FK), user_id(FK), type(enum like/favorite), created_at; UNIQUE(article_id, user_id, type); knowledge_article 表加 `scene_tag` varchar nullable                                                                                                                                                                                                                                                                                                   |
| M2  | `1709000093000-CreateForumTables.ts`        | `forum_category`(id, name, description, sort_order, createdAt, updatedAt, deletedAt), `forum_post`(id, title, content:longtext, category_id:FK, author_id:FK, is_pinned, is_featured, view_count, like_count, createdAt, updatedAt, deletedAt), `forum_comment`(id, post_id:FK, author_id:FK, parent_id:FK nullable, content:text, createdAt, updatedAt, deletedAt)                                                                                                                       |
| M3  | `1709000094000-CreateExamTables.ts`         | `question`(id, content:text, type:enum, options:json, answer:json, explanation:text, category_id, difficulty:tinyint, createdAt, updatedAt, deletedAt), `exam_paper`(id, title, total_score:int, duration:int, questions:json, created_by:FK, createdAt, updatedAt, deletedAt), `exam_session`(id, paper_id:FK, user_id:FK, started_at, submitted_at, score:decimal nullable, answers:json, status:enum, createdAt, updatedAt)                                                            |
| M4  | `1709000095000-CreateTrainingTables.ts`     | `training_category`(id, name, parent_id:FK nullable, createdAt, updatedAt, deletedAt), `training_video`(id, title, description, url, duration:int, category_id:FK, thumbnail_url, sort_order, createdAt, updatedAt, deletedAt), `learning_progress`(id, video_id:FK, user_id:FK, watched_duration:int, total_duration:int, completed_at nullable, UNIQUE video_id+user_id), `learning_task`(id, video_id:FK, assignee_id:FK, assigner_id:FK, due_date, status:enum, createdAt, updatedAt) |
| M5  | `1709000096000-CreateMarketingMaterial.ts`  | `marketing_material`(id, title, content:longtext, type:enum, image_url nullable, category, use_count:int default 0, created_by:FK, createdAt, updatedAt, deletedAt)                                                                                                                                                                                                                                                                                                                       |

### 测试任务

| #   | 标题                     | 文件                                                                | 验收标准                                                             |
| --- | ------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| T1  | 知识库收藏/点赞          | `server/test/knowledge/knowledge-interaction.spec.ts`               | ≥8 tests (toggle+count+favorites)                                    |
| T2  | ForumService             | `server/test/forum/forum.service.spec.ts`                           | ≥15 tests (posts CRUD+comments+like+pin+feature)                     |
| T3  | ExamService              | `server/test/exam/exam.service.spec.ts`                             | ≥18 tests (questions+papers+sessions+autoGrade+statistics+wrongBook) |
| T4  | TrainingService          | `server/test/training/training.service.spec.ts`                     | ≥12 tests (videos+progress+tasks+statistics)                         |
| T5  | MarketingMaterialService | `server/test/marketing-material/marketing-material.service.spec.ts` | ≥8 tests (CRUD+useCount+popular)                                     |
| T6  | E2E — 论坛               | `e2e/forum.spec.ts`                                                 | 帖子列表+发帖+详情+评论                                              |
| T7  | E2E — 考试               | `e2e/exam.spec.ts`                                                  | 题库+组卷+考试+提交+成绩                                             |

## 边界与约束

- **Scope 外**: 视频上传存储(假设外部 CDN URL)；AI 自动出题；微信分享集成
- **安全**: 题库管理仅 Admin/Manager；考试防作弊(前端切屏检测, 不可回退)；论坛帖子审核 Admin/Manager
- **性能**: 论坛热帖缓存 TTL 5min；考试 session 过期自动提交(Cron)；视频进度每30s 一次 PUT
- **模块接口**: ForumModule/ExamModule/TrainingModule 各自独立，导入 UserModule + NotificationModule

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
- **论坛**: 帖子内容支持 Markdown；评论支持嵌套回复(parentId)
- **考试**: 客观题自动评分(JSON answer 比对)；简答题标记待批阅(status=graded 需 Admin)
- **缓存**: 论坛热帖 `forum:hot` TTL 5min；考试统计 `exam:stats:{paperId}` TTL 15min

## Claude Code 提示词

### B1-B3+B20: 知识库增强

```
增强 packages/server/src/modules/knowledge/ 模块：
1. 新建 entities/article-interaction.entity.ts:
   - article: ManyToOne KnowledgeArticle, user: ManyToOne User
   - type: 'like' | 'favorite'
   - UNIQUE constraint (articleId, userId, type)
   - 继承 BaseEntity (仅需 id + createdAt)
2. 修改 knowledge_article entity 新增 sceneTag(varchar nullable)
3. 在 knowledge.service.ts 新增:
   - toggleLike(articleId, userId): 存在则删除，不存在则创建
   - toggleFavorite(articleId, userId): 同上
   - getFavorites(userId, page, pageSize): 分页获取收藏文章
   - getLikeCount(articleId): 点赞数
   - findByScene(scene): 按 sceneTag 查话术文章
4. Controller 新增:
   - POST /knowledge/:id/like, POST /knowledge/:id/favorite
   - GET /knowledge/favorites
   - GET /knowledge/scripts?scene=
5. 迁移: 1709000092000-AddKnowledgeInteractions.ts
```

### B4-B7: 企业论坛模块

```
新建 packages/server/src/modules/forum/ 模块：
1. entities/forum-category.entity.ts: name, description, sortOrder(int); 继承 BaseEntity
2. entities/forum-post.entity.ts: title, content(longtext), category:ManyToOne ForumCategory, author:ManyToOne User, isPinned(boolean default false), isFeatured(boolean default false), viewCount(int default 0), likeCount(int default 0); 继承 BaseEntity
3. entities/forum-comment.entity.ts: post:ManyToOne ForumPost, author:ManyToOne User, parent:ManyToOne ForumComment nullable, content(text); 继承 BaseEntity
4. forum.service.ts:
   - Posts: findAll(分页+分类+排序:latest/hot), findOne(+viewCount++), create, update, delete
   - Comments: findByPost(postId, 分页), addComment(postId, content, parentId?, user)
   - toggleLike(postId, userId), pin(postId, isPinned), feature(postId, isFeatured)
   - getHotPosts(limit): 按 viewCount+likeCount 加权排序
5. forum.controller.ts: /api/v1/forum 前缀
   - @UseGuards(JwtAuthGuard, RolesGuard) @UseInterceptors(AuditLogInterceptor)
   - pin/feature 操作 @Roles(UserRole.ADMIN, UserRole.MANAGER)
6. forum.module.ts: 导入 UserModule, NotificationModule
7. 注册到 AppModule
8. 迁移: 1709000093000-CreateForumTables.ts
```

### B8-B11: 企业考试模块

```
新建 packages/server/src/modules/exam/ 模块：
1. entities/question.entity.ts: content(text), type(QuestionType: SINGLE/MULTI/JUDGE/ESSAY), options(simple-json: [{label, value}]), answer(simple-json), explanation(text nullable), category(varchar), difficulty(tinyint 1-5); 继承 BaseEntity
2. entities/exam-paper.entity.ts: title, totalScore(int), duration(int minutes), questions(simple-json: [{questionId, score}]), createdBy:ManyToOne User; 继承 BaseEntity
3. entities/exam-session.entity.ts: paper:ManyToOne ExamPaper, user:ManyToOne User, startedAt(datetime), submittedAt(datetime nullable), score(decimal nullable), answers(simple-json), status(ExamSessionStatus: IN_PROGRESS/SUBMITTED/GRADED); 不继承软删除
4. exam.service.ts:
   - Questions: CRUD(分页+分类+难度筛选)
   - Papers: CRUD(分页), randomPaper(category, count, totalScore): 随机组卷
   - startExam(paperId, user): 创建 session, 检查是否有进行中的
   - submitExam(sessionId, answers): 客观题自动评分(单选/多选/判断), 简答题标 SUBMITTED
   - getStatistics(paperId): 参加人数/通过率/平均分/分数分布
   - getWrongQuestions(userId): 错题本(答错的题目列表)
   - @Cron('*/5 * * * *') autoSubmitExpired(): 超时未交的自动提交
5. exam.controller.ts: /api/v1/exam 前缀; 题库管理 @Roles(ADMIN, MANAGER)
6. exam.module.ts: 导入 UserModule
7. 枚举 QuestionType, ExamSessionStatus 放 @crm/shared
8. 迁移: 1709000094000-CreateExamTables.ts
```

### B12-B15: 培训视频模块

```
新建 packages/server/src/modules/training/ 模块：
1. entities/training-category.entity.ts: name, parent:ManyToOne self nullable; 继承 BaseEntity
2. entities/training-video.entity.ts: title, description(text), url(varchar), duration(int seconds), category:ManyToOne TrainingCategory, thumbnailUrl(varchar nullable), sortOrder(int default 0); 继承 BaseEntity
3. entities/learning-progress.entity.ts: video:ManyToOne TrainingVideo, user:ManyToOne User, watchedDuration(int seconds), totalDuration(int), completedAt(datetime nullable); UNIQUE(videoId, userId)
4. entities/learning-task.entity.ts: video:ManyToOne TrainingVideo, assignee:ManyToOne User, assigner:ManyToOne User, dueDate(datetime), status(LearningTaskStatus: PENDING/COMPLETED/OVERDUE)
5. training.service.ts:
   - Videos: CRUD(分页+分类), Categories: CRUD(树形)
   - updateProgress(videoId, userId, watchedDuration): upsert, 满足 >= 90% 标完成
   - assignTask(videoIds, userIds, dueDate, assigner): 批量创建学习任务 + 发通知
   - getMyTasks(userId, status): 我的学习任务
   - getStatistics(): 总观看时长/完成率/人均学习时长/活跃学员数
   - @Cron('0 9 * * *') checkOverdueTasks(): 逾期任务标记 + 通知
6. training.controller.ts: /api/v1/training 前缀; 视频管理 @Roles(ADMIN, MANAGER)
7. training.module.ts: 导入 UserModule, NotificationModule
8. 迁移: 1709000095000-CreateTrainingTables.ts
```

### B16-B19: 营销素材模块

```
新建 packages/server/src/modules/marketing-material/ 模块：
1. entities/marketing-material.entity.ts: title, content(longtext), type(MaterialType: TEXT/IMAGE/POSTER), imageUrl(varchar nullable), category(varchar), useCount(int default 0), createdBy:ManyToOne User; 继承 BaseEntity
2. marketing-material.service.ts:
   - CRUD(分页+类型筛选+关键词搜索)
   - incrementUseCount(id): useCount++
   - getPopular(limit): 按 useCount 排行
3. marketing-material.controller.ts: /api/v1/marketing/materials
   - 创建/编辑/删除 @Roles(ADMIN, MANAGER)
   - POST /:id/use 所有角色
4. marketing-material.module.ts: 导入 UserModule
5. 迁移: 1709000096000-CreateMarketingMaterial.ts
```

### F7-F8: 论坛前端

```
新建 packages/web/src/views/forum/ 页面：
1. api/forum.ts: getPosts, getPost, createPost, updatePost, deletePost, getComments, addComment, toggleLike, getCategories
2. index.vue: 论坛列表
   - 顶部: 板块分类 tab (el-tabs)
   - 列表: el-table (标题/作者/回复数/浏览数/最后回复时间)
   - 标签: 精华(el-tag type=warning) + 置顶(el-tag type=danger)
   - 右上角: 发帖按钮
3. detail.vue: 帖子详情
   - 帖子内容: Markdown 渲染(v-html + marked)
   - 点赞按钮 + 收藏按钮
   - 评论区: 嵌套树形评论(el-timeline), 回复框
4. 路由: /forum, /forum/:id
```

### F9-F12: 考试前端

```
新建 packages/web/src/views/exam/ 页面：
1. api/exam.ts: questions CRUD, papers CRUD, startExam, submitExam, getStatistics, getWrongQuestions
2. questions/index.vue: 题库管理
   - 筛选: 类型+难度+分类
   - 表格: 题目摘要/类型/难度/分类
   - 创建对话框: 按题型动态表单(单选=radio options, 多选=checkbox options, 判断=true/false, 简答=textarea)
3. papers/index.vue: 试卷管理
   - 试卷列表 + 组卷页面
   - 手动选题(左侧题库+右侧已选) + 随机抽题(按分类+难度+数量)
   - 分值设置: 每题单独设分
4. session/index.vue: 在线考试
   - 顶部: 倒计时(mm:ss) + 自动提交
   - 左侧: 题目导航(已答/未答/标记 颜色区分)
   - 右侧: 答题区(按题型渲染)
   - 提交确认对话框
5. statistics/index.vue: 考试统计
   - 成绩分布直方图(ECharts)
   - 通过率/平均分/最高分/最低分
   - 错题 Top10 列表
6. 路由: /exam/questions, /exam/papers, /exam/session/:id, /exam/statistics
```
