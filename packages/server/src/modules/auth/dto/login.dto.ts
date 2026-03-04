import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用户名或邮箱' })
  @IsString()
  username!: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password!: string;
}
