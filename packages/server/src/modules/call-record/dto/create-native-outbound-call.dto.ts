import { Type } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CallResult } from '@crm/shared'

export class CreateNativeOutboundCallDto {
  @ApiProperty({ description: 'Client-generated idempotency key for this native call' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientCallId!: string

  @ApiProperty({ description: 'Customer ID selected in the miniapp' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  customerId!: number

  @ApiProperty({ description: 'Customer phone number clicked by the sales user' })
  @IsString()
  @MaxLength(50)
  customerPhone!: string

  @ApiProperty({ description: 'Native outbound call start time (ISO string)' })
  @IsDateString()
  startedAt!: string

  @ApiProperty({ description: 'Native outbound call end/return time (ISO string)' })
  @IsDateString()
  endedAt!: string

  @ApiPropertyOptional({
    description: 'Call result selected after returning to the miniapp',
    enum: CallResult,
  })
  @IsOptional()
  @IsEnum(CallResult)
  callResult?: CallResult

  @ApiPropertyOptional({ description: 'Sales notes after the call', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string

  @ApiPropertyOptional({
    description: 'Preferred SIM slot used by the native dialer',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  simSlot?: number
}
