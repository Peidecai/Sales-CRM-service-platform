import { IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class QueryCallRecordDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number

  @ApiPropertyOptional({ description: 'Filter by opportunity ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  opportunityId?: number

  @ApiPropertyOptional({ description: 'Filter by caller user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number

  @ApiPropertyOptional({ description: 'Filter by call start date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: 'Filter by call end date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string
}
