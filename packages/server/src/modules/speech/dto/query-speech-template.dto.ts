import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { SpeechTemplateStatus } from '@crm/shared'

export class QuerySpeechTemplateDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number

  @ApiPropertyOptional({ description: '状态', enum: SpeechTemplateStatus })
  @IsOptional()
  @IsEnum(SpeechTemplateStatus)
  status?: SpeechTemplateStatus
}
