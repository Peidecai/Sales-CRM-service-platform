import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OpportunityFollowType } from '../entities/opportunity-follow-log.entity'

export class CreateOpportunityFollowLogDto {
  @ApiProperty({ description: 'Follow type', enum: OpportunityFollowType })
  @IsEnum(OpportunityFollowType)
  type!: OpportunityFollowType

  @ApiProperty({ description: 'Follow content' })
  @IsString()
  @IsNotEmpty()
  content!: string

  @ApiPropertyOptional({ description: 'Follow result', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  result?: string

  @ApiPropertyOptional({ description: 'Next step', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextStep?: string

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsOptional()
  @IsArray()
  attachments?: Array<{ name: string; url: string; type?: string }>
}
