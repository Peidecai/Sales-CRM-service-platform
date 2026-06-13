import { Exclude, Expose } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { AuditAction } from '../audit-log.entity'

/**
 * Response DTO for AuditLog entity.
 *
 * Hides internal fields (archiveStatus, responseData) from API consumers.
 * before/after JSON payloads are already masked by AuditLogService.maskSensitive().
 */
@Exclude()
export class AuditLogResponseDto {
  @Expose()
  @ApiProperty({ description: '日志ID' })
  id!: number

  @Expose()
  @ApiProperty({ description: '操作用户ID' })
  userId!: number

  @Expose()
  @ApiProperty({ description: '操作用户名' })
  username!: string

  @Expose()
  @ApiProperty({ description: '操作类型', enum: AuditAction })
  action!: AuditAction

  @Expose()
  @ApiProperty({ description: '资源类型' })
  resource!: string

  @Expose()
  @ApiProperty({ description: '资源ID', required: false })
  resourceId!: number

  @Expose()
  @ApiProperty({ description: '操作前数据', required: false })
  before!: Record<string, unknown> | null

  @Expose()
  @ApiProperty({ description: '操作后数据', required: false })
  after!: Record<string, unknown> | null

  @Expose()
  @ApiProperty({ description: '客户端IP', required: false })
  ip!: string

  @Expose()
  @ApiProperty({ description: '创建时间' })
  createdAt!: Date

  // responseData, archiveStatus — excluded from API response
}
