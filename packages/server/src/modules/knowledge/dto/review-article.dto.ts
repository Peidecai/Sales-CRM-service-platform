import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ReviewArticleDto {
  @ApiProperty({ description: 'Whether the article is approved' })
  @IsBoolean()
  approved!: boolean

  @ApiPropertyOptional({ description: 'Review remark' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}
