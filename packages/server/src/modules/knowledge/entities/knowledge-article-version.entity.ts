import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { KnowledgeArticle } from './knowledge-article.entity'

/**
 * Immutable version snapshot — intentionally does not extend BaseEntity
 * as versions should never be updated or soft-deleted.
 */
@Entity('knowledge_article_versions')
export class KnowledgeArticleVersion {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'article_id', type: 'int' })
  articleId!: number

  @ManyToOne(() => KnowledgeArticle, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'article_id' })
  article!: KnowledgeArticle

  @Column({ type: 'int' })
  version!: number

  @Column({ length: 300 })
  title!: string

  @Column({ type: 'longtext' })
  content!: string

  @Column({ name: 'edited_by_id', type: 'int' })
  editedById!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
