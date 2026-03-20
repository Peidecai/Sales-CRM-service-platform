import { IsString, IsOptional, IsInt, IsArray, ValidateNested, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

class PaperQuestionItemDto {
  @IsInt()
  questionId!: number

  @IsInt()
  @Min(1)
  score!: number

  @IsOptional()
  @IsInt()
  sortOrder?: number
}

class RandomRuleDto {
  @IsInt()
  categoryId!: number

  @IsString()
  type!: string

  @IsInt()
  @Min(1)
  count!: number

  @IsInt()
  @Min(1)
  scorePerQuestion!: number
}

export class CreateExamPaperDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  title!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty()
  @IsString()
  buildMode!: string

  @ApiProperty()
  @IsInt()
  @Min(1)
  totalScore!: number

  @ApiProperty()
  @IsInt()
  @Min(1)
  passScore!: number

  @ApiProperty({ description: 'Duration in minutes' })
  @IsInt()
  @Min(1)
  duration!: number

  @ApiPropertyOptional({ type: [PaperQuestionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaperQuestionItemDto)
  questions?: PaperQuestionItemDto[]

  @ApiPropertyOptional({ type: [RandomRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RandomRuleDto)
  randomConfig?: RandomRuleDto[]
}
