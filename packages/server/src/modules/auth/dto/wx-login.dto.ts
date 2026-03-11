import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class WxLoginDto {
  @ApiProperty({ description: '微信 wx.login 返回的临时登录凭证 code' })
  @IsString()
  @IsNotEmpty()
  code!: string
}
