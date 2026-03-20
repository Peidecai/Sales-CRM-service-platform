import { IsInt, IsPositive, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSpeechAnnotationDto {
  @ApiProperty({ description: '通话记录ID' })
  @IsInt()
  @IsPositive()
  callRecordId!: number

  @ApiPropertyOptional({ description: '关联话术模板ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  templateId?: number

  @ApiProperty({ description: '开始时间(秒)' })
  @IsInt()
  @Min(0)
  startTime!: number

  @ApiProperty({ description: '结束时间(秒)' })
  @IsInt()
  @Min(0)
  endTime!: number

  @ApiProperty({ description: '标注文本' })
  @IsString()
  text!: string

  @ApiPropertyOptional({ description: '评论', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string

  @ApiPropertyOptional({ description: '评分(1-100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  score?: number
}
