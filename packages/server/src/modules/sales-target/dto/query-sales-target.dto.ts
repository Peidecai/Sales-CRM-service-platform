import { IsOptional, IsEnum, IsInt, IsString, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { TargetScope, TargetPeriod, TargetMetricType } from '@crm/shared'

export class QuerySalesTargetDto {
  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页数量', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: '目标范围', enum: TargetScope })
  @IsOptional()
  @IsEnum(TargetScope)
  scope?: TargetScope

  @ApiPropertyOptional({ description: '目标周期', enum: TargetPeriod })
  @IsOptional()
  @IsEnum(TargetPeriod)
  period?: TargetPeriod

  @ApiPropertyOptional({ description: '指标类型', enum: TargetMetricType })
  @IsOptional()
  @IsEnum(TargetMetricType)
  metricType?: TargetMetricType

  @ApiPropertyOptional({ description: '年份' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number

  @ApiPropertyOptional({ description: '分配用户 ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedUserId?: number
}
