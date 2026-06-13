import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export enum AppPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  ALL = 'all',
}

@Entity('app_versions')
export class AppVersion extends BaseEntity {
  @Column({ type: 'varchar', length: 20, comment: '版本号 (semver)' })
  version!: string

  @Index('IDX_app_versions_build_number')
  @Column({ name: 'build_number', type: 'int', comment: '构建号' })
  buildNumber!: number

  @Index('IDX_app_versions_platform')
  @Column({
    type: 'enum',
    enum: AppPlatform,
    default: AppPlatform.ALL,
    comment: '平台',
  })
  platform!: AppPlatform

  @Column({ name: 'download_url', type: 'varchar', length: 500, comment: '下载地址' })
  downloadUrl!: string

  @Column({ type: 'text', comment: '更新描述' })
  description!: string

  @Column({ name: 'force_update', type: 'boolean', default: false, comment: '是否强制更新' })
  forceUpdate!: boolean

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive!: boolean

  @Column({
    name: 'min_version',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '最低支持版本',
  })
  minVersion!: string | null
}
