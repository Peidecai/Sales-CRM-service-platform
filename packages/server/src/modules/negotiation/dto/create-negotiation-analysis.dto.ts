import { IsInt, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateNegotiationAnalysisDto {
  @ApiProperty({ description: '通话记录ID' })
  @IsNotEmpty()
  @IsInt()
  callRecordId!: number
}
