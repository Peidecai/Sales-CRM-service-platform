import { IsOptional, IsEnum, IsInt, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'
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
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ServiceStatus)
  @IsOptional()
  status?: ServiceStatus

  @ApiPropertyOptional({ enum: ServiceType })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ServiceType)
  @IsOptional()
  type?: ServiceType

  @ApiPropertyOptional({ enum: ServicePriority })
  @Transform(({ value }) => (value === '' ? undefined : value))
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
