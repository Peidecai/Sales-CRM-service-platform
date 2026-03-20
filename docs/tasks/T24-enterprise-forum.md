# T24 — 企业论坛

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — enterpriseForum
> 优先级: 🟢低
> 参考设计: 10-learning-training.md §10.2

## 背景

磐销云在学习世界模块下提供企业论坛功能，支持销售团队内部经验分享和问题讨论。本项目已有 knowledge 模块（知识库文章+RAG），但缺少互动讨论能力。企业论坛补充知识库的单向输出，形成双向知识流动，促进团队协作。

## 功能需求

| #   | 功能       | 说明                                                           |
| --- | ---------- | -------------------------------------------------------------- |
| F1  | 板块管理   | 管理员创建/编辑/排序板块（如：经验分享、问题求助、公告、闲聊） |
| F2  | 发帖       | 选择板块发帖，支持富文本（Markdown）、图片上传                 |
| F3  | 评论/回复  | 帖子下评论，支持楼中楼回复                                     |
| F4  | 点赞/收藏  | 帖子和评论点赞，帖子收藏                                       |
| F5  | 置顶/精华  | 管理员置顶和标记精华帖                                         |
| F6  | 搜索       | 按关键词/板块/作者搜索帖子                                     |
| F7  | 关联知识库 | 帖子可引用知识库文章                                           |
| F8  | 管理功能   | 删帖/锁帖/移动板块（Admin/Manager）                            |

## 技术方案

### 后端

#### Entity

```typescript
// forum-category.entity.ts
@Entity("forum_categories")
export class ForumCategory extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  icon: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "int", default: 0 })
  postCount: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;
}

// forum-post.entity.ts
@Entity("forum_posts")
export class ForumPost extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text" })
  content: string; // Markdown

  @ManyToOne(() => ForumCategory)
  @JoinColumn({ name: "categoryId" })
  category: ForumCategory;

  @Column({ type: "int" })
  categoryId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "authorId" })
  author: User;

  @Column({ type: "int" })
  authorId: number;

  @Column({ type: "boolean", default: false })
  isPinned: boolean;

  @Column({ type: "boolean", default: false })
  isFeatured: boolean; // 精华帖

  @Column({ type: "boolean", default: false })
  isLocked: boolean; // 锁定（禁止评论）

  @Column({ type: "int", default: 0 })
  viewCount: number;

  @Column({ type: "int", default: 0 })
  likeCount: number;

  @Column({ type: "int", default: 0 })
  commentCount: number;

  @Column({ type: "int", nullable: true })
  linkedArticleId: number | null; // 关联知识库文章

  @Column({ type: "datetime", nullable: true })
  lastCommentAt: Date | null;
}

// forum-comment.entity.ts
@Entity("forum_comments")
export class ForumComment extends BaseEntity {
  @ManyToOne(() => ForumPost)
  @JoinColumn({ name: "postId" })
  post: ForumPost;

  @Column({ type: "int" })
  postId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "authorId" })
  author: User;

  @Column({ type: "int" })
  authorId: number;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "int", nullable: true })
  parentId: number | null; // 楼中楼回复

  @Column({ type: "int", nullable: true })
  replyToUserId: number | null; // @回复的用户

  @Column({ type: "int", default: 0 })
  likeCount: number;
}

// forum-like.entity.ts
@Entity("forum_likes")
export class ForumLike extends BaseEntity {
  @Column({ type: "int" })
  userId: number;

  @Column({ type: "varchar", length: 20 })
  targetType: "post" | "comment";

  @Column({ type: "int" })
  targetId: number;
}

// forum-favorite.entity.ts
@Entity("forum_favorites")
export class ForumFavorite extends BaseEntity {
  @Column({ type: "int" })
  userId: number;

  @Column({ type: "int" })
  postId: number;
}
```

#### DTO

- `CreateForumCategoryDto`: name, description?, icon?, sortOrder?
- `UpdateForumCategoryDto`: PartialType
- `CreateForumPostDto`: title, content, categoryId, linkedArticleId?
- `UpdateForumPostDto`: title?, content?, categoryId?
- `CreateForumCommentDto`: postId, content, parentId?, replyToUserId?
- `ForumPostQueryDto`: categoryId?, keyword?, authorId?, isPinned?, isFeatured?, page, pageSize, sortBy ('latest' | 'popular' | 'commented')
- `ModeratePostDto`: isPinned?, isFeatured?, isLocked?, categoryId? (移动板块)

#### Service

- `ForumCategoryService`: CRUD + 排序 + 帖子数统计
- `ForumPostService`:
  - `create(dto, user)`: 发帖 + 更新板块计数
  - `findAll(query)`: 分页列表 + 排序（最新/最热/最多评论）
  - `findOne(id, user)`: 详情 + 浏览量+1 + 判断是否已点赞/收藏
  - `update(id, dto, user)`: 只能编辑自己的帖子
  - `moderate(id, dto, user)`: 置顶/精华/锁定/移动（Manager/Admin）
  - `delete(id, user)`: 软删除（自己的帖子或 Manager/Admin）
