# TASK-01: 知识文章点赞/收藏功能

**状态**: ❌ 未实现
**优先级**: P2 — 用户体验增强
**模块**: Knowledge (TM-D)
**估算工作量**: 后端 4h + 前端 3h + 测试 2h

---

## 1. 背景与现状

### 现状分析

`knowledge-article.entity.ts` 已在数据库层预留了 `like_count` 列（`int DEFAULT 0`），但：

- `knowledge.service.ts` 无任何 `like*` / `favorite*` 方法
- `knowledge.controller.ts` 无 `POST /articles/:id/like` 等端点
- `knowledge/index.vue` 无点赞按钮或收藏 UI
- 无 `article_likes` 关联表（无法追踪"谁点赞了哪篇文章"）
- 无数据库迁移文件处理 like 关联表

### 功能目标

1. **点赞**：用户对文章点赞（幂等，已点赞则取消），`like_count` 实时更新
2. **收藏**：用户收藏文章（独立于点赞），可在个人中心查看收藏列表
3. **状态回显**：文章列表/详情页展示当前用户是否已点赞/收藏

---

## 2. 技术规范 (MCP Spec)

### 2.1 数据库设计

#### 新建迁移文件

**文件路径**: `packages/server/database/migrations/1709000008000-CreateArticleLikesTable.ts`

```typescript
import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateArticleLikesTable1709000008000 implements MigrationInterface {
  name = "CreateArticleLikesTable1709000008000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 用户-文章点赞关联表（含唯一约束和查询索引）
    await queryRunner.createTable(
      new Table({
        name: "article_likes",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "user_id", type: "int", isNullable: false },
          { name: "article_id", type: "int", isNullable: false },
          {
            name: "created_at",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        indices: [
          {
            name: "UQ_article_likes_user_article",
            columnNames: ["user_id", "article_id"],
            isUnique: true,
          },
          { name: "IDX_article_likes_article_id", columnNames: ["article_id"] },
        ],
      }),
      true,
    );

    // 2. 用户-文章收藏关联表（含唯一约束和查询索引）
    await queryRunner.createTable(
      new Table({
        name: "article_favorites",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "user_id", type: "int", isNullable: false },
          { name: "article_id", type: "int", isNullable: false },
          {
            name: "created_at",
            type: "datetime",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        indices: [
          {
            name: "UQ_article_favorites_user_article",
            columnNames: ["user_id", "article_id"],
            isUnique: true,
          },
          { name: "IDX_article_favorites_user_id", columnNames: ["user_id"] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("article_favorites", true);
    await queryRunner.dropTable("article_likes", true);
  }
}
```

### 2.2 实体 (Entity)

#### 新建实体文件

**`packages/server/src/modules/knowledge/entities/article-like.entity.ts`**

```typescript
import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";

@Entity("article_likes")
@Index(["userId", "articleId"], { unique: true })
export class ArticleLike {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: "user_id" })
  userId!: number;

  @Index()
  @Column({ name: "article_id" })
  articleId!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
```

**`packages/server/src/modules/knowledge/entities/article-favorite.entity.ts`**

```typescript
import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";

@Entity("article_favorites")
@Index(["userId", "articleId"], { unique: true })
export class ArticleFavorite {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: "user_id" })
  userId!: number;

  @Index()
  @Column({ name: "article_id" })
  articleId!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
```

### 2.3 DTO

**`packages/server/src/modules/knowledge/dto/article-action-response.dto.ts`**

```typescript
export class ArticleActionResponseDto {
  liked!: boolean;
  favorited!: boolean;
  likeCount!: number;
}
```

### 2.4 Service 层

在 `knowledge.service.ts` 中新增以下方法（追加到现有方法列表末尾）：

> **注意**: 在文件顶部 `typeorm` 导入中追加 `In`：
>
> ```typescript
> import { ..., In } from 'typeorm'
> ```

