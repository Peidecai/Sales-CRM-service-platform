import { IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export enum GroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class ReportFilterDto {
  @ApiPropertyOptional({ description: '开始日期', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: '结束日期', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @IsNumber()
  departmentId?: number

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsNumber()
  userId?: number

  @ApiPropertyOptional({ description: '分组方式', enum: GroupBy, default: GroupBy.DAY })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy

  @ApiPropertyOptional({ description: 'Top N 排名', example: 10 })
  @IsOptional()
  @IsNumber()
  topN?: number
}