- `ForumCommentService`:
  - `create(dto, user)`: 评论 + 更新帖子评论数 + 通知帖子作者
  - `findByPost(postId, page, pageSize)`: 评论列表（含楼中楼）
  - `delete(id, user)`: 删除评论
- `ForumLikeService`: 点赞/取消点赞（toggle） + 更新计数
- `ForumFavoriteService`: 收藏/取消收藏（toggle）

#### Controller

- `ForumCategoryController`: `/api/v1/forum/categories`
- `ForumPostController`: `/api/v1/forum/posts`
- `ForumCommentController`: `/api/v1/forum/posts/:postId/comments`

#### Module

- `ForumModule`: 导入 UserModule, NotificationModule, KnowledgeModule (关联文章)

#### Migration

- `1709000090000-CreateForumCategories.ts`
- `1709000091000-CreateForumPosts.ts`
- `1709000092000-CreateForumComments.ts`
- `1709000093000-CreateForumLikesAndFavorites.ts`

### 前端 (PC)

| 文件                                                 | 说明                             |
| ---------------------------------------------------- | -------------------------------- |
| `web/src/views/forum/index.vue`                      | 论坛首页（板块列表+最新/精华帖） |
| `web/src/views/forum/category.vue`                   | 板块帖子列表                     |
| `web/src/views/forum/post-detail.vue`                | 帖子详情 + 评论                  |
| `web/src/views/forum/create-post.vue`                | 发帖页（Markdown 编辑器）        |
| `web/src/views/forum/components/PostCard.vue`        | 帖子卡片组件                     |
| `web/src/views/forum/components/CommentTree.vue`     | 评论树（楼中楼）                 |
| `web/src/views/forum/components/CategoryManager.vue` | 板块管理（Admin）                |
| `web/src/api/forum.ts`                               | API 层                           |

### 前端 (APP)

| 文件                                          | 说明     |
| --------------------------------------------- | -------- |
| `miniapp/src/pages-sub/forum/index.vue`       | 论坛首页 |
| `miniapp/src/pages-sub/forum/post-detail.vue` | 帖子详情 |
| `miniapp/src/pages-sub/forum/create-post.vue` | 发帖     |

## API 接口

| Method | Path                                   | Description                | Auth               |
| ------ | -------------------------------------- | -------------------------- | ------------------ |
| GET    | `/api/v1/forum/categories`             | 板块列表                   | All                |
| POST   | `/api/v1/forum/categories`             | 创建板块                   | Admin              |
| PUT    | `/api/v1/forum/categories/:id`         | 更新板块                   | Admin              |
| DELETE | `/api/v1/forum/categories/:id`         | 删除板块                   | Admin              |
| GET    | `/api/v1/forum/posts`                  | 帖子列表（分页+筛选+排序） | All                |
| POST   | `/api/v1/forum/posts`                  | 发帖                       | All                |
| GET    | `/api/v1/forum/posts/:id`              | 帖子详情                   | All                |
| PUT    | `/api/v1/forum/posts/:id`              | 编辑帖子                   | 作者/Admin         |
| DELETE | `/api/v1/forum/posts/:id`              | 删除帖子                   | 作者/Manager/Admin |
| PUT    | `/api/v1/forum/posts/:id/moderate`     | 置顶/精华/锁定             | Manager/Admin      |
| POST   | `/api/v1/forum/posts/:id/like`         | 点赞/取消点赞              | All                |
| POST   | `/api/v1/forum/posts/:id/favorite`     | 收藏/取消收藏              | All                |
| GET    | `/api/v1/forum/posts/:postId/comments` | 评论列表                   | All                |
| POST   | `/api/v1/forum/posts/:postId/comments` | 发表评论                   | All                |
| DELETE | `/api/v1/forum/comments/:id`           | 删除评论                   | 作者/Manager/Admin |
| POST   | `/api/v1/forum/comments/:id/like`      | 评论点赞                   | All                |
| GET    | `/api/v1/forum/favorites`              | 我的收藏                   | All                |

## 数据库设计

### forum_categories

| Column      | Type           | Nullable | Description |
| ----------- | -------------- | -------- | ----------- |
| id          | int (PK, auto) | NO       |             |
| name        | varchar(100)   | NO       | 板块名称    |
| description | varchar(500)   | YES      | 描述        |
| icon        | varchar(100)   | YES      | 图标        |
| sort_order  | int            | NO       | 排序        |
| post_count  | int            | NO       | 帖子数      |
| is_active   | boolean        | NO       | 是否启用    |
| created_at  | datetime(6)    | NO       |             |
| updated_at  | datetime(6)    | NO       |             |
| deleted_at  | datetime(6)    | YES      | 软删除      |

