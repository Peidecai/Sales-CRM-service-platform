import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsPositive,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TargetScope, TargetPeriod, TargetMetricType } from '@crm/shared'

export class CreateSalesTargetDto {
  @ApiProperty({ description: '目标名称', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string

  @ApiProperty({ description: '目标范围', enum: TargetScope })
  @IsEnum(TargetScope)
  scope!: TargetScope

  @ApiProperty({ description: '目标周期', enum: TargetPeriod })
  @IsEnum(TargetPeriod)
  period!: TargetPeriod

  @ApiProperty({ description: '指标类型', enum: TargetMetricType })
  @IsEnum(TargetMetricType)
  metricType!: TargetMetricType

  @ApiProperty({ description: '目标值', minimum: 0 })
  @IsNumber()
  @Min(0)
  targetValue!: number

  @ApiProperty({ description: '年份' })
  @IsInt()
  @IsPositive()
  year!: number

  @ApiPropertyOptional({ description: '季度 (1-4)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number

  @ApiPropertyOptional({ description: '月份 (1-12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number

  @ApiProperty({ description: '开始日期' })
  @IsDateString()
  startDate!: string

  @ApiProperty({ description: '结束日期' })
  @IsDateString()
  endDate!: string

  @ApiPropertyOptional({ description: '分配给用户 ID (个人目标)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  assignedUserId?: number

  @ApiPropertyOptional({ description: '团队标识 (团队目标)' })
  @IsOptional()
  @IsString()
  teamId?: string

  @ApiPropertyOptional({ description: '父目标 ID (分解自)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  parentTargetId?: number
}
