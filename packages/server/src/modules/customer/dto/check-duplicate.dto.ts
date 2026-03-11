import { IsOptional, IsString, IsEmail } from 'class-validator'

export class CheckDuplicateDto {
  @IsOptional()
  @IsString()
  unifiedCreditCode?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  company?: string

  @IsOptional()
  @IsString()
  contactMobile?: string
}
