import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AnnouncementPriority } from '@crm/shared'

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string
}
