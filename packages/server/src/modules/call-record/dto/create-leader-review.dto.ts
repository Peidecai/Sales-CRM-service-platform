import { IsNotEmpty, IsString, IsOptional, IsInt, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateLeaderReviewDto {
  @ApiProperty({ description: '点评内容' })
  @IsNotEmpty({ message: '点评内容不能为空' })
  @IsString()
  @MaxLength(2000, { message: '点评内容不能超过2000字' })
  content!: string

  @ApiPropertyOptional({ description: '关联客户ID' })
  @IsOptional()
  @IsInt()
  customerId?: number
}
