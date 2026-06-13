import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity('article_likes')
@Index(['userId', 'articleId'], { unique: true })
export class ArticleLike {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @Index()
  @Column({ name: 'article_id' })
  articleId!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
