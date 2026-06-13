import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { AuditAction } from '../audit-log.entity'

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number

  @ApiPropertyOptional({
    description: 'Filter by resource type (customer, opportunity, call-record, knowledge)',
  })
  @IsOptional()
  @IsString()
  resource?: string

  @ApiPropertyOptional({ description: 'Filter by action type', enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction
}
