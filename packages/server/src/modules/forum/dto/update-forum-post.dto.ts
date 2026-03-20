import { IsString, IsInt, IsOptional, MaxLength } from 'class-validator'

export class UpdateForumPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsInt()
  categoryId?: number

  @IsOptional()
  @IsInt()
  linkedArticleId?: number | null
}
