import { IsString, IsEnum, IsInt, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ServiceType, ServicePriority } from '@crm/shared'

export class CreateServiceRecordDto {
  @ApiProperty({ description: '标题', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string

  @ApiProperty({ description: '描述' })
  @IsString()
  description!: string

  @ApiProperty({ description: '服务类型', enum: ServiceType })
  @IsEnum(ServiceType)
  type!: ServiceType

  @ApiProperty({ description: '优先级', enum: ServicePriority, default: ServicePriority.MEDIUM })
  @IsEnum(ServicePriority)
  @IsOptional()
  priority?: ServicePriority

  @ApiProperty({ description: '客户ID' })
  @IsInt()
  customerId!: number

  @ApiPropertyOptional({ description: '合同ID' })
  @IsInt()
  @IsOptional()
  contractId?: number

  @ApiPropertyOptional({ description: '处理人ID' })
  @IsInt()
  @IsOptional()
  assigneeId?: number
}
