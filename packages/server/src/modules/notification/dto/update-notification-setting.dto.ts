import { IsOptional, IsBoolean, IsArray, IsString, Matches } from 'class-validator'

export class UpdateNotificationSettingDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  wsEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mutedTypes?: string[]

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'quietHoursStart must be HH:mm format' })
  quietHoursStart?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'quietHoursEnd must be HH:mm format' })
  quietHoursEnd?: string
}
