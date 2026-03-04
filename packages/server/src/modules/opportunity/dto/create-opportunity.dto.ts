import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OpportunityStage } from '@crm/shared'

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
}
