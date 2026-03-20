import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  MaxLength,
  IsObject,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '@crm/shared'

export class SendPushDto {
  @ApiProperty({ description: '推送标题' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string

  @ApiProperty({ description: '推送内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body!: string

  @ApiPropertyOptional({ description: '目标用户ID（与 role 二选一）' })
  @IsOptional()
  @IsNumber()
  userId?: number

  @ApiPropertyOptional({ description: '目标角色（与 userId 二选一）', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @ApiPropertyOptional({ description: '附加数据' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>
}
