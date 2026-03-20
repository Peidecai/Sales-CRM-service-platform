import { IsString, IsOptional, IsIn } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateCloudCallSettingsDto {
  @ApiPropertyOptional({ description: '云呼服务商', example: 'aliyun' })
  @IsOptional()
  @IsString()
  @IsIn(['aliyun', 'tianrun', 'ronglian'])
  provider?: string

  @ApiPropertyOptional({ description: 'App Key' })
  @IsOptional()
  @IsString()
  appKey?: string

  @ApiPropertyOptional({ description: 'App Secret' })
  @IsOptional()
  @IsString()
  appSecret?: string

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsString()
  webhookUrl?: string
}