```typescript
// 依赖注入（constructor 新增）
@InjectRepository(ArticleLike)
private readonly likeRepository: Repository<ArticleLike>,
@InjectRepository(ArticleFavorite)
private readonly favoriteRepository: Repository<ArticleFavorite>,

// ---- Like / Favorite Methods ----

/**
 * 点赞或取消点赞（幂等）。返回操作后的状态。
 */
async toggleLike(articleId: number, userId: number): Promise<ArticleActionResponseDto> {
  const article = await this.articleRepository.findOne({ where: { id: articleId, deleted: false } })
  if (!article) throw new NotFoundException('文章不存在')

  const existing = await this.likeRepository.findOne({ where: { articleId, userId } })

  if (existing) {
    await this.likeRepository.delete({ id: existing.id })
    await this.articleRepository.decrement({ id: articleId }, 'likeCount', 1)
    article.likeCount = Math.max(article.likeCount - 1, 0)
    return { liked: false, favorited: await this.isFavorited(articleId, userId), likeCount: article.likeCount }
  }

  await this.likeRepository.save(this.likeRepository.create({ articleId, userId }))
  await this.articleRepository.increment({ id: articleId }, 'likeCount', 1)
  article.likeCount += 1
  return { liked: true, favorited: await this.isFavorited(articleId, userId), likeCount: article.likeCount }
}

/**
 * 收藏或取消收藏（幂等）。返回操作后的状态。
 */
async toggleFavorite(articleId: number, userId: number): Promise<ArticleActionResponseDto> {
  const article = await this.articleRepository.findOne({ where: { id: articleId, deleted: false } })
  if (!article) throw new NotFoundException('文章不存在')

  const existing = await this.favoriteRepository.findOne({ where: { articleId, userId } })

  if (existing) {
    await this.favoriteRepository.delete({ id: existing.id })
    return { liked: await this.isLiked(articleId, userId), favorited: false, likeCount: article.likeCount }
  }

  await this.favoriteRepository.save(this.favoriteRepository.create({ articleId, userId }))
  return { liked: await this.isLiked(articleId, userId), favorited: true, likeCount: article.likeCount }
}

/**
 * 获取当前用户对某文章的点赞/收藏状态。
 */
async getArticleActionStatus(articleId: number, userId: number): Promise<ArticleActionResponseDto> {
  const article = await this.articleRepository.findOne({ where: { id: articleId, deleted: false } })
  if (!article) throw new NotFoundException('文章不存在')

  const [liked, favorited] = await Promise.all([
    this.isLiked(articleId, userId),
    this.isFavorited(articleId, userId),
  ])
  return { liked, favorited, likeCount: article.likeCount }
}

/**
 * 获取用户收藏的文章列表（按收藏时间降序）。
 */
async getUserFavorites(userId: number): Promise<KnowledgeArticle[]> {
  const favorites = await this.favoriteRepository.find({
    where: { userId },
    order: { createdAt: 'DESC' },
  })
  if (favorites.length === 0) return []

  const articleIds = favorites.map((f) => f.articleId)
  const articles = await this.articleRepository.find({
    where: { id: In(articleIds), deleted: false },
  })

  // 按 favorites 的 createdAt DESC 顺序重新排列（find 不保证顺序）
  const articleMap = new Map(articles.map((a) => [a.id, a]))
  return articleIds.map((id) => articleMap.get(id)).filter(Boolean) as KnowledgeArticle[]
}

// Private helpers
private async isLiked(articleId: number, userId: number): Promise<boolean> {
  return !!(await this.likeRepository.findOne({ where: { articleId, userId } }))
}

private async isFavorited(articleId: number, userId: number): Promise<boolean> {
  return !!(await this.favoriteRepository.findOne({ where: { articleId, userId } }))
}
```

### 2.5 Controller 层

在 `knowledge.controller.ts` 中追加端点（确保已有 `@UseGuards(JwtAuthGuard, RolesGuard)` 类装饰器）：

```typescript
// 所有角色均可点赞/收藏
@Post('articles/:id/like')
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
toggleLike(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser('id') userId: number,
): Promise<ArticleActionResponseDto> {
  return this.knowledgeService.toggleLike(id, userId)
}

@Post('articles/:id/favorite')
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
toggleFavorite(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser('id') userId: number,
): Promise<ArticleActionResponseDto> {
  return this.knowledgeService.toggleFavorite(id, userId)
}

@Get('articles/:id/status')
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
getArticleStatus(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser('id') userId: number,
): Promise<ArticleActionResponseDto> {
  return this.knowledgeService.getArticleActionStatus(id, userId)
}

@Get('favorites')
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
getUserFavorites(@CurrentUser('id') userId: number): Promise<KnowledgeArticle[]> {
  return this.knowledgeService.getUserFavorites(userId)
}
```

### 2.6 Module 注册

