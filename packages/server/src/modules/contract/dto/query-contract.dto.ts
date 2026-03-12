import { IsOptional, IsEnum, IsInt, IsString, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ContractStatus, ContractType } from '@crm/shared'

export class QueryContractDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '关键词（合同编号、标题）' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ enum: ContractStatus, description: '合同状态' })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus

  @ApiPropertyOptional({ enum: ContractType, description: '合同类型' })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType

  @ApiPropertyOptional({ description: '客户ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  customerId?: number

  @ApiPropertyOptional({ description: '负责人ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  ownerId?: number
}
