import { IsString, IsInt, IsPositive, IsOptional, IsEnum, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SpeechTemplateStatus } from '@crm/shared'

export class CreateSpeechTemplateDto {
  @ApiProperty({ description: '话术标题', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string

  @ApiProperty({ description: '话术内容' })
  @IsString()
  content!: string

  @ApiProperty({ description: '分类ID' })
  @IsInt()
  @IsPositive()
  categoryId!: number

  @ApiPropertyOptional({ description: '适用场景', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  scene?: string

  @ApiPropertyOptional({ description: '标签（逗号分隔）', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tags?: string

  @ApiPropertyOptional({ description: '状态', enum: SpeechTemplateStatus })
  @IsOptional()
  @IsEnum(SpeechTemplateStatus)
  status?: SpeechTemplateStatus
}