### forum_posts

| Column            | Type                        | Nullable | Description      |
| ----------------- | --------------------------- | -------- | ---------------- |
| id                | int (PK, auto)              | NO       |                  |
| title             | varchar(200)                | NO       | 标题             |
| content           | text                        | NO       | 正文（Markdown） |
| category_id       | int (FK → forum_categories) | NO       | 板块             |
| author_id         | int (FK → users)            | NO       | 作者             |
| is_pinned         | boolean                     | NO       | 置顶             |
| is_featured       | boolean                     | NO       | 精华             |
| is_locked         | boolean                     | NO       | 锁定             |
| view_count        | int                         | NO       | 浏览数           |
| like_count        | int                         | NO       | 点赞数           |
| comment_count     | int                         | NO       | 评论数           |
| linked_article_id | int                         | YES      | 关联知识库文章   |
| last_comment_at   | datetime                    | YES      | 最后评论时间     |
| created_at        | datetime(6)                 | NO       |                  |
| updated_at        | datetime(6)                 | NO       |                  |
| deleted_at        | datetime(6)                 | YES      | 软删除           |

**索引**: `IDX_fp_category` (category_id), `IDX_fp_author` (author_id), `IDX_fp_pinned_featured` (is_pinned, is_featured), `IDX_fp_created_at` (created_at), `IDX_fp_last_comment` (last_comment_at)

### forum_comments

| Column           | Type                   | Nullable | Description      |
| ---------------- | ---------------------- | -------- | ---------------- |
| id               | int (PK, auto)         | NO       |                  |
| post_id          | int (FK → forum_posts) | NO       | 帖子             |
| author_id        | int (FK → users)       | NO       | 评论者           |
| content          | text                   | NO       | 评论内容         |
| parent_id        | int                    | YES      | 父评论（楼中楼） |
| reply_to_user_id | int                    | YES      | @回复用户        |
| like_count       | int                    | NO       | 点赞数           |
| created_at       | datetime(6)            | NO       |                  |
| updated_at       | datetime(6)            | NO       |                  |
| deleted_at       | datetime(6)            | YES      | 软删除           |

**索引**: `IDX_fc_post` (post_id), `IDX_fc_parent` (parent_id), `IDX_fc_author` (author_id)

### forum_likes

| Column      | Type             | Nullable | Description    |
| ----------- | ---------------- | -------- | -------------- |
| id          | int (PK, auto)   | NO       |                |
| user_id     | int (FK → users) | NO       | 用户           |
| target_type | varchar(20)      | NO       | post / comment |
| target_id   | int              | NO       | 目标 ID        |
| created_at  | datetime(6)      | NO       |                |
| updated_at  | datetime(6)      | NO       |                |
| deleted_at  | datetime(6)      | YES      |                |

**索引**: `UNQ_fl_user_target` (user_id, target_type, target_id) UNIQUE

### forum_favorites

| Column     | Type                   | Nullable | Description |
| ---------- | ---------------------- | -------- | ----------- |
| id         | int (PK, auto)         | NO       |             |
| user_id    | int (FK → users)       | NO       | 用户        |
| post_id    | int (FK → forum_posts) | NO       | 帖子        |
| created_at | datetime(6)            | NO       |             |
| updated_at | datetime(6)            | NO       |             |
| deleted_at | datetime(6)            | YES      |             |

**索引**: `UNQ_ff_user_post` (user_id, post_id) UNIQUE

## 依赖模块

| 模块               | 关系                          |
| ------------------ | ----------------------------- |
| UserModule         | 导入 — 作者信息               |
| NotificationModule | 导入 — 评论/回复通知          |
| KnowledgeModule    | 导入 — 关联知识库文章（可选） |

## 验收标准

- [ ] 板块 CRUD 完整，管理员可排序、启用/禁用
- [ ] 发帖支持 Markdown 格式，可关联知识库文章
- [ ] 评论支持楼中楼回复，评论后通知帖子作者
- [ ] 点赞/收藏 toggle 功能正常，计数准确
- [ ] 置顶帖在列表顶部显示，精华帖有标记
- [ ] 搜索支持关键词+板块+作者筛选
- [ ] 排序支持最新/最热/最多评论
- [ ] 锁定帖禁止新评论
- [ ] 只能编辑/删除自己的帖子和评论（Manager/Admin 可操作所有）
- [ ] 前端论坛首页 + 帖子详情 + 评论交互正常
- [ ] 后端单元测试 ≥20 tests（ForumPostService + ForumCommentService + ForumLikeService）
- [ ] Migration 可正向/反向执行
- [ ] Skills: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
