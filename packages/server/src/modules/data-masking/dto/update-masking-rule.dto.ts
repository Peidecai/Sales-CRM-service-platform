import { PartialType } from '@nestjs/swagger'
import { CreateMaskingRuleDto } from './create-masking-rule.dto'

export class UpdateMaskingRuleDto extends PartialType(CreateMaskingRuleDto) {}
