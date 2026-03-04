import { IsEnum, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { OpportunityStage } from '@crm/shared'

export class UpdateStageDto {
  @ApiProperty({ description: 'Target stage', enum: OpportunityStage })
  @IsNotEmpty()
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage
}
