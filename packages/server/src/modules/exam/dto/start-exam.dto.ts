import { IsInt, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class StartExamDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  paperId!: number
}
