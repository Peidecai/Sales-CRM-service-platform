import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class BindPhoneDto {
  @ApiProperty({ description: '微信 getPhoneNumber 返回的 code（新版接口）' })
  @IsString()
  @IsNotEmpty()
  code!: string
}
