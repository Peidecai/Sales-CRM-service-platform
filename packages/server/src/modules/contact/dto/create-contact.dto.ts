import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator'
import { Gender, DecisionRole } from '../contact.entity'

export class CreateContactDto {
  @IsInt()
  @IsPositive()
  customerId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  mobile?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  landline?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  wechat?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string

  @IsOptional()
  @IsEnum(DecisionRole)
  decisionRole?: DecisionRole

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  influenceLevel?: number

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

  @IsOptional()
  @IsDateString()
  birthday?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hobby?: string

  @IsOptional()
  @IsString()
  remark?: string
}
