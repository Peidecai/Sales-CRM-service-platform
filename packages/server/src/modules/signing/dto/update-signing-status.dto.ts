import { IsString, IsOptional, IsIn } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const VALID_STATUSES = [
  'draft',
  'internal_review',
  'sent_to_customer',
  'customer_signed',
  'completed',
  'cancelled',
]

export class UpdateSigningStatusDto {
  @ApiProperty({ description: '目标状态', enum: VALID_STATUSES })
  @IsString()
  @IsIn(VALID_STATUSES)
  status!: string

  @ApiPropertyOptional({ description: '第三方电子签章 ID' })
  @IsOptional()
  @IsString()
  externalSignId?: string
}
