import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsString,
  Min,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentMethod } from '@crm/shared'

export class ConfirmPaymentDto {
  @ApiProperty({ description: '实际回款金额', minimum: 0 })
  @IsNumber()
  @Min(0)
  actualAmount!: number

  @ApiProperty({ description: '实际回款日期（ISO 日期字符串）' })
  @IsDateString()
  actualDate!: string

  @ApiProperty({ description: '回款方式', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod

  @ApiPropertyOptional({ description: '银行流水号', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankTransactionNo?: string
}
