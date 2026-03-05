import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '@crm/shared'

export class CreateUserDto {
  @ApiProperty({ description: 'Username', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username!: string

  @ApiProperty({ description: 'Password (min 6 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: '密码至少需要6个字符' })
  @MaxLength(100)
  password!: string

  @ApiProperty({ description: 'Display name', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string

  @ApiPropertyOptional({ description: 'User role', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @ApiPropertyOptional({ description: 'Phone number (Chinese mobile format)', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确，应为11位中国大陆手机号' })
  phone?: string
}
