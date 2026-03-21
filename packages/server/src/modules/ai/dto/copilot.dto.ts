import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CopilotChatDto {
  @ApiProperty({ description: '用户消息内容' })
  @IsString()
  @IsNotEmpty()
  message!: string

  @ApiPropertyOptional({ description: '上下文信息' })
  @IsOptional()
  @IsString()
  context?: string
}

export class CopilotQueryDto {
  @ApiProperty({ description: 'CRM 查询语句' })
  @IsString()
  @IsNotEmpty()
  query!: string
}
