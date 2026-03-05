import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty({ message: '请输入当前密码' })
  oldPassword!: string

  @ApiProperty({ description: 'New password (min 6 chars)' })
  @IsString()
  @IsNotEmpty({ message: '请输入新密码' })
  @MinLength(6, { message: '新密码至少需要6个字符' })
  @MaxLength(100)
  newPassword!: string
}
