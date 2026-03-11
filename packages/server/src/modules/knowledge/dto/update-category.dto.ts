import { IsString, IsOptional, IsInt, IsEnum, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { KnowledgeCategoryType } from '@crm/shared'

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ description: 'Category code', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryCode?: string

  @ApiPropertyOptional({ description: 'Category type', enum: KnowledgeCategoryType })
  @IsOptional()
  @IsEnum(KnowledgeCategoryType)
  categoryType?: KnowledgeCategoryType

  @ApiPropertyOptional({ description: 'Icon URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentId?: number | null

  @ApiPropertyOptional({ description: 'Sort order' })
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
