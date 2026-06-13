import { Entity, Column, Index, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm'
import { PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'
import type { KnowledgeArticle } from './knowledge-article.entity'

@Entity('article_comments')
export class ArticleComment {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'article_id' })
  articleId!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @Index()
  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId!: number | null

  @Column({ type: 'text' })
  content!: string

  @CreateDateColumn({ name: 'created_at', precision: 6 })
  createdAt!: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null

  @ManyToOne('KnowledgeArticle')
  @JoinColumn({ name: 'article_id' })
  article!: KnowledgeArticle

  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user!: unknown
}
