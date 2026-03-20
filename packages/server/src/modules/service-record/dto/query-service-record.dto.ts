import { IsOptional, IsEnum, IsInt, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ServiceType, ServiceStatus, ServicePriority } from '@crm/shared'

export class QueryServiceRecordDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  pageSize?: number

  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus

  @ApiPropertyOptional({ enum: ServiceType })
  @IsEnum(ServiceType)
  @IsOptional()
  type?: ServiceType

  @ApiPropertyOptional({ enum: ServicePriority })
  @IsEnum(ServicePriority)
  @IsOptional()
  priority?: ServicePriority

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  customerId?: number

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  assigneeId?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  keyword?: string
}
