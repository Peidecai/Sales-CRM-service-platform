import { IsString, IsOptional, IsIn, IsArray, ValidateNested, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'
import { GroupRuleDto } from './group-rule.dto'

export class CreateCustomerGroupDto {
  @IsString()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsIn(['static', 'dynamic'])
  type!: 'static' | 'dynamic'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupRuleDto)
  rules?: GroupRuleDto[]
}
