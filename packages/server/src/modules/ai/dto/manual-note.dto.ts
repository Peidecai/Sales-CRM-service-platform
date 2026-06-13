import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ManualNoteDto {
  @ApiProperty({
    description: '手动备注内容（采纳/驳回理由等）',
    example: '客户意向明确，已确认跟进',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  note!: string
}
