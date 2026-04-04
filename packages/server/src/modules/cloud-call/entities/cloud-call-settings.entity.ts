import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm'
import { EncryptionService } from '../../../common/security/encryption.service'

/**
 * Singleton settings row for cloud call provider configuration.
 * Only one row exists (id=1), upserted on save.
 * AppSecret is AES-256-GCM encrypted at rest.
 */
@Entity('cloud_call_settings')
export class CloudCallSettings {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    type: 'varchar',
    length: 20,
    default: 'aliyun',
    comment: 'Provider: aliyun / tianrun / ronglian',
  })
  provider!: string

  @Column({
    name: 'app_key',
    type: 'varchar',
    length: 128,
    default: '',
    comment: 'Access Key ID / AppKey',
  })
  appKey!: string

  @Column({
    name: 'app_secret',
    type: 'varchar',
    length: 512,
    default: '',
    comment: 'Access Key Secret (AES-256-GCM encrypted)',
    transformer: EncryptionService.columnTransformer(),
  })
  appSecret!: string

  @Column({
    name: 'instance_id',
    type: 'varchar',
    length: 128,
    default: '',
    comment: 'CCC instance ID (Aliyun specific)',
  })
  instanceId!: string

  @Column({
    name: 'webhook_url',
    type: 'varchar',
    length: 500,
    default: '',
    comment: 'Webhook callback URL',
  })
  webhookUrl!: string

  @Column({
    name: 'webhook_secret',
    type: 'varchar',
    length: 512,
    default: '',
    comment: 'Webhook HMAC secret (AES-256-GCM encrypted)',
    transformer: EncryptionService.columnTransformer(),
  })
  webhookSecret!: string

  @Column({
    name: 'phone_numbers',
    type: 'varchar',
    length: 500,
    default: '',
    comment: 'Outbound phone numbers (comma-separated)',
  })
  phoneNumbers!: string

  @Column({
    name: 'concurrent_lines',
    type: 'int',
    default: 10,
    comment: 'Max concurrent call lines',
  })
  concurrentLines!: number

  @Column({
    name: 'is_active',
    type: 'tinyint',
    default: 0,
    comment: '1 = configuration verified and active',
  })
  isActive!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
