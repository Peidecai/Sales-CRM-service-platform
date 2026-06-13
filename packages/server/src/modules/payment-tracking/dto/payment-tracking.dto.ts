import {
  IsInt,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsIn,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class PlanItemDto {
  @ApiProperty() @IsNumber() @Type(() => Number) amount!: number
  @ApiProperty() @IsDateString() dueDate!: string
}

export class CreatePaymentPlanDto {
  @ApiProperty() @IsInt() @Type(() => Number) contractId!: number
  @ApiProperty() @IsString() planName!: string
  @ApiProperty() @IsInt() @Type(() => Number) totalInstallments!: number
  @ApiProperty() @IsNumber() @Type(() => Number) totalAmount!: number
  @ApiProperty() @IsString() @IsIn(['equal', 'custom']) splitMethod!: string
  @ApiPropertyOptional({ type: [PlanItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanItemDto)
  items?: PlanItemDto[]
}

export class ConfirmPaymentDto {
  @ApiProperty() @IsNumber() @Type(() => Number) paidAmount!: number
  @ApiPropertyOptional() @IsOptional() @IsDateString() paidAt?: string
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string
}

export class MatchStatementDto {
  @ApiProperty() @IsInt() @Type(() => Number) planItemId!: number
}

export class ImportCsvDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5 * 1024 * 1024, { message: 'CSV 内容不得超过 5MB' })
  csvContent!: string
}

export class PaymentAnalyticsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) salesUserId?: number
}
