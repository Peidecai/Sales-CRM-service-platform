import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
  IsPositive,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ContractStatus, ContractType } from '@crm/shared'

export class CreateContractDto {
  @ApiProperty({ description: '合同标题', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @ApiProperty({ description: '合同类型', enum: ContractType })
  @IsEnum(ContractType)
  contractType!: ContractType

  @ApiPropertyOptional({ description: '关联商机ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  opportunityId?: number

  @ApiPropertyOptional({ description: '关联报价单ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  quotationId?: number

  @ApiProperty({ description: '客户ID' })
  @IsInt()
  @IsPositive()
  customerId!: number

  @ApiProperty({ description: '负责人ID' })
  @IsInt()
  @IsPositive()
  ownerId!: number

  @ApiProperty({ description: '我方签约主体', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ourEntity!: string

  @ApiProperty({ description: '客户签约主体', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerEntity!: string

  @ApiPropertyOptional({ description: '币种', maxLength: 3, default: 'CNY' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string

  @ApiProperty({ description: '合同总金额' })
  @IsNumber()
  @Min(0)
  totalAmount!: number

  @ApiProperty({ description: '合同开始日期 (YYYY-MM-DD)' })
  @IsDateString()
  startDate!: string

  @ApiProperty({ description: '合同结束日期 (YYYY-MM-DD)' })
  @IsDateString()
  endDate!: string

  @ApiPropertyOptional({ description: '签署日期 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  signDate?: string

  @ApiPropertyOptional({ description: '付款条款' })
  @IsOptional()
  @IsString()
  paymentTerms?: string

  @ApiPropertyOptional({ description: '交付条款' })
  @IsOptional()
  @IsString()
  deliveryTerms?: string

  @ApiPropertyOptional({ description: '合同状态', enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus

  @ApiPropertyOptional({ description: '签署文件URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signFileUrl?: string

  @ApiPropertyOptional({ description: '续签提醒天数', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  renewalReminderDays?: number

  @ApiPropertyOptional({ description: '父合同ID (补充协议用)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  parentContractId?: number

  @ApiPropertyOptional({ description: '附件列表 (JSON)' })
  @IsOptional()
  attachments?: Record<string, unknown>[]

  @ApiPropertyOptional({ description: '自定义字段 (JSON)' })
  @IsOptional()
  customFields?: Record<string, unknown>
}
