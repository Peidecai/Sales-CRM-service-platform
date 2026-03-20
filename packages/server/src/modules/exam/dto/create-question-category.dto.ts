import { IsString, IsOptional, MaxLength, IsInt } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateQuestionCategoryDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  parentId?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number
}
