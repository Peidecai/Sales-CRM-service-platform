import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ description: '用户名或邮箱' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username!: string

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(8, { message: '密码至少8位' })
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
