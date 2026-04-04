import { IsOptional, IsString, IsEnum, IsInt, IsIn, Min, Max } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ProspectStatus, ProspectChannel } from '@crm/shared'

export class QueryProspectDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '关键词（企业名称）' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: '线索状态', enum: ProspectStatus })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ProspectStatus)
  status?: ProspectStatus

  @ApiPropertyOptional({ description: '来源渠道', enum: ProspectChannel })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ProspectChannel)
  channel?: ProspectChannel

  @ApiPropertyOptional({ description: '行业' })
  @IsOptional()
  @IsString()
  industry?: string

  @ApiPropertyOptional({ description: '排序字段', enum: ['createdAt', 'companyName', 'status'] })
  @IsOptional()
  @IsIn(['createdAt', 'companyName', 'status'])
  sortBy?: string

  @ApiPropertyOptional({ description: '排序方式', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC'
}
