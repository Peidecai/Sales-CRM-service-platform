import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { DevicePlatform } from '../entities/device-token.entity'

export class RegisterDeviceDto {
  @ApiProperty({ description: '设备推送 Token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  deviceToken!: string

  @ApiProperty({ description: '平台', enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform
}
