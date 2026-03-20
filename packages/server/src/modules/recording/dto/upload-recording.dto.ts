import { IsInt, IsOptional, IsEnum, IsString, MaxLength, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { RecordingSourceType } from '@crm/shared'

export class UploadRecordingDto {
  @ApiPropertyOptional({ description: '关联的通话记录 ID（语音速记时必填，通用上传时可选）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  callRecordId?: number

  @ApiPropertyOptional({
    description: '录音来源类型',
    enum: RecordingSourceType,
    default: RecordingSourceType.VOICE_MEMO,
  })
  @IsOptional()
  @IsEnum(RecordingSourceType)
  sourceType?: RecordingSourceType = RecordingSourceType.VOICE_MEMO

  @ApiPropertyOptional({ description: '关联客户 ID（手动上传时使用）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number

  @ApiPropertyOptional({ description: '关联商机 ID（手动上传时使用）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  opportunityId?: number

  @ApiPropertyOptional({ description: '对方电话号码' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  counterpartPhone?: string

  @ApiPropertyOptional({ description: '实际通话时间' })
  @IsOptional()
  @IsDateString()
  actualCallTime?: string

  @ApiPropertyOptional({ description: '通话时长（秒）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  duration?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
