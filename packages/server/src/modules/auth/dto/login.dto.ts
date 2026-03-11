import { IsString, MinLength, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ description: '用户名或邮箱' })
  @IsString()
  username!: string

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password!: string

  @ApiPropertyOptional({ description: '验证码 ID（登录失败 3 次后必填）' })
  @IsString()
  @IsOptional()
  captchaId?: string

  @ApiPropertyOptional({ description: '验证码（不区分大小写）' })
  @IsString()
  @IsOptional()
  captchaCode?: string

  @ApiPropertyOptional({
    description: '设备类型',
    enum: ['web', 'mobile', 'miniapp'],
    default: 'web',
  })
  @IsString()
  @IsOptional()
  deviceType?: string
}
