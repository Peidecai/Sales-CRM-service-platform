import { IsString, IsEnum, IsOptional, IsArray, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MaskType } from '../entities/data-masking-rule.entity'

export class CreateMaskingRuleDto {
  @ApiProperty({ description: '规则名称', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string

  @ApiProperty({ description: '实体名称', example: 'customer' })
  @IsString()
  @MaxLength(50)
  entityName!: string

  @ApiProperty({ description: '字段名称', example: 'phone' })
  @IsString()
  @MaxLength(50)
  fieldName!: string

  @ApiProperty({ description: '脱敏类型', enum: MaskType })
  @IsEnum(MaskType)
  maskType!: MaskType

  @ApiPropertyOptional({ description: '脱敏模式', example: '3,4,4' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pattern?: string

  @ApiPropertyOptional({ description: '豁免角色列表', example: ['admin'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptRoles?: string[]

  @ApiPropertyOptional({ description: '豁免权限码' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  exemptPermission?: string
}
