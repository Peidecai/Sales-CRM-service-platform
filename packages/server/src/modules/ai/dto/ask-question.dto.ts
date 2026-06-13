import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AskQuestionDto {
  @ApiProperty({ description: '问题内容', example: '如何处理客户投诉？' })
  @IsString()
  @IsNotEmpty()
  question!: string

  @ApiPropertyOptional({ description: '返回的最相关文档数量', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number
}
