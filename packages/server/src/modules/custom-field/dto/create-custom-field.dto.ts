import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  Matches,
  Min,
  MaxLength,
} from 'class-validator'
import { FieldType } from '../custom-field-definition.entity'

export class CreateCustomFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'fieldKey 必须以小写字母开头，仅包含小写字母、数字和下划线',
  })
  fieldKey!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fieldLabel!: string

  @IsEnum(FieldType)
  fieldType!: FieldType

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]

  @IsOptional()
  @IsBoolean()
  required?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number
}
