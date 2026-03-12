import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateQuotationItemDto {
  @ApiProperty({ description: '产品名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName!: string

  @ApiPropertyOptional({ description: '产品规格' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  productSpec?: string

  @ApiPropertyOptional({ description: '单位' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string

  @ApiProperty({ description: '数量' })
  @IsNumber()
  @Min(0.01)
  quantity!: number

  @ApiProperty({ description: '单价' })
  @IsNumber()
  @Min(0)
  unitPrice!: number

  @ApiPropertyOptional({ description: '标准价' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  listPrice?: number

  @ApiPropertyOptional({ description: '行项折扣率(%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountRate?: number

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class CreateQuotationDto {
  @ApiProperty({ description: '报价单名称', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string

  @ApiProperty({ description: '关联商机ID' })
  @IsInt()
  @IsPositive()
  opportunityId!: number

  @ApiProperty({ description: '客户ID' })
  @IsInt()
  @IsPositive()
  customerId!: number

  @ApiPropertyOptional({ description: '联系人ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  contactId?: number

  @ApiPropertyOptional({ description: '币种', default: 'CNY' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string

  @ApiPropertyOptional({ description: '折扣类型: PERCENT/FIXED' })
  @IsOptional()
  @IsString()
  discountType?: string

  @ApiPropertyOptional({ description: '折扣值' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number

  @ApiPropertyOptional({ description: '税率(%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number

  @ApiProperty({ description: '报价有效期 (ISO date)' })
  @IsDateString()
  validUntil!: string

  @ApiPropertyOptional({ description: '付款条款' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentTerms?: string

  @ApiPropertyOptional({ description: '交付条款' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryTerms?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string

  @ApiProperty({ description: '报价明细', type: [CreateQuotationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[]
}
