import { IsString, IsInt, IsOptional, MaxLength } from 'class-validator'

export class CreateForumPostDto {
  @IsString()
  @MaxLength(200)
  title!: string

  @IsString()
  content!: string

  @IsInt()
  categoryId!: number

  @IsOptional()
  @IsInt()
  linkedArticleId?: number
}
