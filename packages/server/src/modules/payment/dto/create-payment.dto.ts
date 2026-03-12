import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentStatus, PaymentMethod } from '@crm/shared'

export class CreatePaymentDto {
  @ApiProperty({ description: '合同ID' })
  @IsInt()
  @IsPositive()
  contractId!: number

  @ApiPropertyOptional({ description: '商机ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  opportunityId?: number

  @ApiProperty({ description: '客户ID' })
  @IsInt()
  @IsPositive()
  customerId!: number

  @ApiProperty({ description: '负责人ID' })
  @IsInt()
  @IsPositive()
  ownerId!: number

  @ApiPropertyOptional({ description: '分期期号' })
  @IsOptional()
  @IsInt()
  @Min(1)
  periodNo?: number

  @ApiPropertyOptional({ description: '计划回款金额', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedAmount?: number

  @ApiPropertyOptional({ description: '实际回款金额', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number

  @ApiPropertyOptional({ description: '计划回款日期（ISO 日期字符串）' })
  @IsOptional()
  @IsDateString()
  plannedDate?: string

  @ApiPropertyOptional({ description: '实际回款日期（ISO 日期字符串）' })
  @IsOptional()
  @IsDateString()
  actualDate?: string

  @ApiPropertyOptional({ description: '回款方式', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod

  @ApiPropertyOptional({ description: '银行流水号', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankTransactionNo?: string

  @ApiPropertyOptional({ description: '发票号', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNo?: string

  @ApiPropertyOptional({ description: '回款状态', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string

  @ApiPropertyOptional({ description: '附件列表（JSON数组）' })
  @IsOptional()
  @IsArray()
  attachments?: unknown[]

  @ApiPropertyOptional({ description: '是否逾期' })
  @IsOptional()
  @IsBoolean()
  isOverdue?: boolean
}
