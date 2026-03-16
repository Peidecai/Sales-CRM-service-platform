import { IsInt, IsOptional, IsEnum } from 'class-validator'
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
}
