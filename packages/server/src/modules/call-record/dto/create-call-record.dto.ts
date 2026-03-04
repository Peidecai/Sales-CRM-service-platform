import {
  IsInt,
  IsPositive,
  IsOptional,
  IsDateString,
  IsString,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCallRecordDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsInt()
  @IsPositive()
  customerId!: number

  @ApiPropertyOptional({ description: 'Opportunity ID' })
  @IsOptional()
  @IsInt()
  opportunityId?: number

  @ApiProperty({ description: 'Caller user ID' })
  @IsInt()
  @IsPositive()
  userId!: number

  @ApiProperty({ description: 'Call datetime (ISO string)' })
  @IsDateString()
  callAt!: string

  @ApiPropertyOptional({ description: 'Duration in seconds', default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number = 0

  @ApiPropertyOptional({ description: 'Call notes' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ description: 'Recording file URL', maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  recordingUrl?: string
}
