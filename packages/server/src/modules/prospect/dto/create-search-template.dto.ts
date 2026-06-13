import { IsString, IsOptional, IsBoolean, IsObject, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ProspectSearchQuery } from '@crm/shared'

export class CreateSearchTemplateDto {
  @ApiProperty({ description: '模板名称', example: '北京科技企业' })
  @IsString()
  @MaxLength(100)
  name!: string

  @ApiProperty({ description: '搜索条件 JSON' })
  @IsObject()
  conditions!: ProspectSearchQuery

  @ApiPropertyOptional({ description: '是否共享', default: false })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean
}