在 `knowledge.module.ts` 的 `TypeOrmModule.forFeature([...])` 中追加新实体：

```typescript
TypeOrmModule.forFeature([
  KnowledgeArticle,
  KnowledgeCategory,
  ArticleLike,
  ArticleFavorite,
]);
```

### 2.7 API 清单

| 方法 | 路径                                      | 权限 | 描述                                |
| ---- | ----------------------------------------- | ---- | ----------------------------------- |
| POST | `/api/v1/knowledge/articles/:id/like`     | ALL  | 点赞/取消点赞（幂等）               |
| POST | `/api/v1/knowledge/articles/:id/favorite` | ALL  | 收藏/取消收藏（幂等）               |
| GET  | `/api/v1/knowledge/articles/:id/status`   | ALL  | 获取当前用户对该文章的点赞/收藏状态 |
| GET  | `/api/v1/knowledge/favorites`             | ALL  | 获取当前用户收藏的文章列表          |

**响应格式** (ArticleActionResponseDto):

```json
{
  "code": 0,
  "message": "success",
  "data": { "liked": true, "favorited": false, "likeCount": 42 }
}
```

### 2.8 前端实现

#### API 层 (`packages/web/src/api/knowledge.ts`)

追加以下方法：

```typescript
export function toggleArticleLike(id: number) {
  return request.post<ArticleActionResponse>(`/knowledge/articles/${id}/like`);
}

export function toggleArticleFavorite(id: number) {
  return request.post<ArticleActionResponse>(
    `/knowledge/articles/${id}/favorite`,
  );
}

export function getArticleStatus(id: number) {
  return request<ArticleActionResponse>({
    url: `/knowledge/articles/${id}/status`,
  });
}

export function getUserFavorites() {
  return request<KnowledgeArticle[]>({ url: "/knowledge/favorites" });
}

export interface ArticleActionResponse {
  liked: boolean;
  favorited: boolean;
  likeCount: number;
}
```

#### 前端 UI (`packages/web/src/views/knowledge/index.vue`)

在文章表格每行 **操作列** 追加点赞/收藏按钮，或在文章详情弹窗底部添加操作区：

```vue
<!-- 在文章详情弹窗/抽屉的 footer 区域 -->
<template #footer>
  <div class="article-actions">
    <el-button
      :type="articleStatus.liked ? 'primary' : 'default'"
      :icon="articleStatus.liked ? 'StarFilled' : 'Star'"
      @click="handleToggleLike"
      :loading="likeLoading"
    >
      {{ articleStatus.liked ? "已点赞" : "点赞" }} ({{
        articleStatus.likeCount
      }})
    </el-button>
    <el-button
      :type="articleStatus.favorited ? 'warning' : 'default'"
      :icon="articleStatus.favorited ? 'CollectionTag' : 'Collection'"
      @click="handleToggleFavorite"
      :loading="favoriteLoading"
    >
      {{ articleStatus.favorited ? "已收藏" : "收藏" }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
// 在组件 script 中追加
import {
  toggleArticleLike,
  toggleArticleFavorite,
  getArticleStatus,
} from "@/api/knowledge";

const articleStatus = ref({ liked: false, favorited: false, likeCount: 0 });
const likeLoading = ref(false);
const favoriteLoading = ref(false);

async function loadArticleStatus(id: number) {
  const res = await getArticleStatus(id);
  if (res.data) articleStatus.value = res.data;
}

async function handleToggleLike() {
  if (!currentArticle.value) return;
  likeLoading.value = true;
  try {
    const res = await toggleArticleLike(currentArticle.value.id);
    if (res.data) articleStatus.value = res.data;
  } finally {
    likeLoading.value = false;
  }
}

async function handleToggleFavorite() {
  if (!currentArticle.value) return;
  favoriteLoading.value = true;
  try {
    const res = await toggleArticleFavorite(currentArticle.value.id);
    if (res.data) articleStatus.value = res.data;
  } finally {
    favoriteLoading.value = false;
  }
}
</script>
```

---

## 3. 代码规范要求

