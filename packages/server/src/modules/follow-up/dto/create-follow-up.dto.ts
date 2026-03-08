import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { FollowUpType } from '../follow-up.entity'

export class CreateFollowUpDto {
  @ApiProperty({ description: '关联客户 ID' })
  @IsInt()
  @IsPositive()
  customerId!: number

  @ApiProperty({ enum: FollowUpType, description: '跟进方式' })
  @IsEnum(FollowUpType)
  type!: FollowUpType

  @ApiProperty({ description: '跟进内容', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string

  @ApiPropertyOptional({ description: '下次跟进日期 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string

  @ApiPropertyOptional({ description: '下次跟进备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextFollowUpNote?: string
}
