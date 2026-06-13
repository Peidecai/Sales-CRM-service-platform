import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  IsNumber,
  IsDateString,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OpportunityStage, OpportunityStatus, Priority } from '@crm/shared'

export class CreateOpportunityDto {
  @ApiProperty({ description: 'Opportunity title', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @ApiProperty({ description: 'Associated customer ID' })
  @IsInt()
  @IsPositive()
  customerId!: number

  @ApiPropertyOptional({ description: 'Opportunity stage', enum: OpportunityStage })
  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage

  @ApiPropertyOptional({ description: 'Deal amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number

  @ApiPropertyOptional({ description: 'Expected close date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string

  @ApiPropertyOptional({ description: 'Win probability 0-100', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number

  @ApiProperty({ description: 'Assigned user ID' })
  @IsInt()
  @IsPositive()
  assignedUserId!: number

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Contact ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  contactId?: number

  @ApiPropertyOptional({ description: 'Team ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  teamId?: number

  @ApiPropertyOptional({ description: 'Opportunity source', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string

  @ApiPropertyOptional({ description: 'Lead ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  leadId?: number

  @ApiPropertyOptional({ description: 'Currency', default: 'CNY', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string

  @ApiPropertyOptional({ description: 'Priority', enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @ApiPropertyOptional({ description: 'Opportunity status', enum: OpportunityStatus })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus

  @ApiPropertyOptional({ description: 'Competitor IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  competitorIds?: number[]

  @ApiPropertyOptional({ description: 'Product IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  productIds?: number[]

  @ApiPropertyOptional({ description: 'Custom fields (key-value)' })
  @IsOptional()
  customFields?: Record<string, unknown>
}
