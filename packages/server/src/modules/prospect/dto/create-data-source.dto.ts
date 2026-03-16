import { IsString, IsEnum, IsOptional, IsInt, Min, MaxLength } from 'class-validator'
import { ProspectChannel } from '@crm/shared'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateDataSourceDto {
  @ApiProperty({ description: '数据源名称', example: '天眼查' })
  @IsString()
  @MaxLength(50)
  name!: string

  @ApiProperty({ description: '渠道', enum: ProspectChannel })
  @IsEnum(ProspectChannel)
  channel!: ProspectChannel

  @ApiProperty({ description: 'API Key' })
  @IsString()
  @MaxLength(500)
  apiKey!: string

  @ApiPropertyOptional({ description: 'API Secret' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiSecret?: string

  @ApiPropertyOptional({ description: '自定义 API 地址' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  apiEndpoint?: string

  @ApiPropertyOptional({ description: '每日调用配额', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyQuota?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string
}
