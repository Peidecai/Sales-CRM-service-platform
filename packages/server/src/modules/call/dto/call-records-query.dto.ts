import { IsOptional, IsInt, Min, Max, IsDateString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CallDirection, CallType } from '@crm/shared'

export class CallRecordsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @ApiPropertyOptional({ enum: CallDirection })
  @IsOptional()
  @IsEnum(CallDirection)
  direction?: CallDirection

  @ApiPropertyOptional({ enum: CallType })
  @IsOptional()
  @IsEnum(CallType)
  callType?: CallType

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string
}
