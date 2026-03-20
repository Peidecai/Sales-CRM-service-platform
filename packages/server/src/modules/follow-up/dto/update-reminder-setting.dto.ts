import { IsOptional, IsBoolean, IsInt, Min, Max, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateReminderSettingDto {
  @ApiPropertyOptional({ description: '默认提醒时间 HH:mm', example: '09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'defaultReminderTime 格式必须为 HH:mm' })
  defaultReminderTime?: string

  @ApiPropertyOptional({ description: '是否启用跟进提醒' })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean

  @ApiPropertyOptional({ description: '是否启用AI智能提醒' })
  @IsOptional()
  @IsBoolean()
  aiReminderEnabled?: boolean

  @ApiPropertyOptional({ description: '未联系天数阈值', minimum: 1, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  inactiveDaysThreshold?: number
}
