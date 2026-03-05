# TM-D: 知识库模块 CLAUDE.md

## 模块信息

**Team**: TM-D
**模块**: 知识库 (Knowledge Base)
**路径**: `packages/server/src/modules/knowledge/`
**前端路由**: `/knowledge`

## 功能范围

### 核心功能

1. 知识文章 CRUD
2. 分类管理（树形结构）
3. 全文搜索（MySQL FULLTEXT 或 Elasticsearch）
4. AI 智能问答（RAG 模式：向量检索 + LLM 回答）
5. 文章点赞/收藏
6. Markdown 编辑器支持

## 技术规范

### 实体设计

```typescript
// knowledge-article.entity.ts
@Entity('knowledge_articles')
export class KnowledgeArticle extends BaseEntity {
  @Column({ length: 300 })
  title: string

  @Column({ type: 'longtext' })
  content: string

  @Column({ name: 'category_id', nullable: true })
  categoryId: number

  @Column({ name: 'author_id' })
  authorId: number

  @Column({ type: 'int', default: 0 })
  viewCount: number

  @Column({ type: 'int', default: 0 })
  likeCount: number

  @Column({ type: 'json', nullable: true })
  tags: string[]

  @Column({ name: 'is_published', default: false })
  isPublished: boolean
}
```

### API 端点

| 方法   | 路径                           | 描述     |
| ------ | ------------------------------ | -------- |
| GET    | /api/v1/knowledge/articles     | 分页列表 |
| POST   | /api/v1/knowledge/articles     | 创建文章 |
| GET    | /api/v1/knowledge/articles/:id | 详情     |
| PUT    | /api/v1/knowledge/articles/:id | 更新     |
| DELETE | /api/v1/knowledge/articles/:id | 软删除   |
| GET    | /api/v1/knowledge/categories   | 分类树   |
| POST   | /api/v1/knowledge/search       | 搜索     |
| POST   | /api/v1/knowledge/ask          | AI 问答  |

## AI 集成说明

- AI 问答使用 RAG 模式
- 向量化：使用 Embedding API 对文章内容向量化存储
- 检索：语义相似度检索 Top-K 相关文章
- 生成：将检索结果作为上下文，调用 LLM 生成回答
- 存储：向量数据可存储于 MySQL (JSON) 或引入 pgvector

## 依赖关系

- **依赖**: `@crm/shared`、Auth 模块（鉴权）
- **独立模块**，不依赖其他业务模块

## 权限与安全

### RBAC 权限控制

- Controller 类级别应用 `@UseGuards(JwtAuthGuard, RolesGuard)`
- 文章创建 (`POST /knowledge/articles`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 文章更新 (`PUT /knowledge/articles/:id`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 文章删除 (`DELETE /knowledge/articles/:id`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 分类创建 (`POST /knowledge/categories`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 分类删除 (`DELETE /knowledge/categories/:id`) 限制为 `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
- 查询和 AI 问答操作所有已认证角色可用

### 审计日志

- Controller 使用 `@UseInterceptors(AuditLogInterceptor)` 自动记录所有写操作
