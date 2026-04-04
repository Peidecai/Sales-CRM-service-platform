import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserRole } from '@crm/shared'
import { ForumPost } from './entities/forum-post.entity'
import { ForumLike } from './entities/forum-like.entity'
import { ForumFavorite } from './entities/forum-favorite.entity'
import { ForumCategory } from './entities/forum-category.entity'
import { CreateForumPostDto } from './dto/create-forum-post.dto'
import { UpdateForumPostDto } from './dto/update-forum-post.dto'
import { ForumPostQueryDto } from './dto/forum-post-query.dto'
import { ModeratePostDto } from './dto/moderate-post.dto'

@Injectable()
export class ForumPostService {
  constructor(
    @InjectRepository(ForumPost)
    private readonly postRepo: Repository<ForumPost>,
    @InjectRepository(ForumLike)
    private readonly likeRepo: Repository<ForumLike>,
    @InjectRepository(ForumFavorite)
    private readonly favoriteRepo: Repository<ForumFavorite>,
    @InjectRepository(ForumCategory)
    private readonly categoryRepo: Repository<ForumCategory>,
  ) {}

  async create(dto: CreateForumPostDto, userId: number): Promise<ForumPost> {
    const post = this.postRepo.create({
      title: dto.title,
      content: dto.content,
      categoryId: dto.categoryId,
      authorId: userId,
      linkedArticleId: dto.linkedArticleId ?? null,
    })
    const saved = await this.postRepo.save(post)
    await this.categoryRepo.increment({ id: dto.categoryId }, 'postCount', 1)
    return saved
  }

  async findAll(query: ForumPostQueryDto): Promise<{ list: ForumPost[]; total: number }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const qb = this.postRepo.createQueryBuilder('post')

    if (query.categoryId) {
      qb.andWhere('post.category_id = :categoryId', { categoryId: query.categoryId })
    }
    if (query.keyword) {
      qb.andWhere('(post.title LIKE :kw OR post.content LIKE :kw)', { kw: `%${query.keyword}%` })
    }
    if (query.isPinned !== undefined) {
      qb.andWhere('post.is_pinned = :isPinned', { isPinned: query.isPinned })
    }
    if (query.isFeatured !== undefined) {
      qb.andWhere('post.is_featured = :isFeatured', { isFeatured: query.isFeatured })
    }

    // Pinned posts first
    qb.addOrderBy('post.isPinned', 'DESC')

    const sortBy = query.sortBy ?? 'latest'
    if (sortBy === 'popular') {
      qb.addOrderBy('post.likeCount', 'DESC')
    } else if (sortBy === 'commented') {
      qb.addOrderBy('post.commentCount', 'DESC')
    } else {
      qb.addOrderBy('post.createdAt', 'DESC')
    }

    qb.skip((page - 1) * pageSize).take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async findOne(
    id: number,
    userId?: number,
  ): Promise<ForumPost & { isLiked?: boolean; isFavorited?: boolean }> {
    const post = await this.postRepo.findOne({ where: { id } })
    if (!post) {
      throw new NotFoundException('帖子不存在')
    }

    // Increment view count
    await this.postRepo.increment({ id }, 'viewCount', 1)
    post.viewCount += 1

    const result: ForumPost & { isLiked?: boolean; isFavorited?: boolean } = post
    if (userId) {
      const like = await this.likeRepo.findOne({
        where: { userId, targetType: 'post', targetId: id },
      })
      result.isLiked = !!like
      const fav = await this.favoriteRepo.findOne({
        where: { userId, postId: id },
      })
      result.isFavorited = !!fav
    }
    return result
  }

  async update(id: number, dto: UpdateForumPostDto, userId: number): Promise<ForumPost> {
    const post = await this.postRepo.findOne({ where: { id } })
    if (!post) {
      throw new NotFoundException('帖子不存在')
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('只能编辑自己的帖子')
    }
    Object.assign(post, dto)
    return this.postRepo.save(post)
  }

  async moderate(id: number, dto: ModeratePostDto): Promise<ForumPost> {
    const post = await this.postRepo.findOne({ where: { id } })
    if (!post) {
      throw new NotFoundException('帖子不存在')
    }
    if (dto.isPinned !== undefined) post.isPinned = dto.isPinned
    if (dto.isFeatured !== undefined) post.isFeatured = dto.isFeatured
    if (dto.isLocked !== undefined) post.isLocked = dto.isLocked
    if (dto.categoryId !== undefined) post.categoryId = dto.categoryId
    return this.postRepo.save(post)
  }

  async remove(id: number, userId: number, userRole: string): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id } })
    if (!post) {
      throw new NotFoundException('帖子不存在')
    }
    if (post.authorId !== userId && userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      throw new ForbiddenException('无权删除此帖子')
    }
    await this.categoryRepo.decrement({ id: post.categoryId }, 'postCount', 1)
    await this.postRepo.softRemove(post)
  }

  async toggleLike(userId: number, postId: number): Promise<{ liked: boolean }> {
    const existing = await this.likeRepo.findOne({
      where: { userId, targetType: 'post', targetId: postId },
    })
    if (existing) {
      await this.likeRepo.remove(existing)
      await this.postRepo.decrement({ id: postId }, 'likeCount', 1)
      return { liked: false }
    }
    const like = this.likeRepo.create({ userId, targetType: 'post', targetId: postId })
    await this.likeRepo.save(like)
    await this.postRepo.increment({ id: postId }, 'likeCount', 1)
    return { liked: true }
  }

  async toggleFavorite(userId: number, postId: number): Promise<{ favorited: boolean }> {
    const existing = await this.favoriteRepo.findOne({
      where: { userId, postId },
    })
    if (existing) {
      await this.favoriteRepo.remove(existing)
      return { favorited: false }
    }
    const fav = this.favoriteRepo.create({ userId, postId })
    await this.favoriteRepo.save(fav)
    return { favorited: true }
  }

  async findFavorites(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<{ list: ForumPost[]; total: number }> {
    const [favs, total] = await this.favoriteRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    if (favs.length === 0) return { list: [], total }
    const postIds = favs.map((f) => f.postId)
    const posts = await this.postRepo.createQueryBuilder('post').whereInIds(postIds).getMany()
    return { list: posts, total }
  }
}