| 规范项   | 要求                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| 类型安全 | 无 `any`，所有方法返回值明确声明类型                                               |
| 错误处理 | Service 抛出 `NotFoundException`，Controller 由全局 `HttpExceptionFilter` 统一处理 |
| 幂等性   | like/favorite 操作幂等（重复点赞 = 取消点赞），前端无需区分状态                    |
| 并发安全 | 使用数据库唯一约束 + `@Column()` `@Index({ unique: true })` 防止并发重复写入       |
| 权限控制 | 所有角色（ADMIN/MANAGER/SALES）均可点赞收藏，无需额外权限                          |
| 审计日志 | POST 端点已由全局 `AuditLogInterceptor` 自动记录，无需额外配置                     |
| 缓存失效 | like/favorite 操作不影响文章列表/详情缓存（`likeCount` 实时写入 DB）               |
| 迁移文件 | 迁移编号 `1709000008000`，命名遵循现有规范                                         |

---

## 4. 单元测试规范

**测试文件**: `packages/server/test/knowledge/knowledge-like.service.spec.ts`

```typescript
describe("KnowledgeService - Like/Favorite", () => {
  describe("toggleLike", () => {
    it("应对未点赞文章执行点赞，likeCount +1，返回 liked: true");
    it("应对已点赞文章取消点赞，likeCount -1，返回 liked: false");
    it("likeCount 最小值为 0，不出现负数");
    it("文章不存在时抛出 NotFoundException");
  });

  describe("toggleFavorite", () => {
    it("应对未收藏文章执行收藏，返回 favorited: true");
    it("应对已收藏文章取消收藏，返回 favorited: false");
    it("文章不存在时抛出 NotFoundException");
  });

  describe("getArticleActionStatus", () => {
    it("未操作时返回 liked: false, favorited: false");
    it("点赞后返回 liked: true, favorited: false");
    it("文章不存在时抛出 NotFoundException");
  });

  describe("getUserFavorites", () => {
    it("无收藏时返回空数组");
    it("返回按 createdAt 降序排列的收藏文章");
  });
});
```

---

## 5. 验证标准 (Acceptance Criteria)

### 功能验证

| #   | 测试场景                  | 期望结果                                           |
| --- | ------------------------- | -------------------------------------------------- |
| F1  | 用户 A 点赞文章 1         | 返回 `{ liked: true, likeCount: N+1 }`             |
| F2  | 用户 A 再次点赞文章 1     | 返回 `{ liked: false, likeCount: N }` （取消点赞） |
| F3  | 用户 A 收藏文章 1         | 返回 `{ favorited: true }`                         |
| F4  | 用户 B 点赞同一文章       | 独立计数，互不影响                                 |
| F5  | 查询 `/articles/1/status` | 返回当前用户对文章 1 的准确状态                    |
| F6  | 查询 `/favorites`         | 返回用户收藏的文章列表                             |
| F7  | 前端点赞按钮              | 按钮状态实时切换，loading 状态正确                 |
| F8  | 前端收藏按钮              | 按钮状态实时切换，高亮样式正确                     |

### 边界条件

| #   | 场景                     | 期望                                                         |
| --- | ------------------------ | ------------------------------------------------------------ |
| B1  | likeCount = 0 时取消点赞 | likeCount 保持 0，不变为负数                                 |
| B2  | 并发两次点赞请求         | 唯一约束阻止重复写入，第二次请求返回数据库约束错误或幂等处理 |
| B3  | 点赞已软删除的文章       | 返回 404 NotFoundException                                   |
| B4  | 无 Token 调用 `/like`    | 返回 401 Unauthorized                                        |

### 接口测试命令

```bash
# 点赞
curl -X POST http://localhost:3000/api/v1/knowledge/articles/1/like \
  -H "Authorization: Bearer <token>"

# 查询状态
curl http://localhost:3000/api/v1/knowledge/articles/1/status \
  -H "Authorization: Bearer <token>"

# 获取收藏列表
curl http://localhost:3000/api/v1/knowledge/favorites \
  -H "Authorization: Bearer <token>"
```

### 单元测试命令

```bash
cd packages/server
pnpm test -- --runInBand test/knowledge/knowledge-like.service.spec.ts
```

### 数据库验证

```sql
-- 验证关联表已创建
DESCRIBE article_likes;
DESCRIBE article_favorites;

-- 验证唯一约束
SHOW INDEX FROM article_likes WHERE Key_name = 'UQ_article_likes_user_article';

-- 验证点赞后 like_count 同步
SELECT id, like_count FROM knowledge_articles WHERE id = 1;
SELECT * FROM article_likes WHERE article_id = 1;
```
