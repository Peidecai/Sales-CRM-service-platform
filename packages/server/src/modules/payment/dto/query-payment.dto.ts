import { IsOptional, IsEnum, IsInt, IsBoolean, Min, Max } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentStatus } from '@crm/shared'

export class QueryPaymentDto {
  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页条数', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '合同ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractId?: number

  @ApiPropertyOptional({ description: '客户ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number

  @ApiPropertyOptional({ description: '负责人ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number

  @ApiPropertyOptional({ description: '回款状态', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus

  @ApiPropertyOptional({ description: '是否逾期' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true
    if (value === 'false' || value === false) return false
    return undefined
  })
  @IsBoolean()
  isOverdue?: boolean
}
