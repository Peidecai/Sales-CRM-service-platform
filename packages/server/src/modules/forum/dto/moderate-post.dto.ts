import { IsOptional, IsBoolean, IsInt } from 'class-validator'

export class ModeratePostDto {
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean

  @IsOptional()
  @IsInt()
  categoryId?: number
}
