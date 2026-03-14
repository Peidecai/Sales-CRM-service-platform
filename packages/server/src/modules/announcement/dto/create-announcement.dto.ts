import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  IsIn,
  ArrayMinSize,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AnnouncementPriority, UserRole } from '@crm/shared'
import { AnnouncementChannel } from '../entities/announcement.entity'

export class CreateAnnouncementDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string

  @ApiPropertyOptional({ enum: AnnouncementPriority })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean

  @ApiPropertyOptional({
    description: '发布渠道',
    enum: AnnouncementChannel,
    isArray: true,
    example: ['WEB'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一个发布渠道' })
  @IsIn(Object.values(AnnouncementChannel), {
    each: true,
    message: '渠道值必须为 WEB/EMAIL/SMS/WECHAT',
  })
  channels?: AnnouncementChannel[]

  @ApiPropertyOptional({
    description: '目标角色（空数组表示全部角色）',
    enum: UserRole,
    isArray: true,
    example: ['ADMIN', 'MANAGER', 'SALES'],
  })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(UserRole), { each: true, message: '角色值必须为 ADMIN/MANAGER/SALES' })
  targetRoles?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string
}
