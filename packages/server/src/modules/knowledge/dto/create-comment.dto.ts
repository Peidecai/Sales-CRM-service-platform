import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @MaxLength(2000)
  content!: string

  @ApiPropertyOptional({ description: 'Parent comment ID for reply' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentId?: number
}
