import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, Min } from 'class-validator'

export class CreateForumCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
