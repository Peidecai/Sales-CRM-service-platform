import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OpportunityStage } from '@crm/shared'

export class UpdateStageDto {
  @ApiProperty({ description: 'Target stage', enum: OpportunityStage })
  @IsNotEmpty()
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage

  @ApiPropertyOptional({ description: '关闭原因（CLOSED_LOST 时必填）', maxLength: 500 })
  @ValidateIf((o) => o.stage === OpportunityStage.CLOSED_LOST)
  @IsString()
  @IsNotEmpty({ message: '关闭商机必须填写关闭原因' })
  @MaxLength(500)
  closeReason?: string

  @ApiPropertyOptional({ description: '阶段变更备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  closeRemark?: string
}
