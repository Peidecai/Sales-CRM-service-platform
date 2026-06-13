import {
  IsInt,
  IsPositive,
  IsOptional,
  IsDateString,
  IsString,
  IsUrl,
  Min,
  MaxLength,
  IsEnum,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CallType, CallResult } from '@crm/shared'

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

  @ApiPropertyOptional({
    description: '呼叫类型: normal=平台外呼, manual=手机原生外呼, callback=回呼',
    enum: CallType,
    default: CallType.NORMAL,
  })
  @IsOptional()
  @IsEnum(CallType)
  callType?: CallType

  @ApiPropertyOptional({
    description: '估算通话时长（秒），方案B手机原生外呼专用',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDuration?: number

  @ApiPropertyOptional({
    description: '通话结果: connected/no_answer/busy/power_off',
    enum: CallResult,
  })
  @IsOptional()
  @IsEnum(CallResult)
  callResult?: CallResult
}
