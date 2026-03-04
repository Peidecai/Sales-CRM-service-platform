import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CustomerStatus } from '@crm/shared'

export class QueryCustomerDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: 'Search keyword (name/company/phone/email)' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: 'Customer status filter', enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus

  @ApiPropertyOptional({ description: 'Assigned user ID filter' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedUserId?: number
}
