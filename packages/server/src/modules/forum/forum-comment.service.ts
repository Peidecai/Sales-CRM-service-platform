import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserRole } from '@crm/shared'
import { ForumComment } from './entities/forum-comment.entity'
import { ForumPost } from './entities/forum-post.entity'
import { ForumLike } from './entities/forum-like.entity'
import { CreateForumCommentDto } from './dto/create-forum-comment.dto'

@Injectable()
export class ForumCommentService {
  constructor(
    @InjectRepository(ForumComment)
    private readonly commentRepo: Repository<ForumComment>,
    @InjectRepository(ForumPost)
    private readonly postRepo: Repository<ForumPost>,
    @InjectRepository(ForumLike)
    private readonly likeRepo: Repository<ForumLike>,
  ) {}

  async create(postId: number, dto: CreateForumCommentDto, userId: number): Promise<ForumComment> {
    const post = await this.postRepo.findOne({ where: { id: postId } })
    if (!post) {
      throw new NotFoundException('帖子不存在')
    }
    if (post.isLocked) {
      throw new ForbiddenException('帖子已锁定，无法评论')
    }
    const comment = this.commentRepo.create({
      postId,
      authorId: userId,
      content: dto.content,
      parentId: dto.parentId ?? null,
      replyToUserId: dto.replyToUserId ?? null,
    })
    const saved = await this.commentRepo.save(comment)
    await this.postRepo.increment({ id: postId }, 'commentCount', 1)
    await this.postRepo.update(postId, { lastCommentAt: new Date() })
    return saved
  }

  async findByPost(
    postId: number,
    page: number,
    pageSize: number,
  ): Promise<{ list: ForumComment[]; total: number }> {
    const [list, total] = await this.commentRepo.findAndCount({
      where: { postId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total }
  }

  async remove(id: number, userId: number, userRole: string): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id } })
    if (!comment) {
      throw new NotFoundException('评论不存在')
    }
    if (
      comment.authorId !== userId &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER
    ) {
      throw new ForbiddenException('无权删除此评论')
    }
    await this.commentRepo.softRemove(comment)
    await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1)
  }

  async toggleLike(userId: number, commentId: number): Promise<{ liked: boolean }> {
    const existing = await this.likeRepo.findOne({
      where: { userId, targetType: 'comment', targetId: commentId },
    })
    if (existing) {
      await this.likeRepo.remove(existing)
      await this.commentRepo.decrement({ id: commentId }, 'likeCount', 1)
      return { liked: false }
    }
    const like = this.likeRepo.create({ userId, targetType: 'comment', targetId: commentId })
    await this.likeRepo.save(like)
    await this.commentRepo.increment({ id: commentId }, 'likeCount', 1)
    return { liked: true }
  }
}
