import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ArticleComment } from './entities/article-comment.entity'
import { UserRole } from '@crm/shared'

export interface CreateCommentDto {
  content: string
  parentId?: number
}

export interface CommentTreeNode {
  id: number
  articleId: number
  userId: number
  parentId: number | null
  content: string
  createdAt: Date
  deleted: boolean
  children: CommentTreeNode[]
}

@Injectable()
export class ArticleCommentService {
  constructor(
    @InjectRepository(ArticleComment)
    private readonly commentRepository: Repository<ArticleComment>,
  ) {}

  async create(articleId: number, userId: number, dto: CreateCommentDto): Promise<ArticleComment> {
    const comment = this.commentRepository.create({
      articleId,
      userId,
      content: dto.content,
      parentId: dto.parentId ?? null,
    })
    return this.commentRepository.save(comment)
  }

  async list(
    articleId: number,
    page: number,
    pageSize: number,
  ): Promise<{ list: CommentTreeNode[]; total: number }> {
    const all = await this.commentRepository.find({
      where: { articleId, deleted: false },
      order: { createdAt: 'ASC' },
    })
    const byParent = new Map<number | null, ArticleComment[]>()
    for (const c of all) {
      const key = c.parentId
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key)!.push(c)
    }
    const build = (parentId: number | null): CommentTreeNode[] => {
      const nodes = byParent.get(parentId) ?? []
      return nodes.map((c) => ({
        id: c.id,
        articleId: c.articleId,
        userId: c.userId,
        parentId: c.parentId,
        content: c.content,
        createdAt: c.createdAt,
        deleted: c.deleted,
        children: build(c.id),
      }))
    }
    const roots = build(null)
    const total = roots.length
    const list = roots.slice((page - 1) * pageSize, page * pageSize)
    return { list, total }
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id } })
    if (!comment) throw new NotFoundException(`Comment ${id} not found`)
    if (comment.userId !== userId && userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      throw new ForbiddenException('Only author or admin can delete')
    }
    comment.deleted = true
    await this.commentRepository.save(comment)
  }
}
