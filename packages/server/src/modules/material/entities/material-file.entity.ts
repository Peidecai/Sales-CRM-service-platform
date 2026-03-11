import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('material_files')
export class MaterialFile extends BaseEntity {
  @Column({ length: 255 })
  name!: string

  @Index()
  @Column({ name: 'oss_key', length: 500 })
  ossKey!: string

  @Column({ name: 'oss_bucket', length: 100 })
  ossBucket!: string

  @Column({ length: 32, nullable: true })
  md5!: string | null

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize!: number

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType!: string | null

  @Column({ name: 'thumbnail_key', length: 500, nullable: true })
  thumbnailKey!: string | null

  @Column({ type: 'int', nullable: true })
  width!: number | null

  @Column({ type: 'int', nullable: true })
  height!: number | null

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds!: number | null

  @Column({ name: 'extra_meta', type: 'json', nullable: true })
  extraMeta!: Record<string, unknown> | null

  @Index()
  @Column({ length: 50, nullable: true })
  category!: string | null

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null
}
