import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { TemplateVariable } from '../entities/contract-template.entity'

export class CreateContractTemplateDto {
  @ApiProperty({ description: '模板名称', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string

  @ApiProperty({ description: '模板内容（支持 {{变量}} 占位符）' })
  @IsString()
  @IsNotEmpty()
  content!: string

  @ApiPropertyOptional({ description: '模板分类', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string

  @ApiPropertyOptional({ description: '变量定义列表' })
  @IsOptional()
  @IsArray()
  variables?: TemplateVariable[]

  @ApiPropertyOptional({ description: '是否为默认模板' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
