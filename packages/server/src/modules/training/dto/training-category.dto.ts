import { IsString, IsOptional, IsInt, IsEnum, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateTrainingCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string

  @IsEnum(['product', 'sales_skill', 'onboarding', 'industry', 'other'])
  type!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number

  @IsOptional()
  @IsString()
  description?: string
}

export class UpdateTrainingCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsEnum(['product', 'sales_skill', 'onboarding', 'industry', 'other'])
  type?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number

  @IsOptional()
  @IsString()
  description?: string
}
