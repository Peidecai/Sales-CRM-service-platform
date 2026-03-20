import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { QuestionType } from '@crm/shared'

class QuestionOptionDto {
  @IsString()
  label!: string

  @IsString()
  content!: string
}

export class CreateQuestionDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type!: QuestionType

  @ApiProperty()
  @IsString()
  content!: string

  @ApiProperty({ type: [QuestionOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[]

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  answer!: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string

  @ApiProperty()
  @IsInt()
  categoryId!: number

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  linkedArticleId?: number
}
