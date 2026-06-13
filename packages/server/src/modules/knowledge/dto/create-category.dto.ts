import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentId?: number

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sort?: number

  @ApiPropertyOptional({ description: 'Category description', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string
}
