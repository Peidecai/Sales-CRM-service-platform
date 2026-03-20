import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class QueryCheckInDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number

  @ApiPropertyOptional({ description: '客户ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string
}
