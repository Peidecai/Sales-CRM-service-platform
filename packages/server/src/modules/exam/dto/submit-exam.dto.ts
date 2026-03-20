import { IsArray, ValidateNested, IsInt, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'

class SubmitAnswerItemDto {
  @IsInt()
  questionId!: number

  @IsArray()
  @IsString({ each: true })
  userAnswer!: string[]
}

export class SubmitExamDto {
  @ApiProperty({ type: [SubmitAnswerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  answers!: SubmitAnswerItemDto[]
}
