import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { AnalysisStatus } from '@crm/shared'

export class QueryAnalysisDto {
  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页条数', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '通话记录 ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  callRecordId?: number

  @ApiPropertyOptional({ description: '客户 ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number

  @ApiPropertyOptional({ description: '客户分类标签', example: '高意向' })
  @IsOptional()
  @IsString()
  customerClassify?: string

  @ApiPropertyOptional({
    description: '分析状态',
    enum: AnalysisStatus,
  })
  @IsOptional()
  @IsEnum(AnalysisStatus)
  status?: AnalysisStatus

  @ApiPropertyOptional({ description: '开始日期 (YYYY-MM-DD)', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string

  @ApiPropertyOptional({ description: '结束日期 (YYYY-MM-DD)', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string
}
