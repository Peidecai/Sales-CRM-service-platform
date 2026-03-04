import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateArticleDto {
  @ApiProperty({ description: 'Article title', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string

  @ApiProperty({ description: 'Article content (Markdown supported)' })
  @IsString()
  @IsNotEmpty()
  content!: string

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsInt()
  categoryId?: number

  @ApiProperty({ description: 'Author user ID' })
  @IsInt()
  @IsPositive()
  authorId!: number

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @ApiPropertyOptional({ description: 'Whether the article is published', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}
