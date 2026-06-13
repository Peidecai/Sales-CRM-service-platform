import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsArray,
  MaxLength,
  IsDateString,
  Min,
  Max,
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

  @ApiPropertyOptional({ description: '关联联系人ID' })
  @IsOptional()
  @IsInt()
  contactId?: number

  @ApiPropertyOptional({ description: '跟进结果', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  result?: string

  @ApiPropertyOptional({ description: '下次计划', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextPlan?: string

  @ApiPropertyOptional({ description: '意向等级(1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  intentionLevel?: number

  @ApiPropertyOptional({ description: '附件列表' })
  @IsOptional()
  @IsArray()
  attachments?: Array<{ name: string; url: string; type: string }>

  @ApiPropertyOptional({ description: '跟进地点', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string

  @ApiPropertyOptional({ description: '时长(分钟)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number

  @ApiPropertyOptional({ description: '录音URL' })
  @IsOptional()
  @IsString()
  callRecordingUrl?: string

  @ApiPropertyOptional({ description: '关联商机ID' })
  @IsOptional()
  @IsInt()
  relatedOpportunityId?: number
}
